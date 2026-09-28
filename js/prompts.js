import {ASSISTANTS, componentName, componentSummary, DOCS, docUrl, FRAMEWORKS, IDPS, serviceById, SERVICES, VERSIONS} from "./catalog.js";
import {activeActivities, names} from "./code.js";
import {component, enabledServices, identifier, pageComponents, usedComponents} from "./state.js";

// Builds the prompts. Each part is a list of steps; the "full" style joins them into one prompt.
export function prompts(state) {
  const parts = [frontend(state), backend(state)];
  if (state.agent.on) {
    parts.push(workflow(state));
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
const nameOf = (state, c) => c.tag ? `<${c.tag}>` : c.app ? componentName(c, state.app.object) : c.name;
const slug = (text) => identifier(text, "custom").replace(/_/g, "-");
const verb = (list) => list.length === 1 ? "sees" : "see";
// "a request", "an expense claim".
const an = (word) => (/^[aeiou]/i.test(word) ? "an " : "a ") + word;

function context(state) {
  const n = names(state);
  const idp = IDPS.find((i) => i.id === state.idp.kind);
  const list = services(state);
  return `App: ${state.app.name}. ${state.app.description}
Business object: ${n.object} (IDs like ${n.idPrefix}-1001). Roles: ${state.app.roles.join(", ")}${state.app.adminRoles.length ? `; ${state.app.adminRoles.join(", ")} ${verb(state.app.adminRoles)} everyone's ${n.object}s` : ""}.
${list.length ? `Commons services (Ballerina Central org \`commons\`, version ${VERSIONS.commons}), all running in the backend process:
${bullet(list.map((s) => `${s.name}: \`${s.module}\`, port ${s.port}, base path ${s.basePath}. ${s.summary}`))}` : "No commons services: the app has only its own API."}
Sign-in: ${idp.id === "none" ? "none yet (development headers)" : `${idp.name} (OIDC)`}.${list.length ? `
Correlation rule: the ${n.object}'s ID is the \`correlationId\` of every conversation, upload case and notification about it (a second conversation about it uses \`${n.idPrefix}-1001/<party>\`).` : ""}`;
}

// ---------------------------------------------------------------- frontend

const PROXY = {notification: "/api/notifications", chat: "/api/chat", attachment: "/api/attachments"};

function frontend(state) {
  const n = names(state);
  const fw = FRAMEWORKS.find((f) => f.id === state.frontend.framework);
  const idp = IDPS.find((i) => i.id === state.idp.kind);
  const plain = fw.id === "plain";
  const shell = state.layout.shell;
  const hub = shell === "hub";
  const all = used(state);
  const commons = all.filter((c) => c.tag);
  const packages = [...new Set(commons.map((c) => serviceById(c.service).npm))];
  if (hub) packages.push("@bal-commons/hub-ui");
  const steps = [];

  steps.push({
    title: "Project and packages",
    body: `Create the frontend in \`frontend/\` with ${fw.name}. ${fw.note}
Serve it on port 5173 in development${plain ? " with Vite as a dev server only (`npx vite`, MIT), for its proxy; the app code stays plain ES modules with no build step" : ""}.
${commons.length ? `
The notification, chat and upload UI comes from the bal-commons Web Components (Lit, Apache-2.0). They are not on npm yet, so build them from source:
\`\`\`sh
git clone https://github.com/bal-commons/module-commons-service-commons && (cd module-commons-service-commons/ui && npm install && npm run build)
${[...new Set(commons.map((c) => c.service))].map((id) => serviceById(id)).map((s) => `git clone ${s.repo} && (cd ${s.repo.split("/").pop()}/ui && npm install && npm run build)`).join("\n")}${hub ? `
git clone ${DOCS.hubRepo} && (cd commons-hub-ui && npm install && npm run build)` : ""}
\`\`\`
${plain
  ? `Copy the single-file bundles into \`frontend/public/vendor/\` and load them with \`<script type="module">\`: ${hub ? "`hub-ui.bundle.js` alone (it contains every component)" : packages.map((p) => `\`${p.split("/")[1]}.bundle.js\``).join(", ")}. Once they are published, the same files come from \`https://cdn.jsdelivr.net/npm/<package>@${VERSIONS.ui}/dist/<name>.bundle.js\`.`
  : `Use \`npm link\` in each package's \`ui/\` directory (the hub at its repo root), then \`npm link ${packages.join(" ")}\` in \`frontend/\`. Import each package once at startup (\`import "${packages[0]}";\`) to register its elements. Once they are published, \`npm install ${packages.join(" ")}\` replaces the links.`}
