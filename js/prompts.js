import {ASSISTANTS, componentSummary, DOCS, docUrl, FRAMEWORKS, IDPS, serviceById, SERVICES, VERSIONS, WORKFLOW_UI} from "./catalog.js";
import {agentActivities, packageState, proxies, wfNames} from "./code.js";
import {fieldName, startInputSchema} from "./contracts.js";
import {claimMap, devPassword, seedFile} from "./identity.js";
import {component, enabledServices, identifier, integrationOf, integrationsOf, managedIntegrations, newIntegrations, pageComponents,
  qualifiedTaskName, taskTypes, usedComponents, workflowsOf} from "./state.js";

// Builds the prompts. Each part is a list of steps; the "full" style joins them into one prompt.
export function prompts(state) {
  const parts = [frontend(state), backend(state)];
  if (newIntegrations(state).some((i) => i.workflows.length)) parts.push(workflows(state));
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
const nameOf = (c) => c.tag ? `<${c.tag}>${c.start || c.taskType ? ` (${c.name})` : ""}` : c.name;
const slug = (text) => identifier(text, "custom").replace(/_/g, "-");
const roles = (state) => state.identity.roles;
const admins = (state) => state.identity.adminRoles;
const idpOf = (state) => IDPS.find((i) => i.id === state.identity.idp.kind);
const taskKey = qualifiedTaskName;

// The JSON Schema a start form renders (shared with the preview).
export const inputSchema = startInputSchema;

// Where the portal reaches an integration, through its development proxy.
export const appPath = (int) => `/api/${int.pkg}/app`;
export const startPath = (int) => `/api/${int.pkg}/start`;
export const mgmtPath = (int) => `/api/${int.pkg}/workflow`;

function describeIntegration(state, int) {
  const items = int.workflows.map((wf) => {
    const w = wfNames(wf);
    const input = wf.input.map((f) => `${fieldName(f)} (${f.type}${f.required ? "" : ", optional"})`).join(", ") || "nothing";
    if (wf.kind === "agent") {
      return `${w.display}: a durable agent${int.source === "new" ? `, started with \`POST ${startPath(int)}/${w.path}\` (${input})${wf.chat ? `; it opens a chat in which the agent takes part as \`${w.agentId}\`` : ""}` : ""}.`;
    }
    const tasks = (wf.tasks ?? []).map((t) => `"${t.title || t.name}" (\`${taskKey(wf, t)}\`) for ${t.roles.join(", ") || "anyone"}`).join(", then ");
    return `${w.display}: a workflow${int.source === "new" ? `, started with \`POST ${startPath(int)}/${w.path}\` (${input})` : `, started through its management API (\`workflowType: "${wf.fixedName ?? wf.name}"\`)`}; it waits for ${tasks || "no human task"}.`;
  });
  return `${int.title} (${int.source === "new" ? `new Ballerina package \`${int.org}/${int.pkg}\`` : `existing integration \`${int.org}/${int.pkg}\`${int.version ? ` ${int.version}` : ""}, imported from its workflow.def.json`}):
${bullet(items)}`;
}

function context(state) {
  const idp = idpOf(state);
  const list = services(state);
  const ints = integrationsOf(state).filter((i) => i.workflows.length || i.source === "new");
  return `App: ${state.app.name}.${state.app.description ? ` ${state.app.description}` : ""}
Identity: ${idp.id === "none" ? "no identity provider yet (development headers)" : `${idp.name} (OIDC); user ID in \`${state.identity.idp.userIdClaim}\`, roles in \`${state.identity.idp.rolesClaim}\``}. Roles: ${roles(state).join(", ")}${admins(state).length ? ` (${admins(state).join(", ")} can see everyone's runs)` : ""}. Initial users: ${state.identity.users.map((u) => `${u.username} (${u.roles.join(", ") || "no role"})`).join(", ")}.
Integrations (Ballerina workflow ${VERSIONS.workflow}); each start is a run with an ID like RUN-1001:
${ints.map((i) => describeIntegration(state, i)).join("\n")}${list.length ? `
Shared commons services (Ballerina Central org \`commons\`, version ${VERSIONS.commons}), in their own package (\`backend/commons\`):
${bullet(list.map((s) => `${s.name}: \`${s.module}\`, port ${s.port}, base path ${s.basePath}. ${s.summary}`))}` : ""}${managedIntegrations(state).length ? `
Human tasks and approvals come from each integration's workflow management API (\`/workflow\`).` : ""}
${behaviorLines(state)}${list.length ? "Correlation rule: a run's ID is the `correlationId` of every conversation, upload case and notification about it." : ""}`;
}

function behaviorLines(state) {
  const lines = [];
  if (state.capabilities?.uploads) {
    lines.push(`Upload slots (what an upload case asks for): ${state.behavior.uploads.slots.map((s) => `${s.label} (${s.mimeTypes.join(", ") || "any type"}, up to ${s.maxFiles}${s.required ? ", required" : ", optional"})`).join("; ")}.`);
  }
  const events = state.capabilities?.notifications ? Object.entries(state.behavior.notifications.events).filter(([, v]) => v).map(([k]) =>
    ({runStarted: "a run starts (its starter)", taskAssigned: "a task is assigned (its reviewer roles)", runFinished: "a run finishes (its starter)"})[k]) : [];
  if (events.length) lines.push(`The integrations send notifications when ${events.join(", when ")}.`);
  return lines.length ? lines.join("\n") + "\n" : "";
}

// ---------------------------------------------------------------- frontend

const packageOf = (c) => c.service === "workflow" || c.service === "workflow-start" ? WORKFLOW_UI : serviceById(c.service);

function frontend(state) {
  const fw = FRAMEWORKS.find((f) => f.id === state.frontend.framework);
  const idp = idpOf(state);
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
  return `git clone ${r} && (cd ${dir}${dir === "commons-workflow-ui" ? "" : "/ui"} && npm install && npm run build)`;
}).join("\n")}${hub ? `
git clone ${DOCS.hubRepo} && (cd commons-hub-ui && npm install && npm run build)` : ""}
\`\`\`
${plain
  ? `Copy the single-file bundles into \`frontend/public/vendor/\` and load them with \`<script type="module">\`: ${packages.map((p) => `\`${p.split("/")[1]}.bundle.js\``).join(", ")}${hub ? " (the hub bundle already contains the notification, chat and attachment components)" : ""}. Once published, the same files come from \`https://cdn.jsdelivr.net/npm/<package>@${VERSIONS.ui}/dist/<name>.bundle.js\`.`
  : `Use \`npm link\` in each package directory, then \`npm link ${packages.join(" ")}\` in \`frontend/\`. Import each package once at startup to register its elements. Once published, \`npm install ${packages.join(" ")}\` replaces the links.`}
