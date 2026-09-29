import {ACTIVITIES, ASSISTANTS, CAPABILITIES, COMPONENTS, CONNECTIONS, componentSummary, DATABASES, DOCS, docUrl, FRAMEWORKS,
  IDPS, LAYOUTS, SERVICES} from "../catalog.js";
import {wfNames} from "../code.js";
import {compose, diagnostics, setCapability, syncTaskPages} from "../compose.js";
import {fieldName} from "../contracts.js";
import {importDescriptor} from "../descriptor.js";
import {architectureSvg} from "../diagram.js";
import {claimMap, devPassword, seedFile} from "../identity.js";
import {component, enabledServices, integrationOf, integrationsOf, managedIntegrations, newId, newIntegration, newWorkflow, taskTypes,
  workflowsOf} from "../state.js";
import {advanced, checkbox, chips, h, list, radios, section, select, text, toggleIn} from "./dom.js";
import {wiringBoard} from "./mapper.js";
import {change, setView, store} from "./store.js";

// `wide` steps use the full width: the preview panel is hidden while they're open.
export const STEPS = [
  {n: 1, id: "describe", title: "Describe your app", short: "Describe", wide: true},
  {n: 2, id: "architecture", title: "Design the architecture", short: "Architecture"},
  {n: 3, id: "capabilities", title: "Choose capabilities", short: "Capabilities"},
  {n: 4, id: "behavior", title: "Configure behavior", short: "Behavior"},
  {n: 5, id: "portal", title: "Arrange your portal", short: "Portal"},
  {n: 6, id: "identity", title: "Identity and sign-in", short: "Identity", wide: true},
  {n: 7, id: "review", title: "Review and generate", short: "Review"}
];

// The step number of a diagnostic's step ID.
export const stepOf = (id) => STEPS.find((x) => x.id === id)?.n ?? 1;

const s = () => store.state;
const issuesFor = (id) => diagnostics(s()).filter((i) => i.step === id);
const wfAt = (x, id) => workflowsOf(x).find((w) => w.id === id);
const intAt = (x, id) => integrationsOf(x).find((i) => i.id === id);

function issueList(id) {
  const issues = issuesFor(id);
  if (!issues.length) return null;
  return h("ul", {class: "issues", "aria-label": "Things to check in this step"}, issues.map((i) => h("li", {class: i.level},
    h("span", {class: "issue-level"}, i.level === "blocker" ? "Fix before generating" : "Suggestion"), " ", i.text,
    i.fix ? h("button", {type: "button", class: "link", onclick: () => change(() => i.fix(s()), {structural: true, undo: i.fixLabel, message: `${i.fixLabel}: done.`})}, i.fixLabel) : null)));
}

// ---------------------------------------------------------------- 1. describe

export function describeStep() {
  const st = s();
  return [
    section("Your app", null,
      text("Name", () => st.app.name, (x, v) => { x.app.name = v; }, {required: true, error: st.app.name.trim() ? undefined : "Give the app a name."}),
      text("Purpose", () => st.app.description, (x, v) => { x.app.description = v; }, {multiline: true, optional: true,
        hint: "One or two sentences; the prompts use them to explain the app."})),
    section("What should it include?", "Pick the features; each one sets up what it needs. You fine-tune them later, in Capabilities and Behavior.",
      h("div", {class: "features", role: "group", "aria-label": "Features"}, CAPABILITIES.map((cap) => {
        const on = st.capabilities[cap.id];
        return h("label", {class: "feature" + (on ? " on" : "")},
          h("input", {type: "checkbox", checked: on, onchange: (e) => {
            const result = setCapability(st, cap.id, e.target.checked);
            change(() => result.state, {structural: true, undo: `${e.target.checked ? "include" : "leave out"} ${cap.name}`, message: result.message});
          }}),
          h("span", {}, h("strong", {}, cap.feature), h("span", {class: "desc"}, cap.example)));
      }))),
    h("p", {class: "small"}, "Next: what runs behind the portal (Architecture). Who signs in and what each role may do comes after the portal (Identity)."),
    issueList("describe")
  ];
}

// ---------------------------------------------------------------- identity

// The roles the integrations' human tasks and approvals ask for, so the identity step can say which are missing.
function referencedRoles(st) {
  const roles = new Set();
  for (const wf of workflowsOf(st)) {
    (wf.startRoles ?? []).forEach((r) => roles.add(r));
    for (const t of wf.tasks ?? []) t.roles.forEach((r) => roles.add(r));
    if (wf.approval?.on) wf.approval.userRoles.forEach((r) => roles.add(r));
  }
  return [...roles];
}

