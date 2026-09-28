import {ASSISTANTS, componentSummary, DOCS, docUrl, FRAMEWORKS, IDPS, serviceById, SERVICES, VERSIONS, WORKFLOW_UI} from "./catalog.js";
import {agentActivities, fieldName, proxies, wfNames} from "./code.js";
import {component, enabledServices, identifier, pageComponents, usedComponents, usesManagementApi} from "./state.js";

// Builds the prompts. Each part is a list of steps; the "full" style joins them into one prompt.
export function prompts(state) {
  const parts = [frontend(state), backend(state)];
  if (state.workflows.length) {
    parts.push(workflows(state));
  }
  return parts.map((part) => state.style === "full" ? {...part, steps: [join(part)]} : part);
}

function join(part) {
  return {
    title: part.title,
    body: `${part.intro}\n\n${part.steps.map((s, i) => `## Part ${i + 1}: ${s.title}\n\n${s.body}${s.check ? `\n\nDone when: ${s.check}` : ""}`).join("\n\n")}`
  };
}

const bullet = (items) => items.filter(Boolean).map((i) => `- ${i}`).join("\n");
const services = (state) => enabledServices(state).map((id) => SERVICES.find((s) => s.id === id));
const on = (state, id) => enabledServices(state).includes(id);
const used = (state) => usedComponents(state).map((id) => component(state, id));
const nameOf = (c) => c.tag ? `<${c.tag}>${c.start ? ` (${c.name})` : ""}` : c.name;
const slug = (text) => identifier(text, "custom").replace(/_/g, "-");
const agentsOf = (state) => state.workflows.filter((w) => w.kind === "agent");
const flowsOf = (state) => state.workflows.filter((w) => w.kind === "workflow");
const proxy = (state, path) => proxies(state).find(([p]) => p === path)?.[0] ?? path;

// The JSON Schema a start form renders, from the start input's fields.
export function inputSchema(fields) {
  const properties = {};
  for (const f of fields) {
    const p = {title: f.label || f.name};
    p.type = f.type === "number" || f.type === "integer" || f.type === "boolean" ? f.type : "string";
    if (f.type === "date") p.format = "date";
    if (f.type === "text") p.format = "textarea";
    if (f.type === "choice") p.enum = (f.options ?? []).map((o) => o.trim()).filter(Boolean);
    properties[fieldName(f)] = p;
  }
  return {type: "object", required: fields.filter((f) => f.required).map(fieldName), properties};
}

function describeWorkflow(wf) {
  const w = wfNames(wf);
  const input = wf.input.map((f) => `${fieldName(f)} (${f.type}${f.required ? "" : ", optional"})`).join(", ") || "nothing";
  if (wf.kind === "agent") {
    return `${w.display}: a durable agent. \`POST /api/start/${w.path}\` with ${input} spawns one for the caller${wf.chat ? `; it opens a chat between the caller and the agent, which takes part as participant \`${w.agentId}\`` : ""}.`;
  }
  const tasks = (wf.tasks ?? []).map((t) => `"${t.title || t.name}" for ${t.roles.join(", ") || "anyone"}`).join(", then ");
  return `${w.display}: a workflow. \`POST /api/start/${w.path}\` with ${input} starts it; it waits for ${tasks || "no human task"}.`;
}