Read the components guide before you start: ${DOCS.guide}
` : ""}
In development, proxy these paths to the backend${commons.length ? " (the components keep a server-sent events stream open, so the proxy must not buffer)" : ""}:
${bullet([["/api/app", "http://localhost:9090/app"], ...services(state).map((s) => [PROXY[s.id], `http://localhost:${s.port}${s.basePath}`])].map(([a, b]) => `\`${a}\` → \`${b}\``))}`,
    check: `the dev server starts${commons.length ? ", the component packages load without console errors" : ""}, and the proxy answers \`/api/app/${n.path}\` (401 without a token is fine).`
  });

  steps.push({
    title: "Sign-in",
    body: idp.id === "none"
      ? `There is no identity provider yet. Add a persona switcher${state.header.includes("user-menu") ? " in the user menu" : " in the header"} with one user per role (${state.app.roles.join(", ")})${commons.length ? ", and call `configureAuth(devUser(userId, roles))` from any bal-commons package at startup" : ""}. Send the identity to the app API as \`x-user-id\` and \`x-user-roles\` headers. Keep all of this in one \`auth\` module so it can be swapped for OIDC later.`
      : `Sign users in with ${idp.name} using the OIDC authorization code flow with PKCE (a public client: no client secret in the browser).
${bullet([
  `Client ID \`${state.idp.clientId}\`, authorize \`${state.idp.authorizeUrl}\`, token \`${state.idp.tokenUrl}\`, scopes \`${state.idp.scopes}\`, redirect URI \`http://localhost:5173/callback\`.`,
  plain ? "Write the PKCE flow by hand (about 60 lines: code verifier, S256 challenge, redirect, code exchange). No library." : "Use `oidc-client-ts` (Apache-2.0) for the flow.",
  `Keep the access token in sessionStorage. Read the user ID from the \`${state.idp.userIdClaim}\` claim and roles from \`${state.idp.rolesClaim}\` (an array or a comma list), only to shape the UI: the services check the token themselves.`,
  commons.length ? "Call `configureAuth(bearer(() => token, () => signIn()))` once at startup, so every component sends the token and a 401 starts sign-in again." : "",
  "Send the same `Authorization: Bearer` header to the app API.",
  idp.defaults.selfSigned ? `${idp.name} uses a self-signed certificate in development: proxy the token endpoint through the dev server so the browser doesn't call it cross-origin.` : ""
])}`,
    check: `you can sign in as a user of each role (${state.app.roles.join(", ")}).`
  });

  steps.push({title: "Layout and navigation", body: layoutText(state),
    check: "every page is reachable from the navigation, Back works, and the layout holds at 1280px and at 390px wide."});

  steps.push({
    title: "The pages",
    body: `${state.pages.map((p) => pageText(state, p)).join("\n\n")}

The builder's Wireframe tab shows each page; follow its layout, not its styling.`,
    check: "each page shows its components in the stated columns and ratio, and selecting an item in a list updates the components beside it."
  });

  if (commons.length) {
    steps.push({
      title: "Wire the commons components",
      body: `Set each component's service URL once, from one config module. The components keep themselves live; never poll their services.${hub ? `
\`<commons-hub>\` renders its panes' components itself from its URLs; the notes below apply where your own pages embed a component.` : ""}
${commons.map((c) => `
### <${c.tag}>
${COMPONENT_NOTES[c.tag](state)}
Reference: ${docUrl(serviceById(c.service), c.tag)}`).join("\n")}${hub ? `

### <commons-hub>
Reference: ${DOCS.hub}` : ""}`,
      check: `unread counts and new messages appear without a reload${on(state, "chat") ? `, and a notification about ${n.idPrefix}-1001 opens its conversation` : ""}.`
    });
  }

  const own = all.filter((c) => !c.tag);
  if (own.length) {
    steps.push({
      title: "The app's own components",
      body: `The app API (Ballerina, behind \`/api/app\`):
${bullet(apiLines(state))}

${own.map((c) => `### ${nameOf(state, c)}\n${APP_NOTES[c.id] ? APP_NOTES[c.id](state) : customNote(state, c)}`).join("\n\n")}`,
      check: `a ${state.app.userRole} can open ${an(n.object)} and see it update as the agent works; ${state.app.adminRoles[0] ?? "an admin"} sees everyone's.`
    });
  }

  steps.push({
    title: "Look and feel",
    body: `${commons.length ? "Match the app's design through the components' CSS custom properties on `:root` (`--bc-accent`, `--bc-font`, `--bc-radius`, `--bc-bg`, `--bc-surface`, `--bc-border`, …) and their `::part()`s; don't restyle their internals. " : ""}Use one set of design tokens for the app's own components too. Keep dark mode (\`prefers-color-scheme\`) and keyboard access (Tab and Enter reach every control). No horizontal scroll at 390px.`,
    check: "the pages look consistent in light and dark mode, and there are no console errors while you use every page."
  });

  return {
    id: "frontend",
    title: "Frontend",
    assistant: ASSISTANTS.claude.name,
    intro: `You are building the web frontend of a new app. Work in \`frontend/\`; the Ballerina backend is built separately (it runs on localhost).

${context(state)}

${commons.length ? "Use the bal-commons Web Components for notifications, chat and uploads; build only the app's own components yourself. " : ""}Keep the code small and readable; no UI library beyond ${fw.name}${plain ? "" : " and what it needs"}. Use only dependencies whose licenses are compatible with Apache-2.0 (MIT, BSD, Apache), and list them in THIRD_PARTY_NOTICES.md.`,
    steps
  };
}