export function identityStep() {
  const st = s();
  const id = st.identity;
  const idp = IDPS.find((i) => i.id === id.idp.kind);
  const seed = seedFile(st);
  const missing = referencedRoles(st).filter((r) => !id.roles.includes(r));
  return [
    section("Identity provider", "Who signs users in. Every backend (the integrations, their management APIs, the commons services) trusts the same tokens.",
      radios("idp", IDPS.map((i) => ({id: i.id, name: i.name, tag: i.license, desc: i.summary})), id.idp.kind,
        (x, v) => { x.identity.idp = {...x.identity.idp, kind: v, ...IDPS.find((i) => i.id === v).defaults}; }),
      idp.id === "none" ? h("p", {class: "small"}, "Development only: the backends trust x-user-id / x-user-roles headers the portal sends for the signed-in user.") : advanced(`${idp.name} endpoints and client`,
        h("div", {class: "row"},
          text("Issuer", () => id.idp.issuer, (x, v) => { x.identity.idp.issuer = v; }),
          text("JWKS URL", () => id.idp.jwksUrl, (x, v) => { x.identity.idp.jwksUrl = v; })),
        h("div", {class: "row"},
          text("Authorize URL", () => id.idp.authorizeUrl, (x, v) => { x.identity.idp.authorizeUrl = v; }),
          text("Token URL", () => id.idp.tokenUrl, (x, v) => { x.identity.idp.tokenUrl = v; })),
        h("div", {class: "row"},
          text("Client ID", () => id.idp.clientId, (x, v) => { x.identity.idp.clientId = v; }, {hint: "A public client with PKCE; the seed file creates it."}),
          text("Scopes", () => id.idp.scopes, (x, v) => { x.identity.idp.scopes = v; })))),
    section("Users, roles and what they can do", "Connect each user to their roles, and each role to what it may do: start a workflow or agent, complete a human task, approve an agent's action, see everyone's runs. An item with no role is open to everyone (admin: to nobody).",
      ...wiringBoard(st),
      missing.length ? h("p", {class: "warning-note"}, `The integrations use roles that aren't defined here: ${missing.join(", ")}. `,
        h("button", {type: "button", class: "link", onclick: () => change((x) => { x.identity.roles = [...x.identity.roles, ...missing]; }, {structural: true, message: `Added ${missing.join(", ")}.`})}, "Add them")) : null,
      seed ? h("p", {class: "small"}, `The starter's ${seed[0]} creates these users and roles, with development passwords (e.g. ${devPassword(id.users[0] ?? {username: "alex"})}).`) : null),
    section("Login screen", "The first screen of the portal: a username and password form.",
      h("div", {class: "row"},
        text("Title", () => id.login.title, (x, v) => { x.identity.login.title = v; }, {optional: true, placeholder: st.app.name, hint: "Empty uses the app's name."}),
        text("Subtitle", () => id.login.subtitle, (x, v) => { x.identity.login.subtitle = v; }, {optional: true})),
      checkbox("Quick sign-in for demos: one button per initial user", id.login.quick, (x, v) => { x.identity.login.quick = v; },
        {hint: idp.id === "none"
          ? "Each button signs in as that user at once. Development only."
          : `Each button starts the ${idp.name} sign-in with the username filled in (login_hint); the password is still asked.`}),
      idp.id !== "none" ? h("p", {class: "small"}, `With ${idp.name}, the username and password form is ${idp.name}'s own sign-in page (the portal never sees the password).`) : null),
    section("Claims", `Where each backend reads the user and their roles in the access token.${idp.id === "none" ? " They apply once you choose an identity provider." : ""}`,
      h("div", {class: "row"},
        text("User ID claim", () => id.idp.userIdClaim, (x, v) => { x.identity.idp.userIdClaim = v; }),
        text("Roles claim", () => id.idp.rolesClaim, (x, v) => { x.identity.idp.rolesClaim = v; }, {hint: "An array or a comma list; dotted paths for nested claims."})),
      text("Token audience (aud)", () => id.idp.audience, (x, v) => { x.identity.idp.audience = v; }, {optional: true,
        hint: "The workflow management APIs check it; empty uses the client ID."}),
      h("table", {class: "claims"}, h("tbody", {}, claimMap(st).map((c) => h("tr", {}, h("th", {}, c.backend), h("td", {}, h("code", {}, c.settings))))))),
    issueList("identity")
  ];
}

// ---------------------------------------------------------------- architecture

const FIELD_TYPES = [["string", "Text"], ["text", "Long text"], ["number", "Number"], ["integer", "Whole number"],
  ["boolean", "Yes / no"], ["date", "Date"], ["choice", "Choice"]];

// A list of form fields: a start input, or a task's answer or context. Imported fields keep their names.
function fieldsEditor(get, set, what, {emptyHint} = {}) {
  const fields = get(s());
  const update = (i, patch, structural = false) => change((x) => { const next = [...get(x)]; next[i] = {...next[i], ...patch}; set(x, next); }, {structural});
  const names = fields.map(fieldName);
  return h("div", {class: "fields", role: "group", "aria-label": `${what} fields`},
    fields.length ? h("div", {class: "field-row head", "aria-hidden": "true"}, h("span", {}, "Label"), h("span", {}, "Type"), h("span", {}, "Required"), h("span")) : null,
    ...fields.map((f, i) => {
      const labelError = !String(f.label || f.name || "").trim() ? "Needs a label" : names.indexOf(names[i]) !== i ? "Two fields share this name" : "";
      const optionsError = f.type === "choice" && !(f.options ?? []).filter(Boolean).length ? "List the options" : "";
      return h("div", {class: "field-row"},
        h("input", {type: "text", value: f.label, "aria-label": `${what} field ${i + 1} label`, placeholder: "Label", "aria-invalid": labelError ? "true" : undefined,
          title: labelError || (f.imported ? `Field ${f.name} (from the descriptor)` : undefined),
          oninput: (e) => update(i, f.imported ? {label: e.target.value} : {label: e.target.value, name: e.target.value})}),
        h("select", {"aria-label": `${what} field ${i + 1} type`, disabled: f.imported, onchange: (e) => update(i, {type: e.target.value}, true)},
          FIELD_TYPES.map(([v, t]) => h("option", {value: v, selected: f.type === v}, t))),
        h("input", {type: "checkbox", checked: f.required, disabled: f.imported, "aria-label": `${what} field ${i + 1} required`, onchange: (e) => update(i, {required: e.target.checked})}),
        f.imported ? h("span", {class: "tag", title: f.lossy ? "The descriptor types it loosely; it's kept as text." : "From the descriptor"}, f.lossy ? "loose" : "imported")
          : h("button", {type: "button", class: "icon", "aria-label": `Remove ${what} field ${f.label || i + 1}`,
            onclick: () => change((x) => set(x, get(x).filter((_, j) => j !== i)), {structural: true, undo: `remove the field "${f.label || i + 1}"`})}, "✕"),
        f.type === "choice" && !f.imported ? h("input", {type: "text", class: "options", value: (f.options ?? []).join(", "), placeholder: "Options, comma separated",
          "aria-label": `${what} field ${i + 1} options`, "aria-invalid": optionsError ? "true" : undefined,
          oninput: (e) => update(i, {options: list(e.target.value)})}) : null,
        labelError || optionsError ? h("small", {class: "error field-error"}, labelError || optionsError) : null);
    }),
    !fields.length && emptyHint ? h("small", {}, emptyHint) : null,
    fields.some((f) => f.imported) ? null : h("button", {type: "button", class: "link", onclick: () => change((x) => set(x, [...get(x), {name: "", label: "", type: "string", required: false}]), {structural: true})},
      "+ Add a field"));
}

function removeWorkflow(x, wf) {
  const int = integrationOf(x, wf.id);
  int.workflows = int.workflows.filter((w) => w.id !== wf.id);
  const refs = new Set(taskTypes(x).map((t) => t.ref));
  x.behavior.tasks.typePages = x.behavior.tasks.typePages.filter((r) => refs.has(r));
  for (const p of x.pages) p.columns = p.columns.map((col) => col.filter((id) => id !== `start:${wf.id}` && (!id.startsWith("task-inbox@") || refs.has(id.slice(11)))));
  return syncTaskPages(x);
}

