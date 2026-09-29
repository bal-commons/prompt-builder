import {grants, renameRole} from "../state.js";
import {h, toggleIn} from "./dom.js";
import {change, setView, store} from "./store.js";

// The identity board: users on the left, roles in the middle, what each role may do on the right. Drag from a dot
// to an item in the next column, or select an item and then click one in the next column, to add or remove a link.

const COLUMNS = ["user", "role", "grant"];
const colOf = (key) => COLUMNS.indexOf(key.split(":")[0]);
const adjacent = (a, b) => Math.abs(colOf(a) - colOf(b)) === 1;
const roleOf = (key) => key.slice(5);

function nodes(st) {
  return {
    user: st.identity.users.map((u, i) => ({key: `user:${i}`, label: u.name || u.username || `User ${i + 1}`, sub: u.username})),
    role: st.identity.roles.map((r) => ({key: `role:${r}`, label: r})),
    grant: grants(st).map((g) => ({key: `grant:${g.key}`, label: g.label, sub: g.detail, group: g.group, empty: g.empty, grant: g}))
  };
}

// [left, right] pairs; links to roles that aren't defined are left out (the identity step flags them).
function links(st) {
  const known = (r) => st.identity.roles.includes(r);
  const out = [];
  st.identity.users.forEach((u, i) => u.roles.filter(known).forEach((r) => out.push([`user:${i}`, `role:${r}`])));
  for (const g of grants(st)) for (const r of g.get(st).filter(known)) out.push([`role:${r}`, `grant:${g.key}`]);
  return out;
}

// Adds or removes the link between two items in adjacent columns.
function toggle(a, b) {
  const [left, right] = colOf(a) < colOf(b) ? [a, b] : [b, a];
  change((x) => {
    if (left.startsWith("user:")) {
      const u = x.identity.users[Number(left.slice(5))];
      u.roles = toggleIn(u.roles, roleOf(right), !u.roles.includes(roleOf(right)));
    } else {
      const g = grants(x).find((y) => `grant:${y.key}` === right);
      const roles = g.get(x);
      g.set(x, toggleIn(roles, roleOf(left), !roles.includes(roleOf(left))));
    }
  }, {structural: true});
}

function select(key) {
  const current = store.view.wire;
  if (current && current !== key && adjacent(current, key)) return toggle(current, key);
  setView({wire: current === key ? undefined : key}, "structure");
}

// The lines between linked items, drawn once the board has its size (and again when it changes).
function draw(board, st, drag) {
  const svg = board.querySelector("svg.wires");
  const box = board.getBoundingClientRect();
  const at = (key, side) => {
    const el = board.querySelector(`[data-key="${CSS.escape(key)}"]`);
    if (!el) return undefined;
    const r = el.getBoundingClientRect();
    return {x: (side === "right" ? r.right : r.left) - box.left, y: r.top + r.height / 2 - box.top};
  };
  const sel = store.view.wire;
  const path = (p, q) => `M${p.x} ${p.y} C ${p.x + 40} ${p.y}, ${q.x - 40} ${q.y}, ${q.x} ${q.y}`;
  const lines = links(st).map(([a, b]) => {
    const p = at(a, "right");
    const q = at(b, "left");
    if (!p || !q) return "";
    return `<path d="${path(p, q)}" class="wire${sel && (a === sel || b === sel) ? " on" : ""}"/>`;
  });
  if (drag) lines.push(`<path d="${drag.from.x < drag.to.x ? path(drag.from, drag.to) : path(drag.to, drag.from)}" class="wire drag"/>`);
  svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
  svg.setAttribute("width", box.width);
  svg.setAttribute("height", box.height);
  svg.innerHTML = lines.join("");
}

function node(n, st, linkedTo) {
  const sel = store.view.wire;
  const col = colOf(n.key);
  const state = sel === n.key ? " selected" : sel && linkedTo.has(n.key) ? " linked" : sel && adjacent(sel, n.key) ? " target" : "";
  const empty = n.grant && !n.grant.get(st).length ? h("span", {class: "node-empty"}, n.empty) : null;
  const port = (side) => h("span", {class: `port ${side}`, "aria-hidden": "true", "data-port": n.key});
  return h("div", {class: "node-wrap"},
    col > 0 ? port("left") : null,
    h("button", {type: "button", class: "node" + state, "data-key": n.key, "aria-pressed": String(sel === n.key),
      onclick: () => select(n.key)}, h("strong", {}, n.label), n.sub ? h("span", {class: "node-sub"}, n.sub) : null, empty),
    col < 2 ? port("right") : null);
}

function column(title, items, st, linkedTo, footer) {
  let group;
  const body = [];
  for (const n of items) {
    if (n.group && n.group !== group) {
      group = n.group;
      body.push(h("span", {class: "node-group"}, group));
    }
    body.push(node(n, st, linkedTo));
  }
  return h("div", {class: "board-col"}, h("span", {class: "board-head"}, title), ...body, footer);
}

