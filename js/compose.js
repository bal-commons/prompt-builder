import {ACTIVITIES, CAPABILITIES, IDPS, SCENARIOS} from "./catalog.js";
import {choices, fieldName} from "./contracts.js";
import {component, defaults, HUB_PANES, newId, newWorkflow, usedComponents, usesManagementApi} from "./state.js";

// Applying scenarios and capabilities, composing pages from them, and checking a design.
// Every function takes the state and returns a new one; the UI keeps the old one for Undo.

const clone = (s) => structuredClone(s);
const chatAgent = (s) => s.workflows.find((w) => w.kind === "agent" && w.chat);
const agents = (s) => s.workflows.filter((w) => w.kind === "agent");
const taskFlows = (s) => s.workflows.filter((w) => w.kind === "workflow");
const placed = (s) => new Set(s.pages.flatMap((p) => [...p.columns[0], ...p.columns[1]]));
const addAll = (list, ids) => [...new Set([...list, ...ids])];

// The components each capability owns on the pages (start forms are found by workflow).
const OWNED = {
  chat: ["conversation", "conversation-list"],
  uploads: ["upload-case", "case-list", "file-viewer"],
  notifications: ["bell", "inbox"],
  tasks: ["task-inbox", "task-form"],
  runs: ["runs"]
};

export function applyScenario(state, id) {
  const scenario = SCENARIOS.find((x) => x.id === id);
  const base = defaults();
  let s = {...base, idp: state.idp, db: state.db, frontend: state.frontend, assistants: state.assistants, style: state.style,
    deploy: state.deploy, connections: state.connections, scenario: id, app: {...base.app, ...scenario.app,
      adminRoles: scenario.app.roles.slice(-1)}};
  for (const cap of scenario.capabilities) {
    s = setCapability(s, cap, true).state;
  }
  if (id === "approval") {
    const flow = taskFlows(s)[0];
    flow.title = "Request approval";
    flow.input = [{name: "title", label: "What do you need?", type: "string", required: true},
      {name: "amount", label: "Amount", type: "number", required: false},
      {name: "details", label: "Details", type: "text", required: false}];
    flow.tasks[0] = {...flow.tasks[0], title: "Review the request", description: "Check the request and decide.",
      fields: [{name: "approved", label: "Approve", type: "boolean", required: true},
        {name: "comment", label: "Comment", type: "text", required: false}]};
  }
  if (id === "documents") {
    const agent = chatAgent(s);
    Object.assign(agent, {name: "collector", title: "Document collector", displayName: "Document assistant",
      purpose: "Collects the documents an application needs, checks them and tells the applicant what is missing.",
      greeting: "Hello! I'll help you collect the documents for your application.",
      input: [{name: "applicationType", label: "Application type", type: "choice", options: ["Residence", "Work permit"], required: true}],
      steps: ["When the run starts: explain which documents are needed and requestUpload them.",
        "When the UPLOAD arrives: check the files, tell the applicant, and updateStatus to SUBMITTED.",
        "When a MESSAGE arrives: answer questions about the documents."]});
    s.behavior.uploads.slots = [
      {name: "identity", label: "Passport or ID card", mimeTypes: ["image/*", "application/pdf"], maxFiles: 1, required: true},
      {name: "address", label: "Proof of address", mimeTypes: ["application/pdf"], maxFiles: 2, required: true},
      {name: "other", label: "Anything else", mimeTypes: [], maxFiles: 3, required: false}];
  }
  return compose(s);
}

// Turns a capability on or off. Returns {state, message}: what changed, in a sentence.
export function setCapability(state, id, on) {
  const s = clone(state);
  const cap = CAPABILITIES.find((c) => c.id === id);
  const notes = [];
  s.capabilities[id] = on;
  if (on) {
    for (const dep of cap.requires ?? []) {
      if (!s.capabilities[dep]) {
        s.capabilities[dep] = true;
        notes.push(`${CAPABILITIES.find((c) => c.id === dep).name} was turned on too: an agent asks for the files in its chat.`);
        ensure(s, dep);
      }
    }
    ensure(s, id);
  } else {
    // Capabilities that need this one go too.
    for (const other of CAPABILITIES.filter((c) => (c.requires ?? []).includes(id) && s.capabilities[c.id])) {
      s.capabilities[other.id] = false;
      release(s, other.id);
      notes.push(`${other.name} was turned off too: it needs ${cap.name}.`);
    }
    release(s, id);
  }
  const next = s.layout.auto ? compose(s) : place(s);
  return {state: next, message: [on ? cap.explainOn : cap.explainOff, ...notes].join(" ")};
}