function context(state) {
  const idp = IDPS.find((i) => i.id === state.idp.kind);
  const list = services(state);
  return `App: ${state.app.name}.${state.app.description ? ` ${state.app.description}` : ""}
Roles: ${state.app.roles.join(", ")}${state.app.adminRoles.length ? `; ${state.app.adminRoles.join(", ")} see everyone's runs` : ""}.
${state.workflows.length ? `Workflows and agents (Ballerina workflow ${VERSIONS.workflow}); each start is a run with an ID like ${(state.app.idPrefix || "RUN").toUpperCase()}-1001:
${bullet(state.workflows.map(describeWorkflow))}` : "No workflows or agents yet."}${list.length ? `
Commons services (Ballerina Central org \`commons\`, version ${VERSIONS.commons}), all running in the backend process:
${bullet(list.map((s) => `${s.name}: \`${s.module}\`, port ${s.port}, base path ${s.basePath}. ${s.summary}`))}` : ""}${usesManagementApi(state) ? `
Human tasks and approvals come from the workflow app's management API (port 8234, \`/workflow\`).` : ""}
Sign-in: ${idp.id === "none" ? "none yet (development headers)" : `${idp.name} (OIDC)`}.${list.length ? `
Correlation rule: a run's ID is the \`correlationId\` of every conversation, upload case and notification about it.` : ""}`;
}

// ---------------------------------------------------------------- frontend

const packageOf = (c) => c.service === "workflow" || c.service === "workflow-start" ? WORKFLOW_UI : serviceById(c.service);

function frontend(state) {
  const fw = FRAMEWORKS.find((f) => f.id === state.frontend.framework);
  const idp = IDPS.find((i) => i.id === state.idp.kind);
  const plain = fw.id === "plain";
  const hub = state.layout.shell === "hub";
  const all = used(state);
  const packaged = all.filter((c) => c.tag);
  const packages = [...new Set(packaged.map((c) => packageOf(c).npm))];
  if (hub) packages.push("@bal-commons/hub-ui");
  const repos = [...new Set(packaged.map((c) => packageOf(c).repo))];
  const steps = [];

  steps.push({
    title: "Project and packages",
    body: `Create the frontend in \`frontend/\` with ${fw.name}. ${fw.note}
Serve it on port 5173 in development${plain ? " with Vite as a dev server only (`npx vite`, MIT), for its proxy; the app code stays plain ES modules with no build step" : ""}.
${packaged.length ? `
The ready-made UI comes from the bal-commons Web Components (Lit, Apache-2.0). They are not on npm yet, so build them from source:
\`\`\`sh
git clone https://github.com/bal-commons/module-commons-service-commons && (cd module-commons-service-commons/ui && npm install && npm run build)
${repos.map((r) => {
  const dir = r.split("/").pop();
  const atRoot = dir === "commons-workflow-ui";
  return `git clone ${r} && (cd ${dir}${atRoot ? "" : "/ui"} && npm install && npm run build)`;
}).join("\n")}${hub ? `
git clone ${DOCS.hubRepo} && (cd commons-hub-ui && npm install && npm run build)` : ""}
\`\`\`
${plain
  ? `Copy the single-file bundles into \`frontend/public/vendor/\` and load them with \`<script type="module">\`: ${packages.map((p) => `\`${p.split("/")[1]}.bundle.js\``).join(", ")}${hub ? " (the hub bundle already contains the notification, chat and attachment components)" : ""}. Once published, the same files come from \`https://cdn.jsdelivr.net/npm/<package>@${VERSIONS.ui}/dist/<name>.bundle.js\`.`
  : `Use \`npm link\` in each package directory, then \`npm link ${packages.join(" ")}\` in \`frontend/\`. Import each package once at startup to register its elements. Once published, \`npm install ${packages.join(" ")}\` replaces the links.`}
Read the components guide first: ${DOCS.guide}
` : ""}
In development, proxy these paths to the backend${packaged.length ? " (some components keep a server-sent events stream open, so the proxy must not buffer)" : ""}:
${bullet(proxies(state).map(([a, , b]) => `\`${a}\` → \`${b}\``))}`,
    check: `the dev server starts${packaged.length ? ", the component packages load without console errors" : ""}, and \`/api/app/runs\` answers through the proxy.`
  });

  steps.push({
    title: "Sign-in",
    body: idp.id === "none"
      ? `There is no identity provider yet. Add a persona switcher${state.header.includes("user-menu") ? " in the user menu" : " in the header"} with one user per role (${state.app.roles.join(", ")})${packaged.length ? ", and call `configureAuth(devUser(userId, roles))` from any bal-commons package at startup" : ""}. Send the identity to the app API and the start service as \`x-user-id\` and \`x-user-roles\` headers. Keep all of this in one \`auth\` module so it can be swapped for OIDC later.`
      : `Sign users in with ${idp.name} using the OIDC authorization code flow with PKCE (a public client: no client secret in the browser).
${bullet([
  `Client ID \`${state.idp.clientId}\`, authorize \`${state.idp.authorizeUrl}\`, token \`${state.idp.tokenUrl}\`, scopes \`${state.idp.scopes}\`, redirect URI \`http://localhost:5173/callback\`.`,
  plain ? "Write the PKCE flow by hand (about 60 lines: code verifier, S256 challenge, redirect, code exchange). No library." : "Use `oidc-client-ts` (Apache-2.0) for the flow.",
  `Keep the access token in sessionStorage. Read the user ID from the \`${state.idp.userIdClaim}\` claim and roles from \`${state.idp.rolesClaim}\`, only to shape the UI: the services check the token themselves.`,
  packaged.length ? "Call `configureAuth(bearer(() => token, () => signIn()))` once at startup, so every component sends the token and a 401 starts sign-in again." : "",
  "Send the same `Authorization: Bearer` header to the app API and the start service.",
  idp.defaults.selfSigned ? `${idp.name} uses a self-signed certificate in development: proxy the token endpoint through the dev server.` : ""
])}`,
    check: `you can sign in as a user of each role (${state.app.roles.join(", ")}).`
  });

  steps.push({title: "Layout and navigation", body: layoutText(state),
    check: "every page is reachable from the navigation, Back works, and the layout holds at 1280px and 390px wide."});

  steps.push({
    title: "The pages",
    body: `${state.pages.map((p) => pageText(state, p)).join("\n\n")}

