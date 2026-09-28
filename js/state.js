import {IDPS} from "./catalog.js";

// The builder's whole state; the page encodes it in the URL hash so a link reproduces the selection.
export function defaults() {
  return {
    app: {
      name: "Tenant maintenance",
      org: "myorg",
      pkg: "tenant_app",
      description: "Tenants report problems; an agent coordinates contractors until the tenant confirms the fix.",
      object: "maintenance request",
      idPrefix: "MR",
      roles: ["Tenant", "Contractor", "PropertyManager"],
      userRole: "Tenant",
      adminRoles: ["PropertyManager"]
    },
    services: {
      notification: {on: true, components: ["commons-notification-bell", "commons-inbox"]},
      chat: {on: true, components: ["commons-conversation-list", "commons-conversation"]},
      attachment: {on: true, components: ["commons-upload-case", "commons-case-list", "commons-file-viewer"]}
    },
    frontend: {framework: "plain", layout: "hub"},
    db: "h2",
    idp: {kind: "thunder", ...IDPS.find((i) => i.id === "thunder").defaults, clientId: "app-portal"},
    agent: {
      on: true,
      name: "coordinator",
      displayName: "Assistant",
      purpose: "Owns one maintenance request from report to resolution: collects photos, finds a contractor, "
        + "books the visit and closes the request when the tenant confirms the fix.",
      steps: [
        "When the request arrives: greet the user and requestUpload for a photo of the problem; notifyRole the PropertyManager.",
        "When the UPLOAD arrives: tell the user what happens next.",
        "When the user says it is fixed: closeCase, closeConversation, and notifyRole the PropertyManager (SUCCESS)."
      ],
      activities: ["notifyUser", "notifyRole", "sendMessage", "askForm", "closeConversation", "requestUpload", "closeCase"],
      approval: {on: false, activity: "closeCase", userRoles: ["PropertyManager"], adminRoles: []},
      model: "wso2"
    },
    assistants: {backend: "claude", workflow: "claude"},
    style: "steps",
    deploy: "compose"
  };
}

export function encode(state) {
  const json = JSON.stringify(state);
  return btoa(String.fromCharCode(...new TextEncoder().encode(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Merges a decoded state over the defaults, so links made by an older version still open.
export function decode(hash) {
  try {
    const base64 = hash.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return merge(defaults(), JSON.parse(new TextDecoder().decode(bytes)));
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

export function enabledServices(state) {
  return Object.entries(state.services).filter(([, s]) => s.on).map(([id]) => id);
}
