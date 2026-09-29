// Generates the prompts for every variant and fails on a throw or a leaked placeholder (undefined, [object …]).
// Usage: node test/prompts.mjs [variant...]
import {prompts} from "../js/prompts.js";
import {screens} from "../js/wireframe.js";
import {diagnostics} from "../js/compose.js";
import {variants} from "./variants.mjs";

const only = process.argv.slice(2);
let failed = 0;
for (const [name, make] of Object.entries(variants)) {
  if (only.length && !only.includes(name)) continue;
  try {
    const state = make();
    const text = prompts(state).flatMap((p) => [p.intro ?? "", ...p.steps.map((s) => `${s.title}\n${s.body}\n${s.check ?? ""}`)]).join("\n");
    const leaks = [...text.matchAll(/.{0,40}(undefined|\[object [A-Za-z]+\]|NaN).{0,40}/g)].map((m) => m[0]);
    screens(state);
    diagnostics(state);
    if (leaks.length) throw new Error(`placeholders leaked:\n  ${leaks.join("\n  ")}`);
    console.log(`ok   ${name} (${text.length} chars)`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}: ${e.stack ?? e}`);
  }
}
process.exit(failed ? 1 : 0);
