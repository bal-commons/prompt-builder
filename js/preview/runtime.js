import {configureAuth, devUser} from "../../vendor/hub-ui.bundle.js";
import "../../vendor/workflow-ui.bundle.js";
import {IDPS} from "../catalog.js";
import {devPassword} from "../identity.js";
import {wfNames} from "../code.js";
import {startInputSchema} from "../contracts.js";
import {component, findWorkflow, integrationOf, integrationsOf, managedIntegrations, newIntegrations, pageComponents, qualifiedTaskName,
  taskTypes} from "../state.js";
import {MOCK_ORIGIN, MOCK_URLS, mockIntegration, MockBackend, mockEventSource, personasOf} from "./mock.js";

// The interactive preview. It renders the portal from the configuration the builder posts, with the real
// bal-commons components, against the mock adapter (mock.js) or the live URLs of the architecture step. It starts
// on the app's login screen, and never mutates a live service unless the builder allows it for the session.

const STORE = "pb-preview-data";
const SELECTION = "pb-preview-selection";
const nativeFetch = window.fetch.bind(window);
const NativeEventSource = window.EventSource;

let config;
let editor = {persona: undefined, page: undefined, allowLive: false, token: ""};
let backend;
const sel = read(SELECTION) ?? {user: undefined, run: undefined, conversation: undefined, task: undefined, caseId: undefined, collapsed: {}};

function read(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is full or blocked: the preview still works, it just won't survive a reload.
  }
}

// ---------------------------------------------------------------- adapters

const trim = (url) => String(url ?? "").trim().replace(/\/+$/, "");

// The shared commons services' base URLs.
const urls = () => {
  const c = config.connections.commons;
  return Object.fromEntries(Object.entries(MOCK_URLS).map(([id, mock]) => [id, c?.mode === "live" && trim(c[id]) ? trim(c[id]) : mock]));
};

// An integration's base URLs: {app, workflow}.
function intUrls(int) {
  const mock = mockIntegration(int.id);
  const c = config.connections[int.id];
  if (c?.mode !== "live") return mock;
  return {app: trim(c.url) || mock.app, workflow: trim(c.mgmtUrl) || mock.workflow};
}

function liveBases() {
  const out = [];
  const commons = config.connections.commons;
  if (commons?.mode === "live") out.push(...Object.keys(MOCK_URLS).map((k) => trim(commons[k])));
  for (const int of integrationsOf(config)) {
    const c = config.connections[int.id];
    if (c?.mode === "live") out.push(trim(c.url), trim(c.mgmtUrl));
  }
  return out.filter(Boolean);
}

const isLive = (url) => liveBases().some((base) => String(url).startsWith(base));

window.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  const method = (init.method ?? (typeof input === "string" ? "GET" : input.method) ?? "GET").toUpperCase();
  if (url.startsWith(MOCK_ORIGIN)) {
    const headers = Object.fromEntries(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
    let body = init.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        // Not JSON; pass it through.
      }
    }
    const result = await backend.handle(method, url, body, headers);
    if (result.body instanceof Blob) return new Response(result.body, {status: result.status});
    return new Response(result.status === 204 || result.body === null ? null : JSON.stringify(result.body),
      {status: result.status, headers: {"content-type": "application/json"}});
  }
  // Live services are read-only here unless the builder allows changes; the stream ticket only opens a stream.
  if (isLive(url) && method !== "GET" && !url.endsWith("/stream-ticket") && !editor.allowLive) {
    const message = "The preview doesn't change live services. Allow it in the Architecture step (Connections).";
    return new Response(JSON.stringify({code: "PREVIEW_READ_ONLY", message, error: {message}}),
      {status: 403, headers: {"content-type": "application/json"}});
  }
  return nativeFetch(input, init);
};

// ---------------------------------------------------------------- rendering

const $ = (sel_) => document.querySelector(sel_);
function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (k === "class") node.className = v;
    else if (k.startsWith(".")) node[k.slice(1)] = v;
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity)) if (c !== null && c !== undefined && c !== false) node.append(c.nodeType ? c : String(c));
  return node;
}

function persona() {
  const people = personasOf(config);
  return people.find((p) => p.id === sel.user) ?? people[0];
}

const isAdmin = () => persona().roles.some((r) => config.identity.adminRoles.includes(r));

