import {ACTIVITIES, ASSISTANTS, CAPABILITIES, COMPONENTS, CONNECTIONS, componentSummary, DATABASES, DOCS, docUrl, FRAMEWORKS,
  IDPS, LAYOUTS, SCENARIOS, SERVICES} from "../catalog.js";
import {wfNames} from "../code.js";
import {applyScenario, compose, diagnostics, setCapability} from "../compose.js";
import {fieldName} from "../contracts.js";
import {component, enabledServices, newId, newWorkflow, usedComponents, usesManagementApi} from "../state.js";
import {advanced, checkbox, chips, h, list, radios, section, select, text, toggleIn} from "./dom.js";
import {change, setView, store} from "./store.js";

export const STEPS = [
  {n: 1, title: "Describe your demo", short: "Describe"},
  {n: 2, title: "Choose capabilities", short: "Capabilities"},
  {n: 3, title: "Configure behavior", short: "Behavior"},
  {n: 4, title: "Arrange your portal", short: "Portal"},
  {n: 5, title: "Connect services", short: "Services"},
  {n: 6, title: "Review and generate", short: "Review"}
];

const s = () => store.state;
const issuesFor = (n) => diagnostics(s()).filter((i) => i.step === n);

function issueList(n) {
  const issues = issuesFor(n);
  if (!issues.length) return null;
  return h("ul", {class: "issues", "aria-label": "Things to check in this step"}, issues.map((i) => h("li", {class: i.level},
    h("span", {class: "issue-level"}, i.level === "blocker" ? "Fix before generating" : "Suggestion"), " ", i.text,
    i.fix ? h("button", {type: "button", class: "link", onclick: () => change(() => i.fix(s()), {structural: true, undo: i.fixLabel, message: `${i.fixLabel}: done.`})}, i.fixLabel) : null)));
}

// ---------------------------------------------------------------- 1. describe

export function describeStep() {
  const st = s();
  const blank = !st.workflows.length && !Object.values(st.capabilities).some(Boolean);
  return [
    section("Start from a scenario", "A scenario picks capabilities and fills in examples you can change later.",
      h("div", {class: "cards", role: "radiogroup", "aria-label": "Scenario"}, SCENARIOS.map((sc) => h("button", {
        type: "button", class: "card-option" + (st.scenario === sc.id ? " current" : ""), role: "radio", "aria-checked": String(st.scenario === sc.id),
        onclick: () => {
          if (st.scenario === sc.id && !blank) return;
          change(() => applyScenario(st, sc.id), {structural: true, undo: `start from ${sc.name}`,
            message: `Started from ${sc.name}: ${sc.capabilities.length ? sc.capabilities.map((c) => CAPABILITIES.find((x) => x.id === c).name).join(", ") : "no capabilities yet"}.`});
        }}, h("strong", {}, sc.name), h("span", {class: "desc"}, sc.desc))))),
    section("Your demo", null,
      text("Name", () => st.app.name, (x, v) => { x.app.name = v; }, {required: true, error: st.app.name.trim() ? undefined : "Give the demo a name."}),
      text("Purpose", () => st.app.description, (x, v) => { x.app.description = v; }, {multiline: true, optional: true,
        hint: "One or two sentences; the prompts use them to explain the app."}),
      text("User roles", () => st.app.roles.join(", "), (x, v) => { x.app.roles = list(v); x.app.adminRoles = x.app.adminRoles.filter((r) => x.app.roles.includes(r)); },
        {hint: "Comma separated, e.g. Employee, Reviewer. Each becomes a preview persona.", error: st.app.roles.length ? undefined : "Add at least one role."}),
      chips("Who sees everyone's runs (admins)", st.app.roles, st.app.adminRoles, (x, v, on) => { x.app.adminRoles = toggleIn(x.app.adminRoles, v, on); })),
    issueList(1)
  ];
}

// ---------------------------------------------------------------- 2. capabilities

export function capabilitiesStep() {
  const st = s();
  return [
    h("p", {class: "note"}, "Pick what the demo does. Each choice adds its components and the services it needs; nothing else is switched on."),
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
    issueList(2)
  ];
}

// ---------------------------------------------------------------- 3. behavior

const FIELD_TYPES = [["string", "Text"], ["text", "Long text"], ["number", "Number"], ["integer", "Whole number"],
  ["boolean", "Yes / no"], ["date", "Date"], ["choice", "Choice"]];

