# App Prompt Builder

A static page that plans any app for demonstrating Ballerina workflows and durable agents, built from the
[bal-commons](https://github.com/bal-commons) services and components plus your own. Pick a starting template (or
the blank one), then shape it:
- **Layout:** sidebar navigation that collapses to a rail, top navigation, or one `<commons-hub>`; what goes in the
  header; where the notification bell leads (a drawer or a page).
- **Pages:** one or two columns, with the split set in 5% steps (e.g. 40 / 60) and an optional collapsible left
  column. Fill each column with components: the commons ones (inbox, conversation list, conversation, upload card,
  case list, file viewer), the app's own (form, list, detail, approvals, summary cards), or custom components you
  describe. One click adds a Notifications, Chats or Files page.
- **The agent:** its job, its process, the activities to generate, and an approval policy on one activity.

The page then gives you:
- **Wireframes** of every page, updated as you choose.
- **Prompts** for the frontend (Claude Code), the backend and the durable agent (Claude Code or Ballerina Copilot),
  either step by step, with a check after each step, or one prompt per part.
- **Code:** a Ballerina package that compiles as generated. It runs the commons services the pages and activities
  need in one process, and has typed clients, the app's API and tables, and optionally the durable agent with its
  activities and webhook receivers. It also includes Config.toml for the identity provider you pick, and optionally
  docker-compose.yml and nginx.conf.

**Download starter (.zip)** packs the code, `PROMPTS.md` and a README. **Copy link** copies a URL that restores the
whole selection. Everything runs in the browser; nothing is sent anywhere.

## What you choose

| Step | Choices |
|---|---|
| Start from | Blank demo app, Approval flow, Support desk, Tenant maintenance (example) |
| The app | Name, business object and ID prefix (the `correlationId` convention), roles, admin roles, database (H2, PostgreSQL, MySQL) |
| Layout | Sidebar (collapsible), top navigation or `<commons-hub>` (and its panes); header components; the bell's target; frontend stack |
| Pages | Title, one or two columns, the ratio, a collapsible left column, and the components in each column, in order |
| Custom components | Name, what it does, and whether it needs a backend endpoint |
| Sign-in | None (development), Thunder, Keycloak, authentik, or another OIDC provider; issuer, JWKS and claims |
| Durable agent | Its job and process, the activities to generate, an approval policy on one activity, the model provider |
| Assistants and output | Claude Code or Ballerina Copilot for the backend and the agent; step-by-step or full prompts; local or Docker Compose |

The backend runs only the commons services the pages or the agent's activities use. Identity providers are limited to
those whose tokens the commons auth reads as they are. The roles claim must be an array or a comma-separated list
(ZITADEL's role map, for example, isn't supported).

## Run it locally

It has no build step. Serve the directory and open it:

```sh
python3 -m http.server 5190   # then open http://localhost:5190
```

It's published with GitHub Pages from the `main` branch root.

## Check the generated code

`test/compile.mjs` generates the backend for every template and a few edge cases (no commons services, no agent, Keycloak + MySQL + Compose) and compiles each one with `bal build` (Ballerina
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
| `js/templates.js` | The starting points |
| `js/state.js` | The state model, which components and services are in use, and the URL encoding |
| `js/zip.js` | A minimal zip writer for the starter download |
| `js/app.js` | The page |

## License

Apache-2.0. See `NOTICE.txt`.