The builder's Wireframe tab shows each page; follow its layout, not its styling.`,
    check: "each page shows its components in the stated columns and ratio, and selecting something in a list updates the components beside it."
  });

  if (packaged.length) {
    steps.push({
      title: "Wire the ready-made components",
      body: `Set each component's URL once, from one config module. The commons components keep themselves live; never poll their services.${hub ? `
\`<commons-hub>\` renders its panes' components itself; the notes below apply where your own pages embed one.` : ""}
${packaged.map((c) => `
### ${nameOf(c)}
${noteFor(state, c)}
Reference: ${c.service === "workflow-start" ? WORKFLOW_UI.docs("workflow-start-form") : docUrl(serviceById(c.service), c.tag)}`).join("\n")}${hub ? `

### <commons-hub>
Reference: ${DOCS.hub}` : ""}`,
      check: `a start form starts its workflow or agent${agentsOf(state).some((a) => a.chat) ? ", and a chat agent's conversation opens with its first message" : ""}${usesManagementApi(state) ? ", and a task completed in the task form leaves the inbox" : ""}.`
    });
  }

  const own = all.filter((c) => !c.tag);
  if (own.length) {
    steps.push({
      title: "The app's own components",
      body: `The app API (Ballerina, behind \`/api/app\`):
${bullet([
  "`GET /api/app/runs` lists the runs the caller started (everyone's for " + (state.app.adminRoles.join(", ") || "admin roles") + "): `id`, `workflow`, `title`, `status`, `conversationId`, `instanceId`, `createdAt`.",
  "`GET /api/app/runs/{id}` returns one.",
  ...state.custom.filter((c) => c.api && usedComponents(state).includes(c.id)).map((c) => `\`GET /api/app/${slug(c.name)}\` serves ${c.name} (the backend prompt adds it).`)
])}

${own.map((c) => `### ${c.name}\n${APP_NOTES[c.id] ? APP_NOTES[c.id](state) : customNote(c)}`).join("\n\n")}`,
      check: "the app's own components show live data from the app API."
    });
  }

  steps.push({
    title: "Look and feel",
    body: `${packaged.length ? "Match the app's design through the components' CSS custom properties on `:root` (`--bc-accent`, `--bc-font`, `--bc-radius`, `--bc-bg`, `--bc-surface`, `--bc-border`, …) and their `::part()`s; don't restyle their internals. " : ""}Use one set of design tokens for the app's own components too. Keep dark mode (\`prefers-color-scheme\`) and keyboard access. No horizontal scroll at 390px.`,
    check: "the pages look consistent in light and dark mode, and there are no console errors while you use every page."
  });

  return {
    id: "frontend",
    title: "Frontend",
    assistant: ASSISTANTS.claude.name,
    intro: `You are building the web frontend of a new app. Work in \`frontend/\`; the Ballerina backend is built separately (it runs on localhost).

${context(state)}

${packaged.length ? "Use the bal-commons Web Components where the design names them; build only the app's own components yourself. " : ""}Keep the code small and readable; no UI library beyond ${fw.name}${plain ? "" : " and what it needs"}. Use only dependencies whose licenses are compatible with Apache-2.0 (MIT, BSD, Apache), and list them in THIRD_PARTY_NOTICES.md.`,
    steps
  };
}

function headerText(state) {
  const items = state.header.map((id) => component(state, id)).filter(Boolean);
  if (!items.length) return "";
  const target = state.pages.find((p) => p.id === state.bell.opens);
  return `On the right of the header: ${items.map(nameOf).join(", ")}.${state.header.includes("bell") ? ` Clicking the bell ${target
    ? `goes to the ${target.title} page`
    : "opens a drawer from the right, about 380px wide, holding `<commons-inbox>`; Escape, a click outside and a notification click close it"}.` : ""}`;
}