function headerText(state) {
  const items = state.header.map((id) => component(state, id)).filter(Boolean);
  if (!items.length) return "";
  const bell = state.header.includes("bell");
  const target = state.pages.find((p) => p.id === state.bell.opens);
  return `On the right of the header: ${items.map((c) => nameOf(state, c)).join(", ")}.${bell ? ` Clicking the bell ${target
    ? `goes to the ${target.title} page`
    : "opens a drawer from the right, about 380px wide, holding `<commons-inbox>`; Escape, a click outside and a notification click close it"}.` : ""}`;
}

function layoutText(state) {
  const n = names(state);
  const titles = state.pages.map((p) => p.title);
  const routes = state.pages.map((p) => `\`#/${p.id}\``).join(", ");
  const shell = state.layout.shell;
  if (shell === "hub") {
    const panes = state.layout.hubPanes;
    return `The app is one \`<commons-hub>\` (${DOCS.hub}) filling the viewport, with ${panes.map((p) => `the ${{inbox: "Notifications", chats: "Chats", files: "Files"}[p]}`).join(", ")} pane${panes.length === 1 ? "" : "s"} (set \`panes="${panes.join(" ")}"\` and the URLs of the services they use), \`me\` set to the signed-in user ID and \`routing="hash"\`${state.app.adminRoles.length && panes.includes("files") ? `; set \`admin\` for ${state.app.adminRoles.join(", ")} so Files lists every case` : ""}. Put the app's name in \`slot="brand"\`${state.header.includes("user-menu") ? " and the user menu in `slot=\"nav-end\"`" : ""}.
The app's own pages are extra panes: ${state.pages.map((p) => `\`<section pane="${p.id}" label="${p.title}">\``).join(", ")}; lay each out as described in the next step. The hub's rail badges replace a separate bell.`;
  }
  const nav = shell === "sidebar"
    ? `A left sidebar (about 220px) lists the pages: ${titles.join(", ")}.${state.layout.collapsible ? " A toggle at its bottom collapses it to a 56px rail of icons with tooltips; remember the choice in localStorage." : ""} A header runs across the content with the current page's title.`
    : `A header holds the app name and the pages as links: ${titles.join(", ")}.`;
  return `${nav}
${headerText(state)}
Each page has its own route (${routes}); the first is the home page and Back moves between them. Below 720px wide ${shell === "sidebar" ? "the sidebar becomes a drawer behind a menu button, and " : "the links move into a menu, and "}two-column pages stack their columns (the left one first; when an item is selected, show the right one with a Back link).${state.pages.some((p) => pageComponents(p).flat().includes("item-detail")) ? ` Selecting ${an(n.object)} puts its ID in the route (e.g. \`#/${state.pages[0].id}/${n.idPrefix}-1001\`), so a notification link can open it.` : ""}`;
}

function pageText(state, page) {
  const n = names(state);
  const cols = pageComponents(page);
  const list = (ids) => ids.map((id) => component(state, id)).filter(Boolean).map((c) => nameOf(state, c)).join(", ") || "(empty)";
  const layout = cols.length === 1
    ? `One column: ${list(cols[0])}.`
    : `Two columns, ${page.ratio}% / ${100 - page.ratio}%.${page.collapsible ? " The left column collapses to a 40px strip with a toggle at its top edge (the right column then takes the full width); remember it per page." : ""}
- Left: ${list(cols[0])}
- Right: ${list(cols[1])}`;
  const ids = cols.flat();
  const has = (id) => ids.includes(id);
  const rules = [];
  if (has("item-list") && ["item-detail", "conversation", "case-list", "file-viewer", "upload-case"].some(has)) {
    rules.push(`Selecting ${an(n.object)} in the list shows it in ${["item-detail", "conversation", "case-list", "file-viewer", "upload-case"].filter(has).map((id) => nameOf(state, component(state, id))).join(" and ")} (the conversation by the ${n.object}'s \`conversationId\`, cases by \`correlation-id\` = its ID). Nothing selected: an empty state that says what to do.`);
  }
  if (has("item-form")) {
    rules.push(`After the form opens ${an(n.object)}, select it${has("conversation") ? " and show its conversation" : ""}.`);
  }
  if (has("conversation-list") && has("conversation")) {
    rules.push("Selecting a conversation in the list shows it in the conversation.");
  }
  if (has("case-list") && has("file-viewer") && has("upload-case")) {
    rules.push("Selecting a case shows it: the upload card while it is OPEN and the user is one of its subjects, otherwise the file viewer.");
  } else if (has("case-list") && (has("file-viewer") || has("upload-case"))) {
    rules.push(`Selecting a case shows it in the ${has("file-viewer") ? "file viewer" : "upload card"}.`);
  }
  if (has("conversation") && !has("item-list") && !has("conversation-list")) {
    rules.push(`The conversation shows the ${n.object} named in the route; without one, the user's latest.`);
  }
  return `### ${page.title} (\`#/${page.id}\`)
${layout}${rules.length ? "\n" + bullet(rules) : ""}`;
}