function agentEditor(wf) {
  const at = (x) => wfAt(x, wf.id);
  const st = s();
  const existing = wf.imported;
  return h("div", {class: "wf agent"},
    h("div", {class: "wf-head"}, h("span", {class: "kind"}, "Agent"), h("strong", {}, wf.title || wf.name), existing ? h("span", {class: "tag"}, wf.fixedName) : null),
    h("div", {class: "row"},
      text("Name", () => wf.title, (x, v) => { at(x).title = v; }),
      existing ? null : text("Name in chats", () => wf.displayName, (x, v) => { at(x).displayName = v; }, {hint: "Shown beside its messages."})),
    text("What it does", () => wf.purpose, (x, v) => { at(x).purpose = v; }, {multiline: true, optional: existing, hint: existing ? "For the prompts; the code is in the integration." : "Its job, in a sentence; this becomes its role."}),
    wf.chat ? text("Greeting", () => wf.greeting, (x, v) => { at(x).greeting = v; }, {optional: true,
      hint: "Posted in the chat as soon as a user starts it, before the agent's first turn."}) : null,
    h("div", {class: "field"}, h("span", {class: "label"}, "Start form"),
      h("small", {}, existing ? "Its input, from the descriptor." : "What a user fills in to start it. The same fields become its input record."),
      fieldsEditor((x) => at(x).input, (x, v) => { at(x).input = v; }, `${wf.title} start`, {emptyHint: "No fields: the start form is just a button."})),
    existing ? null : advanced("Advanced: process, activities and approval",
      text("Code name", () => wf.name, (x, v) => { at(x).name = v; }, {hint: `Chat identity agent:${wf.name || "name"}; start service /start/${wf.name || "name"}.`}),
      checkbox("Opens a chat (needs AI chat)", wf.chat, (x, v) => { at(x).chat = v; }),
      text("The process, one step per line", () => wf.steps.join("\n"), (x, v) => { at(x).steps = v.split("\n"); },
        {multiline: true, hint: "Events are MESSAGE, FORM_ANSWER, UPLOAD and REMINDER; name the tools each step calls."}),
      h("fieldset", {class: "options"}, h("legend", {}, "Activities (generated code)"), ACTIVITIES.map((a) => h("label", {class: "option"},
        h("input", {type: "checkbox", checked: wf.activities.includes(a.id),
          onchange: (e) => change((x) => { at(x).activities = toggleIn(at(x).activities, a.id, e.target.checked); }, {structural: true})}),
        h("span", {}, a.id, h("span", {class: "tag"}, a.service === "app" ? "app" : SERVICES.find((x) => x.id === a.service).name)),
        h("span", {class: "desc"}, a.summary)))),
      checkbox("A person approves one of its activities before it runs", wf.approval.on, (x, v) => { at(x).approval.on = v; },
        {hint: "An activity approval: the agent proposes an action, a person approves, edits or rejects it. It shows in the task inbox."}),
      wf.approval.on ? h("div", {class: "row"},
        select("Guarded activity", wf.activities.map((a) => [a, a]), wf.approval.activity, (x, v) => { at(x).approval.activity = v; }),
        chips("Approvers", st.identity.roles, wf.approval.userRoles, (x, v, on) => { at(x).approval.userRoles = toggleIn(at(x).approval.userRoles, v, on); })) : null),
    h("button", {type: "button", class: "link danger", onclick: () => change((x) => removeWorkflow(x, wf), {structural: true, undo: `delete the agent ${wf.title}`})}, `Delete ${wf.title}`));
}

function workflowEditor(wf) {
  const at = (x) => wfAt(x, wf.id);
  const st = s();
  const existing = wf.imported;
  return h("div", {class: "wf workflow"},
    h("div", {class: "wf-head"}, h("span", {class: "kind"}, "Workflow"), h("strong", {}, wf.title || wf.name), existing ? h("span", {class: "tag"}, wf.fixedName) : null),
    text("Name", () => wf.title, (x, v) => { at(x).title = v; }),
    text("What it does", () => wf.purpose, (x, v) => { at(x).purpose = v; }, {optional: true}),
    h("div", {class: "field"}, h("span", {class: "label"}, "Request form"),
      h("small", {}, existing ? "Its input, from the descriptor; the portal starts it through the management API." : "What the requester fills in to start it."),
      fieldsEditor((x) => at(x).input, (x, v) => { at(x).input = v; }, `${wf.title} start`)),
    h("div", {class: "field"}, h("span", {class: "label"}, existing ? "Human tasks (from the descriptor)" : "Human tasks, in order"),
      h("small", {}, existing
        ? "The descriptor has each task's answer form but not its roles or title: enter the roles the integration assigns, so the preview and the portal route tasks."
        : "A human task: a person fills in a form and the workflow continues with their answer. The form is generated from the answer fields."),
      ...(wf.tasks ?? []).map((t, j) => {
        const task = (x) => at(x).tasks[j];
        const context = t.context ?? wf.input.map(fieldName);
        return h("div", {class: "task-edit"},
          h("div", {class: "row"},
            text(`Task ${j + 1} title`, () => t.title, (x, v) => { task(x).title = v; if (!task(x).fixedName) task(x).name = v; }, {error: t.title.trim() ? undefined : "Give the task a title."}),
            chips("Reviewers", st.identity.roles, t.roles, (x, v, on) => { task(x).roles = toggleIn(task(x).roles, v, on); })),
          existing ? null : text("Instructions", () => t.description, (x, v) => { task(x).description = v; }, {optional: true, hint: "Shown above the form."}),
          wf.input.length && !existing ? chips("Context the reviewer sees", wf.input.map(fieldName), context, (x, v, on) => { task(x).context = toggleIn(task(x).context ?? at(x).input.map(fieldName), v, on); },
            {labels: Object.fromEntries(wf.input.map((f) => [fieldName(f), f.label || f.name]))}) : null,
          h("div", {class: "field"}, h("span", {class: "label"}, "Answer fields"),
            fieldsEditor((x) => task(x).fields, (x, v) => { task(x).fields = v; }, `Task ${j + 1} answer`),
            existing ? null : h("small", {}, "Required fields are enforced by the workflow; the form also checks numbers and choices.")),
          existing ? null : h("button", {type: "button", class: "link danger", onclick: () => change((x) => { at(x).tasks.splice(j, 1); return syncTaskPages(x); }, {structural: true, undo: `remove the task "${t.title}"`})}, "Remove this task"));
      }),
      existing ? null : h("button", {type: "button", class: "link", onclick: () => change((x) => {
        at(x).tasks.push({name: `task${at(x).tasks.length + 1}`, title: "Check it", description: "", roles: x.identity.adminRoles.slice(0, 1),
          fields: [{name: "approved", label: "Approve", type: "boolean", required: true}]});
      }, {structural: true})}, "+ Add a task")),
    existing ? null : advanced("Advanced",
      text("Code name", () => wf.name, (x, v) => { at(x).name = v; }, {hint: `Start service /start/${wf.name || "name"}; task names ${wfNames(wf).fn}.<task>.`})),
    h("button", {type: "button", class: "link danger", onclick: () => change((x) => removeWorkflow(x, wf), {structural: true, undo: `delete the workflow ${wf.title}`})}, `Delete ${wf.title}`));
}

