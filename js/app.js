import {ACTIVITIES, ASSISTANTS, DATABASES, DOCS, docUrl, FRAMEWORKS, IDPS, SERVICES} from "./catalog.js";
import {files} from "./code.js";
import {prompts} from "./prompts.js";
import {decode, defaults, encode} from "./state.js";
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
  for (const child of children.flat()) {
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
  const open = renderForm.open?.[id] ?? n <= 2;
  return h("details", {class: "step", open, ontoggle: (e) => { (renderForm.open ??= {})[id] = e.target.open; }},
    h("summary", {}, h("span", {class: "num"}, n), title, note ? h("span", {class: "summary-note"}, note) : null),
    h("div", {class: "step-body"}, ...body));
}

function renderForm() {
  const s = state;
  const form = $("form");
  const scroll = scrollY;
  form.replaceChildren(
    step(1, "The app", s.app.name,
      text("Name", () => s.app.name, (x, v) => { x.app.name = v; }),
      text("What it does", () => s.app.description, (x, v) => { x.app.description = v; }, {multiline: true}),
      h("div", {class: "row"},
        text("Business object", () => s.app.object, (x, v) => { x.app.object = v; }, {hint: "e.g. order, claim, ticket"}),
        text("ID prefix", () => s.app.idPrefix, (x, v) => { x.app.idPrefix = v; }, {hint: "IDs look like MR-1001"})),
      text("Roles", () => s.app.roles.join(", "), (x, v) => { x.app.roles = list(v); },
        {hint: "Comma separated. They must match the roles (groups) in the identity provider."}),
      h("div", {class: "field"}, h("span", {}, "Who opens a " + (s.app.object || "item")),
        h("select", {onchange: (e) => change((x) => { x.app.userRole = e.target.value; })},
          s.app.roles.map((r) => h("option", {value: r, selected: r === s.app.userRole}, r)))),
      h("div", {class: "field"}, h("span", {}, "Roles that see everything (admin)"),
        chips(s.app.roles, s.app.adminRoles, (x, v, on) => { x.app.adminRoles = toggleIn(x.app.adminRoles, v, on); })),
      h("div", {class: "row"},
        text("Ballerina org", () => s.app.org, (x, v) => { x.app.org = v; }),
        text("Package name", () => s.app.pkg, (x, v) => { x.app.pkg = v; })),
      h("div", {class: "field"}, h("span", {}, "Database"),
        radios("db", DATABASES, s.db, (x, v) => { x.db = v; }))),

    step(2, "Services and UI", Object.values(s.services).filter((x) => x.on).length + " services",
      ...SERVICES.map((service) => {
        const sel = s.services[service.id];
        return h("div", {class: "service" + (sel.on ? "" : " off")},
          h("header", {}, h("label", {}, h("input", {type: "checkbox", checked: sel.on,
            onchange: (e) => change((x) => { x.services[service.id].on = e.target.checked; }, true)}), service.name),
          h("a", {href: service.repo, target: "_blank", rel: "noopener"}, service.module)),
          h("p", {}, service.summary),
          ...service.components.map((c) => h("div", {class: "component"},
            h("input", {type: "checkbox", id: `c-${c.tag}`, checked: sel.components.includes(c.tag), disabled: !sel.on,
              onchange: (e) => change((x) => { x.services[service.id].components = toggleIn(x.services[service.id].components, c.tag, e.target.checked); }, true)}),
            h("label", {for: `c-${c.tag}`}, c.name, " ", h("code", {}, `<${c.tag}>`)),
            h("a", {href: docUrl(service, c.tag), target: "_blank", rel: "noopener"}, "docs"),
            h("span", {class: "desc"}, c.summary))));
      }),
      h("div", {class: "field"}, h("span", {}, "Frontend"),
        h("select", {onchange: (e) => change((x) => { x.frontend.framework = e.target.value; }, true)},
          FRAMEWORKS.map((f) => h("option", {value: f.id, selected: f.id === s.frontend.framework}, f.name))),
        h("small", {}, FRAMEWORKS.find((f) => f.id === s.frontend.framework).note)),
      h("div", {class: "field"}, h("span", {}, "Layout"),
        radios("layout", [
          {id: "hub", name: "One page", tag: "<commons-hub>", desc: "Notifications, chats and files as panes of one element, plus the app's own panes."},
          {id: "pages", name: "Separate pages", desc: "A header with the bell, and a page per feature."}
        ], s.frontend.layout, (x, v) => { x.frontend.layout = v; }),
        h("small", {}, h("a", {href: DOCS.hub, target: "_blank", rel: "noopener"}, "commons-hub docs"), " · ",
          h("a", {href: DOCS.guide, target: "_blank", rel: "noopener"}, "components guide")))),

    step(3, "Sign-in", IDPS.find((i) => i.id === s.idp.kind).name,
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
            {hint: "An array or a comma list; dotted paths for nested claims"}))])),

    step(4, "Durable agent", s.agent.on ? s.agent.name : "off",
      h("label", {class: "chip"}, h("input", {type: "checkbox", checked: s.agent.on,
        onchange: (e) => change((x) => { x.agent.on = e.target.checked; }, true)}), "An AI agent owns each " + (s.app.object || "item")),
      ...(!s.agent.on ? [] : [
        h("div", {class: "row"},
          text("Agent name", () => s.agent.name, (x, v) => { x.agent.name = v; }, {hint: "Its chat ID is agent:<name>"}),
          text("Display name", () => s.agent.displayName, (x, v) => { x.agent.displayName = v; })),
        text("Its job", () => s.agent.purpose, (x, v) => { x.agent.purpose = v; }, {multiline: true}),
        text("The process, one step per line", () => s.agent.steps.join("\n"), (x, v) => { x.agent.steps = v.split("\n"); },
          {multiline: true, hint: "Name the tools each step calls; events are MESSAGE, FORM_ANSWER, UPLOAD and REMINDER."}),
        h("div", {class: "field"}, h("span", {}, "Activities (generated code)"),
          chips(ACTIVITIES.map((a) => a.id), s.agent.activities,
            (x, v, on) => { x.agent.activities = toggleIn(x.agent.activities, v, on); },
            (v) => !s.services[ACTIVITIES.find((a) => a.id === v).service].on),
          h("small", {}, "Each is a durable activity that calls a commons service; greyed-out ones need their service.")),
        h("label", {class: "chip"}, h("input", {type: "checkbox", checked: s.agent.approval.on,
          onchange: (e) => change((x) => { x.agent.approval.on = e.target.checked; }, true)}), "A person approves one activity first"),
        ...(!s.agent.approval.on ? [] : [
          h("div", {class: "field"}, h("span", {}, "Guarded activity"),
            h("select", {onchange: (e) => change((x) => { x.agent.approval.activity = e.target.value; })},
              s.agent.activities.map((a) => h("option", {value: a, selected: a === s.agent.approval.activity}, a)))),
          h("div", {class: "field"}, h("span", {}, "Approvers"),
            chips(s.app.roles, s.agent.approval.userRoles, (x, v, on) => { x.agent.approval.userRoles = toggleIn(x.agent.approval.userRoles, v, on); })),
          h("div", {class: "field"}, h("span", {}, "Administrators (can decide any)"),
            chips(s.app.roles, s.agent.approval.adminRoles, (x, v, on) => { x.agent.approval.adminRoles = toggleIn(x.agent.approval.adminRoles, v, on); }))]),
        h("div", {class: "field"}, h("span", {}, "Model"),
          radios("model", [
            {id: "wso2", name: "WSO2 default model provider", desc: "ai:getDefaultModelProvider(), configured in Config.toml or VS Code."},
            {id: "other", name: "Another ballerinax/ai.* provider", desc: "Any provider with tool calling; the prompt says what to change."}
          ], s.agent.model, (x, v) => { x.agent.model = v; }))])),

    step(5, "Assistants and output", s.style === "steps" ? "step by step" : "one prompt each",
      h("p", {class: "note"}, "Frontend: ", h("a", {href: ASSISTANTS.claude.url, target: "_blank", rel: "noopener"}, "Claude Code"), "."),
      h("div", {class: "field"}, h("span", {}, "Backend"),
        radios("backend", [{id: "claude", name: "Claude Code"}, {id: "copilot", name: "Ballerina Copilot", desc: "Prompts carry the API cheat sheet; one change per prompt."}],
          s.assistants.backend, (x, v) => { x.assistants.backend = v; })),
      ...(s.agent.on ? [h("div", {class: "field"}, h("span", {}, "Durable agent"),
        radios("workflow", [{id: "claude", name: "Claude Code"}, {id: "copilot", name: "Ballerina Copilot"}],
          s.assistants.workflow, (x, v) => { x.assistants.workflow = v; }))] : []),
      h("div", {class: "field"}, h("span", {}, "Prompts"),
        radios("style", [
          {id: "steps", name: "Step by step", desc: "Small prompts with a check after each. Better results."},
          {id: "full", name: "One prompt per part", desc: "Everything at once, for a long unattended run."}
        ], s.style, (x, v) => { x.style = v; })),
      h("div", {class: "field"}, h("span", {}, "Run it with"),
        radios("deploy", [{id: "compose", name: "Docker Compose", desc: "Adds docker-compose.yml and nginx.conf."},
          {id: "local", name: "Locally", desc: "bal run, temporal server start-dev, the frontend dev server."}],
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
    h("div", {class: "legend"}, h("span", {class: "c"}, "bal-commons component"), h("span", {}, "the app's own UI")),
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
      state.agent.on ? ", the durable agent, its activities and webhook receivers" : "", ". The prompts build on it."),
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
  entries.push([`${root}/README.md`, `# ${state.app.name}\n\n${state.app.description}\n\nGenerated by the App Prompt Builder. Open this link to change the selection:\n${location.href}\n\n1. \`cd backend && bal build\`\n2. Follow PROMPTS.md: frontend, backend${state.agent.on ? ", durable agent" : ""}.\n\nReplace every \`change-me\` in backend/Config.toml before anyone else uses the app.\n`]);
  entries.push([`${root}/.gitignore`, "backend/target/\nbackend/Config.toml\nfrontend/node_modules/\nfrontend/dist/\n.env\n"]);
  save(zip(entries), `${root}-starter.zip`);
}

// ---------------------------------------------------------------- start

for (const tab of ["wireframe", "prompts", "code"]) {
  $(`tab-${tab}`).addEventListener("click", () => { view.tab = tab; renderOutput(); });
}
$("share").addEventListener("click", () => copy(location.href, "the link"));
$("reset").addEventListener("click", () => {
  if (confirm("Start over with the example selection?")) {
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