Read the components guide first: ${DOCS.guide}
` : ""}
In development, proxy these paths to the backends${packaged.length ? " (some components keep a server-sent events stream open, so the proxy must not buffer)" : ""}:
${bullet(proxies(state).map(([a, , b]) => `\`${a}\` → \`${b}\``))}`,
    check: `the dev server starts${packaged.length ? ", the component packages load without console errors" : ""}, and each proxy path answers.`
  });

  steps.push({
    title: "The login screen and sign-in",
    body: `The first screen is the login screen: the app's name${state.identity.login.title ? ` ("${state.identity.login.title}")` : ""}${state.identity.login.subtitle ? `, "${state.identity.login.subtitle}"` : ""}, and ${idp.id === "none"
      ? `a list of the initial users to sign in as (development only): ${state.identity.users.map((u) => `${u.name} (${u.roles.join(", ")})`).join(", ")}. Signing in as one calls \`configureAuth(devUser(username, roles))\` and sends \`x-user-id\` / \`x-user-roles\` to every backend. Keep this in one \`auth\` module so OIDC can replace it.`
      : `a "Sign in with ${idp.name}" button. Use the OIDC authorization code flow with PKCE (a public client: no client secret in the browser):
${bullet([
  `Client ID \`${state.identity.idp.clientId}\`, authorize \`${state.identity.idp.authorizeUrl}\`, token \`${state.identity.idp.tokenUrl}\`, scopes \`${state.identity.idp.scopes}\`, redirect URI \`http://localhost:5173/callback\`.`,
  plain ? "Write the PKCE flow by hand (about 60 lines: code verifier, S256 challenge, redirect, code exchange). No library." : "Use `oidc-client-ts` (Apache-2.0) for the flow.",
  `Keep the access token in sessionStorage. Read the user ID from \`${state.identity.idp.userIdClaim}\` and the roles from \`${state.identity.idp.rolesClaim}\` only to shape the UI; every backend checks the token itself.`,
  packaged.length ? "Call `configureAuth(bearer(() => token, () => signIn()))` once, so every component sends the token and a 401 starts sign-in again." : "",
  "Send the same `Authorization: Bearer` header to every integration's app, start and management paths.",
  idp.defaults.selfSigned ? `${idp.name} uses a self-signed certificate in development: proxy the token endpoint through the dev server.` : ""
])}`}
After sign-in, show the portal; Sign out returns to the login screen.`,
    check: `you can sign in as ${state.identity.users.map((u) => u.username).join(", ")}${idp.id !== "none" ? ` (passwords from the identity seed file, e.g. \`${devPassword(state.identity.users[0] ?? {username: "user"})}\`)` : ""}, and each sees the portal.`
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
      check: `each start form starts its workflow or agent${workflowsOf(state).some((a) => a.chat) ? ", a chat agent's conversation opens with its greeting" : ""}${managedIntegrations(state).length ? ", and a task completed in the task form leaves the inbox" : ""}.`
    });
  }

  const own = all.filter((c) => !c.tag);
  if (own.length) {
    steps.push({
      title: "The app's own components",
      body: `${own.map((c) => `### ${c.name}\n${APP_NOTES[c.id] ? APP_NOTES[c.id](state) : customNote(state, c)}`).join("\n\n")}`,
      check: "the app's own components show live data from the integrations."
    });
  }

  steps.push({
    title: "Look and feel",
    body: `${packaged.length ? "Match the app's design through the components' CSS custom properties on `:root` (`--bc-accent`, `--bc-font`, `--bc-radius`, `--bc-bg`, `--bc-surface`, `--bc-border`, …) and their `::part()`s; don't restyle their internals. " : ""}Use one set of design tokens for the login screen and the app's own components too. Keep dark mode (\`prefers-color-scheme\`) and keyboard access. No horizontal scroll at 390px.`,
    check: "the pages look consistent in light and dark mode, and there are no console errors while you use every page."
  });

  return {
    id: "frontend",
    title: "Frontend",
    assistant: ASSISTANTS.claude.name,
    intro: `You are building the web portal of an app ecosystem. Work in \`frontend/\`; the backends (Ballerina integrations and shared commons services) are built separately and run on localhost.

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
    return `The app is one \`<commons-hub>\` (${DOCS.hub}) filling the viewport, with \`panes="${panes.join(" ")}"\` and the URLs of the services those panes use, \`me\` set to the signed-in user ID and \`routing="hash"\`${admins(state).length && panes.includes("files") ? `; set \`admin\` for ${admins(state).join(", ")}` : ""}. Put the app's name in \`slot="brand"\`${state.header.includes("user-menu") ? " and the user menu in `slot=\"nav-end\"`" : ""}.
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
  const inbox = ids.some((id) => id === "task-inbox" || id.startsWith("task-inbox@"));
  const starts = ids.filter((id) => id.startsWith("start:"));
  const rules = [];
  if (starts.length && has("conversation")) rules.push("After a start form starts a chat agent, show its conversation (`detail.response.conversationId` of `workflow-started`).");
  if (starts.length && has("runs")) rules.push("After a start form starts something, refresh My runs and select the new run.");
  if (has("runs") && has("conversation")) rules.push("Selecting a run shows its conversation (`conversationId`); a run without one shows its status instead.");
  if (has("runs") && inbox) rules.push("Selecting a run narrows the task inbox to its tasks (`instance-id` = the run's `instanceId`); clearing the selection shows all.");
  if (inbox && has("task-form")) rules.push("Selecting a task in an inbox opens it in the task form: `kind` and `task-id` from `detail.task`, and `base-url` = the management API of the inbox it came from.");
  if (has("conversation-list") && has("conversation")) rules.push("Selecting a conversation in the list shows it in the conversation.");
  if (has("case-list") && has("file-viewer") && has("upload-case")) rules.push("Selecting a case shows it: the upload card while it is OPEN and the user is one of its subjects, otherwise the file viewer.");
  else if (has("case-list") && (has("file-viewer") || has("upload-case"))) rules.push(`Selecting a case shows it in the ${has("file-viewer") ? "file viewer" : "upload card"}.`);
  return `### ${page.title} (\`#/${page.id}\`)
${layout}${rules.length ? "\n" + bullet(rules) : ""}`;
}