function integrationCard(int) {
  const at = (x) => intAt(x, int.id);
  const isNew = int.source === "new";
  const add = (preset, name) => h("button", {type: "button", class: "card-option small", onclick: () => change((x) => { at(x).workflows.push(newWorkflow(x, preset)); },
    {structural: true, message: `Added a ${name.toLowerCase()} to ${int.title}.`})}, `+ ${name}`);
  return h("div", {class: "integration " + (isNew ? "new" : "existing")},
    h("div", {class: "int-head"}, h("strong", {}, int.title), h("span", {class: "tag"}, isNew ? "new package" : "existing, imported"),
      h("span", {class: "spacer"}),
      h("button", {type: "button", class: "link danger", disabled: integrationsOf(s()).length === 1, onclick: () => change((x) => {
        x.architecture.integrations = x.architecture.integrations.filter((i) => i.id !== int.id);
        delete x.connections[int.id];
        const refs = new Set(taskTypes(x).map((t) => t.ref));
        x.behavior.tasks.typePages = x.behavior.tasks.typePages.filter((r) => refs.has(r));
        for (const p of x.pages) p.columns = p.columns.map((col) => col.filter((id) => component(x, id)));
        return syncTaskPages(x);
      }, {structural: true, undo: `remove the integration ${int.title}`})}, "Remove")),
    h("div", {class: "row"},
      text("Name", () => int.title, (x, v) => { at(x).title = v; }),
      isNew ? text("Ballerina package", () => int.pkg, (x, v) => { at(x).pkg = v.trim(); }, {hint: `backend/${int.pkg || "name"}; lowercase letters, digits, _.`})
        : h("div", {class: "field"}, h("span", {class: "label"}, "Package"), h("span", {}, `${int.org}/${int.pkg} ${int.version}`),
          h("small", {}, "Imported from its workflow.def.json; its code isn't generated."))),
    isNew ? advanced("Package settings",
      h("div", {class: "row"},
        text("Ballerina org", () => int.org, (x, v) => { at(x).org = v.trim(); }),
        text("Run ID prefix", () => int.idPrefix, (x, v) => { at(x).idPrefix = v; }, {hint: `${(int.idPrefix || "RUN").toUpperCase()} gives ${(int.idPrefix || "RUN").toUpperCase()}-1001…`}))) : null,
    ...int.workflows.map((wf) => wf.kind === "agent" ? agentEditor(wf) : workflowEditor(wf)),
    isNew ? h("div", {class: "chips"}, add("chat-agent", "Chat agent"), add("agent", "Background agent"), add("approval", "Approval workflow"), add("workflow", "Workflow")) : null);
}

const count = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

async function importFile(file) {
  const result = importDescriptor(await file.text(), integrationsOf(s()));
  if (result.error) {
    setView({lastChange: {message: result.error, canUndo: false, at: Date.now()}}, "toast");
    return;
  }
  const int = result.integration;
  change((x) => {
    x.architecture.integrations.push(int);
    x.connections[int.id] = {mode: "mock", url: "", mgmtUrl: ""};
    if (int.workflows.some((w) => (w.tasks ?? []).length) && !x.capabilities.tasks) return setCapability(x, "tasks", true).state;
    return x.layout.auto ? compose(x) : x;
  }, {structural: true, undo: `import ${int.title}`,
    message: `Imported ${int.title}: ${count(int.workflows.filter((w) => w.kind === "workflow").length, "workflow")}, ${count(int.workflows.filter((w) => w.kind === "agent").length, "agent")}. ${result.notes.join(" ")}`});
}

// ---------------------------------------------------------------- connections (in the architecture step)

export const STATUS_TEXT = {mock: "Mock", unset: "Not configured", untested: "Not tested", ok: "Connected", failed: "Failed"};

// Every live URL the design can set: [test key, connection id, field, catalog probe id, label].
export function connectionTargets(st = s()) {
  const out = [];
  for (const int of integrationsOf(st)) {
    if (int.source === "new") out.push([`${int.id}.url`, int.id, "url", "app", `${int.title}: app and start API`]);
    if (managedIntegrations(st).some((i) => i.id === int.id) || int.source === "existing") out.push([`${int.id}.mgmtUrl`, int.id, "mgmtUrl", "workflow", `${int.title}: management API`]);
  }
  for (const id of enabledServices(st)) out.push([`commons.${id}`, "commons", id, id, SERVICES.find((x) => x.id === id).name]);
  return out;
}

export function connectionStatus(key) {
  const [connId, field] = key.split(".");
  const c = s().connections[connId];
  if (!c || c.mode === "mock") return "mock";
  if (!String(c[field] ?? "").trim()) return "unset";
  return store.view.tests[key]?.status ?? "untested";
}

// A read-only probe: says whether the URL answers, needs a token, blocks CORS, or answers something unexpected.
export async function testConnection(key, probeId) {
  const [connId, field] = key.split(".");
  const def = CONNECTIONS.find((c) => c.id === probeId);
  const url = String(s().connections[connId][field]).replace(/\/+$/, "") + def.probe;
  const headers = {"x-user-id": "prompt-builder-test"};
  if (store.view.token) headers.Authorization = `Bearer ${store.view.token}`;
  setView({tests: {...store.view.tests, [key]: {status: "untested", message: "Testing…"}}}, "structure");
  let result;
  try {
    const response = await fetch(url, {headers});
    if (response.status === 401 || response.status === 403) {
      result = {status: "failed", message: `It answered ${response.status}: sign-in needed. Paste a token below (kept only in this tab), or use development identity on the service.`};
    } else if (response.status === 404) {
      result = {status: "failed", message: `${def.probe} wasn't found (404): check the base path, e.g. ${def.placeholder}.`};
    } else if (!response.ok) {
      result = {status: "failed", message: `It answered ${response.status} ${response.statusText}.`};
    } else {
      const body = await response.json().catch(() => undefined);
      result = def.expect(body) ? {status: "ok", message: `Connected: ${def.probe} answered as expected.`}
        : {status: "failed", message: `It answered, but not like the ${def.name} (${def.probe} returned an unexpected shape). Is this the right URL?`};
    }
  } catch {
    result = {status: "failed", message: "No answer: the service isn't reachable from this page, or it blocks this origin (CORS). Check it runs, and add this page's origin to its corsAllowOrigins."};
  }
  setView({tests: {...store.view.tests, [key]: result}}, "structure");
}