function apiLines(state) {
  const n = names(state);
  const approval = state.agent.on && state.agent.approval.on;
  return [
    `\`POST /api/app/${n.path}\` with \`{title, details}\` opens ${an(n.object)}${on(state, "chat") ? ", its conversation with the agent" : ""}${state.agent.on ? " and the durable agent that owns it" : ""}; returns it (\`id\`, \`status\`, \`conversationId\`, \`agentId\`, \`createdAt\`).`,
    `\`GET /api/app/${n.path}\` lists the caller's own (everyone's for ${state.app.adminRoles.join(", ") || "admin roles"}); \`GET /api/app/${n.path}/{id}\` returns one.`,
    approval ? "`GET /api/app/reviews` lists the agent actions the caller's roles may approve (`taskId`, `title`, `description`, `input`); `POST /api/app/reviews/{taskId}` with `{approved, comment}` decides one." : "",
    ...state.custom.filter((c) => c.api && usedComponents(state).includes(c.id)).map((c) => `\`GET /api/app/${slug(c.name)}\` serves ${c.name} (the backend prompt adds it).`)
  ];
}

function customNote(state, c) {
  return `Build it: ${c.description || "(no description yet)"}${c.api ? ` It reads \`/api/app/${slug(c.name)}\`.` : " Frontend only."}`;
}

const APP_NOTES = {
  "item-form": (state) => `Title and details (plus the fields this app adds), for ${state.app.userRole}. Posts to \`/api/app/${names(state).path}\`; shows the service's error message on 400.`,
  "item-list": (state) => `The ${names(state).object}s from \`GET /api/app/${names(state).path}\`, newest first, with ID, title, status and age. Refresh after creating one${on(state, "notification") ? " and when a notification about one arrives" : ""}.`,
  "item-detail": (state) => `The selected ${names(state).object}: title, status, details, owner and dates, from \`GET /api/app/${names(state).path}/{id}\`.`,
  "approvals": (state) => state.agent.on && state.agent.approval.on
    ? `Pending reviews from \`GET /api/app/reviews\`: what the agent wants to do (\`title\`, \`description\`) and its arguments (\`input\`), with Approve and Reject. Reject needs a comment: the agent reads it as the reason.`
    : "The agent has no approval policy yet (turn one on in the builder's agent step); until then this shows an empty state.",
  "stats": (state) => `Counts of ${names(state).object}s by status, from the list endpoint.`,
  "user-menu": (state) => `The signed-in user's name and roles${state.idp.kind === "none" ? ", the persona switcher" : ""}, and Sign out.`
};

