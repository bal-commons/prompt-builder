// What the builder offers: the commons services and their components, identity providers, frontend stacks and
// coding assistants. Everything the prompts and generated code say about an API comes from here.

const GH = "https://github.com/bal-commons";

export const DOCS = {
  guide: `${GH}/module-commons-service-commons/blob/main/ui/docs/guide.md`,
  hub: `${GH}/commons-hub-ui/blob/main/docs/commons-hub.md`,
  hubRepo: `${GH}/commons-hub-ui`,
  workflow: "https://central.ballerina.io/ballerina/workflow",
  demo: "https://github.com/hasithaa/wf-durable-agent-demo"
};

export const SERVICES = [
  {
    id: "notification",
    name: "Notifications",
    summary: "Personal and role inboxes with read state, kept live.",
    module: "commons/notification",
    server: "commons/notification.server",
    npm: "@bal-commons/notification-ui",
    repo: `${GH}/module-commons-notification`,
    port: 9100,
    basePath: "/notifications/v1",
    client: "notifications",
    components: [
      {tag: "commons-notification-bell", name: "Bell", summary: "Unread count; opens the inbox."},
      {tag: "commons-inbox", name: "Inbox", summary: "Personal and role notifications, filters, mark read."}
    ],
    webhookEvents: []
  },
  {
    id: "chat",
    name: "Chat",
    summary: "Conversations between people and agents: streaming replies, forms, typing, read receipts.",
    module: "commons/chat",
    server: "commons/chat.server",
    npm: "@bal-commons/chat-ui",
    repo: `${GH}/module-commons-chat`,
    port: 9101,
    basePath: "/chat/v1",
    client: "chats",
    components: [
      {tag: "commons-conversation-list", name: "Conversation list", summary: "The caller's conversations with unread counts and search."},
      {tag: "commons-conversation", name: "Conversation", summary: "One conversation: messages, streaming, forms, upload cards."}
    ],
    webhookEvents: ["message.created", "form.submitted"]
  },
  {
    id: "attachment",
    name: "Attachments",
    summary: "Upload cases with typed slots, previews, downloads and submission.",
    module: "commons/attachment",
    server: "commons/attachment.server",
    npm: "@bal-commons/attachment-ui",
    repo: `${GH}/module-commons-attachment`,
    port: 9102,
    basePath: "/attachments/v1",
    client: "attachments",
    components: [
      {tag: "commons-upload-case", name: "Upload card", summary: "One case: drop zones per slot, thumbnails, Submit."},
      {tag: "commons-case-list", name: "Case list", summary: "The caller's cases (or all, for admins) with progress."},
      {tag: "commons-file-viewer", name: "File viewer", summary: "A case's files: gallery, preview, download, delete."}
    ],
    webhookEvents: ["case.submitted"]
  }
];

export function docUrl(service, tag) {
  return `${service.repo}/blob/main/ui/docs/${tag}.md`;
}

export function serviceById(id) {
  return SERVICES.find((s) => s.id === id);
}

// Activities a durable agent can be given, per service. `code` is generated in code.js.
export const ACTIVITIES = [
  {id: "notifyUser", service: "notification", summary: "Sends one user a notification."},
  {id: "notifyRole", service: "notification", summary: "Sends everyone holding a role a notification."},
  {id: "sendMessage", service: "chat", summary: "Streams a message into the conversation about a business object."},
  {id: "askForm", service: "chat", summary: "Sends a form (fields the agent picks); the answer comes back as an event."},
  {id: "closeConversation", service: "chat", summary: "Closes the conversation about a business object."},
  {id: "requestUpload", service: "attachment", summary: "Opens an upload case for a user and posts an upload card in the chat."},
  {id: "closeCase", service: "attachment", summary: "Closes an upload case."}
];