function layoutText(state) {
  const titles = state.pages.map((p) => p.title);
  const routes = state.pages.map((p) => `\`#/${p.id}\``).join(", ");
  const shell = state.layout.shell;
  if (shell === "hub") {
    const panes = state.layout.hubPanes;
    return `The app is one \`<commons-hub>\` (${DOCS.hub}) filling the viewport, with \`panes="${panes.join(" ")}"\` and the URLs of the services those panes use, \`me\` set to the signed-in user ID and \`routing="hash"\`${state.app.adminRoles.length && panes.includes("files") ? `; set \`admin\` for ${state.app.adminRoles.join(", ")}` : ""}. Put the app's name in \`slot="brand"\`${state.header.includes("user-menu") ? " and the user menu in `slot=\"nav-end\"`" : ""}.
The app's own pages are extra panes: ${state.pages.map((p) => `\`<section pane="${p.id}" label="${p.title}">\``).join(", ")}; lay each out as the next step describes.`;
  }
  const nav = shell === "sidebar"
    ? `A left sidebar (about 220px) lists the pages: ${titles.join(", ")}.${state.layout.collapsible ? " A toggle at its bottom collapses it to a 56px rail of icons with tooltips; remember the choice in localStorage." : ""} A header runs across the content with the current page's title.`
    : `A header holds the app name and the pages as links: ${titles.join(", ")}.`;
  return `${nav}
${headerText(state)}
Each page has its own route (${routes}); the first is the home page and Back moves between them. Below 720px wide ${shell === "sidebar" ? "the sidebar becomes a drawer behind a menu button, and " : "the links move into a menu, and "}two-column pages stack their columns (the left one first; when something is selected, show the right one with a Back link). A selected run or task goes in the route (e.g. \`#/${state.pages[0]?.id ?? "home"}/RUN-1001\`) so links can open it.`;
}

function pageText(state, page) {
  const cols = pageComponents(page);
  const list = (ids) => ids.map((id) => component(state, id)).filter(Boolean).map(nameOf).join(", ") || "(empty)";
  const layout = cols.length === 1
    ? `One column: ${list(cols[0])}.`
    : `Two columns, ${page.ratio}% / ${100 - page.ratio}%.${page.collapsible ? " The left column collapses to a 40px strip with a toggle at its top edge (the right column then takes the full width); remember it per page." : ""}
- Left: ${list(cols[0])}
- Right: ${list(cols[1])}`;
  const ids = cols.flat();
  const has = (id) => ids.includes(id);
  const starts = ids.filter((id) => id.startsWith("start:"));
  const rules = [];
  if (starts.length && has("conversation")) rules.push("After a start form starts a chat agent, show its conversation (`detail.response.conversationId` of `workflow-started`).");
  if (starts.length && has("runs")) rules.push("After a start form starts something, refresh My runs and select the new run.");
  if (has("runs") && has("conversation")) rules.push("Selecting a run shows its conversation (`conversationId`); a run without one shows its status instead.");
  if (has("runs") && has("task-inbox")) rules.push("Selecting a run narrows the task inbox to its tasks (`instance-id` = the run's `instanceId`); clearing the selection shows all.");
  if (has("task-inbox") && has("task-form")) rules.push("Selecting a task in the inbox opens it in the task form (`kind` and `task-id` from `detail.task`).");
  if (has("conversation-list") && has("conversation")) rules.push("Selecting a conversation in the list shows it in the conversation.");
  if (has("case-list") && has("file-viewer") && has("upload-case")) rules.push("Selecting a case shows it: the upload card while it is OPEN and the user is one of its subjects, otherwise the file viewer.");
  else if (has("case-list") && (has("file-viewer") || has("upload-case"))) rules.push(`Selecting a case shows it in the ${has("file-viewer") ? "file viewer" : "upload card"}.`);
  return `### ${page.title} (\`#/${page.id}\`)
${layout}${rules.length ? "\n" + bullet(rules) : ""}`;
}

function customNote(c) {
  return `Build it: ${c.description || "(no description yet)"}${c.api ? ` It reads \`/api/app/${slug(c.name)}\`.` : " Frontend only."}`;
}

const APP_NOTES = {
  "runs": (state) => `The caller's runs from \`GET /api/app/runs\`, newest first: title, which workflow or agent, status and age. Refresh after a start and every 15 seconds while the page is visible${state.workflows.length ? "" : " (there are no workflows yet)"}.`,
  "user-menu": (state) => `The signed-in user's name and roles${state.idp.kind === "none" ? ", the persona switcher" : ""}, and Sign out.`
};