function customNote(state, c) {
  const int = newIntegrations(state)[0];
  return `Build it: ${c.description || "(no description yet)"}${c.api && int ? ` It reads \`${appPath(int)}/${slug(c.name)}\`.` : " Frontend only."}`;
}

const APP_NOTES = {
  "runs": (state) => `The caller's runs from every integration, merged and newest first: ${newIntegrations(state).map((i) => `\`GET ${appPath(i)}/runs\``).join(", ") || "(no new integration)"}. Each item has \`id\`, \`workflow\`, \`title\`, \`status\`, \`conversationId\`, \`instanceId\`, \`createdAt\`; show title, which workflow or agent, status and age. Refresh after a start and every 15 seconds while the page is visible.`,
  "user-menu": (state) => `The signed-in user's name and roles${state.identity.idp.kind === "none" ? ", switching user (back to the login screen)" : ""}, and Sign out.`
};

function noteFor(state, c) {
  if (c.start) {
    const wf = workflowsOf(state).find((w) => w.id === c.start);
    const int = integrationOf(state, wf.id);
    const schema = `\`\`\`json
${JSON.stringify(inputSchema(wf.input), null, 2)}
\`\`\``;
    return int.source === "new"
      ? `\`action\` = \`${startPath(int)}/${wfNames(wf).path}\`; set its \`schema\` property to this JSON Schema (the start input):
${schema}
It posts the values as JSON and fires \`workflow-started\` with \`detail.response\` = \`{runId, instanceId, conversationId}\`.`
      : `${int.title} is an existing integration: start it through its management API. \`action\` = \`${mgmtPath(int)}/workflows\`, \`workflow-type\` = \`${wf.fixedName ?? wf.name}\`, and \`schema\`:
${schema}
The form posts \`{workflowType, input}\`; \`detail.response\` is \`{workflowId, runId}\`.`;
  }
  const managed = managedIntegrations(state);
  if (c.taskType) {
    const type = taskTypes(state).find((t) => t.ref === c.taskType);
    return `\`base-url\` = \`${mgmtPath(type.integration)}\` and \`task-name\` = \`${taskKey(type.workflow, type.task)}\`: only "${type.task.title || type.task.name}" tasks. On \`workflow-task-select\`, open \`detail.task\` in the task form with the same base URL.`;
  }
  switch (c.tag) {
    case "workflow-task-inbox":
      return managed.length > 1
        ? `The tasks come from ${managed.length} integrations: show one \`<workflow-task-inbox>\` per integration, stacked, each with its heading: ${managed.map((i) => `${i.title} (\`base-url\` = \`${mgmtPath(i)}\`)`).join(", ")}. On \`workflow-task-select\`, open \`detail.task\` in the task form with that inbox's base URL. Title the section "Tasks", not "Inbox", so it isn't confused with the notification inbox.`
        : `\`base-url\` = \`${managed[0] ? mgmtPath(managed[0]) : "/api/<integration>/workflow"}\`. It lists the caller's human tasks and approvals (the work assigned to them) and polls. On \`workflow-task-select\`, open \`detail.task\` in the task form. Title it "Tasks", not "Inbox", so it isn't confused with the notification inbox.`;
    case "workflow-task-form":
      return "`base-url` = the management API of the inbox the task came from, and `kind` + `task-id` from the selection. A human task shows its context and a form generated from its answer type; an approval shows the proposed action with Approve / Edit and approve / Reject. It shows success only after the management API accepts the decision, reports a task someone else already completed (409), and the inbox refreshes by itself.";
  }
  return COMPONENT_NOTES[c.tag]?.(state) ?? componentSummary(c);
}

