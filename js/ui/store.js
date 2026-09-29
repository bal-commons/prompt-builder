import {compose} from "../compose.js";
import {decode, defaults, encode, load} from "../state.js";

// The configuration (exported: share links, drafts, files) and the editor state (never exported: the step, the
// open tab, undo, session tokens, connection test results). Every change goes through change().

const DRAFT = "pb-draft";
const EDITOR = "pb-editor";

export const store = {
  state: defaults(),
  view: {step: 1, mode: "guided", tab: "preview", pane: "configure", screen: 0, part: 0, file: 0, persona: undefined,
    previewPage: undefined, undo: [], token: "", allowLive: false, tests: {}, notice: undefined, draft: undefined, lastChange: undefined},
  listeners: new Set()
};

export function onChange(listener) {
  store.listeners.add(listener);
}

function notify(kind) {
  for (const l of store.listeners) l(kind);
}

function safe(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

// Applies a mutation (or a whole new state). `undo` keeps the previous state for the toast's Undo button.
// `structural` redraws the form; text edits only refresh the outputs so focus stays where it is.
export function change(mutate, {structural = false, undo, message} = {}) {
  const before = structuredClone(store.state);
  let next = structuredClone(store.state);
  const result = mutate(next);
  if (result && typeof result === "object" && result.version) next = result;
  if (next.layout.auto && structural) next = compose(next);
  store.state = next;
  if (undo) {
    store.view.undo.push({label: undo, state: before});
    store.view.undo = store.view.undo.slice(-20);
  }
  if (message || undo) store.view.lastChange = {message: message ?? undo, canUndo: !!undo, at: Date.now()};
  persist();
  notify(structural ? "structure" : "text");
}

export function undo() {
  const last = store.view.undo.pop();
  if (!last) return;
  store.state = last.state;
  store.view.lastChange = {message: `Undid: ${last.label}`, canUndo: false, at: Date.now()};
  persist();
  notify("structure");
}

export function setView(patch, kind = "view") {
  Object.assign(store.view, patch);
  safe(() => localStorage.setItem(EDITOR, JSON.stringify({step: store.view.step, mode: store.view.mode, tab: store.view.tab})));
  notify(kind);
}

function persist() {
  history.replaceState(null, "", "#" + encode(store.state));
  safe(() => localStorage.setItem(DRAFT, JSON.stringify({savedAt: Date.now(), state: store.state})));
}

// Opens the link's design, or offers the last draft; a link that can't be opened says why.
export function boot() {
  const editor = safe(() => JSON.parse(localStorage.getItem(EDITOR) ?? "{}"), {});
  Object.assign(store.view, {step: editor.step ?? 1, mode: editor.mode ?? "guided", tab: editor.tab ?? "preview"});
  const hash = location.hash.slice(1);
  if (hash) {
    const opened = decode(hash);
    if (opened.state) {
      store.state = opened.state;
      store.view.notice = opened.notice;
    } else {
      store.view.notice = `${opened.error} A blank design opened instead.`;
    }
  } else {
    const draft = safe(() => JSON.parse(localStorage.getItem(DRAFT) ?? "null"), null);
    const opened = draft && load(draft.state);
    if (opened?.state) store.view.draft = {savedAt: draft.savedAt, state: opened.state, name: opened.state.app.name};
    store.view.step = 1;
  }
  history.replaceState(null, "", "#" + encode(store.state));
}

// A share link pasted into an open builder tab: load it (the previous design stays one Undo away).
export function openHash() {
  const hash = location.hash.slice(1);
  if (!hash || hash === encode(store.state)) return;
  const opened = decode(hash);
  if (!opened.state) {
    store.view.notice = `${opened.error} Your design is unchanged.`;
    history.replaceState(null, "", "#" + encode(store.state));
    notify("view");
    return;
  }
  store.view.undo.push({label: "open a link", state: store.state});
  store.state = opened.state;
  store.view.notice = opened.notice;
  store.view.lastChange = {message: "Opened the design from the link.", canUndo: true, at: Date.now()};
  persist();
  notify("structure");
}

export function restoreDraft(yes) {
  const draft = store.view.draft;
  store.view.draft = undefined;
  if (yes && draft) {
    store.state = draft.state;
    persist();
  }
  notify("structure");
}

export function importConfig(json) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return "The file isn't JSON.";
  }
  const opened = load(parsed.config ?? parsed);
  if (!opened.state) return opened.error;
  change(() => opened.state, {structural: true, undo: "import a configuration", message: opened.notice ?? "Imported the configuration."});
  return undefined;
}

// The configuration file: the design only. Connections keep their URLs; tokens are never part of the state.
export function exportConfig() {
  return JSON.stringify({kind: "bal-commons-prompt-builder", version: store.state.version, exportedAt: new Date().toISOString(), config: store.state}, null, 2);
}
