import {componentName} from "./catalog.js";
import {names} from "./code.js";
import {component, HUB_PANES, pageComponents} from "./state.js";

// Wireframes of the app's screens as SVG boxes: layout only, the components bring their own look.

const W = 800;
const H = 480;

// What a component's box says inside, line by line.
function sketch(state, id) {
  const n = names(state);
  const lines = {
    "bell": ["🔔 ②"],
    "inbox": ["All | Personal | Roles   ☐ Unread  severity ▾", "● WARNING  Needs attention …", "● INFO     New " + n.object + " …", "  SUCCESS  Done …"],
    "conversation-list": ["[ search ]", "title · 2 unread", "title", "title"],
    "conversation": ["agent: streamed reply …", "              you: …", "form: [field] [field] Send", "[ message …        ] Send"],
    "upload-case": ["Files 1/3 · image/*   [▢][▢]", "┆ Drop files here or choose ┆", "[ Submit ]"],
    "case-list": ["title · Needs your upload", "▓▓▓▓░░ 2/3 slots", "title · submitted"],
    "file-viewer": ["[img] [img] [PDF]", "Download · Delete"],
    "item-form": ["[ title ]", "[ details … ]", "[ Open ]"],
    "item-list": [`${n.idPrefix}-1002 · title · OPEN`, `${n.idPrefix}-1001 · title · DONE`, "…"],
    "item-detail": ["title · status", "fields · owner · dates"],
    "approvals": ["action · arguments", "[ comment ]  Approve  Reject"],
    "stats": ["[ 12 open ]  [ 4 waiting ]  [ 31 done ]"],
    "user-menu": ["user ▾"]
  }[id];
  return lines ?? [component(state, id)?.description ?? ""];
}

function label(state, id) {
  const c = component(state, id);
  if (!c) return id;
  return c.tag ? `<${c.tag}>` : c.app ? componentName(c, state.app.object) : c.name;
}

function kind(state, id) {
  const c = component(state, id);
  return c?.tag ? "component" : c?.app ? "app" : "custom";
}

// Boxes stacked in a column, sized by weight (a conversation gets twice the room).
function column(state, ids, x, y, w, h) {
  if (!ids.length) {
    return [box(x, y, w, h, "(empty column)", "empty", [])];
  }
  const weights = ids.map((id) => component(state, id)?.weight ?? 1);
  const total = weights.reduce((a, b) => a + b, 0);
  const gap = 10;
  const free = h - gap * (ids.length - 1);
  let top = y;
  return ids.map((id, i) => {
    const height = Math.max(40, free * weights[i] / total);
    const b = box(x, top, w, height, label(state, id), kind(state, id), sketch(state, id));
    top += height + gap;
    return b;
  });
}

function body(state, page, x, y, w, h) {
  const cols = pageComponents(page);
  if (cols.length === 1) {
    return column(state, cols[0], x, y, w, h);
  }
  const gap = 12;
  const left = Math.round((w - gap) * page.ratio / 100);
  const regions = [...column(state, cols[0], x, y, left, h), ...column(state, cols[1], x + left + gap, y, w - left - gap, h)];
  if (page.collapsible) {
    regions.push(box(x + left - 22, y + 4, 18, 18, "‹", "toggle", []));
  }
  return regions;
}

function headerLine(state) {
  return state.header.map((id) => id === "bell" ? "🔔②" : id === "user-menu" ? "user ▾" : component(state, id)?.name ?? id).join("   ");
}

export function screens(state) {
  const shell = state.layout.shell;
  const list = [];
  const hubPanes = shell === "hub" ? state.layout.hubPanes.map((p) => ({pane: p,
    name: {inbox: "Notifications", chats: "Chats", files: "Files"}[p] + " (hub)"})) : [];
  const navItems = [...hubPanes.map((p) => p.name), ...state.pages.map((p) => p.title)];

  const frame = (current, content) => {
    const regions = [];
    if (shell === "top") {
      regions.push(box(0, 0, W, 48, state.app.name, "nav", [`${navItems.map((t) => t === current ? `[${t}]` : t).join("   ")}        ${headerLine(state)}`]));
      regions.push(...content(16, 64, W - 32, H - 80));
    } else {
      const rail = shell === "hub" ? 170 : 160;
      regions.push(box(0, 0, rail, H, shell === "hub" ? "<commons-hub> rail" : state.app.name, "nav",
        [...navItems.map((t) => (t === current ? "▸ " : "  ") + t), "", state.layout.collapsible && shell === "sidebar" ? "« collapse" : ""]));
      regions.push(box(rail, 0, W - rail, 44, shell === "hub" ? "" : `${current}      ${headerLine(state)}`, "nav", []));
      regions.push(...content(rail + 16, 58, W - rail - 32, H - 74));
    }
    return regions;
  };

  for (const p of hubPanes) {
    const ids = HUB_PANES[p.pane];
    const split = {layout: ids.length > 1 ? "split" : "single", ratio: 35, collapsible: false,
      columns: ids.length > 1 ? [[ids[0]], ids.slice(1)] : [ids, []]};
    list.push({name: p.name, regions: frame(p.name, (x, y, w, h) => body(state, split, x, y, w, h))});
  }
  for (const page of state.pages) {
    list.push({name: page.title, regions: frame(page.title, (x, y, w, h) => body(state, page, x, y, w, h))});
  }
  if (shell !== "hub" && state.header.includes("bell") && state.bell.opens === "drawer" && state.pages.length) {
    const first = state.pages[0];
    const regions = frame(first.title, (x, y, w, h) => body(state, first, x, y, w, h))
      .map((r) => ({...r, kind: r.kind === "nav" ? "nav" : "dim"}));
    regions.push(box(W - 330, 44, 330, H - 44, "Drawer: <commons-inbox>", "component", sketch(state, "inbox")));
    list.push({name: "Bell → drawer", regions});
  }
  return list;
}

function box(x, y, w, h, text, kind, lines = []) {
  return {x, y, w, h, label: text, kind, lines};
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"}[c]));

export function svg(screen) {
  const parts = screen.regions.map((r) => {
    const fill = {nav: "var(--wf-nav)", component: "var(--wf-component)", app: "var(--wf-panel)", custom: "var(--wf-custom)",
      empty: "none", toggle: "var(--wf-nav)", dim: "var(--wf-dim)"}[r.kind];
    const max = Math.max(0, Math.floor((r.h - 30) / 18));
    const lines = r.lines.slice(0, max).map((line, i) => `<text x="${r.x + 10}" y="${r.y + 38 + i * 18}" class="wf-line">${esc(line)}</text>`).join("");
    return `<g><rect x="${r.x + 1}" y="${r.y + 1}" width="${r.w - 2}" height="${r.h - 2}" rx="6" fill="${fill}" class="wf-box ${r.kind}"/>
      <text x="${r.x + (r.kind === "toggle" ? 5 : 10)}" y="${r.y + (r.kind === "toggle" ? 14 : 20)}" class="wf-label">${esc(r.label)}</text>${lines}</g>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Wireframe: ${esc(screen.name)}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="var(--wf-bg)"/>${parts}</svg>`;
}
