import {ACTIVITIES, ASSISTANTS, COMPONENTS, componentSummary, DATABASES, DOCS, docUrl, FRAMEWORKS, IDPS, LAYOUTS,
  SERVICES} from "./catalog.js";
import {files} from "./code.js";
import {prompts} from "./prompts.js";
import {component, decode, defaults, encode, HUB_PANES, newId, newWorkflow, PRESETS, usedComponents, usesManagementApi}
  from "./state.js";
import {screens, svg} from "./wireframe.js";
import {zip} from "./zip.js";

let state = decode(location.hash.slice(1)) ?? defaults();
const view = {tab: "wireframe", screen: 0, part: 0, file: 0};

// ---------------------------------------------------------------- tiny DOM helpers

function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (["value", "checked", "selected", "disabled", "open"].includes(key) || (key in node && typeof value !== "string")) node[key] = value;
    else node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child !== null && child !== undefined && child !== false) node.append(child.nodeType ? child : String(child));
  }
  return node;
}

const $ = (id) => document.getElementById(id);

function toast(text) {
  const node = $("toast");
  node.textContent = text;
  node.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { node.hidden = true; }, 2200);
}

async function copy(text, what) {
  try {
    await navigator.clipboard.writeText(text);
    toast(`Copied ${what}`);
  } catch {
    toast("Copy failed: select the text and copy it");
  }
}

