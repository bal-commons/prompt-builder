import {CAPABILITIES, IDPS, LAYOUTS, SERVICES} from "../catalog.js";
import {files, wfNames} from "../code.js";
import {diagnostics} from "../compose.js";
import {architectureSvg} from "../diagram.js";
import {seedFile} from "../identity.js";
import {enabledServices, integrationsOf, managedIntegrations, newIntegrations, workflowsOf} from "../state.js";
import {h} from "./dom.js";
import {connectionStatus, connectionTargets, STATUS_TEXT, STEPS, stepOf, technicalSettings} from "./steps.js";
import {change, exportConfig, importConfig, setView, store} from "./store.js";

const edit = (id) => h("button", {type: "button", class: "link", onclick: () => setView({step: stepOf(id)}, "structure")}, "Edit");

function block(title, step, ...body) {
  return h("section", {class: "summary"}, h("div", {class: "summary-head"}, h("h3", {}, title), edit(step)), ...body);
}

// What developers must supply before the generated ecosystem runs for real.
export function toSupply(st) {
  const out = [];
  if (workflowsOf(st).length) out.push("A Temporal server: `temporal server start-dev` locally, or a cluster.");
  if (newIntegrations(st).some((i) => i.workflows.some((w) => w.kind === "agent"))) out.push("A model: a WSO2 AI token (`[ballerina.ai.wso2ProviderConfig]`) or another ballerinax/ai provider with tool calling.");
  const idp = IDPS.find((i) => i.id === st.identity.idp.kind);
  const seed = seedFile(st);
  if (idp.id !== "none") out.push(`${idp.name}, loaded with ${seed ? seed[0] : "the roles, users and a public PKCE client"}; change the development passwords.`);
  else out.push("Nothing for sign-in yet: development mode trusts x-user-* headers. Add an identity provider before others use it.");
  for (const int of integrationsOf(st).filter((i) => i.source === "existing")) {
    out.push(`${int.title} running with its management API enabled (\`enableManagementApi = true\`), reachable at the URL the proxy names.`);
  }
  out.push("Secrets: every `change-me` in the Config.toml files (API key, webhook secret, link secret, database password).");
  if (st.db !== "h2") out.push(`A ${st.db === "postgresql" ? "PostgreSQL" : "MySQL"} database per package.`);
  if (st.custom.some((c) => c.api)) out.push("The data behind custom components' endpoints.");
  return out;
}