function connectionsSection() {
  const st = s();
  const targets = connectionTargets(st);
  const backends = [...new Set(targets.map(([, connId]) => connId))];
  const title = (connId) => connId === "commons" ? "Commons services" : intAt(st, connId)?.title ?? connId;
  return section("Connections for the preview", "Each backend runs on sample data (Mock) or a running service (Live). A live request that fails shows its error; the preview never swaps in sample data.",
    !backends.length ? h("p", {class: "empty-note"}, "This design uses no backends yet.") : null,
    ...backends.map((connId) => {
      const c = st.connections[connId] ?? {mode: "mock"};
      return h("div", {class: "conn"},
        h("div", {class: "conn-head"}, h("strong", {}, title(connId))),
        h("div", {class: "segmented", role: "radiogroup", "aria-label": `${title(connId)} data`},
          ["mock", "live"].map((m) => h("label", {}, h("input", {type: "radio", name: `conn-${connId}`, checked: c.mode === m,
            onchange: () => change((x) => { x.connections[connId] = {...(x.connections[connId] ?? {}), mode: m}; }, {structural: true})}), m === "mock" ? "Mock" : "Live"))),
        c.mode === "live" ? targets.filter(([, id]) => id === connId).map(([key, , field, probeId, label]) => {
          const def = CONNECTIONS.find((d) => d.id === probeId);
          const status = connectionStatus(key);
          const test = store.view.tests[key];
          return h("div", {class: "conn-live"},
            text(label, () => c[field] ?? "", (x, v) => { x.connections[connId][field] = v; }, {placeholder: def.placeholder}),
            h("span", {class: `status ${status}`}, STATUS_TEXT[status]),
            h("button", {type: "button", disabled: !String(c[field] ?? "").trim(), onclick: () => testConnection(key, probeId)}, "Test connection"),
            test?.message ? h("p", {class: status === "ok" ? "ok-note" : status === "failed" ? "error" : "small", role: "status"}, test.message) : null);
        }) : null);
    }),
    Object.values(st.connections).some((c) => c.mode === "live") ? h("div", {class: "conn-session"},
      h("div", {class: "field"}, h("label", {for: "session-token"}, "Access token for live services ", h("span", {class: "optional"}, "(optional, this tab only)")),
        h("input", {id: "session-token", type: "password", value: store.view.token, autocomplete: "off",
          oninput: (e) => setView({token: e.target.value}, "text")}),
        h("small", {}, "Sent as a bearer token by the preview and the connection test. It is never saved, shared or exported.")),
      h("label", {class: "check"}, h("input", {type: "checkbox", checked: store.view.allowLive, onchange: (e) => setView({allowLive: e.target.checked}, "structure")}),
        h("span", {}, "Let the preview change live services (send messages, complete tasks) this session"))) : null,
    mixedNotes(st));
}

// Mixed mock/live designs that can't work, said plainly.
function mixedNotes(st) {
  const commons = st.connections.commons?.mode;
  const notes = [];
  for (const int of integrationsOf(st).filter((i) => st.connections[i.id]?.mode === "live")) {
    if (int.workflows.some((w) => w.kind === "agent" && w.chat) && commons !== "live") {
      notes.push(`${int.title} is live: its chats open in the live chat service, so the mock conversations won't show them. Set the commons services to Live too.`);
    }
    if (int.source === "new" && !st.connections[int.id].url && int.workflows.some((w) => (w.tasks ?? []).length)) {
      notes.push(`${int.title}: tasks come from the live management API, but start forms still create mock runs; set its app URL too.`);
    }
  }
  return notes.length ? h("ul", {class: "issues"}, notes.map((n) => h("li", {class: "warning"}, n))) : null;
}

export function architectureStep() {
  const st = s();
  return [
    section("The ecosystem", "What runs behind the portal. Each new integration is its own Ballerina package with a start service, an app API and (when it has human tasks) a workflow management API; the commons services are shared.",
      h("div", {class: "diagram", html: architectureSvg(st)})),
    section("Integrations", null,
      ...integrationsOf(st).map(integrationCard),
      h("div", {class: "chips"},
        h("button", {type: "button", onclick: () => change((x) => {
          const int = newIntegration(x.architecture.integrations);
          x.architecture.integrations.push(int);
          x.connections[int.id] = {mode: "mock", url: "", mgmtUrl: ""};
        }, {structural: true, message: "Added a new integration package."})}, "+ New integration"),
        h("label", {class: "button"}, "Import an existing integration (workflow.def.json)", h("input", {type: "file", accept: "application/json,.json", class: "visually-hidden",
          onchange: (e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ""; }}))),
      h("p", {class: "small"}, "An existing integration's descriptor is packed in its JAR: ", h("code", {}, "unzip -p target/bin/<app>.jar workflow.def.json"),
        ". The portal reaches it through its management API: tasks, approvals, and starting its workflows.")),
    connectionsSection(),
    issueList("architecture")
  ];
}

// ---------------------------------------------------------------- capabilities

export function capabilitiesStep() {
  const st = s();
  const primary = integrationsOf(st).find((i) => i.source === "new");
  return [
    h("p", {class: "note"}, `Pick what the app does. Each choice adds its components and the services it needs; a capability that needs a workflow or an agent adds one to ${primary ? primary.title : "a new integration"}.`),
    h("div", {class: "cap-grid"}, CAPABILITIES.map((cap) => {
      const on = st.capabilities[cap.id];
      const id = `cap-${cap.id}`;
      return h("div", {class: "cap" + (on ? " on" : "")},
        h("div", {class: "cap-head"},
          h("label", {for: id}, h("strong", {}, cap.name)),
          h("input", {id, type: "checkbox", role: "switch", "aria-checked": String(on), checked: on, "aria-describedby": `${id}-d`,
            onchange: (e) => {
              const result = setCapability(st, cap.id, e.target.checked);
              change(() => result.state, {structural: true, undo: `${e.target.checked ? "turn on" : "turn off"} ${cap.name}`, message: result.message});
            }})),
        h("p", {id: `${id}-d`}, cap.summary),
        h("p", {class: "example"}, "For example: ", cap.example),
        h("div", {class: "adds"}, h("span", {class: "small-label"}, "Adds"), h("ul", {}, cap.adds.map((a) => h("li", {}, a)))),
        cap.requires ? h("p", {class: "small"}, `Needs ${cap.requires.map((r) => CAPABILITIES.find((c) => c.id === r).name).join(", ")}; it's turned on with it.`) : null);
    })),
    issueList("capabilities")
  ];
}