const COMPONENT_NOTES = {
  "commons-notification-bell": (state) => `\`base-url\` = \`/api/notifications\`. On \`commons-bell-click\`, ${state.pages.some((p) => p.id === state.bell.opens) ? "navigate to the notifications page" : "open the inbox drawer"}.`,
  "commons-inbox": (state) => `\`base-url\` = \`/api/notifications\`${({personal: "; `box=\"personal\"` and `hide-tabs` (personal notifications only)", role: "; `box=\"role\"` and `hide-tabs` (role notifications only)"})[state.behavior?.notifications?.scope] ?? ""}; add \`show-filters\` on a full page. On \`commons-notification-click\`, open the run named by \`event.detail.notification.correlationId\` (its conversation, or its tasks), or \`actionUrl\` when set. Keep it visually distinct from the task inbox: this one lists what happened, the task inbox lists work.`,
  "commons-conversation-list": () => "`base-url` = `/api/chat`, property `me` = the user ID, add `searchable`. On `commons-conversation-select`, show `event.detail.conversation.id` in the conversation.",
  "commons-conversation": (state) => `\`base-url\` = \`/api/chat\`, \`conversation-id\`, property \`me\` = the user ID${on(state, "attachment") ? ", and `attachments-url` = `/api/attachments` so an agent's upload requests render as upload cards in the chat" : ""}. It renders streamed agent replies, forms and typing itself; give it a fixed height.`,
  "commons-upload-case": () => "`base-url` = `/api/attachments`, `case-id`, property `me` = the user ID (others see it read-only).",
  "commons-case-list": (state) => `\`base-url\` = \`/api/attachments\`, property \`me\`${admins(state).length ? `; set \`admin\` for ${admins(state).join(", ")}` : ""}. On \`commons-case-select\`, show \`event.detail.case\`.`,
  "commons-file-viewer": (state) => `\`base-url\` = \`/api/attachments\`, \`case-id\`, property \`me\`${admins(state).length ? `; set \`can-delete\` for ${admins(state).join(", ")}` : ""}.`
};

// ---------------------------------------------------------------- backend

function backend(state) {
  const idp = idpOf(state);
  const copilot = state.assistants.backend === "copilot";
  const steps = [];
  const seed = seedFile(state);
  const ints = newIntegrations(state);

  steps.push({
    title: idp.id === "none" ? "Development identity" : `The identity provider: ${idp.name}`,
    body: idp.id === "none"
      ? `No identity provider: every backend runs with both auth schemes off, so it trusts the \`x-user-id\` / \`x-user-roles\` headers the portal sends for the signed-in user${managedIntegrations(state).length ? " (the management APIs too, with `enableBasicAuth = false`)" : ""}. Development only; choose an OIDC provider before anyone else uses the app.`
      : `${seed ? `Load the generated seed file \`${seed[0]}\`: it has the roles (${roles(state).join(", ")}), the initial users (${state.identity.users.map((u) => u.username).join(", ")}, with development passwords like \`${devPassword(state.identity.users[0] ?? {username: "user"})}\`), the portal client (\`${state.identity.idp.clientId}\`, public, PKCE, redirect \`http://localhost:5173/callback\`) and the claims below. ${idp.id === "keycloak" ? "Keycloak imports it with `start-dev --import-realm` from `/opt/keycloak/data/import/`." : "Thunder loads it at startup: `./start.sh <file>`."}` : `Set up ${idp.name} (${idp.url}, ${idp.license}):\n${bullet(idp.setup)}\nCreate the roles ${roles(state).join(", ")} and the users ${state.identity.users.map((u) => `${u.username} (${u.roles.join(", ")})`).join(", ")}.`}