const COMPONENT_NOTES = {
  "commons-notification-bell": (state) => `\`base-url\` = \`${PROXY.notification}\`. On \`commons-bell-click\`, ${state.pages.some((p) => p.id === state.bell.opens) ? "navigate to the notifications page" : "open the inbox drawer"}.`,
  "commons-inbox": (state) => `\`base-url\` = \`${PROXY.notification}\`; add \`show-filters\` on a full page. On \`commons-notification-click\`, use \`event.detail.notification.correlationId\` (${an(names(state).object)} ID) to open that ${names(state).object}, or \`actionUrl\` when set. The default action marks it read.`,
  "commons-conversation-list": () => `\`base-url\` = \`${PROXY.chat}\`, property \`me\` = the user ID, add \`searchable\`. On \`commons-conversation-select\`, show \`event.detail.conversation.id\` in the conversation.`,
  "commons-conversation": (state) => `\`base-url\` = \`${PROXY.chat}\`, \`conversation-id\`, property \`me\` = the user ID${on(state, "attachment") ? `, and \`attachments-url\` = \`${PROXY.attachment}\` so the agent's upload requests render as upload cards inside the chat` : ""}. It renders streamed agent replies, forms and typing indicators itself; give it a fixed height.`,
  "commons-upload-case": () => `\`base-url\` = \`${PROXY.attachment}\`, \`case-id\`, property \`me\` = the user ID (others see it read-only). On \`commons-case-submitted\`, refresh what lists the case.`,
  "commons-case-list": (state) => `\`base-url\` = \`${PROXY.attachment}\`, property \`me\`${state.app.adminRoles.length ? `; set \`admin\` for ${state.app.adminRoles.join(", ")}` : ""}. On \`commons-case-select\`, show \`event.detail.case\`.`,
  "commons-file-viewer": (state) => `\`base-url\` = \`${PROXY.attachment}\`, \`case-id\`, property \`me\`${state.app.adminRoles.length ? `; set \`can-delete\` for ${state.app.adminRoles.join(", ")}` : ""}. It previews, downloads and deletes by itself.`
};


// ---------------------------------------------------------------- backend

function backend(state) {
  const n = names(state);
  const idp = IDPS.find((i) => i.id === state.idp.kind);
  const copilot = state.assistants.backend === "copilot";
  const approval = state.agent.on && state.agent.approval.on;
  const steps = [];

  steps.push({
    title: "Start from the generated project",
    body: `The builder generated a Ballerina ${VERSIONS.ballerina} package in \`backend/\` (download the starter): Ballerina.toml, main.bal (starts ${services(state).map((s) => s.name.toLowerCase()).join(", ")} in this process), config.bal, types.bal, store.bal (the app's tables), clients.bal (typed clients as a service account), app.bal (the app API)${state.agent.on ? ", agent.bal, activities.bal and hooks.bal (the durable agent: see the workflow prompt)" : ""}, and Config.toml.
${copilot
  ? "Open `backend/` in VS Code with the Ballerina extension (WSO2 Integrator). Build it before you change anything."
  : "Read every generated file first, then build it before changing anything. The commons packages' sources are in `~/.ballerina/repositories/central.ballerina.io/bala/commons/<name>/0.1.0/` after the first build; read the client and type definitions there instead of guessing APIs."}
\`\`\`sh
cd backend && bal build
\`\`\`
Rules for this package:
${bullet([
  "Every `transaction` block must go through `commons/service_commons.db:atomic`. Ballerina starts one transaction coordinator per package, and the commons services already use it; a second coordinator fails on its port.",
  "Keep secrets (API key, webhook secret, link secret, DB password) out of source control: Config.toml values marked change-me, or environment variables.",
  "The app calls the commons services with the service-account headers in clients.bal; users call them directly from the browser with their own token.",
  `Correlation: use the ${n.object} ID as correlationId everywhere.`
])}`,
    check: "`bal build` succeeds with no errors."
  });

  steps.push({
    title: idp.id === "none" ? "Development identity" : `Sign-in with ${idp.name}`,
    body: idp.id === "none"
      ? "The services run without an identity provider and trust `x-user-id` / `x-user-roles` headers. Keep it that way only on a developer machine; add an OIDC provider before anyone else uses the app."
      : `Configure every \`auth\` section in Config.toml (the app's and each \`commons.*.server\`'s) the same way: \`enableJwtAuth = true\`, \`jwtIssuer = "${state.idp.issuer}"\`, \`jwksUrl = "${state.idp.jwksUrl}"\`, \`userIdClaim = "${state.idp.userIdClaim}"\`, \`rolesClaim = "${state.idp.rolesClaim}"\`${idp.defaults.selfSigned ? ", `jwksVerifyTls = false` (development certificate)" : ""}, and \`enableApiKey = true\` with a strong \`apiKeyValue\` shared with \`serviceApiKey\`.
Set up ${idp.name} (${idp.url}, ${idp.license}):
${bullet(idp.setup)}
Create users for each role (${state.app.roles.join(", ")}) and check a token has the claims: decode it and look for \`${state.idp.userIdClaim}\` and \`${state.idp.rolesClaim}\`.`,
    check: idp.id === "none" ? "`curl -H 'x-user-id: alice' -H 'x-user-roles: " + state.app.userRole + "' localhost:9090/app/" + n.path + "` returns `[]`." : `\`curl -H "Authorization: Bearer $TOKEN" localhost:9090/app/${n.path}\` returns \`[]\`, and without the header returns 401.`
  });

  steps.push({
    title: `Shape the ${n.object}`,
    body: `The generated ${n.object} has \`id\`, \`ownerId\`, \`title\`, \`details\`, \`status\`, \`conversationId\`, \`agentId\` and \`createdAt\`. Add the fields this app needs (${state.app.description}) to \`${n.type}\`, \`${n.newType}\`, the table in store.bal (a new migration version, never an edited one) and the INSERT/SELECT code. Validate input in app.bal and answer with \`service_commons:badRequest\`. Keep \`GET /app/${n.path}\` scoped: owners see theirs, ${state.app.adminRoles.join(", ") || "admin roles"} ${state.app.adminRoles.length === 1 ? "sees" : "see"} all.${approval ? "\nKeep the reviews endpoints: they list and decide the agent's guarded activity calls." : ""}`,
    check: `\`POST /app/${n.path}\` with the new fields returns 201 and \`GET\` returns them.`
  });

  const customApis = state.custom.filter((c) => c.api && usedComponents(state).includes(c.id));
  if (customApis.length) {
    steps.push({
      title: "Endpoints for custom components",
      body: `Add a resource to the \`/app\` service in app.bal for each custom component, scoped to the caller like the others:
${bullet(customApis.map((c) => `\`GET /app/${slug(c.name)}\` for ${c.name}: ${c.description || "(describe what it returns)"}`))}
Put their data in the app's store (a new migration) or call the system that owns it; keep secrets in Config.toml.`,
      check: `each endpoint answers with the caller's token and returns 401 without it.`
    });
  }

  steps.push({
    title: "Database",
    body: state.db === "h2"
      ? "H2 files under `target/data/` work with no setup. Every service and the app share one database file, each with its own table prefix."
      : `Use ${state.db === "postgresql" ? "PostgreSQL" : "MySQL"}: every \`db\` section in Config.toml has \`dbType\`, \`url\`, \`user\` and \`password\` (the services create their tables on start; \`initSchema = true\`). Import \`ballerinax/${state.db}.driver as _\` (already in main.bal). Create the database and user first.`,
    check: "the backend starts and creates its tables (look for the migration log lines)."
  });

  steps.push({
    title: state.deploy === "compose" ? "Run it with Docker Compose" : "Run it locally",
    body: state.deploy === "compose"
      ? `Write \`backend/Dockerfile\` (build the jar with \`bal build\` in a \`ballerina/ballerina:${VERSIONS.ballerina}\` stage, run it on \`eclipse-temurin:21-jre\`) and use the generated docker-compose.yml and nginx.conf. Put secrets in \`.env\` (git-ignored) and render Config.toml from them at start (an entrypoint script), so the image has no secrets. nginx must not buffer the services' \`/stream\` endpoints.`
      : `Run \`bal run\` in \`backend/\`${state.agent.on ? " with `temporal server start-dev` running" : ""}. Stop it with Ctrl+C rather than kill -9${state.agent.on ? ": a killed worker can leave a Temporal poll that holds the next task for minutes" : ""}.`,
    check: `the app API answers on :9090 and each service on its port (${services(state).map((s) => s.port).join(", ")}).`
  });

  return {
    id: "backend",
    title: "Backend",
    assistant: ASSISTANTS[state.assistants.backend].name,
    intro: `${copilot ? "Work in the Ballerina package in `backend/`. Make one change at a time and build after each." : "You are building the Ballerina backend of a new app, in `backend/`. Build after every change with `bal build`."}

${context(state)}${copilot ? `

APIs you will use (commons ${VERSIONS.commons}):
${cheatSheet(state)}` : ""}`,
    steps
  };
}

