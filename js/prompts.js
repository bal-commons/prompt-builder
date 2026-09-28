import {ASSISTANTS, DOCS, docUrl, FRAMEWORKS, IDPS, SERVICES, VERSIONS} from "./catalog.js";
import {activeActivities, names} from "./code.js";
import {enabledServices} from "./state.js";
import {describePages} from "./wireframe.js";

// Builds the prompts. Each part is a list of steps; the "full" style joins them into one prompt.
export function prompts(state) {
  const parts = [frontend(state), backend(state)];
  if (state.agent.on && enabledServices(state).length) {
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
const selected = (state) => services(state).flatMap((s) => s.components
  .filter((c) => state.services[s.id].components.includes(c.tag)).map((c) => ({...c, service: s})));

function context(state) {
  const n = names(state);
  const idp = IDPS.find((i) => i.id === state.idp.kind);
  return `App: ${state.app.name}. ${state.app.description}
Business object: ${n.object} (IDs like ${n.idPrefix}-1001). Roles: ${state.app.roles.join(", ")}${state.app.adminRoles.length ? `; ${state.app.adminRoles.join(", ")} ${state.app.adminRoles.length === 1 ? "sees" : "see"} everyone's ${n.object}s` : ""}.
Commons services (Ballerina Central org \`commons\`, version ${VERSIONS.commons}), all running in the backend process:
${bullet(services(state).map((s) => `${s.name}: \`${s.module}\`, port ${s.port}, base path ${s.basePath}. ${s.summary}`))}
Sign-in: ${idp.id === "none" ? "none yet (development headers)" : `${idp.name} (OIDC)`}.
Correlation rule: the ${n.object}'s ID is the \`correlationId\` of every conversation, upload case and notification about it (a second conversation about it uses \`${n.idPrefix}-1001/<party>\`).`;
}

// ---------------------------------------------------------------- frontend

function frontend(state) {
  const n = names(state);
  const fw = FRAMEWORKS.find((f) => f.id === state.frontend.framework);
  const idp = IDPS.find((i) => i.id === state.idp.kind);
  const comps = selected(state);
  const hub = state.frontend.layout === "hub";
  const approval = state.agent.on && state.agent.approval.on;
  const packages = [...new Set(comps.map((c) => c.service.npm))];
  if (hub) packages.push("@bal-commons/hub-ui");
  const plain = fw.id === "plain";

  const steps = [];
  steps.push({
    title: "Project and packages",
    body: `Create the frontend in \`frontend/\` with ${fw.name}. ${fw.note}
Serve it on port 5173 in development${plain ? " with Vite as a dev server only (`npx vite`, MIT), for its proxy; the app code stays plain ES modules with no build step" : ""}.

The UI comes from the bal-commons Web Components (Lit, Apache-2.0). They are not on npm yet, so build them from source:
\`\`\`sh
git clone https://github.com/bal-commons/module-commons-service-commons && (cd module-commons-service-commons/ui && npm install && npm run build)
${services(state).map((s) => `git clone ${s.repo} && (cd ${s.repo.split("/").pop()}/ui && npm install && npm run build)`).join("\n")}${hub ? `
git clone ${DOCS.hubRepo} && (cd commons-hub-ui && npm install && npm run build)` : ""}
\`\`\`
${plain
  ? `Copy the single-file bundles into \`frontend/public/vendor/\` and load them with \`<script type="module">\`: ${hub ? "`hub-ui.bundle.js` alone (it contains every component)" : packages.map((p) => `\`${p.split("/")[1]}.bundle.js\``).join(", ")}. Once they are published, the same files come from \`https://cdn.jsdelivr.net/npm/<package>@${VERSIONS.ui}/dist/<name>.bundle.js\`.`
  : `Use \`npm link\` in each package's \`ui/\` directory (the hub at its repo root), then \`npm link ${packages.join(" ")}\` in \`frontend/\`. Import each package once at startup (\`import "${packages[0]}";\`) to register its elements. Once they are published, \`npm install ${packages.join(" ")}\` replaces the links.`}