// ---------------------------------------------------------------- behavior

const TYPE_PRESETS = [["", "Any file"], ["image/*", "Images"], ["application/pdf", "PDF"], ["application/pdf,image/*", "Images or PDF"]];
// Accepted types in a fixed order, so "image/*, application/pdf" matches its preset.
const typesKey = (types) => [...types].sort().join(",");

function uploadsEditor() {
  const st = s();
  const slots = st.behavior.uploads.slots;
  const at = (x, i) => x.behavior.uploads.slots[i];
  return [
    h("p", {class: "note"}, "Each slot is a named file the user must (or may) upload. The agent asks for them in the chat with an upload card; the Files page lists every case."),
    ...slots.map((sl, i) => h("div", {class: "slot-edit"},
      text(`Slot ${i + 1} label`, () => sl.label, (x, v) => { at(x, i).label = v; at(x, i).name = v; }, {error: sl.label.trim() ? undefined : "Give the slot a label."}),
      h("div", {class: "row three"},
        select("Accepts", TYPE_PRESETS.some(([v]) => v === typesKey(sl.mimeTypes)) ? TYPE_PRESETS : [...TYPE_PRESETS, [typesKey(sl.mimeTypes), sl.mimeTypes.join(", ")]],
          typesKey(sl.mimeTypes), (x, v) => { at(x, i).mimeTypes = v ? v.split(",") : []; }),
        h("div", {class: "field"}, h("label", {for: `slot-${i}-max`}, "Max files"),
          h("input", {id: `slot-${i}-max`, type: "number", min: 1, max: 20, value: sl.maxFiles, oninput: (e) => change((x) => { at(x, i).maxFiles = Number(e.target.value); })})),
        checkbox("Required", sl.required, (x, v) => { at(x, i).required = v; })),
      h("button", {type: "button", class: "link danger", onclick: () => change((x) => { x.behavior.uploads.slots.splice(i, 1); }, {structural: true, undo: `remove the slot "${sl.label}"`})}, "Remove this slot"))),
    h("button", {type: "button", class: "link", onclick: () => change((x) => { x.behavior.uploads.slots.push({name: "", label: "", mimeTypes: [], maxFiles: 1, required: false}); }, {structural: true})}, "+ Add a slot"),
    h("p", {class: "small"}, "Limits: the attachment service accepts files up to its maxFileBytes (10 MB by default). In the preview, mock uploads stay in this browser tab and are gone after a reload.")
  ];
}

function notificationsEditor() {
  const st = s();
  const n = st.behavior.notifications;
  return [
    select("The bell opens", [["drawer", "The notification inbox in a drawer"], ["page", "A Notifications page"]], st.bell.opens === "drawer" ? "drawer" : "page",
      (x, v) => { x.bell.opens = v === "drawer" ? "drawer" : "notifications"; if (!x.layout.auto && v === "page" && !x.pages.some((p) => p.id === "notifications")) x.pages.push({id: "notifications", title: "Notifications", layout: "single", ratio: 50, collapsible: true, columns: [["inbox"], []]}); }),
    select("Show", [["both", "Personal and role notifications (tabs)"], ["personal", "Personal notifications only"], ["role", "Role notifications only"]], n.scope,
      (x, v) => { x.behavior.notifications.scope = v; }),
    h("fieldset", {class: "options"}, h("legend", {}, "The new integrations notify people when"),
      checkbox("A run starts (the person who started it)", n.events.runStarted, (x, v) => { x.behavior.notifications.events.runStarted = v; }),
      checkbox("A task is assigned (the reviewer roles)", n.events.taskAssigned, (x, v) => { x.behavior.notifications.events.taskAssigned = v; },
        {hint: st.capabilities.tasks ? undefined : "Applies once human tasks are on."}),
      checkbox("A run finishes (the person who started it)", n.events.runFinished, (x, v) => { x.behavior.notifications.events.runFinished = v; })),
    h("p", {class: "small"}, "Clicking a notification opens the run it is about: its conversation, or its tasks. Existing integrations send their own notifications, if any.")
  ];
}

function tasksEditor() {
  const st = s();
  const t = st.behavior.tasks;
  const types = taskTypes(st);
  const sync = (fn) => (x, v) => { fn(x, v); return syncTaskPages(x); };
  return [
    h("p", {class: "note"}, "How people find their work. Each task inbox reads one integration's workflow management API; it shows the tasks and approvals the signed-in user's roles may act on."),
    h("label", {class: "check"}, h("input", {type: "checkbox", checked: t.inbox, onchange: (e) => change((x) => sync((y, v) => { y.behavior.tasks.inbox = v; })(x, e.target.checked), {structural: true})}),
      h("span", {}, "A Tasks page listing every task", h("small", {class: "block"}, `From ${managedIntegrations(st).map((i) => i.title).join(", ") || "each integration with tasks"}; one inbox per integration.`))),
    types.length ? h("fieldset", {class: "options"}, h("legend", {}, "A page for one kind of task"),
      types.map((type) => h("label", {class: "check"}, h("input", {type: "checkbox", checked: t.typePages.includes(type.ref),
        onchange: (e) => change((x) => sync((y, v) => { y.behavior.tasks.typePages = toggleIn(y.behavior.tasks.typePages, type.ref, v); })(x, e.target.checked), {structural: true})}),
        h("span", {}, `${type.task.title || type.task.name}`, h("small", {class: "block"}, `${type.integration.title} · ${type.workflow.title || type.workflow.name} · ${type.task.roles.join(", ") || "anyone"}`))))) :
      h("p", {class: "small"}, "No human tasks yet: add them to a workflow in the Architecture step.")
  ];
}