Every backend reads the same claims:
${bullet(claimMap(state).map((c) => `${c.backend}: ${c.settings}`))}
Each has \`enableJwtAuth = true\`, \`jwtIssuer = "${state.identity.idp.issuer}"\` and \`jwksUrl = "${state.identity.idp.jwksUrl}"\`${idp.defaults.selfSigned ? " (and `jwksVerifyTls = false` for the development certificate)" : ""}; the generated Config.toml files already say so.`,
    check: idp.id === "none" ? "`curl -H 'x-user-id: alex' <an integration>/app/runs` returns `[]`." : `you can sign in as ${state.identity.users[0]?.username ?? "a user"} and the access token carries \`${state.identity.idp.userIdClaim}\` and \`${state.identity.idp.rolesClaim}\`.`
  });

  if (services(state).length) {
    steps.push({
      title: "The commons services",
      body: `\`backend/commons\` runs the shared ${services(state).map((s) => s.name.toLowerCase()).join(", ")} in one process (ports ${services(state).map((s) => s.port).join(", ")}). Its Config.toml sets their auth (the same claims), their database, CORS for the portal${services(state).some((s) => s.id === "chat" || s.id === "attachment") ? ", and the webhooks: each agent's participant ID and the `/hooks` URL of its integration" : ""}. \`apiKeyValue\` must equal every integration's \`serviceApiKey\`${services(state).some((s) => s.id === "chat" || s.id === "attachment") ? ", and each webhook `secret` its integration's `webhookSecret`" : ""}.
\`\`\`sh
cd backend/commons && bal build && bal run
\`\`\`
Every \`transaction\` block in any package that embeds commons code must go through \`commons/service_commons.db:atomic\` (one transaction coordinator per package).`,
      check: `each service answers on its port, e.g. \`curl localhost:${services(state)[0].port}${services(state)[0].basePath}/stream-ticket -X POST -H 'x-user-id: alex'\`.`
    });
  }

  for (const int of ints) {
    const p = packageState(state, int);
    steps.push({
      title: `Integration: ${int.title}`,
      body: `\`backend/${int.pkg}\` is the Ballerina ${VERSIONS.ballerina} package \`${int.org}/${int.pkg}\`: its app API on :${p.ports.app} (\`/app/runs\`${int.workflows.length ? ", `/start/<name>`" : ""})${p.mgmt ? `, its workflow management API on :${p.ports.mgmt}` : ""}${p.services.length ? `, and clients of the commons ${p.services.join(", ")} service${p.services.length > 1 ? "s" : ""} (URLs in Config.toml)` : ""}.
${copilot ? "Open it in VS Code with the Ballerina extension (WSO2 Integrator) and build it before you change anything." : "Read every generated file, then build it before changing anything. The commons and workflow packages' sources are under `~/.ballerina/repositories/central.ballerina.io/bala/` after the first build; read the definitions there instead of guessing APIs."}
\`\`\`sh
cd backend/${int.pkg} && bal build
\`\`\`
${int.workflows.length ? `The start service (start.bal) has one resource per workflow and agent:
${bullet(int.workflows.map((wf) => {
  const w = wfNames(wf);
  return `\`POST /start/${w.path}\` takes \`${w.input}\`, takes the next run ID, ${wf.kind === "agent" && wf.chat && p.services.includes("chat") ? `opens a conversation (correlationId = the run ID) with \`${w.agentId}\` as a participant, ` : ""}${wf.kind === "agent" ? `spawns \`${w.agentVar}\`` : `starts \`${w.fn}\``} with the input plus \`runId\` and \`startedBy\`, records the run and returns \`{runId, instanceId, conversationId}\`.`;
}))}
Add input validation where it's needed (\`service_commons:badRequest\`).` : "It has no workflows yet."}${int === ints[0] ? customEndpoints(state) : ""}`,
      check: `\`bal build\` succeeds, and ${int.workflows.length ? `\`POST localhost:${p.ports.app}/start/${wfNames(int.workflows[0]).path}\` returns 201` : `\`GET localhost:${p.ports.app}/app/runs\` returns \`[]\``}.`
    });
  }

  steps.push({
    title: "Databases",
    body: state.db === "h2"
      ? "H2 files under each package's `target/data/` work with no setup: the commons package and every integration keep their own."
      : `Use ${state.db === "postgresql" ? "PostgreSQL" : "MySQL"}: every \`db\` section has \`dbType\`, \`url\`, \`user\` and \`password\`; give each package its own database (or schema) and create them first.`,
    check: "every package starts and logs its applied migrations."
  });

  steps.push({
    title: state.deploy === "compose" ? "Run the ecosystem with Docker Compose" : "Run the ecosystem locally",
    body: state.deploy === "compose"
      ? `Write a Dockerfile per package (build with \`bal build\` in a \`ballerina/ballerina:${VERSIONS.ballerina}\` stage, run on \`eclipse-temurin:21-jre\`) and use the generated docker-compose.yml (${[idp.id !== "none" && idp.name, services(state).length && "commons", ...ints.map((i) => i.pkg), "web"].filter(Boolean).join(", ")}) and nginx.conf. Secrets go in \`.env\` (git-ignored); render each Config.toml from them at start.`
      : `Start ${[ints.some((i) => i.workflows.length) && "`temporal server start-dev`", idp.id !== "none" && idp.name, services(state).length && "`backend/commons`", ...ints.map((i) => `\`backend/${i.pkg}\``)].filter(Boolean).join(", then ")} (\`bal run\` in each package). Stop them with Ctrl+C rather than kill -9: a killed worker can leave a Temporal poll that holds the next task for minutes.`,
    check: "the portal's proxy paths all answer."
  });

  return {
    id: "backend",
    title: "Backends",
    assistant: ASSISTANTS[state.assistants.backend].name,
    intro: `${copilot ? "Work in the Ballerina packages in `backend/`. Make one change at a time and build after each." : "You are building the backends of an app ecosystem: Ballerina packages in `backend/`, one per integration plus the shared commons services. Build after every change with `bal build`."}

${context(state)}${copilot ? `

APIs you will use:
${cheatSheet(state)}` : ""}`,
    steps
  };
}

