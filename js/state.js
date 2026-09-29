import {ACTIVITIES, COMPONENTS, IDPS} from "./catalog.js";

// The configuration, version 5: identity (sign-in, roles, users, claims), architecture (integrations and the
// shared services), capabilities and their behavior, and the portal. The page encodes it in the URL hash.
// A page has `columns: [left, right]`; a single-column page shows both lists stacked, so switching loses nothing.

export const VERSION = 5;

const NAMES = ["Alex", "Sam", "Priya", "Jordan", "Mei", "Tom", "Ana", "Kofi"];

// One sample user per role, the starting cast for the identity provider and the preview.
export function usersFor(roles) {
  return roles.map((role, i) => {
    const name = NAMES[i % NAMES.length];
    return {username: name.toLowerCase(), name, email: `${name.toLowerCase()}@example.com`, roles: [role]};
  });
}

export function newIntegration(taken, patch = {}) {
  const ids = taken.map((i) => i.id);
  const id = newId("int", ids);
  const n = taken.length + 1;
  return {id, source: "new", title: n === 1 ? "Main integration" : `Integration ${n}`, org: "myorg", pkg: n === 1 ? "main_app" : `integration${n}`,
    idPrefix: "RUN", workflows: [], ...patch};
}

export function defaults() {
  const roles = ["User", "Admin"];
  return {
    version: VERSION,
    scenario: "custom",
    app: {name: "My app", description: ""},
    identity: {
      idp: {kind: "none", ...IDPS.find((i) => i.id === "keycloak").defaults, clientId: "portal", audience: ""},
      roles,
      adminRoles: ["Admin"],
      users: usersFor(roles),
      login: {title: "", subtitle: "Sign in to continue"}
    },
    architecture: {integrations: [newIntegration([])]},
    capabilities: {chat: false, uploads: false, notifications: false, tasks: false, runs: false},
    behavior: {
      uploads: {slots: [{name: "documents", label: "Documents", mimeTypes: ["application/pdf", "image/*"], maxFiles: 3, required: true}]},
      notifications: {scope: "both", events: {runStarted: false, taskAssigned: true, runFinished: true}},
      // inbox: one task inbox of every integration's tasks; typePages: a page per task type ("<integration>:<workflow>.<task>").
      tasks: {inbox: true, typePages: []}
    },
    layout: {shell: "sidebar", collapsible: true, hubPanes: ["inbox", "chats", "files"], auto: true},
    header: ["user-menu"],
    bell: {opens: "drawer"},
    pages: [{id: "home", title: "Home", layout: "single", ratio: 40, collapsible: true, columns: [[], []]}],
    custom: [],
    // Per backend: "commons" (a live URL per shared service) and each integration id ({mode, url, mgmtUrl}).
    // Tokens never go here.
    connections: {commons: {mode: "mock", notification: "", chat: "", attachment: ""}},
    frontend: {framework: "plain"},
    db: "h2",
    assistants: {backend: "claude", workflow: "claude"},
    style: "steps",
    deploy: "local"
  };
}