// Details of the selected user or role, edited in place.
function details(st) {
  const sel = store.view.wire;
  if (!sel) return h("p", {class: "small board-help"}, "Select a user, a role or a permission to see its links. Then click an item in the next column, or drag from a dot, to connect or disconnect it.");
  if (sel.startsWith("user:")) {
    const i = Number(sel.slice(5));
    const u = st.identity.users[i];
    if (!u) return null;
    const field = (label, key, type = "text") => h("div", {class: "field"}, h("label", {for: `user-${key}`}, label),
      h("input", {id: `user-${key}`, type, value: u[key] ?? "", oninput: (e) => change((x) => { x.identity.users[i][key] = key === "username" ? e.target.value.trim() : e.target.value; })}));
    return h("div", {class: "board-detail"}, h("strong", {}, `User: ${u.name || u.username}`),
      h("div", {class: "row three"}, field("Username", "username"), field("Name", "name"), field("Email", "email", "email")),
      h("button", {type: "button", class: "link danger", onclick: () => { setView({wire: undefined}, "view");
        change((x) => { x.identity.users.splice(i, 1); }, {structural: true, undo: `remove the user ${u.username}`}); }}, `Remove ${u.username}`));
  }
  if (sel.startsWith("role:")) {
    const role = roleOf(sel);
    return h("div", {class: "board-detail"}, h("strong", {}, `Role: ${role}`),
      h("div", {class: "field"}, h("label", {for: "role-name"}, "Name"),
        h("input", {id: "role-name", type: "text", value: role, onchange: (e) => {
          const to = e.target.value.trim();
          if (!to || to === role || st.identity.roles.includes(to)) return;
          setView({wire: `role:${to}`}, "view");
          change((x) => renameRole(x, role, to), {structural: true, undo: `rename ${role}`});
        }}), h("small", {}, "Renaming updates every user, task and approval that uses it.")),
      h("button", {type: "button", class: "link danger", onclick: () => { setView({wire: undefined}, "view");
        change((x) => renameRole(x, role, ""), {structural: true, undo: `remove the role ${role}`}); }}, `Remove ${role}`));
  }
  const g = grants(st).find((y) => `grant:${y.key}` === sel);
  return g ? h("p", {class: "small board-help"}, `${g.label}: ${g.get(st).join(", ") || `${g.empty} (no role linked)`}. Click a role to add or remove it.`) : null;
}

export function wiringBoard(st) {
  const all = nodes(st);
  const sel = store.view.wire;
  const linkedTo = new Set(links(st).flatMap(([a, b]) => a === sel ? [b] : b === sel ? [a] : []));
  const wires = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  wires.setAttribute("class", "wires");
  wires.setAttribute("aria-hidden", "true");
  const board = h("div", {class: "board", role: "group", "aria-label": "Users, roles and what they can do"}, wires,
    column("Users", all.user, st, linkedTo, h("button", {type: "button", class: "link", onclick: () => change((x) => {
      const n = x.identity.users.length + 1;
      x.identity.users.push({username: `user${n}`, name: `User ${n}`, email: `user${n}@example.com`, roles: []});
    }, {structural: true})}, "+ Add a user")),
    column("Roles", all.role, st, linkedTo, h("button", {type: "button", class: "link", onclick: () => change((x) => {
      let name = "Role";
      for (let i = 2; x.identity.roles.includes(name); i++) name = `Role ${i}`;
      x.identity.roles.push(name);
    }, {structural: true})}, "+ Add a role")),
    column("What they can do", all.grant, st, linkedTo, null));
  new ResizeObserver(() => draw(board, st)).observe(board);

  // Dragging from a dot: a line follows the pointer; dropping on an item in the next column links or unlinks it.
  board.addEventListener("pointerdown", (e) => {
    const from = e.target.closest?.("[data-port]")?.dataset.port;
    if (!from) return;
    e.preventDefault();
    const box = board.getBoundingClientRect();
    const r = e.target.getBoundingClientRect();
    const start = {x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top};
    const move = (m) => draw(board, st, {from: start, to: {x: m.clientX - box.left, y: m.clientY - box.top}});
    const up = (u) => {
      board.removeEventListener("pointermove", move);
      board.removeEventListener("pointerup", up);
      const target = document.elementFromPoint(u.clientX, u.clientY)?.closest?.("[data-key], [data-port]");
      const to = target?.dataset.key ?? target?.dataset.port;
      if (to && adjacent(from, to)) toggle(from, to);
      else draw(board, st);
    };
    board.setPointerCapture?.(e.pointerId);
    board.addEventListener("pointermove", move);
    board.addEventListener("pointerup", up);
  });
  return [board, details(st)];
}