function noteFor(state, c) {
  if (c.start) {
    const wf = state.workflows.find((w) => w.id === c.start);
    return `\`action\` = \`${proxy(state, "/api/start")}/${wfNames(wf).path}\`; set its \`schema\` property to this JSON Schema (the start input):
\`\`\`json
${JSON.stringify(inputSchema(wf.input), null, 2)}
\`\`\`
It posts the values as JSON and fires \`workflow-started\` with \`detail.response\` = \`{runId, instanceId, conversationId}\`.`;
  }
  const mgmt = proxy(state, "/api/workflow");
  switch (c.tag) {
    case "workflow-task-inbox": return `\`base-url\` = \`${mgmt}\`. It lists the caller's human tasks and approvals and polls. On \`workflow-task-select\`, open \`detail.task\` in the task form.`;
    case "workflow-task-form": return `\`base-url\` = \`${mgmt}\`, and \`kind\` + \`task-id\` from the inbox's selection. It renders the task's generated form (or Approve / Edit and approve / Reject for an approval) and completes it; the inbox refreshes by itself.`;
  }
  return COMPONENT_NOTES[c.tag]?.(state) ?? componentSummary(c);
}

const COMPONENT_NOTES = {
  "commons-notification-bell": (state) => `\`base-url\` = \`/api/notifications\`. On \`commons-bell-click\`, ${state.pages.some((p) => p.id === state.bell.opens) ? "navigate to the notifications page" : "open the inbox drawer"}.`,
  "commons-inbox": () => "`base-url` = `/api/notifications`; add `show-filters` on a full page. On `commons-notification-click`, open the run named by `event.detail.notification.correlationId`, or `actionUrl` when set.",
  "commons-conversation-list": () => "`base-url` = `/api/chat`, property `me` = the user ID, add `searchable`. On `commons-conversation-select`, show `event.detail.conversation.id` in the conversation.",
  "commons-conversation": (state) => `\`base-url\` = \`/api/chat\`, \`conversation-id\`, property \`me\` = the user ID${on(state, "attachment") ? ", and `attachments-url` = `/api/attachments` so an agent's upload requests render as upload cards in the chat" : ""}. It renders streamed agent replies, forms and typing itself; give it a fixed height.`,
  "commons-upload-case": () => "`base-url` = `/api/attachments`, `case-id`, property `me` = the user ID (others see it read-only).",
  "commons-case-list": (state) => `\`base-url\` = \`/api/attachments\`, property \`me\`${state.app.adminRoles.length ? `; set \`admin\` for ${state.app.adminRoles.join(", ")}` : ""}. On \`commons-case-select\`, show \`event.detail.case\`.`,
  "commons-file-viewer": (state) => `\`base-url\` = \`/api/attachments\`, \`case-id\`, property \`me\`${state.app.adminRoles.length ? `; set \`can-delete\` for ${state.app.adminRoles.join(", ")}` : ""}.`
};

// ---------------------------------------------------------------- backend

function backend(state) {
  const idp = IDPS.find((i) => i.id === state.idp.kind);
  const copilot = state.assistants.backend === "copilot";
  const steps = [];
  const chatAgents = agentsOf(state).filter((a) => a.chat && on(state, "chat"));

  steps.push({
    title: "Start from the generated project",
    body: `The builder generated a Ballerina ${VERSIONS.ballerina} package in \`backend/\` (download the starter): main.bal starts ${[...services(state).map((s) => s.name.toLowerCase()), usesManagementApi(state) && "the workflow management API"].filter(Boolean).join(", ") || "the app"} in this process; config.bal; types.bal; clients.bal; store.bal (the runs table); app.bal (\`/app/runs\`)${state.workflows.length ? "; start.bal (the start service); agents.bal / workflows.bal / activities.bal / hooks.bal (see the workflows prompt)" : ""}; Config.toml.
${copilot
  ? "Open `backend/` in VS Code with the Ballerina extension (WSO2 Integrator). Build it before you change anything."
  : "Read every generated file, then build it before changing anything. The commons and workflow packages' sources are under `~/.ballerina/repositories/central.ballerina.io/bala/` after the first build; read the definitions there instead of guessing APIs."}
\`\`\`sh
cd backend && bal build
\`\`\`
Rules for this package:
${bullet([
  "Every `transaction` block must go through `commons/service_commons.db:atomic`. Ballerina starts one transaction coordinator per package, and the commons services already use it.",
  "Keep secrets (API key, webhook secret, link secret, DB password) out of source control.",
  "The app calls the commons services with the service-account headers in clients.bal; users call them from the browser with their own token.",
  "Correlation: a run's ID is the correlationId of everything about it."
])}`,
    check: "`bal build` succeeds with no errors."
  });

  steps.push({
    title: idp.id === "none" ? "Development identity" : `Sign-in with ${idp.name}`,
    body: idp.id === "none"
      ? `No identity provider: the app and every service run with both auth schemes off, so they trust \`x-user-id\` / \`x-user-roles\` headers${usesManagementApi(state) ? " (the management API too, with `enableBasicAuth = false`)" : ""}. Development only; add an OIDC provider before anyone else uses the app.`
      : `Configure every \`auth\` section in Config.toml the same way: \`enableJwtAuth = true\`, \`jwtIssuer = "${state.idp.issuer}"\`, \`jwksUrl = "${state.idp.jwksUrl}"\`, \`userIdClaim = "${state.idp.userIdClaim}"\`, \`rolesClaim = "${state.idp.rolesClaim}"\`${idp.defaults.selfSigned ? ", `jwksVerifyTls = false` (development certificate)" : ""}, and \`enableApiKey = true\` with a strong \`apiKeyValue\` equal to \`serviceApiKey\`.${usesManagementApi(state) ? " The management API needs `jwtAudience` too: the `aud` claim of the access tokens." : ""}
Set up ${idp.name} (${idp.url}, ${idp.license}):
${bullet(idp.setup)}
Create users for each role (${state.app.roles.join(", ")}) and check a token has the claims.`,
    check: idp.id === "none" ? "`curl -H 'x-user-id: alice' localhost:9090/app/runs` returns `[]`." : "`curl -H \"Authorization: Bearer $TOKEN\" localhost:9090/app/runs` returns `[]`, and without the header 401."
  });

  if (state.workflows.length) {
    steps.push({
      title: "The start service",
      body: `start.bal has one resource per workflow and agent on \`/start\`:
${bullet(state.workflows.map((wf) => {
  const w = wfNames(wf);
  const chat = chatAgents.includes(wf);
  return `\`POST /start/${w.path}\` takes \`${w.input}\`, takes the next run ID, ${chat ? `opens a conversation (correlationId = the run ID) between the caller and \`${w.agentId}\` (the agent's own identity in the chat), ` : ""}${wf.kind === "agent" ? `spawns \`${w.agentVar}\`` : `starts the \`${w.fn}\` workflow`} with the input plus \`runId\` and \`startedBy\`, records the run and returns \`{runId, instanceId, conversationId}\`.`;
}))}
Add validation where the input needs it (answer with \`service_commons:badRequest\`), and anything the app must do before a run starts.`,
      check: `\`POST /start/${wfNames(state.workflows[0]).path}\` returns 201 and \`GET /app/runs\` lists the run.`
    });
  }

  const customApis = state.custom.filter((c) => c.api && usedComponents(state).includes(c.id));
  if (customApis.length) {
    steps.push({
      title: "Endpoints for custom components",
      body: `Add a resource to the \`/app\` service in app.bal for each, scoped to the caller like the others:
${bullet(customApis.map((c) => `\`GET /app/${slug(c.name)}\` for ${c.name}: ${c.description || "(describe what it returns)"}`))}`,
      check: "each endpoint answers with the caller's identity and rejects anonymous calls."
    });
  }

  steps.push({
    title: "Database",
    body: state.db === "h2"
      ? "H2 files under `target/data/` work with no setup. The app and every service share one database, each with its own table prefix."
      : `Use ${state.db === "postgresql" ? "PostgreSQL" : "MySQL"}: every \`db\` section in Config.toml has \`dbType\`, \`url\`, \`user\` and \`password\`; the tables are created on start. Create the database and user first.`,
    check: "the backend starts and logs its applied migrations."
  });

  steps.push({
    title: state.deploy === "compose" ? "Run it with Docker Compose" : "Run it locally",
    body: state.deploy === "compose"
      ? `Write \`backend/Dockerfile\` (build with \`bal build\` in a \`ballerina/ballerina:${VERSIONS.ballerina}\` stage, run on \`eclipse-temurin:21-jre\`) and use the generated docker-compose.yml and nginx.conf. Put secrets in \`.env\` (git-ignored) and render Config.toml from them at start, so the image holds none.`
      : `Run \`bal run\` in \`backend/\`${state.workflows.length ? " with `temporal server start-dev` running" : ""}. Stop it with Ctrl+C rather than kill -9${state.workflows.length ? ": a killed worker can leave a Temporal poll that holds the next task for minutes" : ""}.`,
    check: `the app answers on :9090${services(state).length ? ` and each service on its port (${services(state).map((s) => s.port).join(", ")})` : ""}${usesManagementApi(state) ? ", and the management API on :8234" : ""}.`
  });

  return {
    id: "backend",
    title: "Backend",
    assistant: ASSISTANTS[state.assistants.backend].name,
    intro: `${copilot ? "Work in the Ballerina package in `backend/`. Make one change at a time and build after each." : "You are building the Ballerina backend of a new app, in `backend/`. Build after every change with `bal build`."}

${context(state)}${copilot ? `

APIs you will use:
${cheatSheet(state)}` : ""}`,
    steps
  };
}