// What a capability needs in the configuration, created with defaults the first time.
function ensure(s, id) {
  switch (id) {
    case "chat": {
      let agent = chatAgent(s) ?? agents(s)[0];
      if (!agent) {
        agent = newWorkflow(s, "chat-agent");
        s.workflows.unshift(agent);
      }
      agent.chat = true;
      break;
    }
    case "uploads":
      for (const a of agents(s).filter((x) => x.chat)) {
        a.uploads = true;
        a.activities = addAll(a.activities, ["requestUpload", "closeCase"]);
      }
      break;
    case "notifications":
      s.header = addAll(s.header.filter((h) => h !== "user-menu"), ["bell", "user-menu"]);
      for (const a of agents(s)) a.activities = addAll(a.activities, ["notifyUser"]);
      break;
    case "tasks":
      if (!taskFlows(s).some((w) => (w.tasks ?? []).length)) {
        const flow = newWorkflow(s, "approval");
        flow.tasks = flow.tasks.map((t) => ({...t, roles: t.roles.length ? t.roles : s.app.adminRoles.slice(0, 1)}));
        s.workflows.push(flow);
      }
      break;
  }
}

// Undoes what ensure() changed outside the pages; configuration the user entered stays.
function release(s, id) {
  switch (id) {
    case "chat":
      for (const a of agents(s)) a.chat = false;
      break;
    case "uploads":
      for (const a of agents(s)) {
        a.uploads = false;
        a.activities = a.activities.filter((x) => x !== "requestUpload" && x !== "closeCase");
      }
      break;
    case "notifications":
      s.header = s.header.filter((h) => h !== "bell");
      for (const a of agents(s)) a.activities = a.activities.filter((x) => x !== "notifyUser" && x !== "notifyRole");
      break;
  }
  const owned = new Set(OWNED[id] ?? []);
  if (id === "chat") for (const a of agents(s)) owned.add(`start:${a.id}`);
  if (id === "tasks") for (const w of taskFlows(s)) owned.add(`start:${w.id}`);
  for (const p of s.pages) p.columns = p.columns.map((col) => col.filter((c) => !owned.has(c)));
  s.pages = s.pages.filter((p, i) => i === 0 || p.columns.some((col) => col.length));
  if (!s.pages.some((p) => p.id === s.bell.opens)) s.bell.opens = "drawer";
}

// Builds the suggested pages from the capabilities (used while layout.auto is on).
export function compose(state) {
  const s = clone(state);
  const c = s.capabilities;
  const agent = chatAgent(s);
  const flow = taskFlows(s)[0];
  const home = {id: "home", title: "Home", layout: "single", ratio: 35, collapsible: true, columns: [[], []]};
  const pages = [home];
  const custom = s.pages.flatMap((p) => [...p.columns[0], ...p.columns[1]]).filter((id) => s.custom.some((x) => x.id === id));
  if (c.chat && agent) {
    home.layout = "split";
    home.columns = [[`start:${agent.id}`, ...(c.runs ? ["runs"] : ["conversation-list"])], ["conversation"]];
  } else if (c.tasks && flow) {
    home.columns = [[`start:${flow.id}`, ...(c.runs ? ["runs"] : [])], []];
  } else if (c.runs) {
    home.columns = [["runs"], []];
  }
  if (c.chat && c.tasks && flow) home.columns[0].splice(1, 0, `start:${flow.id}`);
  for (const a of agents(s).filter((x) => x !== agent)) home.columns[0].push(`start:${a.id}`);
  home.columns[0].push(...custom);
  if (c.tasks) pages.push({id: "tasks", title: "Tasks", layout: "split", ratio: 35, collapsible: true, columns: [["task-inbox"], ["task-form"]]});
  if (c.uploads) pages.push({id: "files", title: "Files", layout: "split", ratio: 35, collapsible: true, columns: [["case-list"], ["upload-case", "file-viewer"]]});
  if (c.notifications && s.bell.opens !== "drawer") pages.push({id: "notifications", title: "Notifications", layout: "single", ratio: 50, collapsible: true, columns: [["inbox"], []]});
  s.pages = pages;
  if (s.bell.opens !== "drawer") s.bell.opens = pages.some((p) => p.id === "notifications") ? "notifications" : "drawer";
  s.header = c.notifications ? addAll(s.header.filter((h) => h !== "user-menu"), ["bell", "user-menu"]) : s.header.filter((h) => h !== "bell");
  if (!s.header.includes("user-menu")) s.header.push("user-menu");
  return s;
}