// A list of form fields: a start input, or a task's answer or context.
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
          title: labelError || undefined, oninput: (e) => update(i, {label: e.target.value, name: e.target.value})}),
        h("select", {"aria-label": `${what} field ${i + 1} type`, onchange: (e) => update(i, {type: e.target.value}, true)},
          FIELD_TYPES.map(([v, t]) => h("option", {value: v, selected: f.type === v}, t))),
        h("input", {type: "checkbox", checked: f.required, "aria-label": `${what} field ${i + 1} required`, onchange: (e) => update(i, {required: e.target.checked})}),
        h("button", {type: "button", class: "icon", "aria-label": `Remove ${what} field ${f.label || i + 1}`,
          onclick: () => change((x) => set(x, get(x).filter((_, j) => j !== i)), {structural: true, undo: `remove the field "${f.label || i + 1}"`})}, "✕"),
        f.type === "choice" ? h("input", {type: "text", class: "options", value: (f.options ?? []).join(", "), placeholder: "Options, comma separated",
          "aria-label": `${what} field ${i + 1} options`, "aria-invalid": optionsError ? "true" : undefined,
          oninput: (e) => update(i, {options: list(e.target.value)})}) : null,
        labelError || optionsError ? h("small", {class: "error field-error"}, labelError || optionsError) : null);
    }),
    !fields.length && emptyHint ? h("small", {}, emptyHint) : null,
    h("button", {type: "button", class: "link", onclick: () => change((x) => set(x, [...get(x), {name: "", label: "", type: "string", required: false}]), {structural: true})},
      "+ Add a field"));
}

function agentEditor(wf) {
  const at = (x) => x.workflows.find((w) => w.id === wf.id);
  const st = s();
  return h("div", {class: "wf agent"},
    h("div", {class: "wf-head"}, h("span", {class: "kind"}, "Agent"), h("strong", {}, wf.title || wf.name)),
    h("div", {class: "row"},
      text("Name", () => wf.title, (x, v) => { at(x).title = v; }),
      text("Name in chats", () => wf.displayName, (x, v) => { at(x).displayName = v; }, {hint: "Shown beside its messages."})),
    text("What it does", () => wf.purpose, (x, v) => { at(x).purpose = v; }, {multiline: true, hint: "Its job, in a sentence; this becomes its role."}),
    wf.chat ? text("Greeting", () => wf.greeting, (x, v) => { at(x).greeting = v; }, {optional: true,
      hint: "Posted in the chat as soon as a user starts it, before the agent's first turn."}) : null,
    h("div", {class: "field"}, h("span", {class: "label"}, "Start form"),
      h("small", {}, "What a user fills in to start it. The same fields become its input record."),
      fieldsEditor((x) => at(x).input, (x, v) => { at(x).input = v; }, `${wf.title} start`, {emptyHint: "No fields: the start form is just a button."})),
    advanced("Advanced: process, activities and approval",
      text("Code name", () => wf.name, (x, v) => { at(x).name = v; }, {hint: `Chat identity agent:${wf.name || "name"}; start service /start/${wf.name || "name"}.`}),
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
        chips("Approvers", st.app.roles, wf.approval.userRoles, (x, v, on) => { at(x).approval.userRoles = toggleIn(at(x).approval.userRoles, v, on); })) : null,
      h("button", {type: "button", class: "link danger", onclick: () => change((x) => {
        x.workflows = x.workflows.filter((w) => w.id !== wf.id);
        for (const p of x.pages) p.columns = p.columns.map((col) => col.filter((id) => id !== `start:${wf.id}`));
      }, {structural: true, undo: `delete the agent ${wf.title}`})}, `Delete ${wf.title}`)));
}

