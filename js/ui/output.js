import {files} from "../code.js";
import {prompts} from "../prompts.js";
import {personasOf} from "../preview/mock.js";
import {screens, svg} from "../wireframe.js";
import {zip} from "../zip.js";
import {h, $} from "./dom.js";
import {seedFile} from "../identity.js";
import {newIntegrations, workflowsOf} from "../state.js";
import {save, slugOf, toSupply} from "./review.js";
import {exportConfig, setView, store} from "./store.js";

// The right-hand panel: the interactive preview, the wireframes, the prompts and the code.

export const TABS = [["preview", "Preview"], ["wireframe", "Wireframe"], ["prompts", "Prompts"], ["code", "Code"]];

let frame;
let frameReady = false;
let postTimer;

export async function copy(text, what) {
  try {
    await navigator.clipboard.writeText(text);
    setView({lastChange: {message: `Copied ${what}.`, canUndo: false, at: Date.now()}}, "toast");
  } catch {
    setView({lastChange: {message: "Copy failed: select the text and copy it.", canUndo: false, at: Date.now()}}, "toast");
  }
}

function subtabs(items, current, pick, label) {
  return h("div", {class: "subtabs", role: "group", "aria-label": label}, items.map((text, i) =>
    h("button", {type: "button", "aria-pressed": String(i === current), onclick: () => pick(i)}, text)));
}

// ---------------------------------------------------------------- preview

function editorForPreview() {
  const v = store.view;
  return {persona: v.persona, page: v.previewPage, allowLive: v.allowLive, token: v.token};
}

// Sends the configuration to the preview, debounced so typing stays smooth.
export function syncPreview(now = false) {
  clearTimeout(postTimer);
  const post = () => {
    if (frame && frameReady) frame.contentWindow.postMessage({type: "config", config: structuredClone(store.state), editor: editorForPreview()}, "*");
  };
  if (now) post();
  else postTimer = setTimeout(post, 250);
}

window.addEventListener("message", (e) => {
  if (!frame || e.source !== frame.contentWindow) return;
  const msg = e.data ?? {};
  if (msg.type === "preview-ready") {
    frameReady = true;
    syncPreview(true);
  }
  if (msg.type === "preview-persona") store.view.persona = msg.persona;
  if (msg.type === "preview-page") store.view.previewPage = msg.page;
  if (msg.type === "preview-note") setView({lastChange: {message: msg.text, canUndo: false, at: Date.now()}}, "toast");
});

function renderPreview(panel) {
  const st = store.state;
  const people = personasOf(st);
  const live = Object.values(st.connections).some((c) => c.mode === "live");
  if (!frame) {
    frame = h("iframe", {src: "preview.html", title: "Portal preview", class: "preview-frame"});
    frame.addEventListener("load", () => { frameReady = false; });
  }
  const send = (msg) => frame.contentWindow?.postMessage(msg, "*");
  const toolbar = h("div", {class: "preview-bar"},
    h("span", {class: "sample-badge", title: "Conversations, runs, tasks and files here are sample data; agent replies are simulated."},
      live ? "Mixed: sample and live data" : "Sample data · simulated agent"),
    h("label", {}, "View as ", h("select", {"aria-label": "Preview persona", onchange: (e) => { store.view.persona = e.target.value; syncPreview(true); }},
      people.map((p) => h("option", {value: p.id, selected: p.id === (store.view.persona ?? people[0]?.id)}, `${p.name} (${p.roles.join(", ")})`)))),
    h("details", {class: "menu"}, h("summary", {}, "Simulate"),
      h("div", {class: "menu-body"},
        h("button", {type: "button", onclick: () => send({type: "simulate", what: "fail-next"})}, "The next request fails"),
        h("button", {type: "button", onclick: () => send({type: "simulate", what: "latency", value: 1500})}, "Slow network (1.5 s)"),
        h("button", {type: "button", onclick: () => send({type: "simulate", what: "latency", value: 0})}, "Normal network"),
        h("button", {type: "button", onclick: () => send({type: "simulate", what: "other-reviewer"})}, "Another reviewer completes the open task"),
        h("button", {type: "button", onclick: () => send({type: "reset"})}, "Reset the sample data"))));
  // Moving an iframe reloads it: build the panel once, then only swap the toolbar.
  if (frame.parentNode !== panel) panel.replaceChildren(toolbar, frame);
  else panel.replaceChild(toolbar, panel.firstElementChild);
  syncPreview();
}

// ---------------------------------------------------------------- wireframe, prompts, code

function renderWireframe(panel) {
  const all = screens(store.state);
  const v = store.view;
  v.screen = Math.min(v.screen, all.length - 1);
  panel.replaceChildren(
    subtabs(all.map((x) => x.name), v.screen, (i) => setView({screen: i}, "output"), "Pages"),
    h("div", {class: "wireframe", html: svg(all[v.screen])}),
    h("div", {class: "legend"}, h("span", {class: "c"}, "bal-commons component"), h("span", {}, "the app's own"), h("span", {class: "x"}, "custom")),
    h("p", {class: "note"}, "Layout only. The Preview tab shows the same pages working, with sample data."));
}

export function markdown(parts) {
  return parts.map((p) => `# ${p.title} (${p.assistant})\n\n${p.steps.map((s, i) => `${p.steps.length > 1 ? `## Step ${i + 1}: ${s.title}\n\n` : ""}${p.steps.length > 1 && i === 0 ? p.intro + "\n\n" : ""}${s.body}${s.check ? `\n\nDone when: ${s.check}` : ""}`).join("\n\n")}`).join("\n\n---\n\n");
}