function authFor() {
  const p = persona();
  // Mock services and development-mode live services read the x-user-* headers; a session token is sent as a bearer.
  if (editor.token && liveBases().length) {
    const token = editor.token;
    configureAuth({headers: () => ({"x-user-id": p.id, "x-user-roles": p.roles.join(","), Authorization: `Bearer ${token}`})});
  } else {
    configureAuth(devUser(p.id, p.roles));
  }
}

function select(patch) {
  Object.assign(sel, patch);
  write(SELECTION, sel);
  render();
}

function go(pageId, patch = {}) {
  editor.page = pageId;
  parent.postMessage({type: "preview-page", page: pageId}, "*");
  select(patch);
}

// The caller's runs from every new integration, newest first.
async function runsOf() {
  const p = persona();
  const lists = await Promise.all(newIntegrations(config).map(async (int) => {
    const response = await fetch(`${intUrls(int).app}/app/runs`, {headers: {"x-user-id": p.id, "x-user-roles": p.roles.join(","),
      ...(editor.token ? {Authorization: `Bearer ${editor.token}`} : {})}});
    if (!response.ok) throw new Error(`${int.title}: ${response.status} ${(await response.json().catch(() => ({}))).message ?? response.statusText}`);
    return (await response.json()).map((r) => ({...r, intId: int.id}));
  }));
  return lists.flat().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

const placed = (p) => [...p.columns[0], ...p.columns[1]];
const isInbox = (id) => id === "task-inbox" || id.startsWith("task-inbox@");

// Where a run is best seen: the page with its conversation, else the one with a task inbox.
function pageFor(run) {
  const has = (test) => config.pages.find((p) => placed(p).some(test));
  return (run.conversationId && has((id) => id === "conversation")) || has(isInbox) || has((id) => id === "runs") || config.pages[0];
}

function runsList() {
  const box = h("div", {class: "runs", role: "listbox", "aria-label": "My runs"}, h("div", {class: "muted"}, "Loading…"));
  runsOf().then((runs) => {
    box.replaceChildren(h("div", {class: "box-head"}, "My runs", h("span", {class: "count"}, String(runs.length))));
    if (!runs.length) box.append(h("div", {class: "muted"}, "Nothing started yet. Use a start form."));
    for (const r of runs) {
      const wf = integrationsOf(config).find((i) => i.id === r.intId)?.workflows.find((w) => wfNames(w).fn === r.workflow);
      box.append(h("button", {class: "run" + (sel.run === r.id ? " on" : ""), role: "option", "aria-selected": String(sel.run === r.id),
        onclick: () => select({run: r.id, conversation: r.conversationId ?? sel.conversation, runInstance: r.instanceId, runInt: r.intId})},
        h("span", {class: "run-top"}, h("strong", {}, r.title), h("span", {class: "pill " + r.status}, r.status.toLowerCase())),
        h("span", {class: "muted"}, `${r.id} · ${wf ? wfNames(wf).display : r.workflow}${r.sample ? " · sample" : ""}`)));
    }
  }).catch((e) => box.replaceChildren(h("div", {class: "error", role: "alert"}, `Runs: ${e.message}`)));
  return box;
}

// One task inbox: every task of an integration, or (with a task type) only that type's tasks.
function taskInbox(int, type, heading) {
  const onRunsPage = config.pages.some((p) => p.id === editor.page && placed(p).includes("runs"));
  return h("div", {class: "card"}, heading ? h("div", {class: "box-head"}, heading) : null,
    h("workflow-task-inbox", {"base-url": intUrls(int).workflow, "poll-seconds": "5", ".selected": sel.task?.taskId,
      "task-name": type ? qualifiedTaskName(type.workflow, type.task) : undefined,
      "instance-id": sel.run && onRunsPage && sel.runInt === int.id ? sel.runInstance : undefined,
      "onworkflow-task-select": (e) => select({task: {taskId: e.detail.task.taskId, kind: e.detail.task.kind, intId: int.id}})}));
}

function element(id) {
  const c = component(config, id);
  const u = urls();
  const me = persona().id;
  const admin = isAdmin();
  if (!c) return h("div", {class: "missing"}, `${id} (removed)`);
  if (c.start) {
    const wf = findWorkflow(config, c.start);
    const int = integrationOf(config, wf.id);
    const existing = int.source !== "new";
    const need = wf.startRoles ?? [];
    if (need.length && !need.some((r) => persona().roles.includes(r))) {
      return h("div", {class: "card empty"}, `${c.name}: only ${need.join(" or ")} can start it.`);
    }
    return h("div", {class: "card"}, h("workflow-start-form", {heading: c.name,
      action: existing ? `${intUrls(int).workflow}/workflows` : `${intUrls(int).app}/start/${wfNames(wf).path}`,
      "workflow-type": existing ? wf.fixedName ?? wf.name : undefined,
      ".schema": startInputSchema(wf.input), "submit-label": wf.kind === "agent" ? "Start" : "Submit",
      "onworkflow-started": (e) => {
        const r = e.detail.response;
        if (existing) return parent.postMessage({type: "preview-note", text: `Started ${wf.title || wf.name} in ${int.title} (${r.workflowId}).`}, "*");
        const target = r.conversationId ? pageFor({conversationId: r.conversationId}) : config.pages.find((p) => p.id === editor.page);
        go(target?.id ?? editor.page, {run: r.runId, conversation: r.conversationId ?? sel.conversation, runInstance: r.instanceId, runInt: int.id});
      }}));
  }
  if (c.taskType) {
    const type = taskTypes(config).find((t) => t.ref === c.taskType);
    return taskInbox(type.integration, type);
  }
  switch (id) {
    case "runs": return h("div", {class: "card"}, runsList());
    case "conversation":
      // With mock chat, open the persona's latest conversation until the user picks one.
      if (!sel.conversation && config.connections.chat?.mode !== "live") {
        sel.conversation = backend.db.conversations.find((cv) => cv.participants.some((pt) => pt.participantId === me))?.id;
      }
      return sel.conversation
        ? h("commons-conversation", {class: "chat", "base-url": u.chat, "conversation-id": sel.conversation, ".me": me,
            "attachments-url": config.capabilities.uploads ? u.attachment : undefined})
        : h("div", {class: "card empty"}, "No conversation selected. Start the agent, or pick a run or a conversation.");
    case "conversation-list":
      return h("div", {class: "card"}, h("commons-conversation-list", {"base-url": u.chat, ".me": me, searchable: true, ".selected": sel.conversation,
        "oncommons-conversation-select": (e) => select({conversation: e.detail.conversation.id})}));
    case "inbox":
      return h("div", {class: "card"}, h("commons-inbox", {"base-url": u.notification, "show-filters": true,
        "oncommons-notification-click": (e) => follow(e.detail.notification)}));
    case "task-inbox": {
      const ints = managedIntegrations(config);
      if (!ints.length) return h("div", {class: "card empty"}, "No integration has human tasks yet. Add them in the Architecture step.");
      return ints.map((int) => taskInbox(int, undefined, ints.length > 1 ? int.title : undefined));
    }
    case "task-form": {
      const int = sel.task && integrationsOf(config).find((i) => i.id === sel.task.intId);
      return int
        ? h("div", {class: "card"}, h("workflow-task-form", {"base-url": intUrls(int).workflow, kind: sel.task.kind, "task-id": sel.task.taskId}))
        : h("div", {class: "card empty"}, "Choose a task in the task inbox.");
    }
    case "case-list":
      return h("div", {class: "card"}, h("commons-case-list", {"base-url": u.attachment, ".me": me, admin, ".selected": sel.caseId,
        "oncommons-case-select": (e) => select({caseId: e.detail.case.id})}));
    case "upload-case":
      return sel.caseId ? h("div", {class: "card"}, h("commons-upload-case", {"base-url": u.attachment, "case-id": sel.caseId, ".me": me}))
        : h("div", {class: "card empty"}, "Choose a case to upload to.");
    case "file-viewer":
      return sel.caseId ? h("div", {class: "card"}, h("commons-file-viewer", {"base-url": u.attachment, "case-id": sel.caseId, ".me": me, "can-delete": admin}))
        : h("div", {class: "card empty"}, "Choose a case to see its files.");
    case "bell":
      return h("commons-notification-bell", {"base-url": u.notification, "oncommons-bell-click": openInbox});
    case "user-menu":
      return h("div", {class: "who"}, h("span", {}, `${persona().name} · ${persona().roles.join(", ") || "no role"}`),
        h("button", {class: "link", onclick: signOut}, "Sign out"));
  }
  return h("div", {class: "card custom"}, h("strong", {}, c.name), h("p", {class: "muted"}, c.description || "A custom component."),
    h("span", {class: "tag"}, "Custom: your assistant builds this"));
}

// A notification opens the run it is about: its conversation, or its tasks.
function follow(n) {
  if (!n.correlationId) return;
  runsOf().then((runs) => {
    const run = runs.find((r) => r.id === n.correlationId);
    if (!run) return;
    closeDrawer();
    go(pageFor(run).id, {run: run.id, conversation: run.conversationId ?? sel.conversation, runInstance: run.instanceId});
  }).catch(() => undefined);
}

function signIn(id) {
  sel.user = id;
  parent.postMessage({type: "preview-persona", persona: id}, "*");
  select({run: undefined, conversation: undefined, task: undefined, caseId: undefined});
}

function signOut() {
  select({user: undefined, run: undefined, conversation: undefined, task: undefined, caseId: undefined});
}

// The app's login screen: a username and password form, checked against the initial users' development passwords,
// and optionally one quick sign-in button per user. With an identity provider this stands in for its sign-in page.
function login() {
  const idp = IDPS.find((i) => i.id === config.identity.idp.kind);
  const people = personasOf(config);
  const users = config.identity.users;
  const error = h("p", {class: "error", role: "alert", hidden: true});
  const submit = (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const user = users.find((u) => u.username === String(data.get("username")).trim());
    if (!user || data.get("password") !== devPassword(user)) {
      error.textContent = "Wrong username or password.";
      error.hidden = false;
      return;
    }
    signIn(user.username);
  };
  return h("div", {class: "login"}, h("div", {class: "login-card"},
    h("h1", {}, config.identity.login.title || config.app.name),
    config.identity.login.subtitle ? h("p", {class: "muted"}, config.identity.login.subtitle) : null,
    idp.id !== "none" ? h("p", {class: "small muted"}, `${idp.name} sign-in (simulated in the preview)`) : null,
    h("form", {class: "login-form", "aria-label": "Sign in", onsubmit: submit},
      h("label", {}, "Username", h("input", {name: "username", autocomplete: "username", required: true})),
      h("label", {}, "Password", h("input", {name: "password", type: "password", autocomplete: "current-password", required: true})),
      error,
      h("button", {type: "submit", class: "login-idp"}, "Sign in")),
    config.identity.login.quick ? [h("p", {class: "small muted"}, "Quick sign-in (demo)"),
      people.map((p) => h("button", {type: "button", class: "login-user", onclick: () => signIn(p.id)},
        h("strong", {}, p.name), h("span", {class: "muted"}, p.roles.join(", ") || "no role")))] : null,
    h("p", {class: "small muted"}, `Preview passwords: <username>-change-me (e.g. ${devPassword(users[0] ?? {username: "alex"})}).`)));
}

function openInbox() {
  const target = config.pages.find((p) => p.id === config.bell.opens);
  if (target) return go(target.id);
  const drawer = $("#drawer");
  drawer.replaceChildren(h("div", {class: "drawer-head"}, h("strong", {}, "Notifications"),
    h("button", {class: "icon", "aria-label": "Close notifications", onclick: closeDrawer}, "✕")),
  h("commons-inbox", {"base-url": urls().notification, "show-filters": true, "oncommons-notification-click": (e) => follow(e.detail.notification)}));
  drawer.hidden = false;
  drawer.querySelector("button").focus();
}

function closeDrawer() {
  const drawer = $("#drawer");
  if (drawer) drawer.hidden = true;
}

function pageBody(page) {
  const cols = pageComponents(page);
  if (!cols.flat().length) {
    return h("div", {class: "card empty"}, h("strong", {}, `${page.title} is empty.`), h("br"),
      "Choose capabilities (step 2) and the builder lays the page out, or add components in step 4.");
  }
  if (cols.length === 1) return h("div", {class: "cols one"}, h("div", {class: "col"}, cols[0].map(element)));
  const collapsed = page.collapsible && sel.collapsed?.[page.id];
  return h("div", {class: "cols", style: `grid-template-columns: ${collapsed ? "40px" : `${page.ratio}fr`} ${collapsed ? "1fr" : `${100 - page.ratio}fr`}`},
    h("div", {class: "col" + (collapsed ? " collapsed" : "")},
      page.collapsible ? h("button", {class: "icon collapse", "aria-label": collapsed ? "Expand the left column" : "Collapse the left column",
        "aria-expanded": String(!collapsed), onclick: () => select({collapsed: {...sel.collapsed, [page.id]: !collapsed}})}, collapsed ? "›" : "‹") : null,
      collapsed ? null : cols[0].map(element)),
    h("div", {class: "col"}, cols[1].map(element)));
}

function render() {
  if (!config) return;
  if (!sel.user || !personasOf(config).some((p) => p.id === sel.user)) {
    $("#app").replaceChildren(login());
    return;
  }
  authFor();
  const pages = config.pages;
  const page = pages.find((p) => p.id === editor.page) ?? pages[0];
  editor.page = page.id;
  const shell = config.layout.shell;
  const root = $("#app");
  const header = config.header.filter((id) => component(config, id));
  if (shell === "hub") {
    const u = urls();
    const panes = config.layout.hubPanes;
    const hub = h("commons-hub", {"notifications-url": panes.includes("inbox") ? u.notification : undefined,
      "chat-url": panes.includes("chats") ? u.chat : undefined, "attachments-url": panes.includes("files") ? u.attachment : undefined,
      panes: panes.join(" "), ".me": persona().id, admin: isAdmin()},
    h("div", {slot: "brand", class: "brand"}, config.app.name), h("div", {slot: "nav-end"}, element("user-menu")),
    pages.map((p) => h("section", {pane: p.id, label: p.title, class: "pane"}, pageBody(p))));
    root.replaceChildren(hub);
    return;
  }
  const nav = pages.map((p) => h("button", {class: "nav-item", "aria-current": p.id === page.id ? "page" : "false", onclick: () => go(p.id)}, p.title));
  const railCollapsed = shell === "sidebar" && config.layout.collapsible && sel.collapsed?.__rail;
  root.replaceChildren(h("div", {class: `shell ${shell}${railCollapsed ? " rail-collapsed" : ""}`},
    shell === "sidebar" ? h("nav", {class: "side", "aria-label": "Pages"}, h("div", {class: "brand"}, railCollapsed ? config.app.name.slice(0, 1) : config.app.name),
      railCollapsed ? pages.map((p) => h("button", {class: "nav-item", title: p.title, "aria-label": p.title, "aria-current": p.id === page.id ? "page" : "false", onclick: () => go(p.id)}, p.title.slice(0, 1)))
        : nav,
      config.layout.collapsible ? h("button", {class: "nav-item collapse-rail", "aria-label": railCollapsed ? "Expand the sidebar" : "Collapse the sidebar",
        onclick: () => select({collapsed: {...sel.collapsed, __rail: !railCollapsed}})}, railCollapsed ? "»" : "« Collapse") : null) : null,
    h("div", {class: "main"},
      h("header", {class: "top"}, shell === "top" ? [h("div", {class: "brand"}, config.app.name), h("nav", {class: "links", "aria-label": "Pages"}, nav)]
        : h("h1", {}, page.title), h("div", {class: "header-end"}, header.map(element))),
      h("main", {"aria-label": page.title}, pageBody(page))),
    h("aside", {id: "drawer", class: "drawer", hidden: true, "aria-label": "Notifications"})));
}

// ---------------------------------------------------------------- start

window.addEventListener("message", (e) => {
  const msg = e.data ?? {};
  if (msg.type === "config") {
    config = msg.config;
    // The builder's "View as" signs in as that user.
    if (msg.editor?.persona && msg.editor.persona !== editor.persona) sel.user = msg.editor.persona;
    editor = {...editor, ...msg.editor};
    if (!backend) {
      const saved = read(STORE);
      backend = new MockBackend(config, saved && saved.appName === config.app.name ? saved : undefined);
      backend.save = () => write(STORE, {...backend.snapshot(), appName: config.app.name});
      window.EventSource = mockEventSource(backend, NativeEventSource);
    } else {
      backend.configure(config);
    }
    backend.latency = msg.editor?.latency ?? 0;
    render();
  }
  if (msg.type === "reset") {
    sessionStorage.removeItem(STORE);
    sessionStorage.removeItem(SELECTION);
    Object.assign(sel, {user: undefined, run: undefined, conversation: undefined, task: undefined, caseId: undefined, collapsed: {}});
    backend = new MockBackend(config);
    backend.save = () => write(STORE, {...backend.snapshot(), appName: config.app.name});
    window.EventSource = mockEventSource(backend, NativeEventSource);
    render();
  }
  if (msg.type === "simulate" && backend) {
    if (msg.what === "fail-next") backend.failNext = true;
    if (msg.what === "latency") backend.latency = msg.value;
    if (msg.what === "other-reviewer") {
      const t = backend.db.tasks.find((x) => x.taskId === sel.task?.taskId && x.status === "PENDING");
      if (t) Object.assign(t, {status: "COMPLETED", completedBy: "another reviewer", completedAt: new Date().toISOString(), completedAs: "audience"});
      parent.postMessage({type: "preview-note", text: t ? "Another reviewer completed the selected task; try submitting it." : "Select a pending task first."}, "*");
    }
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
});
parent.postMessage({type: "preview-ready"}, "*");