function customEndpoints(state) {
  const apis = state.custom.filter((c) => c.api && usedComponents(state).includes(c.id));
  if (!apis.length) return "";
  return `
Custom components need endpoints on its \`/app\` service, scoped to the caller like the others:
${bullet(apis.map((c) => `\`GET /app/${slug(c.name)}\` for ${c.name}: ${c.description || "(describe what it returns)"}`))}`;
}

function cheatSheet(state) {
  const lines = [];
  if (on(state, "notification")) lines.push("notification:Client `notifications`: `send({recipientType: USER|ROLE, recipientId, severity, title, body, correlationId, idempotencyKey})`.");
  if (on(state, "chat")) lines.push("chat:Client `chats`: `createConversation({correlationId, title, participants: [{participantId}, {participantType: chat:AGENT, participantId, displayName}]})`, `sendText(conversationId, text, senderId, id)`, `sendMessage(conversationId, {kind: chat:FORM|chat:ATTACHMENT_REF, content, senderId})`, `history(conversationId, afterSeq = n)`, `close(conversationId, reason, senderId)`.");
  if (on(state, "attachment")) lines.push("attachment:Client `attachments`: `createCase({idempotencyKey, correlationId, title, subjects, slots: [{name, label, mimeTypes, maxFiles}]})`, `close(caseId, reason)`.");
  lines.push("commons/service_commons.auth: `Authenticator`, `AuthInterceptor`, `callerOf(ctx)` gives `CallerIdentity {userId, roles, scopes}`.");
  lines.push("ballerina/workflow: `workflow:run(workflowFunction, input)` returns the instance ID; a durable agent's `run(query, input)` does the same.");
  return bullet(lines);
}

// ---------------------------------------------------------------- workflows and agents

function workflows(state) {
  const copilot = state.assistants.workflow === "copilot";
  const ints = newIntegrations(state).filter((i) => i.workflows.length);
  const steps = [];

  steps.push({
    title: "Run them as generated",
    body: `Configure:
