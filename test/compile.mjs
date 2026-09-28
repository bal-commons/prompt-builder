// Generates backends for several app designs and compiles each with `bal build`.
// Usage: node test/compile.mjs <work dir> [variant...]
import {execFileSync} from "node:child_process";
import {mkdirSync, rmSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {files} from "../js/code.js";
import {defaults, newWorkflow} from "../js/state.js";

const add = (s, preset, change = (w) => w) => { const w = change(newWorkflow(s, preset)); s.workflows.push(w); return w; };
const place = (s, ...ids) => { s.pages[0].columns[0].push(...ids); return s; };

const variants = {
  blank: () => defaults(),
  chatAgent: () => {
    const s = defaults();
    const a = add(s, "chat-agent");
    return place(s, `start:${a.id}`, "runs", "conversation");
  },
  approvalTasks: () => {
    const s = defaults();
    const w = add(s, "approval");
    return place(s, `start:${w.id}`, "runs", "task-inbox", "task-form");
  },
  agentNoServices: () => {
    const s = defaults();
    add(s, "agent", (w) => ({...w, activities: ["updateStatus"]}));
    return s;
  },
  everything: () => {
    const s = defaults();
    s.header = ["bell", "user-menu"];
    s.idp = {...s.idp, kind: "keycloak", issuer: "http://localhost:8080/realms/app", jwksUrl: "http://localhost:8080/realms/app/protocol/openid-connect/certs",
      userIdClaim: "preferred_username", rolesClaim: "realm_access.roles", audience: "account"};
    s.db = "postgresql";
    s.deploy = "compose";
    const chat = add(s, "chat-agent", (w) => ({...w, uploads: true,
      activities: ["notifyUser", "notifyRole", "sendMessage", "askForm", "closeConversation", "requestUpload", "closeCase", "updateStatus"],
      approval: {on: true, activity: "closeCase", userRoles: ["Admin"], adminRoles: ["Admin"]},
      input: [{name: "type", label: "Type", type: "choice", options: ["Bug", "Idea", "R&D"], required: true},
        {name: "from", label: "From", type: "string", required: false},
        {name: "amount", label: "Amount", type: "number", required: false},
        {name: "count", label: "Count", type: "integer", required: true},
        {name: "urgent", label: "Urgent", type: "boolean", required: false},
        {name: "due", label: "Due", type: "date", required: false}]}));
    add(s, "agent");
    const flow = add(s, "approval", (w) => ({...w, tasks: [...w.tasks,
      {name: "pay", title: "Pay it", description: "Finance pays", roles: ["Admin", "User"],
        fields: [{name: "costCentre", label: "Cost centre", type: "choice", options: ["OPS", "SALES"], required: true},
          {name: "amount", label: "Amount", type: "number", required: true}]}]}));
    add(s, "workflow", (w) => ({...w, input: []}));
    s.pages.push({id: "tasks", title: "Tasks", layout: "split", ratio: 35, collapsible: true, columns: [["task-inbox"], ["task-form"]]});
    return place(s, `start:${chat.id}`, `start:${flow.id}`, "runs", "conversation", "inbox", "case-list", "file-viewer");
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
    execFileSync("bal", ["build"], {cwd: dir, stdio: "pipe", timeout: 600_000});
    console.log(`ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}\n${(e.stdout ?? "").toString()}${(e.stderr ?? "").toString()}`);
  }
}
process.exit(failed ? 1 : 0);