function workflowEditor(wf) {
  const at = (x) => x.workflows.find((w) => w.id === wf.id);
  const st = s();
  return h("div", {class: "wf workflow"},
    h("div", {class: "wf-head"}, h("span", {class: "kind"}, "Workflow"), h("strong", {}, wf.title || wf.name)),
    text("Name", () => wf.title, (x, v) => { at(x).title = v; }),
    text("What it does", () => wf.purpose, (x, v) => { at(x).purpose = v; }, {optional: true}),
    h("div", {class: "field"}, h("span", {class: "label"}, "Request form"),
      h("small", {}, "What the requester fills in to start it."),
      fieldsEditor((x) => at(x).input, (x, v) => { at(x).input = v; }, `${wf.title} start`)),
    h("div", {class: "field"}, h("span", {class: "label"}, "Human tasks, in order"),
      h("small", {}, "A human task: a person fills in a form and the workflow continues with their answer. The form is generated from the answer fields."),
      ...(wf.tasks ?? []).map((t, j) => {
        const task = (x) => at(x).tasks[j];
        const context = t.context ?? wf.input.map(fieldName);
        return h("div", {class: "task-edit"},
          h("div", {class: "row"},
            text(`Task ${j + 1} title`, () => t.title, (x, v) => { task(x).title = v; task(x).name = task(x).fixedName ?? v; }, {error: t.title.trim() ? undefined : "Give the task a title."}),
            chips("Reviewers", st.app.roles, t.roles, (x, v, on) => { task(x).roles = toggleIn(task(x).roles, v, on); })),
          text("Instructions", () => t.description, (x, v) => { task(x).description = v; }, {optional: true, hint: "Shown above the form."}),
          wf.input.length ? chips("Context the reviewer sees", wf.input.map(fieldName), context, (x, v, on) => { task(x).context = toggleIn(task(x).context ?? at(x).input.map(fieldName), v, on); },
            {labels: Object.fromEntries(wf.input.map((f) => [fieldName(f), f.label || f.name]))}) : null,
          h("div", {class: "field"}, h("span", {class: "label"}, "Answer fields"),
            fieldsEditor((x) => task(x).fields, (x, v) => { task(x).fields = v; }, `Task ${j + 1} answer`),
            h("small", {}, "Required fields are enforced by the workflow; the form also checks numbers and choices.")),
          h("p", {class: "small"}, "Actions: Complete (sends the answer) or Can't do this (fails the task with a reason)."),
          h("button", {type: "button", class: "link danger", onclick: () => change((x) => { at(x).tasks.splice(j, 1); }, {structural: true, undo: `remove the task "${t.title}"`})}, "Remove this task"));
      }),
      h("button", {type: "button", class: "link", onclick: () => change((x) => {
        at(x).tasks.push({name: `task${at(x).tasks.length + 1}`, title: "Check it", description: "", roles: x.app.adminRoles.slice(0, 1),
          fields: [{name: "approved", label: "Approve", type: "boolean", required: true}]});
      }, {structural: true})}, "+ Add a task")),
    advanced("Advanced",
      text("Code name", () => wf.name, (x, v) => { at(x).name = v; }, {hint: `Start service /start/${wf.name || "name"}.`}),
      h("button", {type: "button", class: "link danger", onclick: () => change((x) => {
        x.workflows = x.workflows.filter((w) => w.id !== wf.id);
        for (const p of x.pages) p.columns = p.columns.map((col) => col.filter((id) => id !== `start:${wf.id}`));
      }, {structural: true, undo: `delete the workflow ${wf.title}`})}, `Delete ${wf.title}`)));
}

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
    h("p", {class: "small"}, "Limits: the attachment service accepts files up to its maxFileBytes (10 MB by default). In the preview, mock uploads stay in this browser tab and are gone after a reload; a live attachment service stores them in its database or on disk.")
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
    h("fieldset", {class: "options"}, h("legend", {}, "Notify people when"),
      checkbox("A run starts (the person who started it)", n.events.runStarted, (x, v) => { x.behavior.notifications.events.runStarted = v; }),
      checkbox("A task is assigned (the reviewer roles)", n.events.taskAssigned, (x, v) => { x.behavior.notifications.events.taskAssigned = v; },
        {hint: st.capabilities.tasks ? undefined : "Applies once human tasks are on."}),
      checkbox("A run finishes (the person who started it)", n.events.runFinished, (x, v) => { x.behavior.notifications.events.runFinished = v; })),
    h("p", {class: "small"}, "Clicking a notification opens the run it is about: its conversation, or its tasks.")
  ];
}

export function behaviorStep() {
  const st = s();
  const c = st.capabilities;
  const agents = st.workflows.filter((w) => w.kind === "agent");
  const flows = st.workflows.filter((w) => w.kind === "workflow");
  const out = [];
  if (!Object.values(c).some(Boolean) && !st.workflows.length) {
    out.push(h("p", {class: "empty-note"}, "Choose capabilities in step 2 first; their settings appear here."));
  }
  if (c.chat || agents.length) out.push(section("AI chat", c.chat ? "The agent that owns each conversation." : "Agents (chat is off, so they don't open a chat).", ...agents.map(agentEditor)));
  if (c.uploads) out.push(section("File uploads", null, ...uploadsEditor()));
  if (c.notifications) out.push(section("Notifications", null, ...notificationsEditor()));
  if (c.tasks || flows.length) out.push(section("Human tasks", "The workflows people take part in through the task inbox.", ...flows.map(workflowEditor)));
  if (c.runs) out.push(section("Run tracking", "My runs lists what the signed-in user started, newest first, with the status the workflow or agent sets."));
  out.push(advanced("Add another workflow or agent",
    h("div", {class: "cards"}, [["chat-agent", "Chat agent"], ["agent", "Background agent"], ["approval", "Approval workflow"], ["workflow", "Workflow"]].map(([id, name]) =>
      h("button", {type: "button", class: "card-option", onclick: () => change((x) => { x.workflows.push(newWorkflow(x, id)); }, {structural: true, message: `Added a ${name.toLowerCase()}.`})}, `+ ${name}`)))));
  out.push(issueList(3));
  return out;
}

