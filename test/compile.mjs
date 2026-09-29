// Generates backends for every scenario and a few edge cases, and compiles each with `bal build`.
// Usage: node test/compile.mjs <work dir> [variant...]
import {execFileSync} from "node:child_process";
import {mkdirSync, rmSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {files} from "../js/code.js";
import {applyScenario, setCapability} from "../js/compose.js";
import {defaults, newWorkflow} from "../js/state.js";

const scenario = (id, change = (s) => s) => () => change(applyScenario(defaults(), id));
const variants = {
  custom: scenario("custom"),
  assistant: scenario("assistant"),
  approval: scenario("approval", (s) => {
    s.behavior.notifications.events = {runStarted: true, taskAssigned: true, runFinished: true};
    return s;
  }),
  documents: scenario("documents", (s) => {
    s.behavior.notifications.events.runStarted = true;
    return s;
  }),
  agentNoServices: () => {
    const s = defaults();
    s.workflows.push({...newWorkflow(s, "agent"), activities: ["updateStatus"]});
    return s;
  },
  everything: () => {
    let s = applyScenario(defaults(), "documents");
    s = setCapability(s, "tasks", true).state;
    s.behavior.notifications.events = {runStarted: true, taskAssigned: true, runFinished: true};
    s.idp = {...s.idp, kind: "keycloak", issuer: "http://localhost:8080/realms/app", jwksUrl: "http://localhost:8080/realms/app/protocol/openid-connect/certs",
      userIdClaim: "preferred_username", rolesClaim: "realm_access.roles", audience: "account"};
    s.db = "postgresql";
    s.deploy = "compose";
    const agent = s.workflows.find((w) => w.kind === "agent");
    agent.activities = ["notifyUser", "notifyRole", "sendMessage", "askForm", "closeConversation", "requestUpload", "closeCase", "updateStatus"];
    agent.approval = {on: true, activity: "closeCase", userRoles: ["Officer"], adminRoles: ["Officer"]};
    agent.input.push({name: "type", label: "Type", type: "choice", options: ["Bug", "R&D"], required: true},
      {name: "from", label: "From", type: "string", required: false}, {name: "count", label: "Count", type: "integer", required: true},
      {name: "due", label: "Due", type: "date", required: false});
    const flow = s.workflows.find((w) => w.kind === "workflow");
    flow.tasks.push({name: "pay", title: "Pay it", description: "Finance pays", roles: ["Officer", "Applicant"],
      fields: [{name: "costCentre", label: "Cost centre", type: "choice", options: ["OPS", "SALES"], required: true},
        {name: "amount", label: "Amount", type: "number", required: true}]});
    s.workflows.push({...newWorkflow(s, "workflow"), input: []});
    return s;
  }
};

const work = process.argv[2] ?? "/tmp/prompt-builder-compile";
const only = process.argv.slice(3);
let failed = 0;
for (const [name, make] of Object.entries(variants)) {
  if (only.length && !only.includes(name)) continue;
  const dir = join(work, name);
  rmSync(dir, {recursive: true, force: true});
  for (const [path, content] of files(make())) {
    if (!path.startsWith("backend/")) continue;
    const target = join(dir, path.slice("backend/".length));
    mkdirSync(dirname(target), {recursive: true});
    writeFileSync(target, content);
  }
  try {
    const out = execFileSync("bal", ["build"], {cwd: dir, stdio: "pipe", timeout: 600_000}).toString();
    const warnings = out.split("\n").filter((l) => l.startsWith("WARNING"));
    console.log(`ok   ${name}${warnings.length ? ` (${warnings.length} warnings)\n${warnings.join("\n")}` : ""}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}\n${(e.stdout ?? "").toString()}${(e.stderr ?? "").toString()}`);
  }
}
process.exit(failed ? 1 : 0);