export function reviewStep() {
  const st = store.state;
  const issues = diagnostics(st);
  const blockers = issues.filter((i) => i.level === "blocker");
  const warnings = issues.filter((i) => i.level === "warning");
  const services = enabledServices(st).map((id) => SERVICES.find((s) => s.id === id).name);
  const targets = connectionTargets(st);
  const mocked = targets.filter(([key]) => connectionStatus(key) === "mock").map(([, , , , label]) => label);
  const generated = files(st).map(([p]) => p);
  const idp = IDPS.find((i) => i.id === st.identity.idp.kind);
  const fix = (i) => i.fix ? h("button", {type: "button", class: "link", onclick: () => change(() => i.fix(store.state), {structural: true, undo: i.fixLabel, message: `${i.fixLabel}: done.`})}, i.fixLabel) : null;
  return [
    blockers.length
      ? h("div", {class: "banner blocker", role: "alert"}, h("strong", {}, `${blockers.length} thing${blockers.length > 1 ? "s" : ""} to fix before generating. `), "The list below links to each.")
      : h("div", {class: "banner ok", role: "status"}, h("strong", {}, "Ready to generate. "), warnings.length ? `${warnings.length} optional suggestion${warnings.length > 1 ? "s" : ""} below.` : "No issues found."),
    block("Your app", "describe", h("p", {}, h("strong", {}, st.app.name), st.app.description ? ` · ${st.app.description}` : "")),
    block("Identity", "identity", h("p", {}, `${idp.name} · ${st.identity.users.length} users · roles ${st.identity.roles.join(", ")}${st.identity.adminRoles.length ? ` (admins: ${st.identity.adminRoles.join(", ")})` : ""}`),
      h("p", {class: "small"}, `Claims: user ${st.identity.idp.userIdClaim}, roles ${st.identity.idp.rolesClaim}.${seedFile(st) ? ` Seed file: ${seedFile(st)[0]}.` : ""}`)),
    block("Architecture", "architecture", h("div", {class: "diagram", html: architectureSvg(st)}),
      h("ul", {}, integrationsOf(st).map((int) => h("li", {}, h("strong", {}, int.title), ` · ${int.source === "new" ? `new package ${int.pkg}` : `existing ${int.pkg}`}: `,
        int.workflows.map((w) => `${wfNames(w).display} (${w.kind}${(w.tasks ?? []).length ? `, ${(w.tasks ?? []).length} task${(w.tasks ?? []).length === 1 ? "" : "s"}` : ""}${w.approval?.on ? ", approval" : ""})`).join(", ") || "no workflows"))),
      services.length ? h("p", {class: "small"}, `Shared commons services: ${services.join(", ")}. Management APIs: ${managedIntegrations(st).map((i) => i.title).join(", ") || "none"}.`) : null),
    block("Capabilities", "capabilities", h("ul", {class: "tick"}, CAPABILITIES.map((c) => h("li", {class: st.capabilities[c.id] ? "yes" : "no"}, c.name, st.capabilities[c.id] ? "" : " (off)")))),
    block("Behavior", "behavior", h("ul", {},
      st.capabilities.tasks ? h("li", {}, `Human tasks: ${[st.behavior.tasks.inbox ? "a Tasks page with every task" : "", st.behavior.tasks.typePages.length ? `${st.behavior.tasks.typePages.length} page${st.behavior.tasks.typePages.length === 1 ? "" : "s"} for one kind of task` : ""].filter(Boolean).join(" and ") || "no task pages"}`) : null,
      st.capabilities.uploads ? h("li", {}, `Upload slots: ${st.behavior.uploads.slots.map((s) => `${s.label}${s.required ? "" : " (optional)"}`).join(", ")}`) : null,
      st.capabilities.notifications ? h("li", {}, `Notifications: bell opens ${st.bell.opens === "drawer" ? "a drawer" : "the Notifications page"}; notify on ${Object.entries(st.behavior.notifications.events).filter(([, v]) => v).map(([k]) => ({runStarted: "run started", taskAssigned: "task assigned", runFinished: "run finished"})[k]).join(", ") || "nothing"}`) : null)),
    block("Portal", "portal", h("p", {}, `Login screen, then ${LAYOUTS.find((l) => l.id === st.layout.shell).name.toLowerCase()} · ${st.layout.auto ? "suggested layout" : "your layout"}`),
      h("ul", {}, st.pages.map((p) => h("li", {}, h("strong", {}, p.title), ` · ${p.layout === "split" ? `two columns ${p.ratio}/${100 - p.ratio}` : "one column"}: ${[...p.columns[0], ...p.columns[1]].length} components`)))),
    block("Connections", "architecture",
      h("ul", {}, targets.map(([key, , , , label]) => h("li", {}, `${label}: `, h("span", {class: `status ${connectionStatus(key)}`}, STATUS_TEXT[connectionStatus(key)])))),
      mocked.length ? h("p", {class: "small"}, `Mocked in the preview: ${mocked.join(", ")}. The generated code always talks to the real services.`) : null),
    h("section", {class: "summary"}, h("h3", {}, "Developers must supply"), h("ul", {}, toSupply(st).map((t) => h("li", {}, t)))),
    issues.length ? h("section", {class: "summary"}, h("h3", {}, "Issues"),
      h("ul", {class: "issues"}, [...blockers, ...warnings].map((i) => h("li", {class: i.level},
        h("span", {class: "issue-level"}, i.level === "blocker" ? "Fix before generating" : "Suggestion"), " ", i.text, " ", fix(i),
        h("button", {type: "button", class: "link", onclick: () => setView({step: stepOf(i.step)}, "structure")}, `Go to ${STEPS[stepOf(i.step) - 1].short}`))))) : null,
    h("section", {class: "summary"}, h("h3", {}, "Outputs"), technicalSettings(),
      h("p", {class: "small"}, `The starter has ${generated.length} files across ${new Set(generated.map((p) => p.split("/").slice(0, 2).join("/"))).size} folders (${[...new Set(generated.map((p) => p.split("/").slice(0, p.startsWith("backend/") ? 2 : 1).join("/")))].join(", ")}), PROMPTS.md and a README.`),
      h("div", {class: "actions"},
        h("button", {type: "button", class: "primary", disabled: blockers.length > 0, "aria-describedby": blockers.length ? "gen-blocked" : undefined,
          onclick: () => document.getElementById("download").click()}, "Download starter (.zip)"),
        h("button", {type: "button", onclick: () => setView({tab: "prompts", pane: "preview"}, "structure")}, "Open the prompts"),
        h("button", {type: "button", onclick: () => document.getElementById("share").click()}, "Copy share link"),
        h("button", {type: "button", onclick: () => save(new Blob([exportConfig()], {type: "application/json"}), `${slugOf(st)}.builder.json`)}, "Export configuration"),
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

// A file-name-safe name for the app.
export const slugOf = (st) => st.app.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "app";

export function save(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = h("a", {href: url, download: name});
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