// ---------------------------------------------------------------- 4. portal

const label = (c) => c.name;

function addable() {
  const st = s();
  const groups = [];
  if (st.workflows.length) groups.push(["Start forms", st.workflows.map((w) => component(st, `start:${w.id}`))]);
  groups.push(["Human tasks", COMPONENTS.filter((c) => c.service === "workflow")]);
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
    issueList(4)
  ];
}

// ---------------------------------------------------------------- 5. services

export const STATUS_TEXT = {mock: "Mock", unset: "Not configured", untested: "Not tested", ok: "Connected", failed: "Failed"};

export function connectionStatus(id) {
  const c = s().connections[id];
  if (c.mode === "mock") return "mock";
  if (!c.url.trim()) return "unset";
  return store.view.tests[id]?.status ?? "untested";
}

// Which connections this design uses.
export function neededConnections(st = s()) {
  const services = enabledServices(st);
  return CONNECTIONS.filter((c) => c.id === "app" ? st.workflows.length || usedComponents(st).includes("runs")
    : c.id === "workflow" ? usesManagementApi(st) : services.includes(c.id));
}

// A read-only probe: says whether the URL answers, needs a token, blocks CORS, or answers something unexpected.
export async function testConnection(id) {
  const def = CONNECTIONS.find((c) => c.id === id);
  const url = s().connections[id].url.replace(/\/+$/, "") + def.probe;
  const headers = {"x-user-id": "prompt-builder-test"};
  if (store.view.token) headers.Authorization = `Bearer ${store.view.token}`;
  setView({tests: {...store.view.tests, [id]: {status: "untested", message: "Testing…"}}}, "structure");
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
  setView({tests: {...store.view.tests, [id]: result}}, "structure");
}

