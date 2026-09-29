# App Prompt Builder

A static page for designing app ecosystems around Ballerina workflows and durable agents. You define who signs in,
which integrations run behind the portal (new Ballerina packages, or existing ones imported from their
`workflow.def.json`), what the app can do (AI chat, file uploads, notifications, human tasks, run tracking) and how
the portal looks. Then you try it with sample data, and get prompts and a starter that compiles.

Live: https://bal-commons.github.io/prompt-builder/

## The flow

| Step | You decide | What the builder does |
|---|---|---|
| 1. Describe your app | Name, purpose, a template: AI assistant, approval portal, document collection, custom | The template turns on capabilities and fills in an editable integration |
| 2. Identity and sign-in | Identity provider (none for development, Thunder, Keycloak, authentik, other OIDC), the login screen, roles, admin roles, initial users with their roles, the user ID, roles and audience claims | Writes a seed file (`identity/realm.json` for Keycloak, `identity/resources.yaml` for Thunder) with the roles, users and a public PKCE client; shows which claims each backend reads; flags task roles that aren't defined |
| 3. Design the architecture | The integrations: new ones (a package each, with workflows, agents and their human tasks and approvals) and existing ones (import `workflow.def.json`, then add the reviewer roles the descriptor doesn't carry); Mock or Live per backend | Draws the ecosystem: the portal, the identity provider, each integration and the shared commons services. Live backends get a status and a read-only connection test |
| 4. Choose capabilities | AI chat, file uploads, notifications, human tasks, run tracking | Adds each one's components and services, and says what changed, with Undo. Dependencies follow (uploads need chat) |
| 5. Configure behavior | Human tasks as one Tasks page (an inbox per integration) and/or a page per task type; upload slots; notification destination, scope and events | Keeps the task pages in line with the choices |
| 6. Arrange your portal | Navigation (sidebar, top, `<commons-hub>`), header, pages, one or two columns, the ratio, collapsible columns, custom components | Composes a suggested layout from the capabilities. Once you edit a page, capability changes add or remove components in place |
| 7. Review and generate | Technical settings: database, deployment, frontend stack, assistants, prompt style | Summarizes every decision with an Edit link, lists what developers must supply and blockers versus suggestions, and holds the starter, prompts, share link and configuration export and import |

"Advanced" in the header shows every step on one page, over the same configuration. The design autosaves: the URL
always holds it (copy it to share), and a draft in this browser offers itself on the next visit. Version 3 and 4
links are upgraded; older ones explain why they can't open.

### Existing integrations

Every executable the ballerina/workflow 0.10 compiler plugin builds has its Workflow Definition Descriptor at the
root of the JAR (`unzip -p target/bin/<app>.jar workflow.def.json`). The builder reads its workflows, agents, input
schemas and human task answer schemas. Roles and titles live in code, so you add them. The portal reaches an
existing integration only through its workflow management API: its task inbox and task form, and start forms that
post `{workflowType, input}` to `/workflows`.

## The preview

The Preview tab renders the portal with the real bal-commons components (notifications, chat, uploads, the task inbox
and task form, start forms) inside an iframe. It updates as you change the design.
- **Login screen:** the preview opens on the app's login screen; pick one of the initial users (with an identity
  provider, the sign-in is simulated). "View as" switches user; Sign out returns to the login screen.
- **Sample data:** runs, conversations, notifications, upload cases and tasks, seeded from the design and marked as
  samples. The agent's replies are simulated.
- **Simulations:** a failing request, a slow network, another reviewer completing the open task, and a reset.
- **Live data:** a backend set to Live in step 3 is called at its URL. A failure shows as the component's error; the
  preview never falls back to sample data. Live services are read-only unless you allow changes for the session.

## How the data works

`js/preview/mock.js` is the mock adapter: an in-memory implementation of the routes, payloads and events the
components use against the real services. It covers the notification service, chat service, attachment service, and
per integration the workflow management API (human tasks with the `taskName` filter, review activities, `/workflows`
starts) and the generated start service. The route list is at the top of the file.

The preview runtime (`js/preview/runtime.js`) swaps `fetch` and `EventSource` inside the iframe for mock URLs only,
so mock and live services go through the same component code.

Human task forms in the preview use the schema workflow 0.10.0 generates from the answer type
(`js/contracts.js: taskFormSchema`). Start forms use the schema the builder writes (`startInputSchema`). Both the
preview and the generated code read these, so they agree.

Tokens for live services live only in the tab's memory: never in the URL, drafts or exported files.

## Output

- **Prompts** for the frontend (Claude Code), the backend and the workflows and agents (Claude Code or Ballerina
  Copilot), step by step with a check after each step, or one prompt per part.
- **Code:** one Ballerina package per new integration (`backend/<package>`), with only what the design uses, plus
  the shared commons services in `backend/commons` and the identity provider's seed file:
  - the start service and runs;
  - the agents, their activities and webhook receivers;
  - the workflows and their human tasks;
  - the run and task notifications;
  - the upload slots and the management API config;
  - Config.toml per package, with the identity provider's issuer, JWKS and claims;
  - optionally docker-compose.yml and nginx.conf.
- **Download starter (.zip):** the code, PROMPTS.md, a README with setup steps and what you must supply, and
  `builder-config.json` (the design, no credentials).

## Run it locally

There's no build step. Serve the directory:

```sh
python3 -m http.server 5190   # then open http://localhost:5190
```

It is published with GitHub Pages from the `main` branch root.

## Checks

```sh
node test/prompts.mjs                          # generates the prompts, wireframes and diagnostics for every variant
node test/compile.mjs /tmp/pb-compile          # generates the packages for every variant and runs bal build in each
npm i --no-save playwright && npx playwright install chromium
node test/acceptance.mjs                       # the acceptance scenarios, against http://localhost:5190
```

Run the compile check after changing `js/code.js`, `js/contracts.js` or `js/catalog.js` (it needs Ballerina 2201.13.4
on the PATH). Run the acceptance test after changing the UI or the preview.

## How it's organized

| File | What it holds |
|---|---|
| `js/catalog.js` | Services, components, capabilities, scenarios, connections, identity providers, versions |
| `js/contracts.js` | Schemas shared by the preview and the generators |
| `js/state.js` | The configuration (version 5), migration from versions 3 and 4, derived services |
| `js/identity.js` | The identity provider's seed file and the claims each backend reads |
| `js/descriptor.js` | Importing an existing integration from its `workflow.def.json` |
| `js/diagram.js` | The architecture diagram |
| `js/compose.js` | Scenarios, capabilities and their dependencies, the suggested layout, `diagnostics()` |
| `js/code.js`, `js/prompts.js`, `js/wireframe.js`, `js/zip.js` | The generators |
| `test/variants.mjs` | The designs the checks run on |
| `js/ui/` | The builder: store (configuration versus editor state, undo, drafts), steps, review, output panel |
| `preview.html`, `js/preview/` | The interactive preview and its mock adapter |
| `vendor/` | The bal-commons component bundles the preview uses |
| `docs/design.md` | The audit, the flow and the plan |

## License

Apache-2.0. The vendored bundles include Lit (BSD-3-Clause); see `NOTICE.txt` and `THIRD_PARTY_NOTICES.md`.
