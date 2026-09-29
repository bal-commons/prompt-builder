# App Prompt Builder

A static page for designing demo portals for Ballerina workflows and durable agents. You describe the demo, pick
capabilities (AI chat, file uploads, notifications, human tasks, run tracking), try the portal with sample data, and
get prompts and a Ballerina starter that compiles.

Live: https://bal-commons.github.io/prompt-builder/

## The flow

| Step | You decide | What the builder does |
|---|---|---|
| 1. Describe your demo | Name, purpose, roles, a starting scenario: AI assistant, approval portal, document collection, custom | The scenario turns on capabilities and fills in editable examples |
| 2. Choose capabilities | AI chat, file uploads, notifications, human tasks, run tracking | Adds each one's components, workflows and services, and says what changed, with Undo. Dependencies follow (uploads need chat) |
| 3. Configure behavior | The agent (purpose, greeting, start form), upload slots, notification destination, scope and events, and task forms (title, instructions, reviewers, context, answer fields) | Shows only the settings of the capabilities you chose; the process, activities and approvals sit under "Advanced" |
| 4. Arrange your portal | Navigation (sidebar, top, `<commons-hub>`), header, pages, one or two columns, the ratio, collapsible columns, custom components | Composes a suggested layout from the capabilities. Once you edit a page, capability changes add or remove components in place |
| 5. Connect services | Mock or Live per service, sign-in, technical settings | Mock by default. Live services get a status (Not configured, Not tested, Connected, Failed) and a read-only connection test |
| 6. Review and generate | Nothing new | Summarizes every decision with an Edit link. Lists the required and mocked services, what developers must supply, and blockers versus suggestions. Holds the starter, prompts, share link, and configuration export and import |

"Advanced" in the header shows every step on one page, over the same configuration. The design autosaves: the URL
always holds it (copy it to share), and a draft in this browser offers itself on the next visit. Version 3 links
(from the previous builder) are upgraded; older ones explain why they can't open.

## The preview

The Preview tab renders the portal with the real bal-commons components (notifications, chat, uploads, the task inbox
and task form, start forms) inside an iframe. It updates as you change the design.
- **Personas:** one per role; switch with "View as".
- **Sample data:** runs, conversations, notifications, upload cases and tasks, seeded from the design and marked as
  samples. The agent's replies are simulated.
- **Simulations:** a failing request, a slow network, another reviewer completing the open task, and a reset.
- **Live data:** a service set to Live in step 5 is called at its URL. A failure shows as the component's error; the
  preview never falls back to sample data. Live services are read-only unless you allow changes for the session.

## How the data works

`js/preview/mock.js` is the mock adapter: an in-memory implementation of the routes, payloads and events the
components use against the real services. It covers the notification service, chat service, attachment service,
workflow management API (human tasks and review activities) and the generated start service. The route list is at
the top of the file.

The preview runtime (`js/preview/runtime.js`) swaps `fetch` and `EventSource` inside the iframe for mock URLs only,
so mock and live services go through the same component code.

Human task forms in the preview use the schema workflow 0.10.0 generates from the answer type
(`js/contracts.js: taskFormSchema`). Start forms use the schema the builder writes (`startInputSchema`). Both the
preview and the generated code read these, so they agree.

Tokens for live services live only in the tab's memory: never in the URL, drafts or exported files.

## Output

- **Prompts** for the frontend (Claude Code), the backend and the workflows and agents (Claude Code or Ballerina
  Copilot), step by step with a check after each step, or one prompt per part.
- **Code:** a Ballerina package with only the services the design uses:
  - the commons services, in one process;
  - the start service and runs;
  - the agents, their activities and webhook receivers;
  - the workflows and their human tasks;
  - the run and task notifications;
  - the upload slots and the management API config;
  - Config.toml for the identity provider;
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
node test/compile.mjs /tmp/pb-compile          # generates backends for every scenario and edge case, runs bal build
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
| `js/state.js` | The configuration (version 4), migration from version 3, derived services |
| `js/compose.js` | Scenarios, capabilities and their dependencies, the suggested layout, `diagnostics()` |
| `js/code.js`, `js/prompts.js`, `js/wireframe.js`, `js/zip.js` | The generators |
| `js/ui/` | The builder: store (configuration versus editor state, undo, drafts), steps, review, output panel |
| `preview.html`, `js/preview/` | The interactive preview and its mock adapter |
| `vendor/` | The bal-commons component bundles the preview uses |
| `docs/design.md` | The audit, the flow and the plan |

## License

Apache-2.0. The vendored bundles include Lit (BSD-3-Clause); see `NOTICE.txt` and `THIRD_PARTY_NOTICES.md`.
