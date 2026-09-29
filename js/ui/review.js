import {CAPABILITIES, IDPS, LAYOUTS, SERVICES} from "../catalog.js";
import {files, wfNames} from "../code.js";
import {diagnostics} from "../compose.js";
import {enabledServices, usesManagementApi} from "../state.js";
import {h} from "./dom.js";
import {connectionStatus, neededConnections, STATUS_TEXT} from "./steps.js";
import {change, exportConfig, importConfig, setView, store} from "./store.js";

const edit = (step) => h("button", {type: "button", class: "link", onclick: () => setView({step}, "structure")}, "Edit");

function block(title, step, ...body) {
  return h("section", {class: "summary"}, h("div", {class: "summary-head"}, h("h3", {}, title), edit(step)), ...body);
}

// What developers must supply before the generated app runs for real.
export function toSupply(st) {
  const out = [];
  if (st.workflows.length) out.push("A Temporal server: `temporal server start-dev` locally, or a cluster.");
  if (st.workflows.some((w) => w.kind === "agent")) out.push("A model: a WSO2 AI token (`[ballerina.ai.wso2ProviderConfig]`) or another ballerinax/ai provider with tool calling.");
  const idp = IDPS.find((i) => i.id === st.idp.kind);
  if (idp.id !== "none") out.push(`${idp.name}: users for each role (${st.app.roles.join(", ")}) and a public client with PKCE.`);
  else out.push("Nothing for sign-in yet: development mode trusts x-user-* headers. Add an identity provider before others use it.");
  out.push("Secrets: every `change-me` in Config.toml (API key, webhook secret, link secret, database password).");
  if (st.db !== "h2") out.push(`A ${st.db === "postgresql" ? "PostgreSQL" : "MySQL"} database and user.`);
  if (st.custom.some((c) => c.api)) out.push("The data behind custom components' endpoints.");
  return out;
}