// Starting points for one workflow or agent.
export const PRESETS = [
  {id: "chat-agent", name: "Chat agent", desc: "Starting it opens a chat; the agent joins as a participant and works with the user there.",
    build: () => ({kind: "agent", name: "assistant", title: "Assistant", displayName: "Assistant", chat: true, uploads: false,
      purpose: "Helps the user with one request, in a chat, until it is done.",
      greeting: "Hi! I'm your assistant. Tell me what you need and I'll take it from there.",
      input: [{name: "topic", label: "What do you need?", type: "text", required: true}],
      steps: ["When the run starts: greet the user in the chat and ask what you need to know.",
        "When a MESSAGE arrives: answer it, and askForm when you need structured details.",
        "When the work is done: updateStatus to DONE, tell the user, and closeConversation."],
      activities: ["sendMessage", "askForm", "closeConversation", "updateStatus"],
      approval: {on: false, activity: "updateStatus", userRoles: [], adminRoles: []}, tasks: []})},
  {id: "agent", name: "Agent", desc: "A durable agent with no chat: it acts through notifications, uploads and status.",
    build: () => ({kind: "agent", name: "worker", title: "Worker", displayName: "Worker", chat: false, uploads: false,
      purpose: "Works one run in the background and reports back.", greeting: "",
      input: [{name: "title", label: "Title", type: "string", required: true}],
      steps: ["When the run starts: do the work, notifyUser the startedBy user with the outcome, and updateStatus to DONE."],
      activities: ["notifyUser", "updateStatus"],
      approval: {on: false, activity: "updateStatus", userRoles: [], adminRoles: []}, tasks: []})},
  {id: "approval", name: "Approval workflow", desc: "A workflow that waits for a person to decide, with a generated form.",
    build: () => ({kind: "workflow", name: "approval", title: "Approval", purpose: "Asks a reviewer to approve a request.",
      input: [{name: "title", label: "Title", type: "string", required: true},
        {name: "details", label: "Details", type: "text", required: false}],
      tasks: [{name: "review", title: "Review the request", description: "", roles: [],
        fields: [{name: "approved", label: "Approve", type: "boolean", required: true},
          {name: "comment", label: "Comment", type: "text", required: false}]}],
      chat: false, uploads: false, steps: [], activities: [], approval: {on: false, activity: "", userRoles: [], adminRoles: []}})},
  {id: "workflow", name: "Workflow", desc: "A plain workflow; add its human tasks.",
    build: () => ({kind: "workflow", name: "process", title: "Process", purpose: "",
      input: [{name: "title", label: "Title", type: "string", required: true}],
      tasks: [{name: "check", title: "Check it", description: "", roles: [], fields: [{name: "done", label: "Done", type: "boolean", required: true}]}],
      chat: false, uploads: false, steps: [], activities: [], approval: {on: false, activity: "", userRoles: [], adminRoles: []}})}
];

// A new workflow or agent from a preset, with a name and ID no other one has; tasks go to the admin roles.
export function newWorkflow(state, presetId) {
  const wf = PRESETS.find((p) => p.id === presetId).build();
  const all = workflowsOf(state);
  const taken = all.map((w) => w.name);
  let name = wf.name;
  for (let i = 2; taken.includes(name); i++) name = `${wf.name}${i}`;
  const id = newId("w", all.map((w) => w.id));
  const roles = state.identity.adminRoles.length ? [state.identity.adminRoles[0]] : [];
  return {id, ...wf, name, tasks: wf.tasks.map((t) => ({...t, roles: t.roles.length ? t.roles : roles}))};
}

