// Generates backends for several selections and compiles each with `bal build`.
// Usage: node test/compile.mjs <work dir>
import {execFileSync} from "node:child_process";
import {mkdirSync, rmSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {files} from "../js/code.js";
import {defaults} from "../js/state.js";

const work = process.argv[2] ?? "/tmp/prompt-builder-compile";
const variants = {
  full: (s) => s,
  approval: (s) => { s.agent.approval = {on: true, activity: "closeCase", userRoles: ["PropertyManager", "Owner"], adminRoles: ["Admin"]}; return s; },
  noAgent: (s) => { s.agent.on = false; return s; },
  chatOnly: (s) => { s.services.notification.on = false; s.services.attachment.on = false; return s; },
  attachmentOnly: (s) => { s.services.notification.on = false; s.services.chat.on = false; s.db = "postgresql"; s.idp.kind = "none"; return s; },
  notificationOnly: (s) => { s.services.chat.on = false; s.services.attachment.on = false; s.db = "mysql"; return s; }
};
let failed = 0;
for (const [name, change] of Object.entries(variants)) {
  const dir = join(work, name);
  rmSync(dir, {recursive: true, force: true});
  for (const [path, content] of files(change(defaults()))) {
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