export function reviewStep() {
  const st = store.state;
  const issues = diagnostics(st);
  const blockers = issues.filter((i) => i.level === "blocker");
  const warnings = issues.filter((i) => i.level === "warning");
  const services = enabledServices(st).map((id) => SERVICES.find((s) => s.id === id).name);
  const needed = neededConnections(st);
  const mocked = needed.filter((c) => connectionStatus(c.id) === "mock").map((c) => c.name);
  const generated = files(st).map(([p]) => p);
  const fix = (i) => i.fix ? h("button", {type: "button", class: "link", onclick: () => change(() => i.fix(store.state), {structural: true, undo: i.fixLabel, message: `${i.fixLabel}: done.`})}, i.fixLabel) : null;
  return [
    blockers.length
      ? h("div", {class: "banner blocker", role: "alert"}, h("strong", {}, `${blockers.length} thing${blockers.length > 1 ? "s" : ""} to fix before generating. `), "The list below links to each.")
      : h("div", {class: "banner ok", role: "status"}, h("strong", {}, "Ready to generate. "), warnings.length ? `${warnings.length} optional suggestion${warnings.length > 1 ? "s" : ""} below.` : "No issues found."),
    block("Your demo", 1, h("p", {}, h("strong", {}, st.app.name), st.app.description ? ` · ${st.app.description}` : ""),
      h("p", {class: "small"}, `Roles: ${st.app.roles.join(", ")}${st.app.adminRoles.length ? ` · admins: ${st.app.adminRoles.join(", ")}` : ""}`)),
    block("Capabilities", 2, h("ul", {class: "tick"}, CAPABILITIES.map((c) => h("li", {class: st.capabilities[c.id] ? "yes" : "no"}, c.name, st.capabilities[c.id] ? "" : " (off)")))),
    block("Behavior", 3, h("ul", {}, st.workflows.map((w) => h("li", {}, h("strong", {}, wfNames(w).display), w.kind === "agent"
      ? ` · agent${w.chat ? ", opens a chat" : ""}${w.uploads ? ", asks for uploads" : ""}${w.approval.on ? `, ${w.approval.activity} needs approval` : ""} · starts with ${w.input.length} field${w.input.length === 1 ? "" : "s"}`
      : ` · workflow with ${(w.tasks ?? []).length} human task${(w.tasks ?? []).length === 1 ? "" : "s"} (${(w.tasks ?? []).map((t) => `${t.title}: ${t.fields.length} field${t.fields.length === 1 ? "" : "s"} for ${t.roles.join(", ") || "anyone"}`).join("; ")})`)),
      st.capabilities.uploads ? h("li", {}, `Upload slots: ${st.behavior.uploads.slots.map((s) => `${s.label}${s.required ? "" : " (optional)"}`).join(", ")}`) : null,
      st.capabilities.notifications ? h("li", {}, `Notifications: bell opens ${st.bell.opens === "drawer" ? "a drawer" : "the Notifications page"}; notify on ${Object.entries(st.behavior.notifications.events).filter(([, v]) => v).map(([k]) => ({runStarted: "run started", taskAssigned: "task assigned", runFinished: "run finished"})[k]).join(", ") || "nothing"}`) : null)),
    block("Portal", 4, h("p", {}, `${LAYOUTS.find((l) => l.id === st.layout.shell).name} · ${st.layout.auto ? "suggested layout" : "your layout"}`),
      h("ul", {}, st.pages.map((p) => h("li", {}, h("strong", {}, p.title), ` · ${p.layout === "split" ? `two columns ${p.ratio}/${100 - p.ratio}` : "one column"}: ${[...p.columns[0], ...p.columns[1]].length} components`)))),
    block("Services and connections", 5,
      h("p", {}, services.length ? `The backend runs: ${services.join(", ")}${usesManagementApi(st) ? ", the workflow management API" : ""}${st.workflows.length ? ", the start service" : ""}.` : "The backend runs only the app API."),
      h("ul", {}, needed.map((c) => h("li", {}, `${c.name}: `, h("span", {class: `status ${connectionStatus(c.id)}`}, STATUS_TEXT[connectionStatus(c.id)])))),
      mocked.length ? h("p", {class: "small"}, `Mocked in the preview: ${mocked.join(", ")}. The generated code always talks to the real services.`) : null),
    h("section", {class: "summary"}, h("h3", {}, "Developers must supply"), h("ul", {}, toSupply(st).map((t) => h("li", {}, t)))),
    issues.length ? h("section", {class: "summary"}, h("h3", {}, "Issues"),
      h("ul", {class: "issues"}, [...blockers, ...warnings].map((i) => h("li", {class: i.level},
        h("span", {class: "issue-level"}, i.level === "blocker" ? "Fix before generating" : "Suggestion"), " ", i.text, " ", fix(i),
        h("button", {type: "button", class: "link", onclick: () => setView({step: i.step}, "structure")}, `Go to step ${i.step}`))))) : null,
    h("section", {class: "summary"}, h("h3", {}, "Outputs"),
      h("p", {class: "small"}, `The starter has ${generated.length} files (${generated.map((p) => p.split("/").pop()).join(", ")}), PROMPTS.md with the frontend, backend${st.workflows.length ? " and workflow" : ""} prompts, and a README.`),
      h("div", {class: "actions"},
        h("button", {type: "button", class: "primary", disabled: blockers.length > 0, "aria-describedby": blockers.length ? "gen-blocked" : undefined,
          onclick: () => document.getElementById("download").click()}, "Download starter (.zip)"),
        h("button", {type: "button", onclick: () => setView({tab: "prompts", pane: "preview"}, "structure")}, "Open the prompts"),
        h("button", {type: "button", onclick: () => document.getElementById("share").click()}, "Copy share link"),
        h("button", {type: "button", onclick: () => save(new Blob([exportConfig()], {type: "application/json"}), `${st.app.pkg || "app"}.builder.json`)}, "Export configuration"),
        h("label", {class: "button"}, "Import configuration", h("input", {type: "file", accept: "application/json,.json", class: "visually-hidden", onchange: async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const problem = importConfig(await f.text());
          if (problem) setView({lastChange: {message: problem, canUndo: false, at: Date.now()}}, "structure");
        }}))),
      blockers.length ? h("p", {id: "gen-blocked", class: "error"}, "Fix the issues above to download the starter; the prompts and the share link work anyway.") : null,
      h("p", {class: "small"}, "Share links and exported files hold the design and live URLs, never tokens."))
  ];
}

export function save(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = h("a", {href: url, download: name});
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
