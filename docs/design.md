# Design: the guided builder

## Audit of version 3

Findings from the source (`js/app.js`, `js/state.js`, `js/code.js`, `js/prompts.js`, `js/wireframe.js`):

| Area | What the code does | What it costs the user |
|---|---|---|
| Flow | `renderForm()` renders seven collapsible sections in one column: app, layout, workflows, pages, custom, sign-in, assistants | No order, no "done". Package names, databases and identity-provider URLs sit next to the demo idea |
| Capabilities | There are none. `enabledServices()` derives services from the components placed on pages | To get "chat" you add an agent preset, find the "put on page" button and understand start forms. Nothing explains what a service is for |
| Composition | Pages start empty. The presets place components only when asked | A blank portal until you learn the component catalogue |
| Preview | An SVG wireframe of boxes (`wireframe.js`) | You can't see a conversation, a generated task form or an upload card. Personas, sample data and states don't exist |
| Validation | Three inline warnings: an unplaced custom component, hub duplicates, a missing approvals page | Invalid designs generate code silently: empty field names, choices without options, a task form without an inbox, an unplaced start form |
| Removal | Deleting a workflow, page, field or component is immediate | No undo; a slip loses a configured task form |
| Behaviour | Uploads have no slots (the model picks MIME types). Notifications have no scope or events. Task instructions exist in the model but not in the UI | The generated app can't express "ID and proof of address", or "notify reviewers when a task is assigned" |
| Portability | The state lives only in the URL hash. `decode()` drops any other version | Closing the tab loses the work; old links open a blank app |
| Mobile | The output panel stacks under the form | The preview is far below the settings it reflects |

What works, and what to keep:
- one state object feeding the wireframe, prompts and code;
- the page and column editor;
- the compile check (`test/compile.mjs`);
- share links;
- accessible labels on every control.

## Screen flow

A persistent step bar with seven steps; each step has Back and Continue. The preview sits beside the steps on
desktop, and behind a Configure / Preview switch on narrow screens. The builder designs an ecosystem, not one app:
who signs in, which backends exist, and only then what the portal shows.

1. **Describe your app.** Name, purpose and the features to include. A first-level filter: each feature turns on its
   capability; the details come later. Full width.
2. **Design the architecture.** A diagram of the portal, the identity provider, the integrations and the commons
   services. Each new integration is a Ballerina package with its workflows, agents, human tasks and approvals.
   An existing one is imported from its `workflow.def.json`; the user adds the reviewer roles. Mock or live per
   backend, with a read-only connection test.
3. **Choose capabilities.** Cards for AI chat, file uploads, notifications, human tasks and run tracking, with an
   example and what each adds. A capability that needs a workflow or agent adds one to the first new integration.
4. **Configure behavior.** Human tasks as one Tasks page (an inbox per integration with tasks) and/or a page per task
   type (an inbox filtered by the qualified task name `<workflow>.<task>`), upload slots, and notifications.
5. **Arrange your portal.** Navigation style and pages. The layout is composed from the capabilities until you edit
   it; after that, capability changes add or remove components in place.
6. **Identity and sign-in.** The identity provider, and a three-column board: users, roles, and grants (see
   everyone's runs, start a workflow or agent, complete a human task, approve an agent's action). Links are made by
   dragging between dots or by selecting and clicking. The login screen is a username and password form, with an
   optional quick sign-in for demos. The starter carries a seed file the provider loads. Full width.
7. **Review and generate.** A summary with an Edit link per decision, the technical settings, what developers must
   supply, blockers versus suggestions, and the outputs.

Identity comes after the portal because what a role may do refers to the workflows, tasks and approvals designed
before it. Diagnostics name their step by ID (`describe`, `architecture`, …), so the order can change.

"Advanced" (in the header) shows every step's settings on one page, over the same configuration.

## Configuration model (version 5)

`state.js` holds the exported configuration only. The wizard step, preview selection, undo stack, session tokens and
connection test results are editor state and never enter share links or exports.