// Only providers whose tokens the commons auth reads as-is: the roles claim must be an array or a comma list.
export const IDPS = [
  {
    id: "none",
    name: "None (development)",
    license: "",
    summary: "No sign-in. Services trust x-user-id / x-user-roles headers; the UI switches personas. Never deploy this.",
    defaults: {}
  },
  {
    id: "thunder",
    name: "Thunder",
    license: "Apache-2.0",
    url: "https://github.com/thunder-id/thunderid",
    summary: "WSO2's open-source identity server. Users, groups and an OAuth app come from a resource file.",
    image: "ghcr.io/thunder-id/thunderid:1.0.0",
    defaults: {
      issuer: "https://localhost:8090",
      jwksUrl: "https://localhost:8090/oauth2/jwks",
      authorizeUrl: "https://localhost:8090/oauth2/authorize",
      tokenUrl: "https://localhost:8090/oauth2/token",
      userIdClaim: "username",
      rolesClaim: "groups",
      scopes: "openid profile email groups",
      selfSigned: true
    },
    setup: [
      "Create the users, one group per role, and a public OAuth client (authorization code + PKCE, redirect URI `<app origin>/callback`) that puts `groups` and `username` in the access token.",
      "Thunder serves HTTPS with a self-signed certificate in development: set `jwksVerifyTls = false` in each service's auth config and proxy the token endpoint through the web server so the browser doesn't call it cross-origin."
    ]
  },
  {
    id: "keycloak",
    name: "Keycloak",
    license: "Apache-2.0",
    url: "https://www.keycloak.org",
    summary: "The widely used open-source IdP. Roles come from realm roles.",
    image: "quay.io/keycloak/keycloak:26.0",
    defaults: {
      issuer: "http://localhost:8080/realms/app",
      jwksUrl: "http://localhost:8080/realms/app/protocol/openid-connect/certs",
      authorizeUrl: "http://localhost:8080/realms/app/protocol/openid-connect/auth",
      tokenUrl: "http://localhost:8080/realms/app/protocol/openid-connect/token",
      userIdClaim: "preferred_username",
      rolesClaim: "realm_access.roles",
      scopes: "openid profile email",
      selfSigned: false
    },
    setup: [
      "Create a realm (`app` above), one realm role per app role, the users with their roles, and a public client with standard flow + PKCE (S256), redirect URI `<app origin>/callback` and web origin `<app origin>`.",
      "Keycloak puts realm roles in `realm_access.roles`, which the services read with `rolesClaim = \"realm_access.roles\"`. Export the realm (`kc.sh export`) so the setup is repeatable."
    ]
  },
  {
    id: "authentik",
    name: "authentik",
    license: "MIT (open-source edition)",
    url: "https://goauthentik.io",
    summary: "Open-source IdP with a friendly admin UI. Roles come from groups.",
    image: "ghcr.io/goauthentik/server",
    defaults: {
      issuer: "http://localhost:9000/application/o/app/",
      jwksUrl: "http://localhost:9000/application/o/app/jwks/",
      authorizeUrl: "http://localhost:9000/application/o/authorize/",
      tokenUrl: "http://localhost:9000/application/o/token/",
      userIdClaim: "preferred_username",
      rolesClaim: "groups",
      scopes: "openid profile email",
      selfSigned: false
    },
    setup: [
      "Run authentik with its official docker-compose file (it needs PostgreSQL and Redis). Create an OAuth2/OpenID provider (public client, PKCE) and an application with slug `app`, redirect URI `<app origin>/callback`.",
      "The `profile` scope mapping includes `groups`; create one group per app role and add the users. The issuer keeps its trailing slash."
    ]
  },
  {
    id: "oidc",
    name: "Other OIDC provider",
    license: "",
    summary: "Any provider that issues JWT access tokens with the user ID and an array (or comma list) of roles.",
    defaults: {
      issuer: "https://idp.example.com",
      jwksUrl: "https://idp.example.com/.well-known/jwks.json",
      authorizeUrl: "https://idp.example.com/authorize",
      tokenUrl: "https://idp.example.com/token",
      userIdClaim: "sub",
      rolesClaim: "roles",
      scopes: "openid profile",
      selfSigned: false
    },
    setup: ["Register a public client with authorization code + PKCE and make the access token carry the roles claim."]
  }
];

export const FRAMEWORKS = [
  {id: "plain", name: "Plain HTML + JS (no build step)", note: "Loads the single-file component bundles with <script type=\"module\">."},
  {id: "react", name: "React 19 + Vite", note: "React 19 passes properties and events to custom elements."},
  {id: "vue", name: "Vue 3 + Vite", note: "Tell Vue the commons-* tags are custom elements (compilerOptions.isCustomElement)."},
  {id: "angular", name: "Angular", note: "Add CUSTOM_ELEMENTS_SCHEMA to the components that use commons-* tags."},
  {id: "svelte", name: "SvelteKit", note: "Custom elements work directly; import the packages in the browser only (onMount)."}
];

export const DATABASES = [
  {id: "h2", name: "H2 (files, zero setup)", dbType: "H2", driver: "ballerinax/h2.driver"},
  {id: "postgresql", name: "PostgreSQL", dbType: "POSTGRESQL", driver: "ballerinax/postgresql.driver"},
  {id: "mysql", name: "MySQL", dbType: "MYSQL", driver: "ballerinax/mysql.driver"}
];

export const ASSISTANTS = {
  claude: {name: "Claude Code", url: "https://claude.com/claude-code"},
  copilot: {name: "Ballerina Copilot", url: "https://ballerina.io"}
};

// Versions the generated code is written against.
export const VERSIONS = {
  ballerina: "2201.13.4",
  workflow: "0.10.0",
  commons: "0.1.0",
  ui: "0.1"
};