In development, proxy these paths to the backend (the components keep a server-sent events stream open, so the proxy must not buffer):
${bullet([["/api/app", "http://localhost:9090/app"], ...services(state).map((s) => [`/api/${s.id === "notification" ? "notifications" : s.id === "attachment" ? "attachments" : "chat"}`, `http://localhost:${s.port}${s.basePath}`])].map(([a, b]) => `\`${a}\` → \`${b}\``))}
Read the cross-cutting guide before you start: ${DOCS.guide}`,
    check: "the dev server starts, the page loads the component packages without console errors, and the proxy answers `/api/app/" + n.path + "` (401 without a token is fine)."
  });

  steps.push({
    title: "Sign-in",
    body: idp.id === "none"
      ? `There is no identity provider yet. Add a persona switcher (a select in the header) with one user per role (${state.app.roles.join(", ")}), and call \`configureAuth(devUser(userId, roles))\` from any bal-commons package at startup. Send the same identity to the app API as \`x-user-id\` and \`x-user-roles\` headers. Keep all of this behind one \`auth.ts\` module so it can be swapped for OIDC later.`
      : `Sign users in with ${idp.name} using the OIDC authorization code flow with PKCE (a public client: no client secret in the browser).
${bullet([
  `Client ID \`${state.idp.clientId}\`, authorize \`${state.idp.authorizeUrl}\`, token \`${state.idp.tokenUrl}\`, scopes \`${state.idp.scopes}\`, redirect URI \`http://localhost:5173/callback\`.`,
  plain ? "Write the PKCE flow by hand (about 60 lines: code verifier, S256 challenge, redirect, code exchange). No library." : "Use `oidc-client-ts` (Apache-2.0) for the flow.",
  `Keep the access token in sessionStorage. Read the user ID from the \`${state.idp.userIdClaim}\` claim and roles from \`${state.idp.rolesClaim}\` (an array or a comma list), only to shape the UI: the services check the token themselves.`,
  "Call `configureAuth(bearer(() => token, () => signIn()))` once at startup, so every component sends the token and a 401 starts sign-in again. Send the same `Authorization: Bearer` header to the app API.",
  idp.defaults.selfSigned ? `${idp.name} uses a self-signed certificate in development: proxy the token endpoint through the dev server so the browser doesn't call it cross-origin.` : "",
  "Show the signed-in user and a Sign out button in the header."
])}`,
    check: `you can sign in as a user of each role (${state.app.roles.join(", ")}) and the header shows who is signed in.`
  });

  const pages = describePages(state);
  steps.push({
    title: hub ? "The page: one <commons-hub>" : "Pages and navigation",
    body: `${hub
      ? `The whole app is one \`<commons-hub>\` (${DOCS.hub}) filling the viewport, with \`notifications-url\`, \`chat-url\` and \`attachments-url\` set to the proxy paths, \`me\` set to the signed-in user ID and \`routing="hash"\`. Set \`admin\` for ${state.app.adminRoles.join(", ") || "admin roles"} so the Files pane lists every case. Put the app's name in \`slot="brand"\` and the user menu in \`slot="nav-end"\`. Add the app's own panes as children: \`<section pane="${n.path}" label="${capital(n.path)}">\`${approval ? " and `<section pane=\"reviews\" label=\"Approvals\">`" : ""}.`
      : `Build these pages with a header on every page (app name, ${state.services.notification?.on && state.services.notification.components.includes("commons-notification-bell") ? "`<commons-notification-bell>` that opens the inbox, " : ""}the user menu):`}

${pages.map((p) => `### ${p.name}\n${p.description}`).join("\n\n")}