export function behaviorStep() {
  const st = s();
  const c = st.capabilities;
  const out = [];
  if (!Object.values(c).some(Boolean)) {
    out.push(h("p", {class: "empty-note"}, "Choose capabilities first; their settings appear here. Workflows and agents are edited in the Architecture step."));
  }
  if (c.tasks) out.push(section("Human tasks", null, ...tasksEditor()));
  if (c.uploads) out.push(section("File uploads", null, ...uploadsEditor()));
  if (c.notifications) out.push(section("Notifications", null, ...notificationsEditor()));
  if (c.chat) out.push(section("AI chat", `The chat agents: ${workflowsOf(st).filter((w) => w.kind === "agent" && w.chat).map((w) => w.title).join(", ") || "none yet"}. Their greeting, process and activities are in the Architecture step.`));
  if (c.runs) out.push(section("Run tracking", "My runs lists what the signed-in user started in the new integrations, newest first, with the status the workflow or agent sets."));
  out.push(issueList("behavior"));
  return out;
}

// ---------------------------------------------------------------- portal

const label = (c) => c.name;

function addable() {
  const st = s();
  const groups = [];
  const all = workflowsOf(st);
  if (all.length) groups.push(["Start forms", all.map((w) => component(st, `start:${w.id}`))]);
  groups.push(["Human tasks", [...COMPONENTS.filter((c) => c.service === "workflow"), ...taskTypes(st).map((t) => component(st, `task-inbox@${t.ref}`))]]);
  groups.push(...SERVICES.map((svc) => [svc.name, COMPONENTS.filter((c) => c.service === svc.id && !c.header)]));
  groups.push(["The app's own", COMPONENTS.filter((c) => c.app && !c.header)]);
  if (st.custom.length) groups.push(["Custom", st.custom]);
  return groups;
}

// Editing a page means the layout no longer follows the capabilities.
const customize = (x) => { x.layout.auto = false; };

function columnEditor(pageIndex, colIndex, heading) {
  const page = s().pages[pageIndex];
  const single = page.layout !== "split";
  const ids = single ? [...page.columns[0], ...page.columns[1]] : page.columns[colIndex];
  const write = (x, next) => {
    customize(x);
    const p = x.pages[pageIndex];
    if (single) p.columns = [next, []];
    else p.columns[colIndex] = next;
  };
  const move = (i, d) => change((x) => { const next = [...ids]; [next[i], next[i + d]] = [next[i + d], next[i]]; write(x, next); }, {structural: true});
  return h("div", {class: "col-edit"},
    h("span", {class: "col-head"}, heading),
    h("ol", {}, ids.map((id, i) => {
      const c = component(s(), id);
      return h("li", {}, h("span", {class: "col-name", title: c ? componentSummary(c) : id}, c ? label(c) : `${id} (removed)`),
        h("button", {type: "button", class: "icon", "aria-label": `Move ${c ? label(c) : id} up`, disabled: i === 0, onclick: () => move(i, -1)}, "↑"),
        h("button", {type: "button", class: "icon", "aria-label": `Move ${c ? label(c) : id} down`, disabled: i === ids.length - 1, onclick: () => move(i, 1)}, "↓"),
        h("button", {type: "button", class: "icon", "aria-label": `Remove ${c ? label(c) : id}`,
          onclick: () => change((x) => write(x, ids.filter((_, j) => j !== i)), {structural: true, undo: `remove ${c ? label(c) : id} from ${page.title}`})}, "✕"));
    })),
    h("select", {"aria-label": `Add a component to ${page.title}, ${heading}`, onchange: (e) => {
      const id = e.target.value;
      if (id) change((x) => write(x, [...ids, id]), {structural: true});
    }}, h("option", {value: ""}, "+ Add a component…"),
    addable().map(([group, items]) => h("optgroup", {label: group},
      items.map((c) => h("option", {value: c.id, disabled: ids.includes(c.id)}, label(c)))))));
}

function pageEditor(page, i) {
  const st = s();
  const split = page.layout === "split";
  const ratioId = `ratio-${page.id}`;
  return h("div", {class: "page-edit"},
    h("div", {class: "page-top"},
      h("input", {type: "text", value: page.title, "aria-label": `Title of page ${i + 1}`,
        oninput: (e) => change((x) => { customize(x); x.pages[i].title = e.target.value; })}),
      h("button", {type: "button", class: "icon", "aria-label": `Move ${page.title} up`, disabled: i === 0,
        onclick: () => change((x) => { customize(x); [x.pages[i - 1], x.pages[i]] = [x.pages[i], x.pages[i - 1]]; }, {structural: true})}, "↑"),
      h("button", {type: "button", class: "icon", "aria-label": `Move ${page.title} down`, disabled: i === st.pages.length - 1,
        onclick: () => change((x) => { customize(x); [x.pages[i + 1], x.pages[i]] = [x.pages[i], x.pages[i + 1]]; }, {structural: true})}, "↓"),
      h("button", {type: "button", class: "icon", "aria-label": `Delete ${page.title}`, disabled: st.pages.length === 1,
        onclick: () => change((x) => {
          customize(x);
          x.pages.splice(i, 1);
          if (x.bell.opens === page.id) x.bell.opens = "drawer";
        }, {structural: true, undo: `delete the page ${page.title}`})}, "✕")),
    h("div", {class: "segmented", role: "radiogroup", "aria-label": `${page.title} columns`},
      ["single", "split"].map((v) => h("label", {}, h("input", {type: "radio", name: `layout-${page.id}`, checked: page.layout === v,
        onchange: () => change((x) => { customize(x); x.pages[i].layout = v; }, {structural: true})}), v === "single" ? "One column" : "Two columns"))),
    split ? h("div", {class: "ratio"},
      h("label", {for: ratioId}, "Left ", h("strong", {}, `${page.ratio}%`), " / right ", h("strong", {}, `${100 - page.ratio}%`)),
      h("input", {id: ratioId, type: "range", min: 20, max: 80, step: 5, value: page.ratio,
        oninput: (e) => { const v = Number(e.target.value); const l = e.target.previousElementSibling.querySelectorAll("strong");
          l[0].textContent = `${v}%`; l[1].textContent = `${100 - v}%`; change((x) => { customize(x); x.pages[i].ratio = v; }); }}),
      checkbox("Left column collapses", page.collapsible, (x, v) => { customize(x); x.pages[i].collapsible = v; })) : null,
    split
      ? h("div", {class: "cols", style: `grid-template-columns: ${page.ratio}fr ${100 - page.ratio}fr`}, columnEditor(i, 0, "Left"), columnEditor(i, 1, "Right"))
      : columnEditor(i, 0, "Components"));
}