function cheatSheet(state) {
  const lines = [];
  if (on(state, "notification")) {
    lines.push("notification:Client `notifications`: `send(NewNotification)` with recipientType USER|ROLE, recipientId, severity INFO|WARNING|ERROR|SUCCESS, title, body, correlationId, actionUrl, idempotencyKey; `list`, `unreadCount`, `markRead`.");
  }
  if (on(state, "chat")) {
    lines.push("chat:Client `chats`: `createConversation({correlationId, title, participants: [{participantId}, {participantType: chat:AGENT, participantId, displayName}]})`, `findByCorrelation(correlationId)`, `sendText(conversationId, text, senderId, id)`, `sendMessage(conversationId, {kind: chat:FORM|chat:ATTACHMENT_REF|chat:TEXT, content, senderId, id})`, `startStreaming`/`appendChunk`/`completeMessage`, `typing`, `history(conversationId, afterSeq = n)`, `close(conversationId, reason, senderId)`.");
  }
  if (on(state, "attachment")) {
    lines.push("attachment:Client `attachments`: `createCase({idempotencyKey, correlationId, title, subjects, watchers, slots: [{name, label, mimeTypes, minFiles, maxFiles}], autoSubmit})`, `getCase`, `listCases`, `listFiles`, `download`, `close(caseId, reason)`, `reopen`.");
  }
  lines.push("commons/service_commons.webhook: `verify(req, secret)` returns `WebhookEvent {eventId, event, correlationId?, data}` or an error.");
  lines.push("commons/service_commons.auth: `Authenticator`, `AuthInterceptor`, `callerOf(ctx)` returns `CallerIdentity {userId, roles, scopes}`.");
  return bullet(lines);
}