// With a hand-made layout, adds what an enabled capability needs without moving anything else.
function place(state) {
  const s = state;
  const c = s.capabilities;
  const has = placed(s);
  const home = s.pages[0];
  const addPage = (id, title, left, right) => {
    if (!s.pages.some((p) => p.id === id)) s.pages.push({id, title, layout: right.length ? "split" : "single", ratio: 35, collapsible: true, columns: [left, right]});
  };
  const agent = chatAgent(s);
  if (c.chat && agent) {
    if (!has.has(`start:${agent.id}`)) home.columns[0].push(`start:${agent.id}`);
    if (!has.has("conversation")) {
      if (home.layout === "split") home.columns[1].push("conversation");
      else home.columns[0].push("conversation");
    }
  }
  if (c.tasks && !has.has("task-inbox")) addPage("tasks", "Tasks", ["task-inbox"], ["task-form"]);
  if (c.tasks) for (const w of taskFlows(s)) if (!has.has(`start:${w.id}`)) home.columns[0].push(`start:${w.id}`);
  if (c.uploads && !has.has("case-list")) addPage("files", "Files", ["case-list"], ["upload-case", "file-viewer"]);
  if (c.runs && !has.has("runs")) home.columns[0].push("runs");
  return s;
}

// ---------------------------------------------------------------- diagnostics