Wireframes are in the builder's Wireframe tab; follow their layout, not their styling.`,
    check: "every page renders at 1280px and at 390px wide, and the browser Back button moves between pages."
  });

  steps.push({
    title: "Wire the components",
    body: `Set each component's service URL once, from one config module. The components keep themselves live; never poll their services.${hub ? `
\`<commons-hub>\` renders the inbox, conversation list, conversation, case list, upload card and file viewer itself from its three URLs, and its rail badges replace the bell. The notes below apply where the app's own panes embed a component (e.g. the ${n.object} detail's conversation).` : ""}
${comps.filter((c) => !(hub && c.tag === "commons-notification-bell")).map((c) => `
### <${c.tag}>
${COMPONENT_NOTES[c.tag](state)}
Reference: ${docUrl(c.service, c.tag)}`).join("\n")}${hub ? `

### <commons-hub>
It already contains the components above. Listen for \`commons-hub-navigate\` only if the app must veto or log navigation. Reference: ${DOCS.hub}` : ""}`,
    check: `a notification about ${n.idPrefix}-1001 opens its conversation${state.services.attachment?.on ? ", an upload card accepts a dropped file" : ""}, and unread counts update without a reload.`
  });

  steps.push({
    title: `The ${n.object} pages`,
    body: `The app API (Ballerina, behind \`/api/app\`) has:
${bullet([
  `\`POST /api/app/${n.path}\` with \`{title, details}\` opens a ${n.object}${state.services.chat?.on ? ", its conversation with the agent" : ""}${state.agent.on ? " and the durable agent that owns it" : ""}; returns the ${n.object} (\`id\`, \`status\`, \`conversationId\`, \`agentId\`, \`createdAt\`).`,
  `\`GET /api/app/${n.path}\` lists the caller's own (everyone's for ${state.app.adminRoles.join(", ") || "admin roles"}).`,
  `\`GET /api/app/${n.path}/{id}\` returns one.`,
  approval ? "`GET /api/app/reviews` lists the approvals the caller's roles may decide (`taskId`, `title`, `description`, `input`); `POST /api/app/reviews/{taskId}` with `{approved, comment}` decides one. A rejection needs a comment: the agent reads it as the reason." : ""
])}
Build: a "New ${n.object}" form for ${state.app.userRole}; a list with status; a detail view that shows the ${n.object}'s conversation (\`conversationId\`)${state.services.attachment?.on ? " and its files (`<commons-case-list correlation-id=\"<id>\">` beside `<commons-file-viewer>`)" : ""}${approval ? "; an Approvals view with Approve and Reject (comment required)" : ""}. After creating a ${n.object}, open its conversation.`,
    check: `a ${state.app.userRole} can open a ${n.object} and lands in its conversation; ${state.app.adminRoles[0] ?? "an admin"} sees it in the list.`
  });

  steps.push({
    title: "Look and feel",
    body: `Match the app's design through the components' CSS custom properties on \`:root\` (\`--bc-accent\`, \`--bc-font\`, \`--bc-radius\`, \`--bc-bg\`, \`--bc-surface\`, \`--bc-border\`, …) and their \`::part()\`s; don't restyle their internals. Keep dark mode (\`prefers-color-scheme\`). Keep keyboard access (every list item and button is reachable with Tab and Enter). No horizontal scroll at 390px.`,
    check: "the pages look consistent in light and dark mode, and there are no console errors while you use every page."
  });

  return {
    id: "frontend",
    title: "Frontend",
    assistant: ASSISTANTS.claude.name,
    intro: `You are building the web frontend of a new app. Work in \`frontend/\`; the Ballerina backend is built separately (it runs on localhost).

${context(state)}

Use the bal-commons Web Components for notifications, chat and uploads; build only the app's own screens yourself. Keep the code small and readable; no UI framework beyond ${fw.name}${plain ? "" : " and what it needs"}. Use only dependencies whose licenses are compatible with Apache-2.0 (MIT, BSD, Apache), and list them in THIRD_PARTY_NOTICES.md.`,
    steps
  };
}

const capital = (s) => s[0].toUpperCase() + s.slice(1);