${bullet([
  "Temporal: `temporal server start-dev` locally (`[ballerina.workflow] mode = \"LOCAL\"`, `url = \"localhost:7233\"`), or a cluster with `mode = \"SELF_HOSTED\"`. The integrations share the namespace; each has its own task queue.",
  ints.some((i) => i.workflows.some((w) => w.kind === "agent")) ? "The agents' model: the WSO2 default provider, `[ballerina.ai.wso2ProviderConfig]` with `serviceUrl` and `accessToken` in the integration's Config.toml (VS Code: Ballerina → Configure default model provider), or replace `ai:getDefaultModelProvider()` in agents.bal with a ballerinax/ai.* provider that supports tool calling." : "",
  ints.some((i) => i.workflows.some((w) => w.chat || w.uploads)) ? "Webhooks: the commons package's Config.toml registers each chat agent's participant ID with the chat service (and upload agents with the attachment service), pointing at its integration's `/hooks`. hooks.bal verifies each delivery, drops repeats, finds the run by correlationId and hands the event to that run's agent with `sendData(instanceId, \"chat\", event)`." : "",
  managedIntegrations(state).length ? "Each integration with human tasks or approvals serves its workflow management API (`[ballerina.workflow.management.rest]`); the task inbox and task form read it. It decides who may see and complete each task from the token's roles." : ""
])}`,
    check: "starting each one from its start form creates a run, and the Temporal UI (http://localhost:8233 with `temporal server start-dev`) shows it."
  });

  for (const int of ints) {
    const p = packageState(state, int);
    for (const wf of int.workflows) {
      const w = wfNames(wf);
      if (wf.kind === "agent") {
        const acts = agentActivities(p, wf);
        steps.push({
          title: `${int.title} · agent ${w.display}`,
          body: `\`${w.agentVar}\` in \`backend/${int.pkg}/agents.bal\` is a \`workflow:DurableAgent\`: one instance per run, input \`${w.start}\`, one \`chat\` event (MULTI_EVENT)${wf.chat ? `, and a conversation in which it speaks as \`${w.agentId}\`` : ""}. Its activities: ${acts.map((a) => `\`${a.id}\``).join(", ") || "none yet"}.
