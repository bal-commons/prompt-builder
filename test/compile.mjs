// Generates the backends for every scenario and a few edge cases, and compiles each package with `bal build`.
// Usage: node test/compile.mjs <work dir> [variant...]
import {execFileSync} from "node:child_process";
import {mkdirSync, rmSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {files} from "../js/code.js";
import {variants} from "./variants.mjs";

const work = process.argv[2] ?? "/tmp/prompt-builder-compile";
const only = process.argv.slice(3);
let failed = 0;
for (const [name, make] of Object.entries(variants)) {
  if (only.length && !only.includes(name)) continue;
  const root = join(work, name);
  rmSync(root, {recursive: true, force: true});
  const packages = new Set();
  for (const [path, content] of files(make())) {
    const target = join(root, path);
    mkdirSync(dirname(target), {recursive: true});
    writeFileSync(target, content);
    const m = /^backend\/([^/]+)\//.exec(path);
    if (m) packages.add(m[1]);
  }
  for (const pkg of packages) {
    try {
      const out = execFileSync("bal", ["build"], {cwd: join(root, "backend", pkg), stdio: "pipe", timeout: 600_000}).toString();
      const warnings = out.split("\n").filter((l) => l.startsWith("WARNING"));
      console.log(`ok   ${name}/${pkg}${warnings.length ? ` (${warnings.length} warnings)\n${warnings.join("\n")}` : ""}`);
    } catch (e) {
      failed++;
      console.log(`FAIL ${name}/${pkg}\n${(e.stdout ?? "").toString()}${(e.stderr ?? "").toString()}`);
    }
  }
}
process.exit(failed ? 1 : 0);
