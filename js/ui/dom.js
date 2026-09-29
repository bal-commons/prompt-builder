import {change} from "./store.js";

// Small DOM helpers for the builder's own UI (no framework).

export function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (["value", "checked", "selected", "disabled", "open", "indeterminate"].includes(key) || (key in node && typeof value !== "string")) node[key] = value;
    else node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child !== null && child !== undefined && child !== false) node.append(child.nodeType ? child : String(child));
  }
  return node;
}

export const $ = (id) => document.getElementById(id);
export const list = (value) => value.split(",").map((v) => v.trim()).filter(Boolean);
export const toggleIn = (arr, value, on) => on ? [...new Set([...arr, value])] : arr.filter((x) => x !== value);

let uid = 0;
const nextId = () => `f${++uid}`;

// A labelled text input or textarea. `get` reads from the state; `set` mutates the draft state.
export function text(label, get, set, {hint, multiline, placeholder, optional, error, required} = {}) {
  const id = nextId();
  const hintId = hint || error ? `${id}-hint` : undefined;
  const attrs = {id, value: get() ?? "", placeholder, "aria-describedby": hintId, "aria-invalid": error ? "true" : undefined,
    required: required || undefined, oninput: (e) => change((s) => set(s, e.target.value))};
  return h("div", {class: "field"},
    h("label", {for: id}, label, optional ? h("span", {class: "optional"}, " (optional)") : null),
    multiline ? h("textarea", {...attrs, rows: 3}) : h("input", {...attrs, type: "text"}),
    error ? h("small", {id: hintId, class: "error"}, error) : hint ? h("small", {id: hintId}, hint) : null);
}

export function select(label, options, current, set, {hint} = {}) {
  const id = nextId();
  return h("div", {class: "field"}, h("label", {for: id}, label),
    h("select", {id, onchange: (e) => change((s) => set(s, e.target.value), {structural: true})},
      options.map(([value, name]) => h("option", {value, selected: value === current}, name))),
    hint ? h("small", {}, hint) : null);
}

export function radios(name, options, current, set, {legend} = {}) {
  return h("fieldset", {class: "options"}, legend ? h("legend", {}, legend) : null,
    options.map((o) => h("label", {class: "option"},
      h("input", {type: "radio", name, value: o.id, checked: o.id === current, onchange: () => change((s) => set(s, o.id), {structural: true, undo: o.undo})}),
      h("span", {}, o.name, o.tag ? h("span", {class: "tag"}, o.tag) : null),
      o.desc ? h("span", {class: "desc"}, o.desc) : h("span"))));
}

export function checkbox(label, checked, set, {hint, undo} = {}) {
  return h("label", {class: "check"}, h("input", {type: "checkbox", checked, onchange: (e) => change((s) => set(s, e.target.checked), {structural: true, undo})}),
    h("span", {}, label, hint ? h("small", {class: "block"}, hint) : null));
}

export function chips(legend, values, selected, toggle, {disabled = () => false, labels = {}} = {}) {
  return h("fieldset", {class: "chips"}, legend ? h("legend", {}, legend) : null,
    values.map((v) => h("label", {class: "chip"},
      h("input", {type: "checkbox", checked: selected.includes(v), disabled: disabled(v),
        onchange: (e) => change((s) => toggle(s, v, e.target.checked), {structural: true})}), labels[v] ?? v)));
}

// A disclosure for settings most people leave alone.
export function advanced(summary, ...body) {
  return h("details", {class: "advanced"}, h("summary", {}, summary), h("div", {class: "advanced-body"}, ...body));
}

export function section(title, intro, ...body) {
  return h("section", {class: "section"}, h("h3", {}, title), intro ? h("p", {class: "note"}, intro) : null, ...body);
}