export function encode(state) {
  const json = JSON.stringify(state);
  return btoa(String.fromCharCode(...new TextEncoder().encode(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Returns {state} for a link or file, or {error} saying why it can't be opened. Versions 3 and 4 are migrated.
export function load(parsed) {
  if (!parsed || typeof parsed !== "object") return {error: "This isn't a builder configuration."};
  if (parsed.version === VERSION) return {state: merge(defaults(), parsed)};
  if (parsed.version === 4 || parsed.version === 3) {
    return {state: migrate(parsed), notice: `This link was made with an older builder (version ${parsed.version}); it was upgraded. Check the identity and architecture steps.`};
  }
  return {error: `This configuration is version ${parsed.version ?? "unknown"}; the builder opens versions 3 to 5. Start from a scenario instead.`};
}

export function decode(hash) {
  try {
    const base64 = hash.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return load(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return {error: "The link is damaged: it doesn't decode as a configuration."};
  }
}

// Versions 3 and 4 kept one package, the roles and the sign-in on `app`/`idp`: move them into identity and one
// integration. Version 3 had no capabilities: infer them from the design.
export function migrate(old) {
  const base = defaults();
  const roles = old.app?.roles ?? base.identity.roles;
  const s = merge(base, {
    version: VERSION,
    scenario: old.scenario ?? "custom",
    app: {name: old.app?.name ?? base.app.name, description: old.app?.description ?? ""},
    identity: {idp: {...base.identity.idp, ...(old.idp ?? {})}, roles, adminRoles: old.app?.adminRoles ?? [], users: usersFor(roles), login: base.identity.login},
    architecture: {integrations: [{...newIntegration([]), org: old.app?.org ?? "myorg", pkg: old.app?.pkg ?? "main_app",
      idPrefix: old.app?.idPrefix ?? "RUN", workflows: (old.workflows ?? []).map((w) => ({greeting: "", ...w}))}]},
    capabilities: old.capabilities, behavior: {...base.behavior, ...(old.behavior ?? {}), tasks: base.behavior.tasks},
    layout: old.layout, header: old.header, bell: old.bell, pages: old.pages, custom: old.custom,
    frontend: old.frontend, db: old.db, assistants: old.assistants, style: old.style, deploy: old.deploy
  });
  const int = s.architecture.integrations[0];
  const oldConn = old.connections ?? {};
  const svc = ["notification", "chat", "attachment"];
  s.connections = {commons: {mode: svc.some((k) => oldConn[k]?.mode === "live") ? "live" : "mock",
    ...Object.fromEntries(svc.map((k) => [k, oldConn[k]?.mode === "live" ? oldConn[k].url ?? "" : ""]))},
    [int.id]: {mode: oldConn.app?.mode ?? "mock", url: oldConn.app?.url ?? "", mgmtUrl: oldConn.workflow?.url ?? ""}};
  if (old.version === 3) {
    const placed = new Set([...old.header ?? [], ...(old.pages ?? []).flatMap((p) => [...p.columns[0], ...p.columns[1]])]);
    const agents = (old.workflows ?? []).filter((w) => w.kind === "agent");
    s.capabilities = {
      chat: agents.some((a) => a.chat) || placed.has("conversation") || placed.has("conversation-list"),
      uploads: agents.some((a) => a.uploads) || ["upload-case", "case-list", "file-viewer"].some((id) => placed.has(id)),
      notifications: placed.has("bell") || placed.has("inbox"),
      tasks: placed.has("task-inbox") || placed.has("task-form") || (old.workflows ?? []).some((w) => w.kind === "workflow" && (w.tasks ?? []).length),
      runs: placed.has("runs")
    };
  }
  s.layout = {...s.layout, auto: false};
  return s;
}

function merge(base, over) {
  if (Array.isArray(base) || typeof base !== "object" || base === null) {
    return over ?? base;
  }
  const out = {...base};
  for (const [key, value] of Object.entries(over ?? {})) {
    out[key] = key in base ? merge(base[key], value) : value;
  }
  return out;
}

// Ballerina identifiers: lowercase letters, digits and underscores, starting with a letter.
export function identifier(text, fallback) {
  const cleaned = String(text ?? "").toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  return /^[a-z]/.test(cleaned) ? cleaned : fallback;
}

// camelCase from free text: "expense claim" -> "expenseClaim"; an existing camelCase name stays as it is.
export function camel(text) {
  const words = String(text).trim().split(/[^A-Za-z0-9]+/).filter(Boolean);
  const out = words.map((w, i) => i === 0 ? w[0].toLowerCase() + w.slice(1) : w[0].toUpperCase() + w.slice(1)).join("");
  return /^[a-z]/.test(out) ? out : out ? "x" + out : "item";
}

export function pascal(text) {
  const c = camel(text);
  return c[0].toUpperCase() + c.slice(1);
}

// ---------------------------------------------------------------- architecture

export const integrationsOf = (state) => state.architecture.integrations;
export const newIntegrations = (state) => integrationsOf(state).filter((i) => i.source === "new");
export const workflowsOf = (state) => integrationsOf(state).flatMap((i) => i.workflows);
export const integrationOf = (state, wfId) => integrationsOf(state).find((i) => i.workflows.some((w) => w.id === wfId));
export const findWorkflow = (state, wfId) => workflowsOf(state).find((w) => w.id === wfId);

// The integration new workflows and agents go to: the first new one.
export function primaryIntegration(state) {
  return newIntegrations(state)[0];
}

// Every human task type, as "<integration id>:<workflow>.<task>".
export function taskTypes(state) {
  return integrationsOf(state).flatMap((int) => int.workflows.filter((w) => w.kind === "workflow")
    .flatMap((w) => (w.tasks ?? []).map((t) => ({ref: `${int.id}:${w.name}.${camel(t.name || "task")}`, integration: int, workflow: w, task: t}))));
}

// The name the management API knows a human task by (its taskName filter): "<workflow>.<task>". Imported
// integrations keep the names in their descriptor; generated ones use the camel-cased names the code declares.
export function qualifiedTaskName(wf, task) {
  return `${wf.fixedName ?? camel(wf.name || wf.title || "flow")}.${task.fixedName ?? camel(task.name || "task")}`;
}

// ---------------------------------------------------------------- components

// The components a page shows, in order: both columns stacked when it has one column.
export function pageComponents(page) {
  return page.layout === "split" ? page.columns : [[...page.columns[0], ...page.columns[1]]];
}

// Built-in, custom and parameterized components, by ID:
//   start:<workflow id>          the start form of a workflow or agent
//   task-inbox@<ref>             the task inbox of one task type (a ref from taskTypes())
export function component(state, id) {
  if (id.startsWith("start:")) {
    const wf = findWorkflow(state, id.slice(6));
    return wf && {id, tag: "workflow-start-form", service: "workflow-start", start: wf.id, name: `Start ${wf.title || wf.name}`,
      summary: wf.kind === "agent" ? `Spawns ${wf.title || wf.name}${wf.chat ? " and opens its chat" : ""}.` : `Starts the ${wf.title || wf.name} workflow.`};
  }
  if (id.startsWith("task-inbox@")) {
    const type = taskTypes(state).find((t) => t.ref === id.slice(11));
    return type && {id, tag: "workflow-task-inbox", service: "workflow", taskType: type.ref, name: `Tasks: ${type.task.title || type.task.name}`,
      summary: `Only "${type.task.title || type.task.name}" tasks from ${type.integration.title}.`};
  }
  return COMPONENTS.find((c) => c.id === id) ?? state.custom.find((c) => c.id === id);
}

// The components each built-in <commons-hub> pane shows.
export const HUB_PANES = {
  inbox: ["inbox"],
  chats: ["conversation-list", "conversation"],
  files: ["case-list", "upload-case", "file-viewer"]
};

// Every component the app uses, anywhere.
export function usedComponents(state) {
  // The hub has no header: its rail badges stand in for the bell.
  const ids = new Set(state.layout.shell === "hub" ? [] : state.header);
  for (const page of state.pages) {
    for (const id of [...page.columns[0], ...page.columns[1]]) ids.add(id);
  }
  if (state.layout.shell === "hub") {
    for (const pane of state.layout.hubPanes) {
      for (const id of HUB_PANES[pane] ?? []) ids.add(id);
    }
  }
  return [...ids].filter((id) => component(state, id));
}

// The shared commons services the ecosystem runs: those the portal shows, those the new integrations' agents
// need, and notifications when the integrations send them on run and task events.
export function enabledServices(state) {
  const ids = new Set(usedComponents(state).map((id) => component(state, id).service).filter(Boolean));
  if (notificationEvents(state).length && newIntegrations(state).length) ids.add("notification");
  for (const int of newIntegrations(state)) {
    for (const wf of int.workflows.filter((w) => w.kind === "agent")) {
      if (wf.chat) ids.add("chat");
      if (wf.uploads) ids.add("attachment");
      for (const a of ACTIVITIES.filter((x) => wf.activities.includes(x.id))) {
        if (a.service !== "app") ids.add(a.service);
      }
    }
  }
  return ["notification", "chat", "attachment"].filter((id) => ids.has(id));
}

// The run and task events the integrations notify people about (only with the notifications capability).
export function notificationEvents(state) {
  if (!state.capabilities?.notifications) return [];
  const events = state.behavior?.notifications?.events ?? {};
  return ["runStarted", "taskAssigned", "runFinished"].filter((e) => events[e]);
}

// The integrations whose management API the portal reads (task inbox, task form, start forms of existing ones).
export function managedIntegrations(state) {
  const used = usedComponents(state);
  const allTasks = used.includes("task-inbox") || used.includes("task-form");
  const typed = new Set(used.filter((id) => id.startsWith("task-inbox@")).map((id) => id.slice(11).split(":")[0]));
  const starts = new Set(used.filter((id) => id.startsWith("start:")).map((id) => integrationOf(state, id.slice(6))).filter((i) => i?.source === "existing").map((i) => i.id));
  return integrationsOf(state).filter((int) => (allTasks && hasTasks(int)) || typed.has(int.id) || starts.has(int.id)
    || (allTasks && int.workflows.some((w) => w.kind === "agent" && w.approval?.on)));
}

const hasTasks = (int) => int.workflows.some((w) => (w.tasks ?? []).length);

export function usesManagementApi(state, int) {
  return managedIntegrations(state).some((i) => !int || i.id === int.id);
}

export function uses(state, id) {
  return usedComponents(state).includes(id);
}

export function newId(prefix, taken) {
  let i = 1;
  while (taken.includes(`${prefix}${i}`)) i++;
  return `${prefix}${i}`;
}