function save(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = h("a", {href: url, download: name});
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ---------------------------------------------------------------- state changes

let pending;
// Text edits only refresh the output; structural edits (toggles, choices) also redraw the form.
function change(mutate, structural = false) {
  mutate(state);
  history.replaceState(null, "", "#" + encode(state));
  if (structural) renderForm();
  clearTimeout(pending);
  pending = setTimeout(renderOutput, structural ? 0 : 150);
}

const text = (label, get, set, {hint, multiline, placeholder} = {}) => h("label", {class: "field"},
  h("span", {}, label),
  multiline
    ? h("textarea", {value: get(), placeholder, rows: 3, oninput: (e) => change((s) => set(s, e.target.value))})
    : h("input", {type: "text", value: get(), placeholder, oninput: (e) => change((s) => set(s, e.target.value))}),
  hint ? h("small", {}, hint) : null);

const list = (value) => value.split(",").map((v) => v.trim()).filter(Boolean);

function radios(name, options, current, set) {
  return h("div", {class: "options", role: "radiogroup"}, options.map((o) => h("label", {class: "option"},
    h("input", {type: "radio", name, value: o.id, checked: o.id === current, onchange: () => change((s) => set(s, o.id), true)}),
    h("span", {}, o.name, o.tag ? h("span", {class: "tag"}, o.tag) : null),
    o.desc ? h("span", {class: "desc"}, o.desc) : h("span"))));
}

function chips(values, selected, toggle, disabled = () => false) {
  return h("div", {class: "chips"}, values.map((v) => h("label", {class: "chip"},
    h("input", {type: "checkbox", checked: selected.includes(v), disabled: disabled(v),
      onchange: (e) => change((s) => toggle(s, v, e.target.checked), true)}), v)));
}

const toggleIn = (arr, value, on) => on ? [...new Set([...arr, value])] : arr.filter((x) => x !== value);

// ---------------------------------------------------------------- form

function step(n, title, note, ...body) {
  const id = `step-${n}`;
  const open = renderForm.open?.[id] ?? (n === 1 || n === 3 || n === 4);
  return h("details", {class: "step", open, ontoggle: (e) => { (renderForm.open ??= {})[id] = e.target.open; }},
    h("summary", {}, h("span", {class: "num"}, n), title, note ? h("span", {class: "summary-note"}, note) : null),
    h("div", {class: "step-body"}, ...body));
}

const label = (c) => c.name;

// Components that can go on a page, grouped for the "Add" menu.
function addable() {
  const groups = [];
  if (state.workflows.length) {
    groups.push(["Start forms", state.workflows.map((w) => component(state, `start:${w.id}`))]);
  }
  groups.push(["Workflow tasks", COMPONENTS.filter((c) => c.service === "workflow")]);
  groups.push(...SERVICES.map((svc) => [svc.name, COMPONENTS.filter((c) => c.service === svc.id && !c.header)]));
  groups.push(["The app's own", COMPONENTS.filter((c) => c.app && !c.header)]);
  if (state.custom.length) groups.push(["Custom", state.custom]);
  return groups;
}

function columnEditor(pageIndex, colIndex, heading) {
  const page = state.pages[pageIndex];
  const single = page.layout !== "split";
  const ids = single ? [...page.columns[0], ...page.columns[1]] : page.columns[colIndex];
  const write = (x, next) => {
    const p = x.pages[pageIndex];
    if (single) p.columns = [next, []];
    else p.columns[colIndex] = next;
  };
  const move = (i, d) => change((x) => { const next = [...ids]; [next[i], next[i + d]] = [next[i + d], next[i]]; write(x, next); }, true);
  return h("div", {class: "col-edit"},
    h("span", {class: "col-head"}, heading),
    h("ol", {}, ids.map((id, i) => {
      const c = component(state, id);
      return h("li", {}, h("span", {class: "col-name", title: c ? componentSummary(c) : id}, c ? label(c) : `${id} (removed)`),
        h("button", {type: "button", class: "icon", "aria-label": "Move up", disabled: i === 0, onclick: () => move(i, -1)}, "↑"),
        h("button", {type: "button", class: "icon", "aria-label": "Move down", disabled: i === ids.length - 1, onclick: () => move(i, 1)}, "↓"),
        h("button", {type: "button", class: "icon", "aria-label": `Remove ${c ? label(c) : id}`,
          onclick: () => change((x) => write(x, ids.filter((_, j) => j !== i)), true)}, "✕"));
    })),
    h("select", {"aria-label": `Add a component to ${page.title}, ${heading}`, onchange: (e) => {
      const id = e.target.value;
      if (id) change((x) => write(x, [...ids, id]), true);
    }}, h("option", {value: ""}, "+ Add a component…"),
    addable().map(([group, list]) => h("optgroup", {label: group},
      list.map((c) => h("option", {value: c.id, disabled: ids.includes(c.id)}, label(c)))))));
}

function pageEditor(page, i) {
  const s = state;
  const split = page.layout === "split";
  return h("div", {class: "page-edit"},
    h("div", {class: "page-top"},
      h("input", {type: "text", value: page.title, "aria-label": `Title of page ${i + 1}`,
        oninput: (e) => change((x) => { x.pages[i].title = e.target.value; })}),
      h("button", {type: "button", class: "icon", "aria-label": "Move page up", disabled: i === 0,
        onclick: () => change((x) => { [x.pages[i - 1], x.pages[i]] = [x.pages[i], x.pages[i - 1]]; }, true)}, "↑"),
      h("button", {type: "button", class: "icon", "aria-label": "Move page down", disabled: i === s.pages.length - 1,
        onclick: () => change((x) => { [x.pages[i + 1], x.pages[i]] = [x.pages[i], x.pages[i + 1]]; }, true)}, "↓"),
      h("button", {type: "button", class: "icon", "aria-label": `Delete ${page.title}`, disabled: s.pages.length === 1,
        onclick: () => change((x) => {
          x.pages.splice(i, 1);
          if (x.bell.opens === page.id) x.bell.opens = "drawer";
        }, true)}, "✕")),
    h("div", {class: "segmented", role: "radiogroup", "aria-label": "Columns"},
      ["single", "split"].map((v) => h("label", {}, h("input", {type: "radio", name: `layout-${page.id}`, checked: page.layout === v,
        onchange: () => change((x) => { x.pages[i].layout = v; }, true)}), v === "single" ? "One column" : "Two columns"))),
    split ? h("div", {class: "ratio"},
      h("label", {}, "Left ", h("strong", {}, `${page.ratio}%`), " / right ", h("strong", {}, `${100 - page.ratio}%`),
        h("input", {type: "range", min: 20, max: 80, step: 5, value: page.ratio, "aria-label": "Left column width",
          oninput: (e) => { const v = Number(e.target.value); e.target.previousElementSibling.previousElementSibling.textContent = `${v}%`;
            e.target.previousElementSibling.textContent = `${100 - v}%`; change((x) => { x.pages[i].ratio = v; }); }})),
      h("label", {class: "chip"}, h("input", {type: "checkbox", checked: page.collapsible,
        onchange: (e) => change((x) => { x.pages[i].collapsible = e.target.checked; }, true)}), "Left column collapses")) : null,
    split
      ? h("div", {class: "cols", style: `grid-template-columns: ${page.ratio}fr ${100 - page.ratio}fr`},
        columnEditor(i, 0, "Left"), columnEditor(i, 1, "Right"))
      : columnEditor(i, 0, "Components"));
}

function addPage(x, title, idBase, left, right = [], layout = right.length ? "split" : "single") {
  const id = x.pages.some((p) => p.id === idBase) ? newId(idBase, x.pages.map((p) => p.id)) : idBase;
  x.pages.push({id, title, layout, ratio: 35, collapsible: true, columns: [left, right]});
  return id;
}

function quickPage(title, idBase, left, right = []) {
  const ids = [...left, ...right];
  const exists = state.pages.some((p) => ids.every((id) => [...p.columns[0], ...p.columns[1]].includes(id)));
  return h("button", {type: "button", disabled: exists, onclick: () => change((x) => { addPage(x, title, idBase, left, right); }, true)},
    `+ ${title} page`);
}

// Pages that only repeat a pane the hub already has.
function repeats(s) {
  const panes = {inbox: HUB_PANES.inbox, chats: HUB_PANES.chats, files: ["case-list"]};
  const dup = s.pages.filter((p) => s.layout.hubPanes.some((pane) => panes[pane].every((id) => [...p.columns[0], ...p.columns[1]].includes(id))));
  return dup.length ? [h("p", {class: "warn"}, `The hub already has ${dup.map((p) => p.title).join(", ")}: remove ${dup.length === 1 ? "that page" : "those pages"} or the matching hub pane.`)] : [];
}

const FIELD_TYPES = [["string", "Text"], ["text", "Long text"], ["number", "Number"], ["integer", "Whole number"],
  ["boolean", "Yes / no"], ["date", "Date"], ["choice", "Choice"]];

// Editor for a list of form fields (a start input, or a human task's answer).
function fieldsEditor(get, set, what) {
  const fields = get(state);
  const update = (i, patch, structural = false) => change((x) => { const next = [...get(x)]; next[i] = {...next[i], ...patch}; set(x, next); }, structural);
  return h("div", {class: "fields"},
    fields.length ? h("div", {class: "field-row head", "aria-hidden": "true"}, h("span", {}, "Label"), h("span", {}, "Type"), h("span", {}, "Required"), h("span")) : null,
    ...fields.map((f, i) => h("div", {class: "field-row"},
      h("input", {type: "text", value: f.label, "aria-label": `${what} field ${i + 1} label`, placeholder: "Label",
        oninput: (e) => update(i, {label: e.target.value, name: e.target.value})}),
      h("select", {"aria-label": `${what} field ${i + 1} type`, onchange: (e) => update(i, {type: e.target.value}, true)},
        FIELD_TYPES.map(([v, t]) => h("option", {value: v, selected: f.type === v}, t))),
      h("input", {type: "checkbox", checked: f.required, "aria-label": `${what} field ${i + 1} required`,
        onchange: (e) => update(i, {required: e.target.checked})}),
      h("button", {type: "button", class: "icon", "aria-label": `Remove ${what} field ${f.label || i + 1}`,
        onclick: () => change((x) => set(x, get(x).filter((_, j) => j !== i)), true)}, "✕"),
      f.type === "choice" ? h("input", {type: "text", class: "options", value: (f.options ?? []).join(", "), placeholder: "Options, comma separated",
        "aria-label": `${what} field ${i + 1} options`, oninput: (e) => update(i, {options: list(e.target.value)})}) : null)),
    h("button", {type: "button", class: "link", onclick: () => change((x) => set(x, [...get(x), {name: "", label: "", type: "string", required: false}]), true)},
      `+ Add a field`));
}

// Puts a workflow's start form (and, for a chat agent, its chat; for a workflow, the task inbox) on a page.
function placeWorkflow(x, wf) {
  const start = `start:${wf.id}`;
  if (wf.kind === "agent") {
    const target = x.pages[0];
    if (![...target.columns[0], ...target.columns[1]].includes(start)) {
      if (wf.chat) {
        target.layout = "split";
        target.columns = [[...target.columns[0], start, "runs"], [...target.columns[1], "conversation"]];
      } else {
        target.columns[0] = [...target.columns[0], start, "runs"];
      }
    }
    return;
  }
  x.pages[0].columns[0] = [...new Set([...x.pages[0].columns[0], start, "runs"])];
  if (!x.pages.some((p) => [...p.columns[0], ...p.columns[1]].includes("task-inbox"))) {
    addPage(x, "Tasks", "tasks", ["task-inbox"], ["task-form"]);
  }
}

function workflowEditor(wf, i) {
  const s = state;
  const at = (x) => x.workflows[i];
  const agent = wf.kind === "agent";
  const placed = usedComponents(s).includes(`start:${wf.id}`);
  const nameField = (key, labelText, hint) => text(labelText, () => wf[key], (x, v) => { at(x)[key] = v; }, {hint});
  return h("div", {class: "wf " + wf.kind},
    h("div", {class: "page-top"},
      h("span", {class: "kind"}, agent ? "Agent" : "Workflow"),
      h("input", {type: "text", value: wf.title, "aria-label": `Title of ${agent ? "agent" : "workflow"} ${i + 1}`,
        oninput: (e) => change((x) => { at(x).title = e.target.value; })}),
      h("button", {type: "button", class: "icon", "aria-label": `Delete ${wf.title}`, onclick: () => change((x) => {
        x.workflows.splice(i, 1);
        for (const p of x.pages) p.columns = p.columns.map((col) => col.filter((id) => id !== `start:${wf.id}`));
      }, true)}, "✕")),
    h("div", {class: "row"},
      nameField("name", "Code name", agent ? `Chat identity agent:${wf.name || "name"}; start service /start/${wf.name || "name"}` : `Start service /start/${wf.name || "name"}`),
      agent ? nameField("displayName", "Name in chats") : h("span")),
    text(agent ? "Its job" : "What it does", () => wf.purpose, (x, v) => { at(x).purpose = v; }, {multiline: true}),
    h("div", {class: "field"}, h("span", {}, "Start input (becomes its start form)"),
      fieldsEditor((x) => x.workflows[i].input, (x, v) => { x.workflows[i].input = v; }, "Start")),
    ...(agent ? [
      h("div", {class: "chips"},
        h("label", {class: "chip"}, h("input", {type: "checkbox", checked: wf.chat,
          onchange: (e) => change((x) => { at(x).chat = e.target.checked; }, true)}), "Starting opens a chat; the agent joins it"),
        h("label", {class: "chip"}, h("input", {type: "checkbox", checked: wf.uploads,
          onchange: (e) => change((x) => { at(x).uploads = e.target.checked; }, true)}), "It hears about submitted uploads")),
      text("The process, one step per line", () => wf.steps.join("\n"), (x, v) => { at(x).steps = v.split("\n"); },
        {multiline: true, hint: "Events are MESSAGE, FORM_ANSWER, UPLOAD and REMINDER; name the tools each step calls."}),
      h("div", {class: "field"}, h("span", {}, "Activities (generated code)"),
        h("div", {class: "options"}, ACTIVITIES.map((a) => h("label", {class: "option"},
          h("input", {type: "checkbox", checked: wf.activities.includes(a.id),
            onchange: (e) => change((x) => { at(x).activities = toggleIn(at(x).activities, a.id, e.target.checked); }, true)}),
          h("span", {}, a.id, h("span", {class: "tag"}, a.service === "app" ? "app" : SERVICES.find((x) => x.id === a.service).name)),
          h("span", {class: "desc"}, a.summary))))),
      h("label", {class: "chip"}, h("input", {type: "checkbox", checked: wf.approval.on,
        onchange: (e) => change((x) => { at(x).approval.on = e.target.checked; }, true)}), "A person approves one activity first"),
      ...(!wf.approval.on ? [] : [
        h("label", {class: "field"}, h("span", {}, "Guarded activity"),
          h("select", {onchange: (e) => change((x) => { at(x).approval.activity = e.target.value; })},
            wf.activities.map((a) => h("option", {value: a, selected: a === wf.approval.activity}, a)))),
        h("div", {class: "field"}, h("span", {}, "Approvers"),
          chips(s.app.roles, wf.approval.userRoles, (x, v, on) => { at(x).approval.userRoles = toggleIn(at(x).approval.userRoles, v, on); }))])
    ] : [
      h("div", {class: "field"}, h("span", {}, "Human tasks, in order"),
        ...wf.tasks.map((t, j) => h("div", {class: "task-edit"},
          h("div", {class: "page-top"},
            h("input", {type: "text", value: t.title, "aria-label": `Task ${j + 1} title`, placeholder: "What the person does",
              oninput: (e) => change((x) => { const task = at(x).tasks[j]; task.title = e.target.value; if (!task.fixedName) task.name = e.target.value; })}),
            h("button", {type: "button", class: "icon", "aria-label": `Remove task ${t.title || j + 1}`,
              onclick: () => change((x) => { at(x).tasks.splice(j, 1); }, true)}, "✕")),
          h("div", {class: "field"}, h("span", {}, "Who"),
            chips(s.app.roles, t.roles, (x, v, on) => { at(x).tasks[j].roles = toggleIn(at(x).tasks[j].roles, v, on); })),
          h("div", {class: "field"}, h("span", {}, "The form"),
            fieldsEditor((x) => x.workflows[i].tasks[j].fields, (x, v) => { x.workflows[i].tasks[j].fields = v; }, `Task ${j + 1}`)))),
        h("button", {type: "button", class: "link", onclick: () => change((x) => {
          at(x).tasks.push({name: `task${at(x).tasks.length + 1}`, title: "", description: "", roles: x.app.adminRoles.slice(0, 1),
            fields: [{name: "approved", label: "Approve", type: "boolean", required: true}]});
        }, true)}, "+ Add a task"))
    ]),
    h("div", {class: "chips"},
      placed ? h("span", {class: "note"}, "Its start form is on a page.") : h("button", {type: "button", onclick: () => change((x) => placeWorkflow(x, at(x)), true)},
        agent ? (wf.chat ? "Put its start form, runs and chat on the first page" : "Put its start form and runs on the first page")
          : "Put its start form on the first page and add a Tasks page")));
}

function renderForm() {
  const s = state;
  const form = $("form");
  const scroll = scrollY;
  const headerChoices = [...COMPONENTS.filter((c) => c.header), ...s.custom];
  form.replaceChildren(
    step(1, "The app", s.app.name,
      text("Name", () => s.app.name, (x, v) => { x.app.name = v; }),
      text("What it does", () => s.app.description, (x, v) => { x.app.description = v; }, {multiline: true}),
      text("Roles", () => s.app.roles.join(", "), (x, v) => { x.app.roles = list(v); },
        {hint: "Comma separated; they must match the identity provider's roles or groups."}),
      h("div", {class: "field"}, h("span", {}, "Who sees everyone's runs"),
        chips(s.app.roles, s.app.adminRoles, (x, v, on) => { x.app.adminRoles = toggleIn(x.app.adminRoles, v, on); })),
      h("div", {class: "row"},
        text("Ballerina org", () => s.app.org, (x, v) => { x.app.org = v; }),
        text("Package name", () => s.app.pkg, (x, v) => { x.app.pkg = v; })),
      h("div", {class: "row"},
        text("Run ID prefix", () => s.app.idPrefix, (x, v) => { x.app.idPrefix = v; }, {hint: "RUN gives RUN-1001, RUN-1002…"}),
        h("label", {class: "field"}, h("span", {}, "Database"),
          h("select", {onchange: (e) => change((x) => { x.db = e.target.value; }, true)},
            DATABASES.map((d) => h("option", {value: d.id, selected: d.id === s.db}, d.name)))))),

    step(2, "Layout", LAYOUTS.find((l) => l.id === s.layout.shell).name,
      radios("shell", LAYOUTS, s.layout.shell, (x, v) => { x.layout.shell = v; }),
      s.layout.shell === "sidebar" ? h("label", {class: "chip"}, h("input", {type: "checkbox", checked: s.layout.collapsible,
        onchange: (e) => change((x) => { x.layout.collapsible = e.target.checked; }, true)}), "The sidebar collapses to a rail") : null,
      s.layout.shell === "hub" ? h("div", {class: "field"}, h("span", {}, "Hub panes"),
        chips(["inbox", "chats", "files"], s.layout.hubPanes, (x, v, on) => { x.layout.hubPanes = toggleIn(x.layout.hubPanes, v, on); }),
        h("small", {}, h("a", {href: DOCS.hub, target: "_blank", rel: "noopener"}, "commons-hub docs"))) : null,
      s.layout.shell !== "hub" ? h("div", {class: "field"}, h("span", {}, "In the header"),
        chips(headerChoices.map((c) => c.id), s.header, (x, v, on) => { x.header = toggleIn(x.header, v, on); }),
        h("small", {}, headerChoices.map((c) => `${c.id}: ${label(c)}`).join(" · "))) : null,
      s.layout.shell !== "hub" && s.header.includes("bell") ? h("label", {class: "field"}, h("span", {}, "The bell opens"),
        h("select", {onchange: (e) => change((x) => { x.bell.opens = e.target.value; }, true)},
          h("option", {value: "drawer", selected: s.bell.opens === "drawer"}, "The inbox in a drawer"),
          s.pages.map((p) => h("option", {value: p.id, selected: s.bell.opens === p.id}, `The ${p.title} page`)))) : null,
      h("label", {class: "field"}, h("span", {}, "Frontend"),
        h("select", {onchange: (e) => change((x) => { x.frontend.framework = e.target.value; }, true)},
          FRAMEWORKS.map((f) => h("option", {value: f.id, selected: f.id === s.frontend.framework}, f.name))),
        h("small", {}, FRAMEWORKS.find((f) => f.id === s.frontend.framework).note))),

    step(3, "Workflows and agents", s.workflows.length ? `${s.workflows.length}` : "none yet",
      h("p", {class: "note"}, "The special part: what runs durably, how it starts (a start service per workflow or agent), how it hears about what people do (chat and uploads), and where people take part (chats, human tasks, approvals)."),
      ...s.workflows.map((wf, i) => workflowEditor(wf, i)),
      h("div", {class: "presets"}, PRESETS.map((p) => h("button", {type: "button", class: "option template", onclick: () => change((x) => {
        x.workflows.push(newWorkflow(x, p.id));
      }, true)}, h("strong", {}, `+ ${p.name}`), h("span", {class: "desc"}, p.desc))))),

    step(4, "Pages", `${s.pages.length} page${s.pages.length === 1 ? "" : "s"}`,
      ...(s.layout.shell === "hub" ? repeats(s) : []),
      ...s.pages.map((p, i) => pageEditor(p, i)),
      h("div", {class: "chips"},
        h("button", {type: "button", onclick: () => change((x) => {
          x.pages.push({id: newId("page", x.pages.map((p) => p.id)), title: "New page", layout: "single", ratio: 40, collapsible: true, columns: [[], []]});
        }, true)}, "+ Blank page"),
        quickPage("Tasks", "tasks", ["task-inbox"], ["task-form"]),
        quickPage("Notifications", "inbox", ["inbox"]),
        quickPage("Chats", "chats", ["conversation-list"], ["conversation"]),
        quickPage("Files", "files", ["case-list"], ["file-viewer"])),
      h("p", {class: "note"}, "Docs: ",
        [...SERVICES.flatMap((svc) => svc.components.map((c) => [svc, c.tag])),
          [{id: "workflow"}, "workflow-task-inbox"], [{id: "workflow"}, "workflow-task-form"], [{id: "workflow"}, "workflow-start-form"]]
          .map(([svc, tag], i) => [i ? " · " : "", h("a", {href: docUrl(svc, tag), target: "_blank", rel: "noopener"}, `<${tag}>`)]), ". ",
        h("a", {href: DOCS.guide, target: "_blank", rel: "noopener"}, "Guide"))),

    step(5, "Custom components", s.custom.length ? `${s.custom.length}` : "none",
      h("p", {class: "note"}, "Anything the app needs that isn't in the list: describe it, place it on a page, and the prompts ask the assistant to build it."),
      ...s.custom.map((c, i) => h("div", {class: "service"},
        h("div", {class: "page-top"},
          h("input", {type: "text", value: c.name, "aria-label": `Name of custom component ${i + 1}`,
            oninput: (e) => change((x) => { x.custom[i].name = e.target.value; })}),
          h("button", {type: "button", class: "icon", "aria-label": `Delete ${c.name}`, onclick: () => change((x) => {
            x.custom.splice(i, 1);
            x.header = x.header.filter((id) => id !== c.id);
            for (const p of x.pages) p.columns = p.columns.map((col) => col.filter((id) => id !== c.id));
          }, true)}, "✕")),
        h("textarea", {value: c.description, rows: 2, "aria-label": `What ${c.name} does`, placeholder: "What it shows and does",
          oninput: (e) => change((x) => { x.custom[i].description = e.target.value; })}),
        h("label", {class: "chip"}, h("input", {type: "checkbox", checked: c.api,
          onchange: (e) => change((x) => { x.custom[i].api = e.target.checked; }, true)}), "Needs a backend endpoint"),
        usedComponents(s).includes(c.id) ? null : h("p", {class: "warn"}, "Not on any page yet: add it from a page's menu."))),
      h("button", {type: "button", onclick: () => change((x) => {
        x.custom.push({id: newId("custom", x.custom.map((c) => c.id)), name: "New component", description: "", api: false});
      }, true)}, "+ Add a custom component")),

    step(6, "Sign-in", IDPS.find((i) => i.id === s.idp.kind).name,
      radios("idp", IDPS.map((i) => ({id: i.id, name: i.name, tag: i.license, desc: i.summary})), s.idp.kind,
        (x, v) => { x.idp = {...x.idp, kind: v, ...IDPS.find((i) => i.id === v).defaults}; }),
      ...(s.idp.kind === "none" ? [h("p", {class: "warn"}, "Development only: anyone can claim any identity.")] : [
        h("div", {class: "row"},
          text("Issuer", () => s.idp.issuer, (x, v) => { x.idp.issuer = v; }),
          text("JWKS URL", () => s.idp.jwksUrl, (x, v) => { x.idp.jwksUrl = v; })),
        h("div", {class: "row"},
          text("Authorize URL", () => s.idp.authorizeUrl, (x, v) => { x.idp.authorizeUrl = v; }),
          text("Token URL", () => s.idp.tokenUrl, (x, v) => { x.idp.tokenUrl = v; })),
        h("div", {class: "row"},
          text("Client ID", () => s.idp.clientId, (x, v) => { x.idp.clientId = v; }),
          text("Scopes", () => s.idp.scopes, (x, v) => { x.idp.scopes = v; })),
        h("div", {class: "row"},
          text("User ID claim", () => s.idp.userIdClaim, (x, v) => { x.idp.userIdClaim = v; }),
          text("Roles claim", () => s.idp.rolesClaim, (x, v) => { x.idp.rolesClaim = v; },
            {hint: "An array or a comma list; dotted paths for nested claims"})),
        usesManagementApi(s) ? text("Token audience (aud)", () => s.idp.audience, (x, v) => { x.idp.audience = v; },
          {hint: "The management API checks it; empty uses the client ID."}) : null])),

    step(7, "Assistants and output", s.style === "steps" ? "step by step" : "one prompt each",
      h("p", {class: "note"}, "Frontend: ", h("a", {href: ASSISTANTS.claude.url, target: "_blank", rel: "noopener"}, "Claude Code"), "."),
      h("div", {class: "field"}, h("span", {}, "Backend"),
        radios("backend", [{id: "claude", name: "Claude Code"}, {id: "copilot", name: "Ballerina Copilot", desc: "Prompts carry the API cheat sheet; one change per prompt."}],
          s.assistants.backend, (x, v) => { x.assistants.backend = v; })),
      ...(s.workflows.length ? [h("div", {class: "field"}, h("span", {}, "Workflows and agents"),
        radios("workflow", [{id: "claude", name: "Claude Code"}, {id: "copilot", name: "Ballerina Copilot"}],
          s.assistants.workflow, (x, v) => { x.assistants.workflow = v; }))] : []),
      h("div", {class: "field"}, h("span", {}, "Prompts"),
        radios("style", [
          {id: "steps", name: "Step by step", desc: "Small prompts with a check after each. Better results."},
          {id: "full", name: "One prompt per part", desc: "Everything at once, for a long unattended run."}
        ], s.style, (x, v) => { x.style = v; })),
      h("div", {class: "field"}, h("span", {}, "Run it with"),
        radios("deploy", [{id: "local", name: "Locally", desc: "bal run, temporal server start-dev, the frontend dev server."},
          {id: "compose", name: "Docker Compose", desc: "Adds docker-compose.yml and nginx.conf."}],
        s.deploy, (x, v) => { x.deploy = v; }))));
  scrollTo({top: scroll});
}

// ---------------------------------------------------------------- output

function subtabs(items, current, pick) {
  return h("div", {class: "subtabs", role: "group"}, items.map((label, i) =>
    h("button", {type: "button", "aria-pressed": String(i === current), onclick: () => { pick(i); renderOutput(); }}, label)));
}

function renderWireframe() {
  const all = screens(state);
  view.screen = Math.min(view.screen, all.length - 1);
  const screen = all[view.screen];
  $("panel-wireframe").replaceChildren(
    subtabs(all.map((x) => x.name), view.screen, (i) => { view.screen = i; }),
    h("div", {class: "wireframe", html: svg(screen)}),
    h("div", {class: "legend"}, h("span", {class: "c"}, "bal-commons component"), h("span", {}, "the app's own"),
      h("span", {class: "x"}, "custom")),
    h("p", {class: "note"}, "Layout only. The components bring their own look; theme them with --bc-* custom properties."));
}

function markdown(parts) {
  return parts.map((p) => `# ${p.title} (${p.assistant})\n\n${p.steps.map((s, i) => `${parts.length && p.steps.length > 1 ? `## Step ${i + 1}: ${s.title}\n\n` : ""}${p.steps.length > 1 && i === 0 ? p.intro + "\n\n" : ""}${s.body}${s.check ? `\n\nDone when: ${s.check}` : ""}`).join("\n\n")}`).join("\n\n---\n\n");
}

function renderPrompts() {
  const parts = prompts(state);
  view.part = Math.min(view.part, parts.length - 1);
  const part = parts[view.part];
  const stepped = part.steps.length > 1;
  const bodyOf = (s, i) => `${stepped && i === 0 ? part.intro + "\n\n" : ""}${stepped ? "" : ""}${s.body}${s.check ? `\n\nDone when: ${s.check}` : ""}`;
  $("panel-prompts").replaceChildren(
    subtabs(parts.map((p) => p.title), view.part, (i) => { view.part = i; }),
    h("div", {class: "part-head"}, h("h2", {}, part.title), h("span", {class: "badge"}, part.assistant),
      h("span", {class: "spacer"}),
      h("button", {type: "button", onclick: () => copy(markdown([part]), part.title.toLowerCase() + " prompts")}, "Copy all"),
      h("button", {type: "button", onclick: () => save(new Blob([markdown(parts)], {type: "text/markdown"}), "PROMPTS.md")}, "Download PROMPTS.md")),
    stepped ? h("p", {class: "note"}, "Paste one prompt at a time; move on when its check passes. The first one carries the context.") : null,
    ...part.steps.map((s, i) => h("article", {class: "prompt"},
      h("header", {}, h("strong", {}, stepped ? `${i + 1}. ${s.title}` : s.title),
        h("button", {type: "button", onclick: () => copy(bodyOf(s, i), "the prompt")}, "Copy")),
      h("pre", {}, stepped ? bodyOf({...s, check: undefined}, i) : s.body),
      s.check && stepped ? h("p", {class: "check"}, "Done when: " + s.check) : null)));
}

function renderCode() {
  const list = files(state);
  view.file = Math.min(view.file, list.length - 1);
  const [path, content] = list[view.file];
  $("panel-code").replaceChildren(
    h("p", {class: "note"}, "A starting point that compiles with Ballerina 2201.13.4: the commons services in one process, the app API",
      state.workflows.length ? ", the start service, the workflows and agents, their activities and webhook receivers" : "", ". The prompts build on it."),
    h("div", {class: "code"},
      h("nav", {class: "files", "aria-label": "Files"}, list.map(([p], i) => h("button", {type: "button", "aria-current": String(i === view.file),
        onclick: () => { view.file = i; renderOutput(); }}, p))),
      h("div", {class: "file-view"},
        h("div", {class: "part-head", style: "padding:8px 10px;border-bottom:1px solid var(--line)"},
          h("strong", {style: "flex:1;font:12px ui-monospace,monospace"}, path),
          h("button", {type: "button", onclick: () => copy(content, path)}, "Copy")),
        h("pre", {}, content))));
}

function renderOutput() {
  for (const tab of ["wireframe", "prompts", "code"]) {
    $(`tab-${tab}`).setAttribute("aria-selected", String(view.tab === tab));
    $(`panel-${tab}`).hidden = view.tab !== tab;
  }
  ({wireframe: renderWireframe, prompts: renderPrompts, code: renderCode})[view.tab]();
}

function starter() {
  const parts = prompts(state);
  const entries = files(state).map(([p, c]) => [`${state.app.pkg || "app"}/${p}`, c]);
  const root = state.app.pkg || "app";
  entries.push([`${root}/PROMPTS.md`, markdown(parts)]);
  entries.push([`${root}/README.md`, `# ${state.app.name}\n\n${state.app.description}\n\nGenerated by the App Prompt Builder. Open this link to change the selection:\n${location.href}\n\n1. \`cd backend && bal build\`\n2. Follow PROMPTS.md: frontend, backend${state.workflows.length ? ", workflows and agents" : ""}.\n\nReplace every \`change-me\` in backend/Config.toml before anyone else uses the app.\n`]);
  entries.push([`${root}/.gitignore`, "backend/target/\nbackend/Config.toml\nfrontend/node_modules/\nfrontend/dist/\n.env\n"]);
  save(zip(entries), `${root}-starter.zip`);
}

// ---------------------------------------------------------------- start

for (const tab of ["wireframe", "prompts", "code"]) {
  $(`tab-${tab}`).addEventListener("click", () => { view.tab = tab; renderOutput(); });
}
$("share").addEventListener("click", () => copy(location.href, "the link"));
$("reset").addEventListener("click", () => {
  if (confirm("Start over with a blank app?")) {
    state = defaults();
    history.replaceState(null, "", "#" + encode(state));
    renderForm();
    renderOutput();
  }
});
$("download").addEventListener("click", starter);
history.replaceState(null, "", "#" + encode(state));
renderForm();
renderOutput();