function renderPrompts(panel) {
  const parts = prompts(store.state);
  const v = store.view;
  v.part = Math.min(v.part, parts.length - 1);
  const part = parts[v.part];
  const stepped = part.steps.length > 1;
  const bodyOf = (s, i) => `${stepped && i === 0 ? part.intro + "\n\n" : ""}${s.body}${s.check ? `\n\nDone when: ${s.check}` : ""}`;
  panel.replaceChildren(
    subtabs(parts.map((p) => p.title), v.part, (i) => setView({part: i}, "output"), "Prompt parts"),
    h("div", {class: "part-head"}, h("h2", {}, part.title), h("span", {class: "badge"}, part.assistant), h("span", {class: "spacer"}),
      h("button", {type: "button", onclick: () => copy(markdown([part]), `the ${part.title.toLowerCase()} prompts`)}, "Copy all"),
      h("button", {type: "button", onclick: () => save(new Blob([markdown(parts)], {type: "text/markdown"}), "PROMPTS.md")}, "Download PROMPTS.md")),
    stepped ? h("p", {class: "note"}, "Paste one prompt at a time; move on when its check passes. The first one carries the context.") : null,
    ...part.steps.map((s, i) => h("article", {class: "prompt"},
      h("header", {}, h("strong", {}, stepped ? `${i + 1}. ${s.title}` : s.title),
        h("button", {type: "button", onclick: () => copy(bodyOf(s, i), "the prompt")}, "Copy")),
      h("pre", {}, stepped ? bodyOf({...s, check: undefined}, i) : s.body),
      s.check && stepped ? h("p", {class: "check"}, "Done when: " + s.check) : null)));
}

function renderCode(panel) {
  const list = files(store.state);
  const v = store.view;
  v.file = Math.min(v.file, list.length - 1);
  const [path, content] = list[v.file];
  panel.replaceChildren(
    h("p", {class: "note"}, "A starting point that compiles with Ballerina 2201.13.4: one package per new integration, the shared commons package and the identity seed file. The prompts build on it."),
    h("div", {class: "code"},
      h("nav", {class: "files", "aria-label": "Files"}, list.map(([p], i) => h("button", {type: "button", "aria-current": String(i === v.file),
        onclick: () => setView({file: i}, "output")}, p))),
      h("div", {class: "file-view"},
        h("div", {class: "file-head"}, h("strong", {}, path), h("button", {type: "button", onclick: () => copy(content, path)}, "Copy")),
        h("pre", {}, content))));
}

export function renderOutput() {
  const v = store.view;
  for (const [id] of TABS) {
    $(`tab-${id}`).setAttribute("aria-selected", String(v.tab === id));
    $(`tab-${id}`).tabIndex = v.tab === id ? 0 : -1;
    $(`panel-${id}`).hidden = v.tab !== id;
  }
  const panel = $(`panel-${v.tab}`);
  ({preview: renderPreview, wireframe: renderWireframe, prompts: renderPrompts, code: renderCode})[v.tab](panel);
  if (v.tab !== "preview") syncPreview();
}

// ---------------------------------------------------------------- starter

export function starter() {
  const st = store.state;
  const parts = prompts(st);
  const root = slugOf(st);
  const list = files(st);
  const entries = list.map(([p, c]) => [`${root}/${p}`, c]);
  const packages = [...new Set(list.map(([p]) => /^backend\/([^/]+)\//.exec(p)?.[1]).filter(Boolean))];
  const flows = workflowsOf(st).length > 0;
  const seed = seedFile(st);
  entries.push([`${root}/PROMPTS.md`, markdown(parts)]);
  entries.push([`${root}/builder-config.json`, exportConfig()]);
  entries.push([`${root}/README.md`, `# ${st.app.name}

${st.app.description}

Generated by the App Prompt Builder. \`builder-config.json\` is the design (no credentials); import it in the builder to
change it, or open this link: ${location.href.split("#")[0]}#${location.hash.slice(1)}

## What's here

${packages.map((p) => `- \`backend/${p}\`: ${p === "commons" ? "the shared commons services" : "an integration package"}`).join("\n")}${seed ? `\n- \`${seed[0]}\`: the identity provider's roles, users and portal client` : ""}

## Set up

You need Ballerina 2201.13.4 (\`bal\`), Java 21${flows ? ", the Temporal CLI" : ""} and Node.js 20+ for the frontend.

1. \`bal build\` in each package under \`backend/\`: the starter compiles as generated.
2. Replace every \`change-me\` in the Config.toml files; keep them out of version control.
3. ${flows ? "Start Temporal (`temporal server start-dev`), then " : ""}${seed ? "the identity provider with the seed file, then " : ""}\`bal run\` in ${packages.map((p) => `\`backend/${p}\``).join(", ")}.
4. Follow PROMPTS.md: the frontend, the backends${newIntegrations(st).some((i) => i.workflows.length) ? ", then the workflows and agents" : ""}. Each step ends with a check.

## You must supply

${toSupply(st).map((t) => `- ${t}`).join("\n")}
`]);
  entries.push([`${root}/.gitignore`, "backend/*/target/\nbackend/*/Config.toml\nfrontend/node_modules/\nfrontend/dist/\n.env\n"]);
  save(zip(entries), `${root}-starter.zip`);
}
