// Generates backends for every template and a few edge cases, and compiles each with `bal build`.
// Usage: node test/compile.mjs <work dir>
import {execFileSync} from "node:child_process";
import {mkdirSync, rmSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {files} from "../js/code.js";
import {fromTemplate} from "../js/state.js";
import {TEMPLATES} from "../js/templates.js";

const work = process.argv[2] ?? "/tmp/prompt-builder-compile";
const variants = Object.fromEntries(TEMPLATES.map((t) => [t.id, () => fromTemplate(t.id)]));
Object.assign(variants, {
  // No commons service at all: only the app API and an agent with updateStatus.
  appOnly: () => {
    const s = fromTemplate("blank");
    s.header = ["user-menu"];
    s.pages = [{id: "home", title: "Home", layout: "single", ratio: 50, collapsible: false, columns: [["item-form", "item-list"], []]}];
    s.agent.activities = ["updateStatus"];
    return s;
  },
  noAgent: () => { const s = fromTemplate("approval"); s.agent.on = false; s.db = "postgresql"; return s; },
  keycloakMysql: () => { const s = fromTemplate("support"); s.idp.kind = "keycloak"; s.db = "mysql"; s.deploy = "compose"; return s; }
});
let failed = 0;
for (const [name, make] of Object.entries(variants)) {
  const dir = join(work, name);
  rmSync(dir, {recursive: true, force: true});
  for (const [path, content] of files(make())) {
    if (!path.startsWith("backend/")) continue;
    const target = join(dir, path.slice("backend/".length));
    mkdirSync(dirname(target), {recursive: true});
    writeFileSync(target, content);
  }
  try {
    execFileSync("bal", ["build"], {cwd: dir, stdio: "pipe", timeout: 600_000});
    console.log(`ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}\n${(e.stdout ?? "").toString()}${(e.stderr ?? "").toString()}`);
  }
}
process.exit(failed ? 1 : 0);
