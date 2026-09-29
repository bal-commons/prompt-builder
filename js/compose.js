import {CAPABILITIES, IDPS, SCENARIOS} from "./catalog.js";
import {choices, fieldName} from "./contracts.js";
import {component, defaults, HUB_PANES, integrationsOf, newIntegration, newIntegrations, newWorkflow, primaryIntegration, taskTypes,
  usedComponents, usersFor, workflowsOf} from "./state.js";

// Applying scenarios and capabilities, composing pages from them, and checking a design.
// Every function takes the state and returns a new one; the UI keeps the old one for Undo.

const clone = (s) => structuredClone(s);
const agents = (s) => workflowsOf(s).filter((w) => w.kind === "agent");
const newAgents = (s) => newIntegrations(s).flatMap((i) => i.workflows).filter((w) => w.kind === "agent");
const chatAgent = (s) => agents(s).find((w) => w.chat);
const taskFlows = (s) => workflowsOf(s).filter((w) => w.kind === "workflow" && (w.tasks ?? []).length);
const placed = (s) => new Set(s.pages.flatMap((p) => [...p.columns[0], ...p.columns[1]]));
const addAll = (list, ids) => [...new Set([...list, ...ids])];

// The integration new workflows and agents go to, created when the design has none.
function home(s) {
  let int = primaryIntegration(s);
  if (!int) {
    int = newIntegration(integrationsOf(s));
    s.architecture.integrations.unshift(int);
    s.connections[int.id] = {mode: "mock", url: "", mgmtUrl: ""};
  }
  return int;
}

// The components each capability owns on the pages (start forms and typed task inboxes are found by prefix).
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
  const roles = scenario.app.roles;
  let s = {...base, db: state.db, frontend: state.frontend, assistants: state.assistants, style: state.style, deploy: state.deploy,
    scenario: id, app: {name: scenario.app.name, description: scenario.app.description},
    identity: {...base.identity, idp: state.identity.idp, roles, adminRoles: roles.slice(-1), users: usersFor(roles)}};
  s.connections = {...base.connections, [s.architecture.integrations[0].id]: {mode: "mock", url: "", mgmtUrl: ""}};
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
      let agent = chatAgent(s) ?? newAgents(s)[0];
      if (!agent) {
        agent = newWorkflow(s, "chat-agent");
        home(s).workflows.unshift(agent);
      }
      agent.chat = true;
      break;
    }
    case "uploads":
      for (const a of newAgents(s).filter((x) => x.chat)) {
        a.uploads = true;
        a.activities = addAll(a.activities, ["requestUpload", "closeCase"]);
      }
      break;
    case "notifications":
      s.header = addAll(s.header.filter((h) => h !== "user-menu"), ["bell", "user-menu"]);
      for (const a of newAgents(s)) a.activities = addAll(a.activities, ["notifyUser"]);
      break;
    case "tasks":
      if (!taskFlows(s).length) {
        const flow = newWorkflow(s, "approval");
        home(s).workflows.push(flow);
      }
      break;
  }
}

// Undoes what ensure() changed outside the pages; configuration the user entered stays.
function release(s, id) {
  switch (id) {
    case "chat":
      for (const a of newAgents(s)) a.chat = false;
      break;
    case "uploads":
      for (const a of newAgents(s)) {
        a.uploads = false;
        a.activities = a.activities.filter((x) => x !== "requestUpload" && x !== "closeCase");
      }
      break;
    case "notifications":
      s.header = s.header.filter((h) => h !== "bell");
      for (const a of newAgents(s)) a.activities = a.activities.filter((x) => x !== "notifyUser" && x !== "notifyRole");
      break;
  }
  const owned = (c) => (OWNED[id] ?? []).includes(c) || (id === "tasks" && c.startsWith("task-inbox@"))
    || (id === "chat" && agents(s).some((a) => c === `start:${a.id}`))
    || (id === "tasks" && taskFlows(s).some((w) => c === `start:${w.id}`));
  for (const p of s.pages) p.columns = p.columns.map((col) => col.filter((c) => !owned(c)));
  s.pages = s.pages.filter((p, i) => i === 0 || p.columns.some((col) => col.length));
  if (!s.pages.some((p) => p.id === s.bell.opens)) s.bell.opens = "drawer";
}