function cheatSheet(state) {
  const lines = [];
  if (on(state, "notification")) lines.push("notification:Client `notifications`: `send({recipientType: USER|ROLE, recipientId, severity, title, body, correlationId, idempotencyKey})`.");
  if (on(state, "chat")) lines.push("chat:Client `chats`: `createConversation({correlationId, title, participants: [{participantId}, {participantType: chat:AGENT, participantId, displayName}]})`, `sendText(conversationId, text, senderId, id)`, `sendMessage(conversationId, {kind: chat:FORM|chat:ATTACHMENT_REF, content, senderId})`, `history(conversationId, afterSeq = n)`, `close(conversationId, reason, senderId)`.");
  if (on(state, "attachment")) lines.push("attachment:Client `attachments`: `createCase({idempotencyKey, correlationId, title, subjects, slots: [{name, label, mimeTypes, maxFiles}]})`, `close(caseId, reason)`.");
  lines.push("commons/service_commons.auth: `Authenticator`, `AuthInterceptor`, `callerOf(ctx)` gives `CallerIdentity {userId, roles, scopes}`.");
  if (state.workflows.length) lines.push("ballerina/workflow: `workflow:run(workflowFunction, input)` returns the instance ID; a durable agent's `run(query, input)` does the same.");
  return bullet(lines);
}

