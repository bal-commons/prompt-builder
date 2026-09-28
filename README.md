# App Prompt Builder

A static page that plans a new app built on the [bal-commons](https://github.com/bal-commons) services and a
Ballerina durable agent. Pick what the app needs; the page gives you:
- **Wireframes** of every screen, updated as you choose.
- **Prompts** for the frontend (Claude Code), the backend and the durable agent (Claude Code or Ballerina Copilot),
  either step by step, with a check after each step, or one prompt per part.
- **Code**: a Ballerina package that compiles as generated. It runs the commons services in one process and has
  typed clients, the app's API and tables, and optionally the durable agent with its activities and webhook
  receivers. It also includes Config.toml for the identity provider you pick, and optionally docker-compose.yml and
  nginx.conf.

**Download starter (.zip)** packs the code, `PROMPTS.md` and a README. **Copy link** copies a URL that restores the
whole selection. Everything runs in the browser; nothing is sent anywhere.

## What you choose

| Step | Choices |
|---|---|
| The app | Name, business object and ID prefix (the `correlationId` convention), roles, admin roles, database (H2, PostgreSQL, MySQL) |
| Services and UI | Notifications, chat, attachments, and their components; frontend stack (plain JS, React, Vue, Angular, SvelteKit); one page (`<commons-hub>`) or separate pages |
| Sign-in | None (development), Thunder, Keycloak, authentik, or another OIDC provider; issuer, JWKS and claims |
| Durable agent | Its job and process, the activities to generate, an approval policy on one activity, the model provider |
| Assistants and output | Claude Code or Ballerina Copilot for the backend and the agent; step-by-step or full prompts; Docker Compose or local |

Identity providers are limited to those whose tokens the commons auth reads as they are. The roles claim must be an
array or a comma-separated list (ZITADEL's role map, for example, isn't supported).

## Run it locally

It has no build step. Serve the directory and open it:

```sh
python3 -m http.server 5190   # then open http://localhost:5190
```

It's published with GitHub Pages from the `main` branch root.

## Check the generated code

`test/compile.mjs` generates the backend for several selections and compiles each one with `bal build` (Ballerina
2201.13.4 on the PATH):

```sh
node test/compile.mjs /tmp/prompt-builder-compile
```

Run it after changing `js/code.js` or `js/catalog.js`.

## How it's organized

| File | What it holds |
|---|---|
| `js/catalog.js` | The services, components, activities, identity providers, stacks and versions. Every API fact the prompts state comes from here or from `code.js` |
| `js/code.js` | The Ballerina and configuration generators |
| `js/prompts.js` | The prompts, per part and step |
| `js/wireframe.js` | The screens as SVG, and their text form for the prompts |
| `js/state.js` | Defaults and the URL encoding |
| `js/zip.js` | A minimal zip writer for the starter download |
| `js/app.js` | The page |

## License

Apache-2.0. See `NOTICE.txt`.
