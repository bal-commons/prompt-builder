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

A persistent step bar with six steps; each step has Back and Continue. The preview sits beside the steps on desktop,
and behind a Configure / Preview switch on narrow screens.

1. **Describe your demo.** Name, purpose, roles, and a starting scenario (AI assistant, approval portal, document
   collection, custom). A scenario sets capabilities and defaults; everything stays editable.
2. **Choose capabilities.** Cards for AI chat, file uploads, notifications, human tasks and run tracking. Each card
   shows an example and the components it adds. Toggling one explains what changed and offers Undo.
3. **Configure behaviour.** One section per enabled capability: the agent (purpose, greeting, start input), upload
   slots, notification destination, scope and events, and the task forms (title, instructions, reviewers, context
   fields, answer fields). The process, activities and approvals are under "Advanced".
4. **Arrange your portal.** Navigation style and pages. The layout is composed from the capabilities until you edit
   it; after that, capability changes add or remove components in place.
5. **Connect services.** Mock or live per service, with a status (Mock, Not configured, Not tested, Connected,
   Failed) and an explicit read-only connection test. Sign-in, database, packages, frontend stack, assistants and
   deployment are here, most under "Technical settings".
6. **Review and generate.** A summary with an Edit link per decision. It lists the required services, what stays
   mocked, what developers must supply, and blockers versus suggestions, and has the outputs: prompts, starter
   download, share link, and configuration export.

"Advanced" (in the header) shows every step's settings on one page, over the same configuration.

## Configuration model (version 4)

`state.js` holds the exported configuration only. The wizard step, preview selection, undo stack, session tokens and
connection test results are editor state (`view` in `app.js`) and never enter share links or exports.

| Key | Holds |
|---|---|
| `app` | Name, purpose, roles, admin roles, run ID prefix, Ballerina org and package |
| `scenario` | The scenario the design started from (informational) |
| `capabilities` | `chat`, `uploads`, `notifications`, `tasks`, `runs` flags |
| `behavior.uploads` | Named slots: label, accepted types, max files, required |
| `behavior.notifications` | Scope and events: run started, task assigned, run finished |
| `workflows` | Agents and workflows (version 3 shape, plus `greeting`) |
| `layout`, `header`, `bell`, `pages`, `custom` | The portal (version 3 shape); `layout.auto` says whether pages follow the capabilities |
| `connections` | Per service: `mode` (`mock` or `live`) and `url`. Never tokens |
| `frontend`, `db`, `idp`, `assistants`, `style`, `deploy` | Technical settings |

`migrate()` upgrades version 3 links: it infers the capabilities from the design, sets `layout.auto = false` (the
pages were hand-made) and fills in the new keys. Versions below 3 open a blank app with a notice.

## Modules

| Module | Responsibility |
|---|---|
| `js/catalog.js` | Services, components, capabilities (defaults, dependencies, the components each adds), scenarios, identity providers, versions |
| `js/contracts.js` | Schemas both the preview and the generator use: the start form's JSON Schema, and the task form schema workflow 0.10.0 generates from a record type |
| `js/compose.js` | Applying a capability or scenario, composing pages, and `diagnostics()` (issues with fixes) |
| `js/state.js` | The configuration, migration, encoding, derived services |
| `js/code.js`, `js/prompts.js`, `js/wireframe.js` | Generators (unchanged role) |
| `js/ui/*.js` | The wizard steps, review, advanced mode |
| `preview.html`, `js/preview/runtime.js` | The interactive preview: renders the portal with the real bal-commons components |
| `js/preview/mock.js` | The mock adapter: an in-memory implementation of the service contracts the components call |

## Data adapters

The preview runs in an iframe. Components get a base URL per service:
- **Mock:** `https://mock.preview/<service>`. The runtime replaces `fetch` and `EventSource` inside the iframe and
  answers those URLs from `mock.js`.
- **Live:** the URL from step 5. Requests go to the network unchanged. A failure shows as the component's error; the
  preview never falls back to sample data. Live services are read-only in the preview until the user allows
  changes for the session.

The mock implements the same routes, payloads and events the components use against the real services. It covers
the notification service, chat service, attachment service, workflow management API (human tasks and review
activities) and the generated start service. Each route is listed in `mock.js`. Sample data is seeded from the
configuration, marked "sample", and kept in `sessionStorage` so a preview reload keeps its conversations and runs.

## Plan

| Phase | Work | Modules |
|---|---|---|
| 1 | Wizard, scenarios, capabilities with dependencies and undo, contextual behaviour settings, auto-composed layout, diagnostics, review screen, version 4 model and migration, draft recovery, synchronized interactive preview with mock adapters, personas | `catalog`, `contracts`, `compose`, `state`, `ui/*`, `preview/*`, `code`, `prompts` |
| 2 | Richer simulations (another reviewer completes a task, slow network, service error, stream reconnect) and live connection tests | `preview/*`, `ui/connect` |
| 3 | Configuration import and export files, an example configuration, and live-mode preview with a session token | `ui/review`, `state` |

The phase numbers are the order of work. The report at the end of the change says what shipped.

## What shipped in this change

| Item | State |
|---|---|
| Six-step wizard, step bar with blocker counts, Back and Continue, Advanced mode | Done |
| Scenarios (AI assistant, approval portal, document collection, custom) | Done |
| Capabilities with dependencies, explanations and Undo; configuration kept when a capability is toggled | Done |
| Contextual behavior: agent greeting and start form, upload slots, notification destination, scope and events, task instructions, context and answer fields | Done; the generators emit all of them |
| Suggested layout that follows capabilities until edited; in-place changes afterwards | Done |
| `diagnostics()`: blockers and suggestions with fixes | Done |
| Interactive preview with real components, personas, sample data, simulated agent, notification-to-run navigation | Done |
| Simulations: a failing request, a slow network, another reviewer, a reset | Done |
| Mock or Live per service, status, read-only connection test, session-only token, live changes gated | Done. The live preview hasn't run against real services |
| Draft recovery, share links, version 3 migration, configuration export and import | Done |
| Starter with setup steps, what to supply, and `builder-config.json` | Done |

Deferred:
- Live-mode verification against running services.
- Stream reconnect simulation. The components refetch on reconnect; the mock streams don't drop.
- Per-field validation beyond what workflow 0.10.0 enforces: the answer schema carries types, enums and required,
  not ranges.