// ---------------------------------------------------------------- workflows and agents

function workflows(state) {
  const copilot = state.assistants.workflow === "copilot";
  const agents = agentsOf(state);
  const flows = flowsOf(state);
  const steps = [];

  steps.push({
    title: "Run them as generated",
    body: `Configure:
${bullet([
  "Temporal: `temporal server start-dev` locally (`[ballerina.workflow] mode = \"LOCAL\"`, `url = \"localhost:7233\"`), or a cluster with `mode = \"SELF_HOSTED\"`.",
  agents.length ? "The agents' model: the WSO2 default provider, `[ballerina.ai.wso2ProviderConfig]` with `serviceUrl` and `accessToken` in Config.toml (VS Code: Ballerina → Configure default model provider), or replace `ai:getDefaultModelProvider()` in agents.bal with a ballerinax/ai.* provider that supports tool calling." : "",
  agents.some((a) => a.chat || a.uploads) ? "Webhooks: Config.toml registers each chat agent's participant ID with the chat service (and upload agents with the attachment service). `url` is this app's `/hooks/...` receiver and `secret` must equal `webhookSecret`. hooks.bal verifies each delivery, drops repeats, finds the run by correlationId and hands the event to that run's agent with `sendData(instanceId, \"chat\", event)`." : "",
  usesManagementApi(state) ? "The management API (`[ballerina.workflow.management.rest]`, port 8234) serves the task inbox and task forms: human tasks from `ctx->awaitHumanTask` and approvals from `approvalPolicy`. It decides who may see and complete each task from its roles." : ""
])}`,
    check: "starting each one from its start form creates a run, and the Temporal UI (http://localhost:8233 with `temporal server start-dev`) shows it."
  });

  for (const wf of agents) {
    const w = wfNames(wf);
    const acts = agentActivities(state, wf);
    steps.push({
      title: `Agent: ${w.display}`,
      body: `\`${w.agentVar}\` in agents.bal is a \`workflow:DurableAgent\`: one instance per run, input \`${w.start}\`, one \`chat\` event (MULTI_EVENT)${wf.chat ? `, and a conversation in which it speaks as \`${w.agentId}\`` : ""}. Its activities (activities.bal): ${acts.map((a) => `\`${a.id}\``).join(", ") || "none yet"}.