export function servicesStep() {
  const st = s();
  const needed = neededConnections(st);
  const idp = IDPS.find((i) => i.id === st.idp.kind);
  return [
    section("Data for the preview", "Each service the design uses can run on sample data (Mock) or a running service (Live). A live request that fails shows its error; the preview never swaps in sample data.",
      !needed.length ? h("p", {class: "empty-note"}, "This design uses no services yet.") : null,
      ...needed.map((def) => {
        const c = st.connections[def.id];
        const status = connectionStatus(def.id);
        const test = store.view.tests[def.id];
        return h("div", {class: "conn"},
          h("div", {class: "conn-head"}, h("strong", {}, def.name), h("span", {class: `status ${status}`}, STATUS_TEXT[status])),
          h("small", {}, `Used by: ${def.uses}.`),
          h("div", {class: "segmented", role: "radiogroup", "aria-label": `${def.name} data`},
            ["mock", "live"].map((m) => h("label", {}, h("input", {type: "radio", name: `conn-${def.id}`, checked: c.mode === m,
              onchange: () => change((x) => { x.connections[def.id].mode = m; }, {structural: true})}), m === "mock" ? "Mock" : "Live"))),
          c.mode === "live" ? h("div", {class: "conn-live"},
            text("URL", () => c.url, (x, v) => { x.connections[def.id].url = v; }, {placeholder: def.placeholder, error: c.url.trim() ? undefined : "Enter the service's base URL."}),
            h("button", {type: "button", disabled: !c.url.trim(), onclick: () => testConnection(def.id)}, "Test connection"),
            test?.message ? h("p", {class: status === "ok" ? "ok-note" : status === "failed" ? "error" : "small", role: "status"}, test.message) : null) : null);
      }),
      needed.some((d) => st.connections[d.id].mode === "live") ? h("div", {class: "conn-session"},
        h("div", {class: "field"}, h("label", {for: "session-token"}, "Access token for live services ", h("span", {class: "optional"}, "(optional, this tab only)")),
          h("input", {id: "session-token", type: "password", value: store.view.token, autocomplete: "off",
            oninput: (e) => setView({token: e.target.value}, "text")}),
          h("small", {}, "Sent as a bearer token by the preview and the connection test. It is never saved, shared or exported.")),
        h("label", {class: "check"}, h("input", {type: "checkbox", checked: store.view.allowLive, onchange: (e) => setView({allowLive: e.target.checked}, "structure")}),
          h("span", {}, "Let the preview change live services (send messages, complete tasks) this session"))) : null,
      mixedNotes(st)),
    section("Sign-in", "How users sign in to the generated portal.",
      radios("idp", IDPS.map((i) => ({id: i.id, name: i.name, tag: i.license, desc: i.summary})), st.idp.kind,
        (x, v) => { x.idp = {...x.idp, kind: v, ...IDPS.find((i) => i.id === v).defaults}; }),
      idp.id === "none" ? h("p", {class: "small"}, "Development only: the services trust x-user-* headers, like the preview's personas.") : advanced(`${idp.name} settings`,
        h("div", {class: "row"},
          text("Issuer", () => st.idp.issuer, (x, v) => { x.idp.issuer = v; }),
          text("JWKS URL", () => st.idp.jwksUrl, (x, v) => { x.idp.jwksUrl = v; })),
        h("div", {class: "row"},
          text("Authorize URL", () => st.idp.authorizeUrl, (x, v) => { x.idp.authorizeUrl = v; }),
          text("Token URL", () => st.idp.tokenUrl, (x, v) => { x.idp.tokenUrl = v; })),
        h("div", {class: "row"},
          text("Client ID", () => st.idp.clientId, (x, v) => { x.idp.clientId = v; }),
          text("Scopes", () => st.idp.scopes, (x, v) => { x.idp.scopes = v; })),
        h("div", {class: "row"},
          text("User ID claim", () => st.idp.userIdClaim, (x, v) => { x.idp.userIdClaim = v; }),
          text("Roles claim", () => st.idp.rolesClaim, (x, v) => { x.idp.rolesClaim = v; }, {hint: "An array or a comma list; dotted paths for nested claims."})),
        usesManagementApi(st) ? text("Token audience (aud)", () => st.idp.audience, (x, v) => { x.idp.audience = v; }, {optional: true, hint: "The management API checks it; empty uses the client ID."}) : null)),
    advanced("Technical settings: packages, database, stack, assistants, deployment",
      h("div", {class: "row"},
        text("Ballerina org", () => st.app.org, (x, v) => { x.app.org = v; }),
        text("Package name", () => st.app.pkg, (x, v) => { x.app.pkg = v; })),
      h("div", {class: "row"},
        text("Run ID prefix", () => st.app.idPrefix, (x, v) => { x.app.idPrefix = v; }, {hint: "RUN gives RUN-1001, RUN-1002…"}),
        select("Database", DATABASES.map((d) => [d.id, d.name]), st.db, (x, v) => { x.db = v; })),
      select("Frontend stack of the generated portal", FRAMEWORKS.map((f) => [f.id, f.name]), st.frontend.framework, (x, v) => { x.frontend.framework = v; },
        {hint: FRAMEWORKS.find((f) => f.id === st.frontend.framework).note}),
      h("div", {class: "row"},
        select("Backend assistant", [["claude", ASSISTANTS.claude.name], ["copilot", ASSISTANTS.copilot.name]], st.assistants.backend, (x, v) => { x.assistants.backend = v; }),
        select("Workflow assistant", [["claude", ASSISTANTS.claude.name], ["copilot", ASSISTANTS.copilot.name]], st.assistants.workflow, (x, v) => { x.assistants.workflow = v; })),
      h("div", {class: "row"},
        select("Prompts", [["steps", "Step by step, with checks"], ["full", "One prompt per part"]], st.style, (x, v) => { x.style = v; }),
        select("Run it with", [["local", "bal run and a Temporal dev server"], ["compose", "Docker Compose"]], st.deploy, (x, v) => { x.deploy = v; }))),
    issueList(5)
  ];
}

// Mixed mock/live designs that can't work, said plainly.
function mixedNotes(st) {
  const mode = (id) => st.connections[id]?.mode;
  const notes = [];
  if (mode("app") === "live" && st.workflows.some((w) => w.kind === "agent" && w.chat) && mode("chat") === "mock") {
    notes.push("A live start service opens its chats in the live chat service, so the mock conversations won't show them. Set Chat to Live too.");
  }
  if (mode("workflow") === "live" && mode("app") === "mock" && st.workflows.some((w) => w.kind === "workflow")) {
    notes.push("Tasks come from the live workflow app, but start forms create mock runs: a run started in the preview won't appear in the live task inbox.");
  }
  if (mode("attachment") === "mock" && mode("app") === "live" && st.capabilities.uploads) {
    notes.push("Supported: live workflows with mock uploads. Upload cards the live agent creates refer to live cases, which the mock attachment service doesn't have.");
  }
  return notes.length ? h("ul", {class: "issues"}, notes.map((n) => h("li", {class: "warning"}, n))) : null;
}

export {wfNames};