const COMPONENT_NOTES = {
  "commons-notification-bell": () => "`base-url` = the notifications proxy path. On `commons-bell-click`, open the inbox (a panel or the inbox page).",
  "commons-inbox": (state) => `\`base-url\` = the notifications proxy path; add \`show-filters\` on a full page. On \`commons-notification-click\`, use \`event.detail.notification.correlationId\` (a ${names(state).object} ID) to open that ${names(state).object}, or \`actionUrl\` when set. The default action marks it read; call \`event.preventDefault()\` only to keep it unread.`,
  "commons-conversation-list": () => "`base-url` = the chat proxy path, property `me` = the user ID, add `searchable`. On `commons-conversation-select`, show `<commons-conversation>` with `event.detail.conversation.id`.",
  "commons-conversation": (state) => `\`base-url\` = the chat proxy path, \`conversation-id\`, property \`me\` = the user ID${state.services.attachment?.on ? ", and `attachments-url` = the attachments proxy path so an agent's upload requests render as upload cards inside the chat" : ""}. It renders streamed agent replies, forms (JSON Schema) and typing indicators by itself; give it a fixed height.`,
  "commons-upload-case": () => "`base-url` = the attachments proxy path, `case-id`, property `me` = the user ID (non-subjects then see it read-only). Users drop files or pick them; images and PDFs preview on click. On `commons-case-submitted`, refresh whatever lists the case.",
  "commons-case-list": (state) => `\`base-url\` = the attachments proxy path, property \`me\`; set \`admin\` for ${state.app.adminRoles.join(", ") || "admin roles"}. On \`commons-case-select\`, show the case: \`<commons-upload-case>\` while it is OPEN and the user is a subject, otherwise \`<commons-file-viewer>\`.`,
  "commons-file-viewer": (state) => `\`base-url\` = the attachments proxy path, \`case-id\`, property \`me\`${state.app.adminRoles.length ? `; set \`can-delete\` for ${state.app.adminRoles.join(", ")}` : ""}. It previews, downloads and deletes by itself; listen to \`commons-file-deleted\` only to update other views.`
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
  if (state.services.notification?.on) {
    lines.push("notification:Client `notifications`: `send(NewNotification)` with recipientType USER|ROLE, recipientId, severity INFO|WARNING|ERROR|SUCCESS, title, body, correlationId, actionUrl, idempotencyKey; `list`, `unreadCount`, `markRead`.");
  }
  if (state.services.chat?.on) {
    lines.push("chat:Client `chats`: `createConversation({correlationId, title, participants: [{participantId}, {participantType: chat:AGENT, participantId, displayName}]})`, `findByCorrelation(correlationId)`, `sendText(conversationId, text, senderId, id)`, `sendMessage(conversationId, {kind: chat:FORM|chat:ATTACHMENT_REF|chat:TEXT, content, senderId, id})`, `startStreaming`/`appendChunk`/`completeMessage`, `typing`, `history(conversationId, afterSeq = n)`, `close(conversationId, reason, senderId)`.");
  }
  if (state.services.attachment?.on) {
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
  `Webhooks: Config.toml registers the agent (\`${n.agentId}\`) with the ${[state.services.chat?.on && "chat", state.services.attachment?.on && "attachment"].filter(Boolean).join(" and ")} service${state.services.chat?.on && state.services.attachment?.on ? "s" : ""}: \`url\` is this app's \`/hooks/...\` receiver (the services run in the same process, so \`localhost:9090\` is right; change it only if you move a service out), \`secret\` must equal \`webhookSecret\`, and \`events\` lists what to deliver. The services sign each delivery; hooks.bal verifies it, drops repeats (at-least-once delivery) and hands the event to the agent with \`sendData(agentId, "chat", event)\`.`
])}`,
    check: `opening a ${n.object} starts an agent (its ID is on the ${n.object}) and the agent's first message appears in the conversation.`
  });

  steps.push({
    title: "Teach the agent the process",
    body: `Rewrite the instructions in agent.bal for this app (${state.agent.purpose}). Keep the generated rules: act only through tools, one message per person per turn, end a turn with exactly \`[done]\`, answer side questions in plain text. Write the process as numbered steps, one per event kind the agent receives (MESSAGE, FORM_ANSWER, UPLOAD, REMINDER), each naming the tools to call.
Current steps:
${state.agent.steps.filter(Boolean).map((s, i) => `${i + 1}. ${s}`).join("\n") || "(none yet)"}
Give each activity a description that says when to use it and what comes back; the model chooses tools from those descriptions.`,
    check: `a scripted run (open a ${n.object}, answer as the user, upload a file) makes the agent follow every step, and each turn ends without errors in the log.`
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