Its job: ${wf.purpose || "(describe it)"}
Rewrite its instructions for that job, keeping the generated rules (act only through tools, one message per person per turn, end a turn with exactly \`[done]\`, answer side questions in plain text). The process, one step per event kind (MESSAGE, FORM_ANSWER, UPLOAD, REMINDER), each naming its tools:
${wf.steps.filter(Boolean).map((s, i) => `${i + 1}. ${s}`).join("\n") || "(none yet)"}${wf.approval.on ? `
\`${wf.approval.activity}\` has an \`approvalPolicy\`: each call waits for ${wf.approval.userRoles.join(" or ") || "a person"} to approve it in the task inbox; a rejection returns their reason to the agent.` : ""}`,
      check: `a run of ${w.display} follows every step, and each turn ends without errors in the log.`
    });
  }

  for (const wf of flows) {
    const w = wfNames(wf);
    steps.push({
      title: `Workflow: ${w.display}`,
      body: `\`${w.fn}\` in workflows.bal waits for its human tasks in order with \`ctx->awaitHumanTask\`, then marks the run DONE:
${bullet((wf.tasks ?? []).map((t) => `"${t.title || t.name}" for ${t.roles.join(", ") || "anyone"}: its answer type is generated from the task's fields (${t.fields.map((f) => fieldName(f)).join(", ") || "none"}), and the management API turns that type into the form the task form shows.`))}
Add the real work between the tasks as \`@workflow:Activity\` functions called with \`ctx->callActivity\` (bind the result to a typed variable; \`_ = check ctx->callActivity(...)\` fails type inference). Branch on the answers (e.g. stop when a reviewer rejects). A risky activity can take \`approvalPolicy = {userRoles: ..., title: ...}\`, which puts an approval in the task inbox before it runs.`,
      check: `a run of ${w.display} reaches each task in the inbox, and completing them finishes the run.`
    });
  }

  steps.push({
    title: "Guardrails and durability",
    body: bullet([
      agents.length ? "The model decides what to do next; the rules that matter belong in the activities: check preconditions and return an error that tells the model what to do instead." : "",
      "Make every activity idempotent: idempotency keys on notifications and upload cases, deterministic chat message IDs (as generated). A retried activity must not act twice.",
      "Kill the backend while a run waits (Ctrl+C), start it again and continue: nothing is lost. Avoid kill -9 in development.",
      agents.length ? "A turn that exceeds `maxIter` fails the whole agent run (ballerina-library#9225): keep the stop rule and the activities quick." : "",
      usesManagementApi(state) ? "Workflow 0.10.0 reports `canComplete: false` on every approval; the task components allow for it (the decide endpoints still check roles)." : "",
      "Event, input and activity payloads must be plain data: records, strings, numbers, arrays."
    ]),
    check: "the kill-and-restart test passes for each workflow and agent."
  });

  return {
    id: "workflows",
    title: "Workflows and agents",
    assistant: ASSISTANTS[state.assistants.workflow].name,
    intro: `${copilot ? "Work in the Ballerina package in `backend/`." : "You are building the workflows and durable agents of a Ballerina app, in `backend/`."} They are Ballerina workflow ${VERSIONS.workflow} programs that the app starts through its start service and that people take part in through chat and tasks.

${context(state)}${copilot ? `

Workflow API (ballerina/workflow ${VERSIONS.workflow}):
${bullet([
  "`@workflow:Workflow function f(workflow:Context ctx, T input) returns R|error`; `workflow:run(f, input)` starts it.",
  "`T answer = check ctx->awaitHumanTask(\"name\", {...context}, userRoles = \"Role\", title = \"...\")` waits for a person; T's fields become the form.",
  "`R r = check ctx->callActivity(fn, {arg: value}, approvalPolicy = {userRoles: \"Role\", title: \"...\"})` runs an activity, optionally behind an approval.",
  "`final workflow:DurableAgent a = check new ({systemPrompt: {role, instructions}, model, inputType: T, activities: [{activity: fn, description, approvalPolicy?}], events: {chat: {request: E, response: string, cardinality: workflow:MULTI_EVENT}}, maxIter});` `a.run(query, input)`, `a.sendData(id, \"chat\", event)`, `a.waitForDataResult(id, token)`."
])}` : ""}`,
    steps
  };
}