function quickPage(title, idBase, left, right = []) {
  const ids = [...left, ...right];
  const exists = s().pages.some((p) => ids.every((id) => [...p.columns[0], ...p.columns[1]].includes(id)));
  return h("button", {type: "button", disabled: exists, onclick: () => change((x) => {
    customize(x);
    const id = x.pages.some((p) => p.id === idBase) ? newId(idBase, x.pages.map((p) => p.id)) : idBase;
    x.pages.push({id, title, layout: right.length ? "split" : "single", ratio: 35, collapsible: true, columns: [left, right]});
  }, {structural: true})}, `+ ${title} page`);
}

export function portalStep() {
  const st = s();
  const headerChoices = [...COMPONENTS.filter((c) => c.header), ...st.custom];
  return [
    h("p", {class: "note"}, "The portal opens on the login screen (set up in Identity); these are the pages behind it."),
    section("Navigation", null,
      radios("shell", LAYOUTS.map((l) => ({...l, undo: undefined})), st.layout.shell, (x, v) => { x.layout.shell = v; }),
      st.layout.shell === "sidebar" ? checkbox("The sidebar collapses to a rail", st.layout.collapsible, (x, v) => { x.layout.collapsible = v; }) : null,
      st.layout.shell === "hub" ? chips("Hub panes", ["inbox", "chats", "files"], st.layout.hubPanes, (x, v, on) => { x.layout.hubPanes = toggleIn(x.layout.hubPanes, v, on); },
        {labels: {inbox: "Notifications", chats: "Chats", files: "Files"}}) : null,
      st.layout.shell === "hub" ? h("p", {class: "small"}, "Hub panes only show; they don't turn capabilities on. A pane whose service is off stays empty. ",
        h("a", {href: DOCS.hub, target: "_blank", rel: "noopener"}, "commons-hub docs")) : null,
      st.layout.shell !== "hub" ? chips("In the header", headerChoices.map((c) => c.id), st.header, (x, v, on) => { x.header = toggleIn(x.header, v, on); },
        {labels: Object.fromEntries(headerChoices.map((c) => [c.id, label(c)]))}) : null),
    section("Pages", null,
      h("div", {class: "layout-mode"}, st.layout.auto
        ? h("p", {class: "note"}, h("strong", {}, "Suggested layout. "), "The pages follow your capabilities. Editing a page makes it yours; after that, capability changes add or remove components without rearranging it.")
        : h("p", {class: "note"}, h("strong", {}, "Your layout. "), "Capability changes add or remove their components in place. ",
          h("button", {type: "button", class: "link", onclick: () => change((x) => { x.layout.auto = true; return compose(x); }, {structural: true, undo: "reset the layout to the suggestion", message: "The layout follows your capabilities again."})}, "Use the suggested layout"))),
      ...st.pages.map((p, i) => pageEditor(p, i)),
      h("div", {class: "chips"},
        h("button", {type: "button", onclick: () => change((x) => { customize(x); x.pages.push({id: newId("page", x.pages.map((p) => p.id)), title: "New page", layout: "single", ratio: 40, collapsible: true, columns: [[], []]}); }, {structural: true})}, "+ Blank page"),
        quickPage("Tasks", "tasks", ["task-inbox"], ["task-form"]),
        quickPage("Notifications", "notifications", ["inbox"]),
        quickPage("Chats", "chats", ["conversation-list"], ["conversation"]),
        quickPage("Files", "files", ["case-list"], ["upload-case", "file-viewer"])),
      h("p", {class: "small"}, "Two inboxes: the ", h("strong", {}, "task inbox"), " lists work assigned to the user (human tasks and approvals); the ",
        h("strong", {}, "notification inbox"), " lists messages about what happened. Docs: ",
        [...SERVICES.flatMap((svc) => svc.components.map((c) => [svc, c.tag])), [{id: "workflow"}, "workflow-task-inbox"], [{id: "workflow"}, "workflow-task-form"], [{id: "workflow"}, "workflow-start-form"]]
          .map(([svc, tag], i) => [i ? " · " : "", h("a", {href: docUrl(svc, tag), target: "_blank", rel: "noopener"}, `<${tag}>`)]))),
    section("Custom components", "Anything the portal needs that isn't in the list: describe it and place it on a page; the prompts ask the assistant to build it.",
      ...st.custom.map((c, i) => h("div", {class: "slot-edit"},
        text(`Custom component ${i + 1}`, () => c.name, (x, v) => { x.custom[i].name = v; }),
        text("What it does", () => c.description, (x, v) => { x.custom[i].description = v; }, {multiline: true}),
        checkbox("Needs a backend endpoint", c.api, (x, v) => { x.custom[i].api = v; }),
        h("button", {type: "button", class: "link danger", onclick: () => change((x) => {
          x.custom.splice(i, 1);
          x.header = x.header.filter((id) => id !== c.id);
          for (const p of x.pages) p.columns = p.columns.map((col) => col.filter((id) => id !== c.id));
        }, {structural: true, undo: `delete the custom component ${c.name}`})}, `Delete ${c.name}`))),
      h("button", {type: "button", class: "link", onclick: () => change((x) => {
        const id = newId("custom", x.custom.map((c) => c.id));
        x.custom.push({id, name: "New component", description: "", api: false});
        customize(x);
        x.pages[0].columns[0].push(id);
      }, {structural: true, message: "Added a custom component to Home."})}, "+ Add a custom component")),
    issueList("portal")
  ];
}

// ---------------------------------------------------------------- technical settings (in the review step)

export function technicalSettings() {
  const st = s();
  return advanced("Technical settings: database, stack, assistants, deployment",
    h("div", {class: "row"},
      select("Database", DATABASES.map((d) => [d.id, d.name]), st.db, (x, v) => { x.db = v; }),
      select("Run it with", [["local", "bal run and a Temporal dev server"], ["compose", "Docker Compose"]], st.deploy, (x, v) => { x.deploy = v; })),
    select("Frontend stack of the generated portal", FRAMEWORKS.map((f) => [f.id, f.name]), st.frontend.framework, (x, v) => { x.frontend.framework = v; },
      {hint: FRAMEWORKS.find((f) => f.id === st.frontend.framework).note}),
    h("div", {class: "row"},
      select("Backend assistant", [["claude", ASSISTANTS.claude.name], ["copilot", ASSISTANTS.copilot.name]], st.assistants.backend, (x, v) => { x.assistants.backend = v; }),
      select("Workflow assistant", [["claude", ASSISTANTS.claude.name], ["copilot", ASSISTANTS.copilot.name]], st.assistants.workflow, (x, v) => { x.assistants.workflow = v; })),
    select("Prompts", [["steps", "Step by step, with checks"], ["full", "One prompt per part"]], st.style, (x, v) => { x.style = v; }));
}

export {wfNames};