// The pages for the task capability: one inbox of everything, and a page per chosen task type.
function taskPages(s) {
  const pages = [];
  const t = s.behavior.tasks;
  if (t.inbox) pages.push({id: "tasks", title: "Tasks", layout: "split", ratio: 35, collapsible: true, columns: [["task-inbox"], ["task-form"]]});
  for (const ref of t.typePages) {
    const type = taskTypes(s).find((x) => x.ref === ref);
    if (!type) continue;
    const id = `task-${type.workflow.name}-${type.task.name}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    pages.push({id, title: type.task.title || type.task.name, layout: "split", ratio: 35, collapsible: true, columns: [[`task-inbox@${ref}`], ["task-form"]]});
  }
  return pages;
}

// Builds the suggested pages from the capabilities (used while layout.auto is on).
export function compose(state) {
  const s = clone(state);
  const c = s.capabilities;
  const agent = chatAgent(s);
  const flow = newIntegrations(s).flatMap((i) => i.workflows).find((w) => w.kind === "workflow" && (w.tasks ?? []).length);
  const first = {id: "home", title: "Home", layout: "single", ratio: 35, collapsible: true, columns: [[], []]};
  const pages = [first];
  const custom = s.pages.flatMap((p) => [...p.columns[0], ...p.columns[1]]).filter((id) => s.custom.some((x) => x.id === id));
  if (c.chat && agent) {
    first.layout = "split";
    first.columns = [[`start:${agent.id}`, ...(c.runs ? ["runs"] : ["conversation-list"])], ["conversation"]];
  } else if (c.tasks && flow) {
    first.columns = [[`start:${flow.id}`, ...(c.runs ? ["runs"] : [])], []];
  } else if (c.runs) {
    first.columns = [["runs"], []];
  }
  if (c.chat && c.tasks && flow) first.columns[0].splice(1, 0, `start:${flow.id}`);
  for (const a of newAgents(s).filter((x) => x !== agent)) first.columns[0].push(`start:${a.id}`);
  first.columns[0].push(...custom);
  if (c.tasks) pages.push(...taskPages(s));
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
  const first = s.pages[0];
  const addPage = (page) => { if (!s.pages.some((p) => p.id === page.id)) s.pages.push(page); };
  const agent = chatAgent(s);
  if (c.chat && agent) {
    if (!has.has(`start:${agent.id}`)) first.columns[0].push(`start:${agent.id}`);
    if (!has.has("conversation")) (first.layout === "split" ? first.columns[1] : first.columns[0]).push("conversation");
  }
  if (c.tasks) for (const page of taskPages(s)) if (![...page.columns[0]].every((id) => has.has(id))) addPage(page);
  if (c.uploads && !has.has("case-list")) addPage({id: "files", title: "Files", layout: "split", ratio: 35, collapsible: true, columns: [["case-list"], ["upload-case", "file-viewer"]]});
  if (c.runs && !has.has("runs")) first.columns[0].push("runs");
  return s;
}

// Keeps the task pages in line with behavior.tasks after the user changes them (used by the behavior step).
export function syncTaskPages(state) {
  const s = clone(state);
  if (!s.capabilities.tasks) return s;
  if (s.layout.auto) return compose(s);
  const wanted = taskPages(s);
  const isTaskPage = (p) => p.id === "tasks" || p.columns[0].some((id) => id.startsWith("task-inbox@"));
  s.pages = s.pages.filter((p) => !isTaskPage(p) || wanted.some((w) => w.id === p.id));
  for (const w of wanted) if (!s.pages.some((p) => p.id === w.id)) s.pages.push(w);
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
  const id = s.identity;

  // 1. Describe
  if (!s.app.name.trim()) add("blocker", 1, "The app has no name.");
  // 2. Identity
  if (!id.roles.length) add("blocker", 2, "Add at least one role: tasks, approvals and personas need roles.");
  if (!id.users.length) add("blocker", 2, "Add at least one user: they sign in to the portal and the preview.");
  const usernames = id.users.map((u) => u.username.trim().toLowerCase());
  id.users.forEach((u, i) => {
    if (!u.username.trim()) add("blocker", 2, `User ${i + 1} has no username.`);
    else if (usernames.indexOf(usernames[i]) !== i) add("blocker", 2, `Two users are both called "${u.username}".`);
    const unknown = u.roles.filter((r) => !id.roles.includes(r));
    if (unknown.length) add("warning", 2, `${u.username} has roles that aren't defined: ${unknown.join(", ")}.`, "Remove them", (x) => {
      const r = clone(x);
      r.identity.users[i].roles = r.identity.users[i].roles.filter((ro) => r.identity.roles.includes(ro));
      return r;
    });
  });
  for (const role of id.roles) if (!id.users.some((u) => u.roles.includes(role))) add("warning", 2, `Nobody has the role ${role}, so nobody can act as it.`);
  const idp = IDPS.find((i) => i.id === id.idp.kind);
  if (idp.id !== "none") {
    for (const key of ["issuer", "jwksUrl", "authorizeUrl", "tokenUrl", "clientId", "userIdClaim", "rolesClaim"]) {
      if (!String(id.idp[key] ?? "").trim()) add("blocker", 2, `Sign-in: ${key} is empty.`);
    }
    if (!id.idp.audience) add("warning", 2, "The management APIs check the token audience; the client ID is used because none is set.");
  }
  // 3. Architecture
  const pkgs = newIntegrations(s).map((i) => i.pkg.trim().toLowerCase());
  newIntegrations(s).forEach((int, i) => {
    if (!/^[a-z][a-z0-9_]*$/.test(int.pkg)) add("blocker", 3, `${int.title}: the package name "${int.pkg}" must be lowercase letters, digits and underscores.`);
    else if (pkgs.indexOf(pkgs[i]) !== i || int.pkg === "commons_services") add("blocker", 3, `Two packages would be called "${int.pkg}".`);
  });
  for (const int of integrationsOf(s)) {
    if (int.source === "existing" && s.connections[int.id]?.mode === "live" && !s.connections[int.id]?.mgmtUrl) {
      add("warning", 3, `${int.title} is live but has no management API URL.`);
    }
    for (const wf of int.workflows) {
      checkFields(add, wf.input, `${wf.title || wf.name}: start input`, 3);
      if (wf.kind === "workflow") {
        if (!(wf.tasks ?? []).length && int.source === "new") add("warning", 3, `${wf.title || wf.name} has no human task; it finishes as soon as it starts.`);
        for (const t of wf.tasks ?? []) {
          if (!t.fields.length) add("blocker", 3, `Task "${t.title || t.name}" has no answer fields; a person can't complete an empty form.`);
          checkFields(add, t.fields, `Task "${t.title || t.name}"`, 3);
          if (!t.roles.length) add("warning", 3, int.source === "existing"
            ? `Task "${t.title || t.name}" (imported) has no reviewer role here; enter the roles ${int.title} assigns, so the preview routes it.`
            : `Task "${t.title || t.name}" has no reviewer role, so anyone can complete it.`);
        }
      } else if (wf.approval?.on && !wf.activities.includes(wf.approval.activity)) {
        add("blocker", 3, `${wf.title}: the approval guards "${wf.approval.activity}", which isn't one of its activities.`, "Guard its first activity", (x) => {
          const r = clone(x);
          const w = workflowsOf(r).find((y) => y.id === wf.id);
          w.approval.activity = w.activities[0] ?? "";
          if (!w.approval.activity) w.approval.on = false;
          return r;
        });
      }
    }
    const names = int.workflows.map((w) => w.name.trim().toLowerCase());
    names.forEach((n, i) => {
      if (!n) add("blocker", 3, `A ${int.workflows[i].kind} in ${int.title} has no code name.`);
      else if (names.indexOf(n) !== i) add("blocker", 3, `${int.title} has two workflows or agents called "${n}".`);
    });
  }
  // 4 and 5. Capabilities and behavior
  for (const cap of CAPABILITIES) {
    if (!s.capabilities[cap.id]) continue;
    const missing = {
      chat: !chatAgent(s) ? "There's no chat agent." : !on.has("conversation") && s.layout.shell !== "hub" ? "No page shows the conversation." : "",
      tasks: !taskFlows(s).length && !agents(s).some((a) => a.approval?.on) ? "No integration has a human task or an approval." :
        !usedComponents(s).some((c) => c === "task-inbox" || c.startsWith("task-inbox@")) ? "No page shows a task inbox." : "",
      runs: !on.has("runs") ? "No page shows My runs." : "",
      uploads: !newAgents(s).some((a) => a.uploads) ? "No agent asks for uploads." : !s.behavior.uploads.slots.length ? "There are no upload slots." : "",
      notifications: !s.header.includes("bell") && !allPlaced.has("inbox") && s.layout.shell !== "hub" ? "Neither the bell nor the notification inbox is in the portal." : ""
    }[cap.id];
    if (missing) {
      add("warning", 4, `${cap.name}: ${missing}`, "Add it", (x) => {
        const r = clone(x);
        ensure(r, cap.id);
        return r.layout.auto ? compose(r) : place(r);
      });
    }
  }
  if (s.capabilities.tasks && !s.behavior.tasks.inbox && !s.behavior.tasks.typePages.length) {
    add("warning", 5, "Human tasks: choose the task inbox or at least one task page.", "Use the task inbox", (x) => {
      const r = clone(x);
      r.behavior.tasks.inbox = true;
      return syncTaskPages(r);
    });
  }
  for (const [cap, ids] of Object.entries(OWNED)) {
    if (s.capabilities[cap]) continue;
    const stray = ids.filter((c) => allPlaced.has(c) && !(s.layout.shell === "hub" && Object.values(HUB_PANES).flat().includes(c)));
    if (stray.length) {
      const name = CAPABILITIES.find((c) => c.id === cap).name;
      add("warning", 6, `${stray.map((c) => component(s, c).name).join(", ")} ${stray.length > 1 ? "are" : "is"} on a page, but ${name} is off.`,
        `Turn ${name} on`, (x) => setCapability(x, cap, true).state);
    }
  }
  // 6. Portal
  if (on.has("task-form") && ![...on].some((c) => c === "task-inbox" || c.startsWith("task-inbox@"))) {
    add("warning", 6, "A page shows the task form without a task inbox, so nothing selects a task.", "Add the inbox next to it", (x) => {
      const r = clone(x);
      const p = r.pages.find((pg) => [...pg.columns[0], ...pg.columns[1]].includes("task-form"));
      p.columns[0].unshift("task-inbox");
      return r;
    });
  }
  for (const c of [...on].filter((x) => x.startsWith("task-inbox@") || x.startsWith("start:"))) {
    if (!component(s, c)) add("blocker", 6, `A page shows a component whose workflow or task was removed (${c}).`, "Remove it", (x) => {
      const r = clone(x);
      for (const p of r.pages) p.columns = p.columns.map((col) => col.filter((y) => y !== c));
      return r;
    });
  }
  for (const wf of newIntegrations(s).flatMap((i) => i.workflows)) {
    if (!allPlaced.has(`start:${wf.id}`)) {
      add("warning", 6, `${wf.title || wf.name} has no start form on any page, so nobody can start it from the portal.`, "Put it on Home", (x) => {
        const r = clone(x);
        r.pages[0].columns[0].unshift(`start:${wf.id}`);
        return r;
      });
    }
  }
  const seen = new Map();
  for (const p of s.pages) {
    const key = [...p.columns[0], ...p.columns[1]].sort().join("|");
    if (key && seen.has(key)) add("warning", 6, `"${p.title}" shows the same components as "${seen.get(key)}".`, `Remove "${p.title}"`, (x) => {
      const r = clone(x);
      r.pages = r.pages.filter((pg) => pg.id !== p.id);
      return r;
    });
    else if (key) seen.set(key, p.title);
    if (!key && s.pages.length > 1) add("warning", 6, `"${p.title}" is empty.`);
  }
  if (s.layout.shell === "hub") {
    const dup = s.pages.filter((p) => s.layout.hubPanes.some((pane) => (pane === "files" ? ["case-list"] : HUB_PANES[pane]).every((c) => [...p.columns[0], ...p.columns[1]].includes(c))));
    for (const p of dup) add("warning", 6, `The hub already has a pane for what "${p.title}" shows.`);
  }
  for (const c of s.custom) {
    if (!on.has(c.id) && !s.header.includes(c.id)) add("warning", 6, `Custom component "${c.name}" isn't on any page.`);
    if (!c.description.trim()) add("warning", 6, `Custom component "${c.name}" has no description, so the prompt can't say what to build.`);
  }
  for (const s_ of s.capabilities.uploads ? s.behavior.uploads.slots : []) {
    if (!s_.label.trim()) add("blocker", 5, "An upload slot has no label.");
    if (!(s_.maxFiles >= 1)) add("blocker", 5, `Upload slot "${s_.label}" must allow at least one file.`);
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
