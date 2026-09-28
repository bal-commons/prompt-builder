import {ACTIVITIES, COMPONENTS, IDPS} from "./catalog.js";

// The builder's whole state; the page encodes it in the URL hash so a link reproduces the selection.
// A page has `columns: [left, right]`; a single-column page shows both lists stacked, so switching loses nothing.
export function defaults() {
  return {
    version: 3,
    app: {name: "My app", description: "", idPrefix: "RUN", roles: ["User", "Admin"], adminRoles: ["Admin"],
      org: "myorg", pkg: "my_app"},
    layout: {shell: "sidebar", collapsible: true, hubPanes: ["inbox", "chats", "files"]},
    header: ["user-menu"],
    bell: {opens: "drawer"},
    pages: [{id: "home", title: "Home", layout: "single", ratio: 40, collapsible: true, columns: [[], []]}],
    custom: [],
    workflows: [],
    frontend: {framework: "plain"},
    db: "h2",
    idp: {kind: "none", ...IDPS.find((i) => i.id === "thunder").defaults, clientId: "app-portal", audience: ""},
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
      input: [{name: "topic", label: "What do you need?", type: "text", required: true}],
      steps: ["When the run starts: greet the user in the chat and ask what you need to know.",
        "When a MESSAGE arrives: answer it, and askForm when you need structured details.",
        "When the work is done: updateStatus to DONE, tell the user, and closeConversation."],
      activities: ["sendMessage", "askForm", "closeConversation", "updateStatus"],
      approval: {on: false, activity: "updateStatus", userRoles: [], adminRoles: []}, tasks: []})},
  {id: "agent", name: "Agent", desc: "A durable agent with no chat: it acts through notifications, uploads and status.",
    build: () => ({kind: "agent", name: "worker", title: "Worker", displayName: "Worker", chat: false, uploads: false,
      purpose: "Works one run in the background and reports back.",
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

// A new workflow or agent from a preset, with a name no other one has; tasks go to the app's admin roles.
export function newWorkflow(state, presetId) {
  const wf = PRESETS.find((p) => p.id === presetId).build();
  const taken = state.workflows.map((w) => w.name);
  let name = wf.name;
  for (let i = 2; taken.includes(name); i++) name = `${wf.name}${i}`;
  const id = newId("w", state.workflows.map((w) => w.id));
  const roles = state.app.adminRoles.length ? [state.app.adminRoles[0]] : [];
  return {id, ...wf, name, tasks: wf.tasks.map((t) => ({...t, roles: t.roles.length ? t.roles : roles}))};
}

export function encode(state) {
  const json = JSON.stringify(state);
  return btoa(String.fromCharCode(...new TextEncoder().encode(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Links from before this model (version < 3) open a blank app.
export function decode(hash) {
  try {
    const base64 = hash.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed.version === 3 ? merge(defaults(), parsed) : undefined;
  } catch {
    return undefined;
  }
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

// The components a page shows, in order: both columns stacked when it has one column.
export function pageComponents(page) {
  return page.layout === "split" ? page.columns : [[...page.columns[0], ...page.columns[1]]];
}

// Built-in, custom and start-form components, by ID. A start form's ID is "start:<workflow id>".
export function component(state, id) {
  if (id.startsWith("start:")) {
    const wf = state.workflows.find((w) => w.id === id.slice(6));
    return wf && {id, tag: "workflow-start-form", service: "workflow-start", start: wf.id, name: `Start ${wf.title || wf.name}`,
      summary: wf.kind === "agent" ? `Spawns ${wf.title || wf.name}${wf.chat ? " and opens its chat" : ""}.` : `Starts the ${wf.title || wf.name} workflow.`};
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

// The commons services the backend runs: those the UI uses, and those the agents need.
export function enabledServices(state) {
  const ids = new Set(usedComponents(state).map((id) => component(state, id).service).filter(Boolean));
  for (const wf of state.workflows.filter((w) => w.kind === "agent")) {
    if (wf.chat) ids.add("chat");
    if (wf.uploads) ids.add("attachment");
    for (const a of ACTIVITIES.filter((x) => wf.activities.includes(x.id))) {
      if (a.service !== "app") ids.add(a.service);
    }
  }
  return ["notification", "chat", "attachment"].filter((id) => ids.has(id));
}

// The workflow management API is on when a page shows tasks.
export function usesManagementApi(state) {
  return usedComponents(state).some((id) => component(state, id)?.service === "workflow");
}

export function uses(state, id) {
  return usedComponents(state).includes(id);
}

export function newId(prefix, taken) {
  let i = 1;
  while (taken.includes(`${prefix}${i}`)) i++;
  return `${prefix}${i}`;
}
