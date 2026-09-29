// The identity provider's seed file: the roles, the initial users, the portal's client and the claims every backend
// reads. Keycloak takes a realm export (imported with --import-realm); Thunder takes a declarative resources file.
// Passwords are development placeholders: change them before anyone else signs in.

const quote = (v) => JSON.stringify(String(v));
export const devPassword = (user) => `${user.username}-change-me`;

// The realm name from a Keycloak issuer like http://host/realms/<name>.
export function realmOf(issuer) {
  return /\/realms\/([^/]+)/.exec(issuer ?? "")?.[1] ?? "app";
}

export function keycloakRealm(state, portalOrigin = "http://localhost:5173") {
  const id = state.identity;
  const clientId = id.idp.clientId || "portal";
  return JSON.stringify({
    realm: realmOf(id.idp.issuer),
    enabled: true,
    sslRequired: "external",
    roles: {realm: id.roles.map((name) => ({name}))},
    users: id.users.map((u) => ({
      username: u.username, email: u.email, firstName: u.name, lastName: "", enabled: true, emailVerified: true,
      credentials: [{type: "password", value: devPassword(u), temporary: false}],
      realmRoles: u.roles
    })),
    clients: [{
      clientId,
      name: state.app.name,
      publicClient: true,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: false,
      redirectUris: [`${portalOrigin}/*`],
      webOrigins: [portalOrigin],
      attributes: {"pkce.code.challenge.method": "S256"},
      // Access tokens carry realm_access.roles and preferred_username by default; this adds the client as an audience,
      // which the workflow management API checks.
      protocolMappers: [{name: "portal-audience", protocol: "openid-connect", protocolMapper: "oidc-audience-mapper",
        config: {"included.client.audience": clientId, "access.token.claim": "true", "id.token.claim": "false"}}]
    }]
  }, null, 2) + "\n";
}

// Thunder's declarative resources: users, one group per role (group names travel in the `groups` claim), the app.
export function thunderResources(state, portalOrigin = "http://localhost:5173") {
  const id = state.identity;
  const ou = "01900000-0000-7000-8000-000000000001";
  const docs = [];
  for (const u of id.users) {
    docs.push(`resource_type: user
id: user-${u.username}
type: Person
ouId: ${ou}
attributes:
  username: ${u.username}
  email: ${u.email}
  given_name: ${quote(u.name)}
credentials:
  password: ${quote(devPassword(u))}`);
  }
  for (const role of id.roles) {
    const members = id.users.filter((u) => u.roles.includes(role));
    docs.push(`resource_type: group
id: group-${role.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
name: ${quote(role)}
ouId: ${ou}
members:${members.length ? members.map((u) => `\n  - id: user-${u.username}\n    type: user`).join("") : " []"}`);
  }
  docs.push(`resource_type: application
id: app-portal
name: ${quote(state.app.name)}
type: browser
ouId: ${ou}
authFlowHandle: default-flow
inboundAuthConfig:
  - type: oauth2
    config:
      clientId: ${id.idp.clientId || "portal"}
      redirectUris:
        - "${portalOrigin}/callback"
      grantTypes:
        - authorization_code
        - refresh_token
      responseTypes:
        - code
      tokenEndpointAuthMethod: none
      publicClient: true
      pkceRequired: true
      # The groups claim is opt-in twice: listed as a token attribute, and released through a scope mapping.
      token:
        accessToken:
          userConfig:
            attributes:
              - username
              - email
              - given_name
              - groups
        idToken:
          userAttributes:
            - username
            - email
            - given_name
            - groups
      scopeClaims:
        groups:
          - groups
        profile:
          - username
          - given_name
        email:
          - email`);
  return `# ${state.app.name}: users, their roles (groups) and the portal, for Thunder to load at startup.
# Passwords are development placeholders; change them before anyone else signs in.
${docs.join("\n---\n")}
`;
}

// The seed file for the chosen provider, as [path, content], or undefined when it has none.
export function seedFile(state) {
  switch (state.identity.idp.kind) {
    case "keycloak": return ["identity/realm.json", keycloakRealm(state)];
    case "thunder": return ["identity/resources.yaml", thunderResources(state)];
  }
  return undefined;
}

// The claims each kind of backend reads, for the review and the prompts.
export function claimMap(state) {
  const idp = state.identity.idp;
  return [
    {backend: "Commons services (chat, notifications, attachments)", settings: `auth.userIdClaim = "${idp.userIdClaim}", auth.rolesClaim = "${idp.rolesClaim}"`},
    {backend: "Each integration's app API and start service", settings: `auth.userIdClaim = "${idp.userIdClaim}", auth.rolesClaim = "${idp.rolesClaim}"`},
    {backend: "Each integration's workflow management API", settings: `userIdClaim = "${idp.userIdClaim}", rolesClaim = "${idp.rolesClaim}", jwtAudience = "${idp.audience || idp.clientId}"`}
  ];
}