// Problems in a design. level "blocker" stops generation; "warning" is a suggestion. `fix` returns a new state.
export function diagnostics(state) {
  const s = state;
  const issues = [];
  const add = (level, step, text, fixLabel, fix) => issues.push({level, step, text, fixLabel, fix});
  const on = placed(s);
  const allPlaced = new Set(usedComponents(s));

  if (!s.app.name.trim()) add("blocker", 1, "The app has no name.");
  if (!s.app.roles.length) add("blocker", 1, "Add at least one role: tasks, approvals and personas need roles.");
  for (const cap of CAPABILITIES) {
    if (!s.capabilities[cap.id]) continue;
    const missing = {
      chat: !chatAgent(s) ? "There's no chat agent." : !on.has("conversation") && s.layout.shell !== "hub" ? "No page shows the conversation." : "",
      tasks: !allPlaced.has("task-inbox") ? "No page shows the task inbox." : "",
      runs: !on.has("runs") ? "No page shows My runs." : "",
      uploads: !agents(s).some((a) => a.uploads) ? "No agent asks for uploads." : !s.behavior.uploads.slots.length ? "There are no upload slots." : "",
      notifications: !s.header.includes("bell") && !allPlaced.has("inbox") && s.layout.shell !== "hub" ? "Neither the bell nor the inbox is in the portal." : ""
    }[cap.id];
    if (missing) {
      add("warning", cap.id === "uploads" && missing.includes("slots") ? 3 : 4, `${cap.name}: ${missing}`, "Add it", (x) => {
        const repaired = clone(x);
        ensure(repaired, cap.id);
        return repaired.layout.auto ? compose(repaired) : place(repaired);
      });
    }
  }
  for (const [cap, ids] of Object.entries(OWNED)) {
    if (s.capabilities[cap]) continue;
    const stray = ids.filter((id) => allPlaced.has(id) && !(s.layout.shell === "hub" && Object.values(HUB_PANES).flat().includes(id)));
    if (stray.length) {
      const name = CAPABILITIES.find((c) => c.id === cap).name;
      add("warning", 4, `${stray.map((id) => component(s, id).name).join(", ")} ${stray.length > 1 ? "are" : "is"} on a page, but ${name} is off.`,
        `Turn ${name} on`, (x) => setCapability(x, cap, true).state);
    }
  }
  if (on.has("task-form") && !on.has("task-inbox")) add("warning", 4, "A page shows the task form without the task inbox, so nothing selects a task.", "Add the inbox next to it", (x) => {
    const r = clone(x);
    const p = r.pages.find((pg) => [...pg.columns[0], ...pg.columns[1]].includes("task-form"));
    p.columns[0].unshift("task-inbox");
    return r;
  });
  for (const wf of s.workflows) {
    if (!allPlaced.has(`start:${wf.id}`)) {
      add("warning", 4, `${wf.title || wf.name} has no start form on any page, so nobody can start it from the portal.`, "Put it on Home", (x) => {
        const r = clone(x);
        r.pages[0].columns[0].unshift(`start:${wf.id}`);
        return r;
      });
    }
    checkFields(add, wf.input, `${wf.title || wf.name}: start input`, 3);
    if (wf.kind === "workflow") {
      if (!(wf.tasks ?? []).length) add("warning", 3, `${wf.title || wf.name} has no human task; it finishes as soon as it starts.`);
      for (const t of wf.tasks ?? []) {
        if (!t.fields.length) add("blocker", 3, `Task "${t.title || t.name}" has no answer fields; a person can't complete an empty form.`);
        checkFields(add, t.fields, `Task "${t.title || t.name}"`, 3);
        if (!t.roles.length) add("warning", 3, `Task "${t.title || t.name}" has no reviewer role, so anyone can complete it.`);
      }
    } else if (wf.approval.on && !wf.activities.includes(wf.approval.activity)) {
      add("blocker", 3, `${wf.title}: the approval guards "${wf.approval.activity}", which isn't one of its activities.`, "Guard its first activity", (x) => {
        const r = clone(x);
        const w = r.workflows.find((y) => y.id === wf.id);
        w.approval.activity = w.activities[0] ?? "";
        if (!w.approval.activity) w.approval.on = false;
        return r;
      });
    } else if (wf.approval.on && !wf.approval.userRoles.length) {
      add("warning", 3, `${wf.title}: the approval has no approver role, so anyone can decide it.`);
    }
  }
  const names = s.workflows.map((w) => w.name.trim().toLowerCase());
  names.forEach((n, i) => {
    if (!n) add("blocker", 3, `A ${s.workflows[i].kind} has no code name.`);
    else if (names.indexOf(n) !== i) add("blocker", 3, `Two workflows or agents are both called "${n}"; code names must differ.`);
  });
  for (const slot of s.capabilities.uploads ? s.behavior.uploads.slots : []) {
    if (!slot.label.trim()) add("blocker", 3, "An upload slot has no label.");
    if (!(slot.maxFiles >= 1)) add("blocker", 3, `Upload slot "${slot.label}" must allow at least one file.`);
  }
  const seen = new Map();
  for (const p of s.pages) {
    const key = [...p.columns[0], ...p.columns[1]].sort().join("|");
    if (key && seen.has(key)) add("warning", 4, `"${p.title}" shows the same components as "${seen.get(key)}".`, `Remove "${p.title}"`, (x) => {
      const r = clone(x);
      r.pages = r.pages.filter((pg) => pg.id !== p.id);
      return r;
    });
    else if (key) seen.set(key, p.title);
    if (!key && s.pages.length > 1) add("warning", 4, `"${p.title}" is empty.`);
  }
  if (s.layout.shell === "hub") {
    const dup = s.pages.filter((p) => s.layout.hubPanes.some((pane) => (pane === "files" ? ["case-list"] : HUB_PANES[pane]).every((id) => [...p.columns[0], ...p.columns[1]].includes(id))));
    for (const p of dup) add("warning", 4, `The hub already has a pane for what "${p.title}" shows.`);
  }
  for (const c of s.custom) {
    if (!on.has(c.id) && !s.header.includes(c.id)) add("warning", 4, `Custom component "${c.name}" isn't on any page.`);
    if (!c.description.trim()) add("warning", 4, `Custom component "${c.name}" has no description, so the prompt can't say what to build.`);
  }
  const idp = IDPS.find((i) => i.id === s.idp.kind);
  if (idp.id !== "none") {
    for (const key of ["issuer", "jwksUrl", "authorizeUrl", "tokenUrl", "clientId", "userIdClaim", "rolesClaim"]) {
      if (!String(s.idp[key] ?? "").trim()) add("blocker", 5, `Sign-in: ${key} is empty.`);
    }
    if (usesManagementApi(s) && !s.idp.audience) add("warning", 5, "Sign-in: the management API checks the token audience; the client ID is used because none is set.");
  }
  for (const [id, conn] of Object.entries(s.connections)) {
    if (conn.mode === "live" && !conn.url.trim()) add("warning", 5, `${id} is set to Live but has no URL; the preview shows it as not configured.`, "Use mock data", (x) => {
      const r = clone(x);
      r.connections[id].mode = "mock";
      return r;
    });
  }
  return issues;
}

function checkFields(add, fields, where, step) {
  const names = fields.map(fieldName);
  fields.forEach((f, i) => {
    if (!String(f.label || f.name || "").trim()) add("blocker", step, `${where}: field ${i + 1} has no label.`);
    else if (names.indexOf(names[i]) !== i) add("blocker", step, `${where}: two fields are both called "${names[i]}".`);
    if (f.type === "choice" && !choices(f).length) add("blocker", step, `${where}: "${f.label}" is a choice with no options.`);
  });
}

export {ACTIVITIES, newId};
