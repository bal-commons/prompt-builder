import {names} from "./code.js";

// Simple wireframes of the app's screens, as SVG boxes. Layout only; the components bring their own look.

const W = 800;
const H = 480;

function on(state, id, tag) {
  return state.services[id]?.on && (!tag || state.services[id].components.includes(tag));
}

// The screens the app will have, each as a list of regions.
export function screens(state) {
  const n = names(state);
  const hub = state.frontend.layout === "hub";
  const approval = state.agent.on && state.agent.approval.on;
  const list = [];
  const itemLabel = n.path[0].toUpperCase() + n.path.slice(1);

  const itemsBody = (x, y, w, h) => [
    box(x, y, w * 0.36, h, `${itemLabel} list`, "list", ["+ New " + n.object, "status · date", "status · date", "status · date"]),
    box(x + w * 0.38, y, w * 0.62, h * 0.32, `${capital(n.object)} detail`, "panel", ["title, status, fields"]),
    ...(on(state, "chat", "commons-conversation") ? [box(x + w * 0.38, y + h * 0.35, w * 0.62, h * 0.65, "<commons-conversation>", "component", ["agent: streamed reply", "form / upload card", "[ message …        ] Send"])] : [])
  ];
  const inboxBody = (x, y, w, h) => [box(x, y, w, h, "<commons-inbox show-filters>", "component",
    ["All | Personal | Roles   ☐ Unread  severity ▾   Mark all read", "● WARNING  No reply yet …", "● INFO     New " + n.object + " …", "  SUCCESS  Resolved …"])];
  const chatsBody = (x, y, w, h) => [
    ...(on(state, "chat", "commons-conversation-list") ? [box(x, y, w * 0.34, h, "<commons-conversation-list searchable>", "component", ["[ search ]", "title · 2 unread", "title", "title"])] : []),
    ...(on(state, "chat", "commons-conversation") ? [box(x + w * 0.36, y, w * 0.64, h, "<commons-conversation>", "component", ["agent: …", "              you: …", "form: [field] [field] Send", "[ message …        ] Send"])] : [])
  ];
  const filesBody = (x, y, w, h) => [
    ...(on(state, "attachment", "commons-case-list") ? [box(x, y, w * 0.34, h, "<commons-case-list>", "component", ["title · Needs your upload", "▓▓▓▓░░ 2/3 slots", "title · submitted"])] : []),
    ...(on(state, "attachment", "commons-upload-case") ? [box(x + w * 0.36, y, w * 0.64, h * 0.55, "<commons-upload-case>", "component", ["Photos 1/3 · image/*   [▢][▢]", "┆ Drop files here or choose ┆", "[ Submit ]"])] : []),
    ...(on(state, "attachment", "commons-file-viewer") ? [box(x + w * 0.36, y + h * 0.58, w * 0.64, h * 0.42, "<commons-file-viewer>", "component", ["[img] [img] [PDF]  Download · Delete"])] : [])
  ];
  const reviewsBody = (x, y, w, h) => [box(x, y, w, h, "Approvals", "list",
    [`${state.agent.approval.activity} · ${n.object} ${n.idPrefix}-1001`, "arguments the agent proposed", "[ comment ]  Approve  Reject"])];

  const pages = [[itemLabel, itemsBody]];
  if (on(state, "notification", "commons-inbox")) pages.push(["Notifications", inboxBody]);
  if (on(state, "chat")) pages.push(["Chats", chatsBody]);
  if (on(state, "attachment")) pages.push(["Files", filesBody]);
  if (approval) pages.push(["Approvals", reviewsBody]);

  for (const [name, body] of pages) {
    const regions = [];
    if (hub) {
      regions.push(box(0, 0, 170, H, "<commons-hub> rail", "nav", [state.app.name, ...pages.map(([p]) => (p === name ? "▸ " : "  ") + p + (p === "Notifications" || p === "Chats" ? "  ②" : "")), "", "", "user ▾"]));
      regions.push(...body(186, 16, W - 202, H - 32));
    } else {
      regions.push(box(0, 0, W, 48, "Header", "nav", [`${state.app.name}    ${pages.map(([p]) => p).join("  ·  ")}    ${on(state, "notification", "commons-notification-bell") ? "🔔②" : ""}  user ▾`]));
      regions.push(...body(16, 64, W - 32, H - 80));
    }
    list.push({name, regions});
  }
  return list;
}

function box(x, y, w, h, label, kind, lines = []) {
  return {x, y, w, h, label, kind, lines};
}

const capital = (s) => s[0].toUpperCase() + s.slice(1);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"}[c]));

export function svg(screen) {
  const parts = screen.regions.map((r) => {
    const fill = {nav: "var(--wf-nav)", component: "var(--wf-component)", list: "var(--wf-panel)", panel: "var(--wf-panel)"}[r.kind];
    const lines = r.lines.map((line, i) => `<text x="${r.x + 10}" y="${r.y + 40 + i * 20}" class="wf-line">${esc(line)}</text>`).join("");
    return `<g><rect x="${r.x + 1}" y="${r.y + 1}" width="${r.w - 2}" height="${r.h - 2}" rx="6" fill="${fill}" class="wf-box ${r.kind}"/>
      <text x="${r.x + 10}" y="${r.y + 20}" class="wf-label">${esc(r.label)}</text>${lines}</g>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Wireframe: ${esc(screen.name)}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="var(--wf-bg)"/>${parts}</svg>`;
}

// A text version of the screens, for the prompts.
export function describePages(state) {
  return screens(state).map((s) => ({
    name: s.name,
    description: s.regions.filter((r) => r.kind !== "nav").map((r) => `- ${r.label}: ${r.lines.join(" / ")}`).join("\n")
  }));
}