// ---------------------------------------------------------------- workflow

function workflow(state) {
  const n = names(state);
  const copilot = state.assistants.workflow === "copilot";
  const acts = activeActivities(state);
  const approval = state.agent.approval.on && acts.some((a) => a.id === state.agent.approval.activity);
  const steps = [];

  steps.push({
    title: "Run the agent as generated",
    body: `\`backend/agent.bal\` declares \`${n.agentVar}\`, a \`workflow:DurableAgent\` (ballerina/workflow ${VERSIONS.workflow}, ${DOCS.workflow}). One instance owns one ${n.object}: app.bal starts it with \`${n.agentVar}.run(query, AgentInput)\` and stores the returned ID on the ${n.object}. It has one event, \`chat\` (MULTI_EVENT), and these activities (activities.bal): ${acts.map((a) => `\`${a.id}\``).join(", ")}.
Configure:
${bullet([
  "Temporal: `temporal server start-dev` locally (`[ballerina.workflow] mode = \"LOCAL\"`, `url = \"localhost:7233\"`), or a Temporal cluster with `mode = \"SELF_HOSTED\"`. The task queue is in Config.toml.",
  state.agent.model === "wso2"
    ? "The model: the WSO2 default provider, `[ballerina.ai.wso2ProviderConfig]` with `serviceUrl` and `accessToken` in Config.toml (VS Code: Ballerina → Configure default model provider). Tokens expire; keep them out of source control."
    : "The model: replace `ai:getDefaultModelProvider()` with the ballerinax/ai.* provider you use; it must support tool calling. Test that it calls tools, not just replies.",
  `Webhooks: Config.toml registers the agent (\`${n.agentId}\`) with the ${[on(state, "chat") && "chat", on(state, "attachment") && "attachment"].filter(Boolean).join(" and ")} service${on(state, "chat") && on(state, "attachment") ? "s" : ""}: \`url\` is this app's \`/hooks/...\` receiver (the services run in the same process, so \`localhost:9090\` is right; change it only if you move a service out), \`secret\` must equal \`webhookSecret\`, and \`events\` lists what to deliver. The services sign each delivery; hooks.bal verifies it, drops repeats (at-least-once delivery) and hands the event to the agent with \`sendData(agentId, "chat", event)\`.`
])}`,
    check: `opening ${an(n.object)} starts an agent (its ID is on the ${n.object}) and the agent's first message appears in the conversation.`
  });

  steps.push({
    title: "Teach the agent the process",
    body: `Rewrite the instructions in agent.bal for this app (${state.agent.purpose}). Keep the generated rules: act only through tools, one message per person per turn, end a turn with exactly \`[done]\`, answer side questions in plain text. Write the process as numbered steps, one per event kind the agent receives (MESSAGE, FORM_ANSWER, UPLOAD, REMINDER), each naming the tools to call.
Current steps:
${state.agent.steps.filter(Boolean).map((s, i) => `${i + 1}. ${s}`).join("\n") || "(none yet)"}
Give each activity a description that says when to use it and what comes back; the model chooses tools from those descriptions.`,
    check: `a scripted run (open ${an(n.object)}, answer as the user, upload a file) makes the agent follow every step, and each turn ends without errors in the log.`
  });

  steps.push({
    title: "Guardrails in code",
    body: `The model decides what to do next; the rules that matter must hold even when it decides wrong. Put them in the activities, not in the prompt:
${bullet([
  "Check preconditions in the activity and return an error that tells the model what to do instead (e.g. closing before the user confirmed). The error goes back to the model as the tool result.",
  approval ? `\`${state.agent.approval.activity}\` has an \`approvalPolicy\`: every call waits for ${state.agent.approval.userRoles.join(" or ")} to approve or reject it (with feedback) before it runs. The app API lists and decides these reviews (\`/app/reviews\`).` : "For a risky step, give its ActivityDecl an `approvalPolicy {userRoles, administratorRoles, title, description}`: every call then waits for a person to approve it; a rejection returns their feedback to the model.",
  "Make every activity idempotent: an idempotency key on notifications and upload cases, deterministic message IDs for chat (as generated). A retried activity must not message anyone twice.",
  "Do required follow-ups in code: a reminder is a separate `@workflow:Workflow` that sleeps (`ctx.sleep`) and then sends the agent a REMINDER event with `sendData`; escalations belong in that activity, not in the model's discretion."
])}`,
    check: "a deliberately wrong tool call (e.g. closing too early) is refused with a helpful error and the agent recovers."
  });

  steps.push({
    title: "Durability and limits",
    body: bullet([
      `Kill the backend while the agent waits (Ctrl+C), start it again, and continue the conversation: nothing is lost. Avoid kill -9 in development (a stale Temporal poll can hold the next task for minutes).`,
      "Replies: hooks.bal posts a turn's final answer only when it is a real reply (a side question answered while the agent is parked), never `[done]`.",
      "A turn that exceeds `maxIter` fails the whole agent run (ballerina-library#9225): keep the stop rule in the instructions and the activities quick.",
      approval ? "`ReviewActivityInfo.taskInput` is declared `map<json>` but arrives as `map<anydata>` (ballerina-library#9226): read it with `.toJson()`, as app.bal does." : "",
      "`_ = check ctx->callActivity(...)` fails type inference: bind the result to a typed variable.",
      "Event and activity payloads must be plain data (anydata): records, strings, numbers, arrays."
    ]),
    check: "the kill-and-restart test passes and the Temporal UI (\`temporal server start-dev\` serves it on http://localhost:8233; in Compose add \`temporalio/ui\`) shows the agent's history: model calls, tool calls and waits in order."
  });

  return {
    id: "workflow",
    title: "Durable agent",
    assistant: ASSISTANTS[state.assistants.workflow].name,
    intro: `${copilot ? "Work in the Ballerina package in `backend/`." : "You are building the durable agent of a Ballerina app, in `backend/`."} The agent is a Ballerina workflow durable agent that drives the app's commons services through activities.

${context(state)}${copilot ? `

Durable agent API (ballerina/workflow ${VERSIONS.workflow}):
${bullet([
  "`final workflow:DurableAgent agent = check new ({systemPrompt: {role, instructions}, model, inputType: T, activities: [{activity: fn, description, approvalPolicy?}], tools?: [...], events: {chat: {request: E, response: string, cardinality: workflow:MULTI_EVENT}}, maxIter});`",
  "`string id = check agent.run(query, input)` starts an instance; `string token = check agent.sendData(id, \"chat\", event)` delivers an event; `string reply = check agent.waitForDataResult(id, token)` waits for that turn's answer.",
  "Activities are `@workflow:Activity function name(<plain data params>) returns T|error`.",
  "`ballerina/workflow.management`: `listAllReviewActivities(status, taskQueue = management:getWorkflowTaskQueue())`, `getReviewActivityInfo(taskId)`, `completeReviewActivity(taskId, {action: \"proceed\"|\"reject\", feedback}, roles, userId)`."
])}

Generated activity code is in activities.bal; keep its idempotency keys and message IDs when you change it.` : ""}`,
    steps
  };
}
