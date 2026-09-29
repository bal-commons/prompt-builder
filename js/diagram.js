import {IDPS, SERVICES} from "./catalog.js";
import {enabledServices, integrationsOf, managedIntegrations} from "./state.js";

// The ecosystem as an architecture diagram: the portal on top, the identity provider beside it, and below them each
// integration (its workflows, agents and human tasks) and the shared commons services. Returns an SVG string.

const W = 760;
const BOX_W = 232;
const GAP = 32;
const LINE = 16;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"}[c]));
const fit = (text, width, px = 6.4) => {
  const n = Math.max(4, Math.floor((width - 20) / px));
  return text.length > n ? text.slice(0, n - 1) + "…" : text;
};

function integrationLines(state, int) {
  const lines = [int.source === "new" ? `new · ${int.org}/${int.pkg}` : `existing · ${int.org ? int.org + "/" : ""}${int.pkg}${int.version ? " " + int.version : ""}`];
  for (const wf of int.workflows) {
    lines.push(`${wf.kind === "agent" ? "● agent" : "◆ workflow"} ${wf.title || wf.name}${wf.chat ? " · chat" : ""}`);
    for (const t of wf.tasks ?? []) lines.push(`   ☐ ${t.title || t.name} · ${t.roles.join(", ") || "anyone"}`);
    if (wf.approval?.on) lines.push(`   ✓ approves ${wf.approval.activity} · ${wf.approval.userRoles.join(", ") || "anyone"}`);
  }
  if (!int.workflows.length) lines.push("(no workflows yet)");
  const apis = [int.source === "new" ? "app + start API" : "", managedIntegrations(state).some((i) => i.id === int.id) ? "management API" : ""].filter(Boolean);
  if (apis.length) lines.push(`serves: ${apis.join(", ")}`);
  return lines;
}

function box(x, y, w, h, title, lines, kind) {
  const text = lines.map((l, i) => `<text x="${x + 10}" y="${y + 40 + i * LINE}" class="ad-line">${esc(fit(l, w))}</text>`).join("");
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="ad-box ${kind}"/>
    <text x="${x + 10}" y="${y + 20}" class="ad-title">${esc(fit(title, w, 7.4))}</text>${text}</g>`;
}

export function architectureSvg(state) {
  const idp = IDPS.find((i) => i.id === state.identity.idp.kind);
  const services = enabledServices(state).map((id) => SERVICES.find((s) => s.id === id));
  const backends = [
    ...integrationsOf(state).map((int) => ({title: int.title, lines: integrationLines(state, int), kind: int.source === "new" ? "int-new" : "int-existing"})),
    ...(services.length ? [{title: "Commons services", lines: ["shared package · backend/commons", ...services.map((s) => `${s.name} :${s.port}`)], kind: "commons"}] : [])
  ];
  const perRow = Math.max(1, Math.floor((W + GAP) / (BOX_W + GAP)));
  const top = {x: (W - 300) / 2, y: 12, w: 300, h: 64};
  const idpBox = {x: W - 180, y: 12, w: 170, h: 64};
  top.x = Math.min(top.x, idpBox.x - top.w - 24);
  let y = top.y + top.h + 56;
  const parts = [];
  const links = [];
  for (let row = 0; row * perRow < backends.length; row++) {
    const items = backends.slice(row * perRow, row * perRow + perRow);
    const h = Math.max(...items.map((b) => 34 + b.lines.length * LINE));
    const width = items.length * BOX_W + (items.length - 1) * GAP;
    let x = (W - width) / 2;
    for (const b of items) {
      parts.push(box(x, y, BOX_W, h, b.title, b.lines, b.kind));
      links.push(`<path d="M${top.x + top.w / 2} ${top.y + top.h} C ${top.x + top.w / 2} ${y - 24}, ${x + BOX_W / 2} ${top.y + top.h + 24}, ${x + BOX_W / 2} ${y}" class="ad-link"/>`);
      x += BOX_W + GAP;
    }
    y += h + GAP;
  }
  const portal = box(top.x, top.y, top.w, top.h, `Portal · ${state.app.name}`, [`${state.pages.length} page${state.pages.length === 1 ? "" : "s"} · login first`], "portal");
  const id = box(idpBox.x, idpBox.y, idpBox.w, idpBox.h, idp.id === "none" ? "Dev sign-in" : idp.name,
    [`${state.identity.users.length} users · ${state.identity.roles.length} roles`], "idp");
  const idLink = `<path d="M${top.x + top.w} ${top.y + top.h / 2} L ${idpBox.x} ${idpBox.y + idpBox.h / 2}" class="ad-link dashed"/>`;
  const height = Math.max(y, 160);
  return `<svg viewBox="0 0 ${W} ${height}" role="img" aria-label="Architecture: the portal, the identity provider, ${backends.length} backend${backends.length === 1 ? "" : "s"}" xmlns="http://www.w3.org/2000/svg">
    ${links.join("")}${idLink}${portal}${id}${parts.join("")}</svg>`;
}
