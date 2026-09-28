import {ACTIVITIES, COMPONENTS, IDPS} from "./catalog.js";
import {TEMPLATES} from "./templates.js";

// The builder's whole state; the page encodes it in the URL hash so a link reproduces the selection.
export function fromTemplate(id) {
  const template = TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
  const built = template.build();
  return {
    version: 2,
    template: template.id,
    ...built,
    layout: {hubPanes: ["inbox", "chats", "files"], ...built.layout},
    frontend: {framework: "plain"},
    db: "h2",
    idp: {kind: "none", ...IDPS.find((i) => i.id === "thunder").defaults, clientId: "app-portal"},
    assistants: {backend: "claude", workflow: "claude"},
    style: "steps",
    deploy: "local"
  };
}

export function defaults() {
  return fromTemplate("blank");
}

export function encode(state) {
  const json = JSON.stringify(state);
  return btoa(String.fromCharCode(...new TextEncoder().encode(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Links made before pages existed (version 1) start over from the blank template.
export function decode(hash) {
  try {
    const base64 = hash.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed.version === 2 ? merge(fromTemplate(parsed.template), parsed) : undefined;
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

// camelCase from free text: "maintenance request" -> "maintenanceRequest".
export function camel(text) {
  const words = String(text).trim().split(/[^A-Za-z0-9]+/).filter(Boolean);
  return words.map((w, i) => i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()).join("") || "item";
}

export function pascal(text) {
  const c = camel(text);
  return c[0].toUpperCase() + c.slice(1);
}

// The components a page shows, in order: both columns stacked when it has one column.
export function pageComponents(page) {
  return page.layout === "split" ? page.columns : [[...page.columns[0], ...page.columns[1]]];
}

// Built-in and custom components, by ID.
export function component(state, id) {
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

// The commons services the backend runs: those the UI uses, and those the agent's activities call.
export function enabledServices(state) {
  const ids = new Set(usedComponents(state).map((id) => component(state, id).service).filter(Boolean));
  if (state.agent.on) {
    for (const a of ACTIVITIES.filter((x) => state.agent.activities.includes(x.id))) {
      if (a.service !== "app") ids.add(a.service);
    }
  }
  return ["notification", "chat", "attachment"].filter((id) => ids.has(id));
}

export function uses(state, id) {
  return usedComponents(state).includes(id);
}

export function newId(prefix, taken) {
  let i = 1;
  while (taken.includes(`${prefix}${i}`)) i++;
  return `${prefix}${i}`;
}