| Key | Holds |
|---|---|
| `app` | Name and purpose |
| `identity` | `idp` (kind, endpoints, client, claims, audience), `roles`, `adminRoles`, `users` (username, name, email, roles), `login` (title, subtitle, `quick`) |
| `architecture.integrations` | Per integration: `id`, `source` (`new` or `existing`), title, org, package, run ID prefix, and its `workflows` (agents and workflows with `startRoles`, task `roles`, approval `userRoles`; imported ones keep `fixedName`s from the descriptor) |
| `capabilities` | `chat`, `uploads`, `notifications`, `tasks`, `runs` flags |
| `behavior` | `uploads.slots`, `notifications` (scope, events), `tasks` (`inbox`, `typePages`: `<integration>:<workflow>.<task>` refs) |
| `layout`, `header`, `bell`, `pages`, `custom` | The portal; `layout.auto` says whether pages follow the capabilities. Component IDs `start:<workflow>` and `task-inbox@<ref>` are parameterized |
| `connections` | `commons` (mode and a URL per service) and one entry per integration (mode, `url`, `mgmtUrl`). Never tokens |
| `frontend`, `db`, `assistants`, `style`, `deploy` | Technical settings |

`migrate()` upgrades version 3 and 4 links. The old app becomes the first integration, the roles get one user each,
and `layout.auto` is off for version 3 (its pages were hand-made). Versions below 3 open a blank app with a notice.

## Modules

| Module | Responsibility |
|---|---|
| `js/catalog.js` | Services, components, capabilities (defaults, dependencies, the components each adds), scenarios, identity providers, versions |
| `js/contracts.js` | Schemas both the preview and the generator use: the start form's JSON Schema, and the task form schema workflow 0.10.0 generates from a record type |
| `js/compose.js` | Applying a capability or scenario, composing pages, and `diagnostics()` (issues with fixes) |
| `js/state.js` | The configuration, migration, encoding, derived services (the integrations the portal manages, task types) |
| `js/identity.js` | The Keycloak realm or Thunder resources seed file, and the claims each backend reads |
| `js/descriptor.js` | Maps a `workflow.def.json` to an existing integration: workflows, agents, input and answer fields (lossy schemas become text) |
| `js/diagram.js` | The architecture diagram (SVG) |
| `js/code.js`, `js/prompts.js`, `js/wireframe.js` | Generators (unchanged role) |
| `js/ui/*.js` | The wizard steps, review, advanced mode |
| `preview.html`, `js/preview/runtime.js` | The interactive preview: renders the portal with the real bal-commons components |
| `js/preview/mock.js` | The mock adapter: an in-memory implementation of the service contracts the components call |

## Data adapters

The preview runs in an iframe. Components get a base URL per service:
- **Mock:** `https://mock.preview/<service>` for the commons services and `https://mock.preview/int/<id>/app-service`
  and `/int/<id>/workflow` per integration. The runtime replaces `fetch` and `EventSource` inside the iframe and
  answers those URLs from `mock.js`.
- **Live:** the URLs from step 3. Requests go to the network unchanged. A failure shows as the component's error; the
  preview never falls back to sample data. Live services are read-only in the preview until the user allows
  changes for the session.

The mock implements the same routes, payloads and events the components use against the real services. It covers
the notification service, chat service, attachment service, workflow management API (human tasks and review
activities) and the generated start service. Each route is listed in `mock.js`. Sample data is seeded from the
configuration, marked "sample", and kept in `sessionStorage` so a preview reload keeps its conversations and runs.

## What shipped

| Item | State |
|---|---|
| Seven-step wizard, step bar with blocker counts, Back and Continue, Advanced mode | Done |
| Templates, capabilities with dependencies, explanations and Undo | Done |
| Describe as a feature checklist; identity after the portal; full-width Describe and Identity | Done |
| Identity step: provider, users → roles → grants board (drag or click), start roles enforced by the start service, username and password login with optional quick sign-in, claims; Keycloak and Thunder seed files | Done; the seed files aren't yet loaded into a running Keycloak or Thunder by the checks |
| Architecture step: diagram, new and imported integrations, one package each plus a commons package | Done; every variant compiles |
| Human tasks as one inbox per integration and pages per task type | Done |
| Interactive preview with a login screen, users from the identity step, multi-integration mocks, simulated agent | Done |
| Mock or Live per backend, status, read-only connection test, session-only token, live changes gated | Done. The live preview hasn't run against real services |
| Draft recovery, share links, version 3 and 4 migration, configuration export and import | Done |

Deferred:
- Reading existing integrations from a running management API (`/definitions`) or a JAR, instead of the descriptor.
- Live-mode verification against running services.
- Stream reconnect simulation. The components refetch on reconnect; the mock streams don't drop.
