# App Prompt Builder

A static page for designing web apps that demonstrate Ballerina workflows and durable agents. You lay out the app,
and it hands you the prompts and a Ballerina starter to build it with.

The app is ordinary web-app structure plus the part that is special: the workflows and agents.
- **Layout:** sidebar navigation that collapses to a rail, top navigation, or one `<commons-hub>`; what goes in the
  header; where the notification bell leads (a drawer or a page).
- **Pages:** starting from Home. Each page has one or two columns, with the split set in 5% steps (e.g. 40 / 60) and
  an optional collapsible left column. Each column holds components:
  - the bal-commons ones: inbox, conversation list, conversation, upload card, case list, file viewer;
  - the workflow ones: a start form per workflow or agent, the task inbox and the task form;
  - the app's own: My runs and the user menu;
  - custom components you describe.
- **Workflows and agents:** each one gets:
  - a start input, which becomes its start form and its input record;
  - a dedicated start service, `POST /start/<name>`.
  
  A chat agent's start opens a conversation that the agent joins as its own participant (`agent:<name>`). From then
  on, messages, form answers and submitted uploads reach it through signed webhooks. A workflow's human tasks get
  their forms generated from the fields you list. Approvals come from an `approvalPolicy` on an activity. The task
  inbox and task form read and decide both through the workflow app's management API.

The page then gives you:
- **Wireframes** of every page, updated as you choose.
- **Prompts** for the frontend (Claude Code), the backend, and the workflows and agents (Claude Code or Ballerina
  Copilot). They come step by step, with a check after each step, or as one prompt per part.
- **Code:** a Ballerina package that compiles as generated:
  - the commons services the design uses, in one process;
  - the start service and the runs table;
  - the durable agents and their activities;
  - the workflows and their human tasks;
  - the webhook receivers, which route each event to its run's agent;
  - the management API config, and Config.toml for the identity provider you pick;
  - optionally docker-compose.yml and nginx.conf.

**Download starter (.zip)** packs the code, `PROMPTS.md` and a README. **Copy link** copies a URL that restores the
whole design. Everything runs in the browser; nothing is sent anywhere.

## What you choose

| Step | Choices |
|---|---|
| The app | Name, roles, who sees everyone's runs, run ID prefix, Ballerina org and package, database (H2, PostgreSQL, MySQL) |
| Layout | Sidebar (collapsible), top navigation or `<commons-hub>` (and its panes); header components; the bell's target; frontend stack |
| Workflows and agents | Chat agent, agent, approval workflow or workflow. Each has a start input. Agents also have chat and uploads, a process, activities and an approval policy; workflows have human tasks with approvers and form fields. One click puts each on a page |
| Pages | Title, one or two columns, the ratio, a collapsible left column, and the components in each column, in order. Quick Tasks, Notifications, Chats and Files pages |
| Custom components | Name, what it does, and whether it needs a backend endpoint |
| Sign-in | None (development), Thunder, Keycloak, authentik, or another OIDC provider; issuer, JWKS, claims, and the token audience for the management API |
| Assistants and output | Claude Code or Ballerina Copilot for the backend and the workflows; step-by-step or full prompts; local or Docker Compose |

The backend runs only the commons services that the pages or agents use, and turns on the management API only when
a page shows tasks.

Identity providers are limited to those whose tokens the commons auth reads as they are. The roles claim must be an
array or a comma-separated list (ZITADEL's role map, for example, isn't supported).

## Run it locally

It has no build step. Serve the directory and open it:

```sh
python3 -m http.server 5190   # then open http://localhost:5190
```

It's published with GitHub Pages from the `main` branch root.

## Check the generated code

`test/compile.mjs` generates the backend for several designs: a blank app, a chat agent, an approval workflow with task pages, an agent with no services, and one that uses everything (keyword field names, choice fields, Keycloak, PostgreSQL, Compose), and compiles each one with `bal build` (Ballerina
2201.13.4 on the PATH):

```sh
node test/compile.mjs /tmp/prompt-builder-compile
```

Run it after changing `js/code.js` or `js/catalog.js`.

## How it's organized

| File | What it holds |
|---|---|
| `js/catalog.js` | The services, components, layouts, activities, identity providers, stacks and versions. Every API fact the prompts state comes from here or from `code.js` |
| `js/code.js` | The Ballerina and configuration generators |
| `js/prompts.js` | The prompts, per part and step |
| `js/wireframe.js` | The screens as SVG, and their text form for the prompts |
| `js/state.js` | The state model, the workflow presets, which components and services are in use, and the URL encoding |
| `js/zip.js` | A minimal zip writer for the starter download |
| `js/app.js` | The page |

## License

Apache-2.0. See `NOTICE.txt`.