Its job: ${wf.purpose || "(describe it)"}${wf.chat && wf.greeting?.trim() ? `
start.bal posts its greeting ("${wf.greeting.trim()}") as soon as the chat opens, and the instructions tell the agent not to greet again.` : ""}
Rewrite its instructions for that job, keeping the generated rules (act only through tools, one message per person per turn, end a turn with exactly \`[done]\`, answer side questions in plain text). The process, one step per event kind (MESSAGE, FORM_ANSWER, UPLOAD, REMINDER):
${wf.steps.filter(Boolean).map((s, i) => `${i + 1}. ${s}`).join("\n") || "(none yet)"}${wf.approval.on ? `
\`${wf.approval.activity}\` has an \`approvalPolicy\`: each call waits for ${wf.approval.userRoles.join(" or ") || "a person"} to approve it in the task inbox; a rejection returns their reason to the agent.` : ""}`,
          check: `a run of ${w.display} follows every step, and each turn ends without errors in the log.`
        });
      } else {
        steps.push({
          title: `${int.title} · workflow ${w.display}`,
          body: `\`${w.fn}\` in \`backend/${int.pkg}/workflows.bal\` waits for its human tasks in order with \`ctx->awaitHumanTask\`, then marks the run DONE:
${bullet((wf.tasks ?? []).map((t) => `"${t.title || t.name}" (\`${taskKey(wf, t)}\`) for ${t.roles.join(", ") || "anyone"}${t.description ? ` ("${t.description}")` : ""}: it shows ${t.context ? (t.context.join(", ") || "no start fields") : "every start field"} beside the form; its answer type is generated from the task's fields (${t.fields.map((f) => fieldName(f)).join(", ") || "none"}), and the management API turns that type into the form the task form shows.`))}
Add the real work between the tasks as \`@workflow:Activity\` functions called with \`ctx->callActivity\` (bind the result to a typed variable; \`_ = check ctx->callActivity(...)\` fails type inference). Branch on the answers. A risky activity can take \`approvalPolicy = {userRoles: ..., title: ...}\`, which puts an approval in the task inbox before it runs.`,
          check: `a run of ${w.display} reaches each task in the inbox, and completing them finishes the run.`
        });
      }
    }
  }

  steps.push({
    title: "Guardrails and durability",
    body: bullet([
      "The model decides what to do next; the rules that matter belong in the activities: check preconditions and return an error that tells the model what to do instead.",
      "Make every activity idempotent: idempotency keys on notifications and upload cases, deterministic chat message IDs (as generated). A retried activity must not act twice.",
      "Kill an integration while a run waits (Ctrl+C), start it again and continue: nothing is lost. Avoid kill -9 in development.",
      "A turn that exceeds `maxIter` fails the whole agent run (ballerina-library#9225): keep the stop rule and the activities quick.",
      managedIntegrations(state).length ? "Workflow 0.10.0 reports `canComplete: false` on every approval; the task components allow for it (the decide endpoints still check roles)." : "",
      "Event, input and activity payloads must be plain data: records, strings, numbers, arrays."
    ]),
    check: "the kill-and-restart test passes for each workflow and agent."
  });

  return {
    id: "workflows",
    title: "Workflows and agents",
    assistant: ASSISTANTS[state.assistants.workflow].name,
    intro: `${copilot ? "Work in the integration packages in `backend/`." : "You are building the workflows and durable agents of an app ecosystem, one Ballerina package per integration in `backend/`."} They are Ballerina workflow ${VERSIONS.workflow} programs the portal starts through each integration's start service, and people take part in through chat and tasks.

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
