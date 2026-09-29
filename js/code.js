import {ACTIVITIES, DATABASES, IDPS, SERVICES, VERSIONS} from "./catalog.js";
import {choices, fieldName} from "./contracts.js";
import {camel, enabledServices, identifier, notificationEvents, pascal, usesManagementApi} from "./state.js";

// Generates a Ballerina backend for the selection: the commons servers in one process, typed clients, a start
// service per workflow and agent, the runs table, the agents with their activities, the workflows with their
// human tasks, and the webhook receivers that hand chat and upload events to the right agent.
// The output compiles as is; test/compile.mjs checks that.

const KEYWORDS = new Set(("abstract annotation any anydata ascending base16 base64 boolean break by byte check "
  + "client collect commit conflict const continue decimal descending distinct do else enum equals error external "
  + "fail false field final float foreach fork from function future group handle if import in int is isolated join "
  + "json key let limit listener lock map match never new null object on order outer panic private public readonly "
  + "record remote resource retry return returns rollback select self service source start stream string table "
  + "transaction transactional trap true type typedesc var wait where while worker xml").split(" "));

// A field name as a Ballerina identifier, quoted when it is a keyword.
const ident = (name) => KEYWORDS.has(name) ? `'${name}` : name;
const lit = (value) => JSON.stringify(String(value));
const roleList = (roles) => roles.length === 1 ? lit(roles[0]) : `[${roles.map(lit).join(", ")}]`;
const an = (word) => (/^[aeiou]/i.test(word) ? "an " : "a ") + word;

export function names(state) {
  return {
    org: identifier(state.app.org, "myorg"),
    pkg: identifier(state.app.pkg, "app"),
    idPrefix: (state.app.idPrefix || "RUN").toUpperCase().replace(/[^A-Z0-9]/g, "") || "RUN",
    table: "app_run",
    events: "app_event"
  };
}

// Per workflow or agent: its Ballerina names.
export function wfNames(wf) {
  const base = camel(wf.name || wf.title || "flow");
  return {
    fn: base,
    agentVar: base + "Agent",
    input: pascal(base) + "Input",
    start: pascal(base) + "Start",
    agentId: "agent:" + identifier(wf.name, "agent").replace(/_/g, "-"),
    path: identifier(wf.name, "flow"),
    display: wf.title || pascal(base)
  };
}

export {fieldName};
const tells = (state, event) => notificationEvents(state).includes(event);

function ballerinaType(field) {
  switch (field.type) {
    case "number": return "decimal";
    case "integer": return "int";
    case "boolean": return "boolean";
    case "choice": {
      const options = choices(field);
      return options.length ? options.map(lit).join("|") : "string";
    }
    default: return "string";
  }
}

// Record fields for a list of form fields; optional ones default to ().
function recordFields(fields, indent = "    ") {
  return fields.map((f) => {
    const type = ballerinaType(f);
    const doc = `${indent}# ${f.label || f.name}${f.type === "date" ? " (YYYY-MM-DD)" : ""}\n`;
    return f.required
      ? `${doc}${indent}${type} ${ident(fieldName(f))};`
      : `${doc}${indent}${type.includes("|") ? `(${type})` : type}? ${ident(fieldName(f))} = ();`;
  }).join("\n");
}

const agents = (state) => state.workflows.filter((w) => w.kind === "agent");
const flows = (state) => state.workflows.filter((w) => w.kind === "workflow");

function has(state, id) {
  return id === "app" || enabledServices(state).includes(id);
}

// The activities an agent can run with the services on.
export function agentActivities(state, wf) {
  return ACTIVITIES.filter((a) => wf.activities.includes(a.id) && has(state, a.service));
}

const chatAgents = (state) => has(state, "chat") ? agents(state).filter((a) => a.chat) : [];
const uploadAgents = (state) => has(state, "attachment") ? agents(state).filter((a) => a.uploads) : [];
const needsHooks = (state) => chatAgents(state).length > 0 || uploadAgents(state).length > 0;

export function ballerinaToml(state) {
  const n = names(state);
  const deps = [...(state.workflows.length || usesManagementApi(state) ? [["ballerina", "workflow", VERSIONS.workflow]] : []),
    ...enabledServices(state).map((id) => ["commons", id, VERSIONS.commons]),
    ["commons", "service_commons", VERSIONS.commons]];
  return `[package]
org = "${n.org}"
name = "${n.pkg}"
version = "0.1.0"
distribution = "${VERSIONS.ballerina}"

[build-options]
observabilityIncluded = true
${deps.map(([org, name, version]) => `
[[dependency]]
org = "${org}"
name = "${name}"
version = "${version}"`).join("\n")}
`;
}

export function mainBal(state) {
  const db = DATABASES.find((d) => d.id === state.db);
  const imports = ["import ballerina/log;", `import ${db.driver} as _;`,
    ...enabledServices(state).map((id) => `import ${SERVICES.find((s) => s.id === id).server} as _;`)];
  if (usesManagementApi(state)) imports.push("import ballerina/workflow.management.rest as _;");
  return `${imports.sort().join("\n")}

// One process runs the commons services${state.workflows.length ? ", the workflows and agents" : ""}${usesManagementApi(state) ? ", the workflow management API" : ""} and the app API.
function init() returns error? {
    check initStore();
    log:printInfo(string \`${state.app.name.replace(/`/g, "'")} API on port \${appPort}\`);
}
`;
}

export function configBal(state) {
  const lines = [
    "import commons/service_commons.auth as sauth;",
    "import commons/service_commons.db as sdb;",
    "",
    "# Port of the app API" + (state.workflows.length ? ", the start service" : "") + (needsHooks(state) ? " and the webhook receivers." : "."),
    "configurable int appPort = 9090;"
  ];
  for (const id of enabledServices(state)) {
    const s = SERVICES.find((x) => x.id === id);
    lines.push(`# ${s.name} service, as this process reaches it.`,
      `configurable string ${camel(id)}Url = "http://localhost:${s.port}${s.basePath}";`);
  }
  lines.push("# API key this app presents to the commons services, as a service account.",
    `configurable string serviceApiKey = "change-me";`);
  if (needsHooks(state)) {
    lines.push("# Secret of the agents' webhooks; the services sign every delivery with it.",
      `configurable string webhookSecret = "change-me";`);
  }
  lines.push("# Auth of the app API; mirrors the commons services.", "configurable sauth:AuthConfig auth = {};",
    "# The app's own tables.", "configurable sdb:DbConfig db = {};",
    "# Roles that see every run.", `configurable string[] & readonly adminRoles = [${state.app.adminRoles.map(lit).join(", ")}];`,
    "# Origins allowed to call the app API from a browser.", `configurable string[] corsAllowOrigins = ["*"];`);
  return lines.join("\n") + "\n";
}

export function typesBal(state) {
  let out = `// One started workflow or agent, as the app records it.
type Run record {|
    // The app's ID; every conversation, upload case and notification about the run carries it as correlationId
    string id;
    // Which workflow or agent
    string workflow;
    string ownerId;
    string title;
    string status;
    string? conversationId;
    // The workflow engine's instance ID
    string instanceId;
    string createdAt;
|};
`;
  if (state.workflows.length) {
    out += `
// What a start service returns.
type Started record {|
    string runId;
    string instanceId;
    string? conversationId;
|};
`;
  }
  for (const wf of state.workflows) {
    const w = wfNames(wf);
    out += `
# What a user enters to start ${w.display}.
type ${w.input} record {|
${recordFields(wf.input)}
|};

// What ${w.display} starts with: the user's input, plus the run it belongs to.
type ${w.start} record {|
    *${w.input};
    string runId;
    string startedBy;${wf.kind === "agent" ? `
    string? conversationId;` : ""}
|};
`;
    if (wf.kind === "workflow") {
      for (const task of wf.tasks ?? []) {
        out += `
# The answer to "${(task.title || task.name).replace(/"/g, "'")}"; its fields become the task's form.
type ${w.start.replace(/Start$/, "")}${pascal(camel(task.name || "task"))} record {|
${recordFields(task.fields)}
|};
`;
      }
    }
  }
  if (agents(state).length) {
    out += `
// Everything that happens reaches an agent as one of these, on its \`chat\` event.
type AgentEvent record {|
    // Who it is from: a user ID, or "system"
    string 'from;
    // MESSAGE, FORM_ANSWER, UPLOAD or REMINDER
    string kind;
    string text;
    json data = ();
|};
`;
  }
  if (agents(state).some((a) => agentActivities(state, a).some((x) => x.id === "askForm"))) {
    out += `
// One field of a form an agent sends.
type FormField record {|
    // Key of the answer
    string name;
    // What the user sees
    string label;
    // string, number, boolean or date
    string 'type = "string";
    boolean required = false;
|};
`;
  }
  return out;
}

export function storeBal(state) {
  const n = names(state);
  return `import ballerina/sql;
import ballerinax/java.jdbc;
import commons/service_commons;
import commons/service_commons.db as sdb;

final sdb:Migration[] & readonly migrations = [
    {
        version: 1,
        description: "runs and processed webhook events",
        statements: [
            string \`CREATE TABLE {prefix}run (
                id VARCHAR(32) NOT NULL PRIMARY KEY,
                workflow VARCHAR(100) NOT NULL,
                owner_id VARCHAR(255) NOT NULL,
                title VARCHAR(500) NOT NULL,
                status VARCHAR(32) NOT NULL,
                conversation_id VARCHAR(26),
                instance_id VARCHAR(255) NOT NULL,
                created_at BIGINT NOT NULL)\`,
            "CREATE INDEX {prefix}run_owner ON {prefix}run (owner_id)",
            string \`CREATE TABLE {prefix}event (
                event_id VARCHAR(64) NOT NULL PRIMARY KEY,
                received_at BIGINT NOT NULL)\`
        ]
    }
];

type RunRow record {|
    string id;
    string workflow;
    string owner_id;
    string title;
    string status;
    string? conversation_id;
    string instance_id;
    int created_at;
|};

final jdbc:Client appDb = check sdb:connect(db);

function initStore() returns error? {
    if db.initSchema {
        check sdb:migrate(appDb, db.dbType, "app_", migrations);
    }
}

// ${n.idPrefix}-1001, ${n.idPrefix}-1002, ... Good enough for one process; use a sequence when you run several.
isolated function nextRunId() returns string|error {
    int count = check appDb->queryRow(\`SELECT COUNT(*) FROM ${n.table}\`);
    return string \`${n.idPrefix}-\${1001 + count}\`;
}

isolated function saveRun(Run run) returns error? {
    _ = check appDb->execute(\`INSERT INTO ${n.table} (id, workflow, owner_id, title, status, conversation_id,
        instance_id, created_at) VALUES (\${run.id}, \${run.workflow}, \${run.ownerId}, \${run.title}, \${run.status},
        \${run.conversationId}, \${run.instanceId}, \${service_commons:nowMillis()})\`);
}

isolated function setRunStatus(string id, string status) returns error? {
    _ = check appDb->execute(\`UPDATE ${n.table} SET status = \${status} WHERE id = \${id}\`);
}

isolated function runById(string id) returns Run?|error {
    Run[] found = check runs(\`SELECT * FROM ${n.table} WHERE id = \${id}\`);
    return found.length() == 0 ? () : found[0];
}

// Everyone's when ownerId is (), for admin roles.
isolated function runsFor(string? ownerId) returns Run[]|error {
    return ownerId is string
        ? runs(\`SELECT * FROM ${n.table} WHERE owner_id = \${ownerId} ORDER BY created_at DESC\`)
        : runs(\`SELECT * FROM ${n.table} ORDER BY created_at DESC\`);
}

isolated function runs(sql:ParameterizedQuery query) returns Run[]|error {
    stream<RunRow, sql:Error?> rows = appDb->query(query);
    return from RunRow row in rows
        select {
            id: row.id,
            workflow: row.workflow,
            ownerId: row.owner_id,
            title: row.title,
            status: row.status,
            conversationId: row.conversation_id,
            instanceId: row.instance_id,
            createdAt: service_commons:toIso(row.created_at)
        };
}

// Webhooks arrive at least once; the first delivery of an event wins.
isolated function firstDelivery(string eventId) returns boolean|error {
    sql:ExecutionResult|sql:Error result = appDb->execute(\`INSERT INTO ${n.events} (event_id, received_at)
        VALUES (\${eventId}, \${service_commons:nowMillis()})\`);
    if result is sql:Error {
        if sdb:isDuplicateKey(result) {
            return false;
        }
        return result;
    }
    return true;
}
`;
}

export function clientsBal(state) {
  const n = names(state);
  const services = enabledServices(state).map((id) => SERVICES.find((s) => s.id === id));
  const list = agents(state);
  return `${services.map((s) => `import ${s.module};`).join("\n")}

// The app acts as a service account: the API key admits it with every scope.
final map<string> & readonly serviceHeaders = {
    "x-api-key": serviceApiKey,
    "x-user-id": ${lit(n.pkg + "-app")},
    "x-user-scopes": "*"
};
${services.map((s) => `\nfinal ${s.id}:Client ${s.client} = check new (${camel(s.id)}Url, headers = serviceHeaders);`).join("")}
${list.length ? `
// Each agent's identity: its participant ID in chat and the sender of its messages.
isolated function agentIdOf(string workflowName) returns string {
    match workflowName {
${list.map((wf) => `        ${lit(wfNames(wf).fn)} => {
            return ${lit(wfNames(wf).agentId)};
        }`).join("\n")}
    }
    return "agent:" + workflowName;
}
` : ""}`;
}

export function appBal(state) {
  return `import ballerina/http;
import commons/service_commons;
import commons/service_commons.auth as sauth;

listener http:Listener appListener = new (appPort, timeout = 0);

final sauth:Authenticator authenticator = check new (auth);
final sauth:TicketStore tickets = new;

// The UI's own API: the runs the caller started. The commons components call their services directly.
@http:ServiceConfig {
    cors: {
        allowOrigins: corsAllowOrigins,
        allowHeaders: ["Authorization", "Content-Type", sauth:HEADER_USER_ID, sauth:HEADER_USER_ROLES,
            sauth:HEADER_USER_SCOPES],
        allowMethods: ["GET", "POST", "OPTIONS"]
    }
}
service http:InterceptableService /app on appListener {

    public function createInterceptors() returns [sauth:AuthInterceptor, service_commons:ErrorInterceptor] =>
        [new (authenticator, tickets), new];

    // Admin roles see every run; everyone else sees their own.
    resource function get runs(http:RequestContext ctx) returns Run[]|error {
        sauth:CallerIdentity caller = check sauth:callerOf(ctx);
        return runsFor(isAdmin(caller) ? () : caller.userId);
    }

    resource function get runs/[string id](http:RequestContext ctx) returns Run|http:NotFound|error {
        sauth:CallerIdentity caller = check sauth:callerOf(ctx);
        Run? run = check runById(id);
        if run is () || (!isAdmin(caller) && run.ownerId != caller.userId) {
            return service_commons:notFound(string \`Run \${id} not found\`);
        }
        return run;
    }
}

isolated function isAdmin(sauth:CallerIdentity caller) returns boolean {
    foreach string role in caller.roles {
        if adminRoles.indexOf(role) != () {
            return true;
        }
    }
    return false;
}
`;
}

// The start service: one resource per workflow and agent.
export function startBal(state) {
  if (!state.workflows.length) return "";
  const withChat = new Set(chatAgents(state));
  const imports = ["import ballerina/http;", "import commons/service_commons;", "import commons/service_commons.auth as sauth;"];
  if (flows(state).length) imports.push("import ballerina/workflow;");
  if (withChat.size) imports.push("import commons/chat;");
  if (tells(state, "runStarted")) imports.push("import commons/notification;");
  const titleOf = (wf) => {
    const f = wf.input.find((x) => fieldName(x) === "title" && x.type !== "boolean");
    const display = lit(wfNames(wf).display);
    if (!f) return display;
    const value = f.type === "number" || f.type === "integer" ? `input.title.toString()` : "input.title";
    return f.required ? value : `input.title is () ? ${display} : ${f.type === "number" || f.type === "integer" ? "input.title.toString()" : "<string>input.title"}`;
  };
  const resources = state.workflows.map((wf) => {
    const w = wfNames(wf);
    const chat = withChat.has(wf);
    const start = wf.kind === "agent"
      ? `${w.start} started = {...input, runId, startedBy: caller.userId, conversationId};
        string instanceId = check ${w.agentVar}.run(string \`\${caller.userId} started ${w.display.replace(/`/g, "'")} \${runId}\`, started);`
      : `${w.start} started = {...input, runId, startedBy: caller.userId};
        string instanceId = check workflow:run(${w.fn}, started);`;
    return `
    // Starts ${an(w.display)}${chat ? ": opens a chat between the caller and the agent, which joins it as its own participant" : ""}.
    resource function post ${ident(w.path)}(http:RequestContext ctx, @http:Payload ${w.input} input)
            returns http:Created|error {
        sauth:CallerIdentity caller = check sauth:callerOf(ctx);
        string runId = check nextRunId();
        string? conversationId = ();${chat ? `
        chat:Conversation conversation = check chats->createConversation({
            correlationId: runId,
            title: string \`${w.display.replace(/`/g, "'")} · \${runId}\`,
            participants: [
                {participantId: caller.userId},
                {participantType: chat:AGENT, participantId: ${lit(w.agentId)}, displayName: ${lit(wf.displayName || w.display)}}
            ]
        });
        conversationId = conversation.id;${wf.greeting?.trim() ? `
        // The greeting comes from the design, so the user sees it before the agent's first turn.
        _ = check chats->sendText(conversation.id, ${lit(wf.greeting.trim())}, ${lit(w.agentId)}, runId + "-greeting");` : ""}` : ""}
        ${start}
        check saveRun({id: runId, workflow: ${lit(w.fn)}, ownerId: caller.userId, title: ${titleOf(wf)}, status: "RUNNING",
            conversationId, instanceId, createdAt: service_commons:toIso(service_commons:nowMillis())});${tells(state, "runStarted") ? `
        tell(notification:USER, caller.userId, string \`Started \${runId}\`, ${lit(`${w.display} is working on it.`)}, runId, runId + "/started");` : ""}
        Started body = {runId, instanceId, conversationId};
        return <http:Created>{body};
    }`;
  }).join("\n");
  return `${imports.sort().join("\n")}

// A dedicated start service: POST /start/<name> starts a workflow or spawns an agent for the caller.
@http:ServiceConfig {
    cors: {
        allowOrigins: corsAllowOrigins,
        allowHeaders: ["Authorization", "Content-Type", sauth:HEADER_USER_ID, sauth:HEADER_USER_ROLES,
            sauth:HEADER_USER_SCOPES],
        allowMethods: ["POST", "OPTIONS"]
    }
}
service http:InterceptableService /'start on appListener {

    public function createInterceptors() returns [sauth:AuthInterceptor, service_commons:ErrorInterceptor] =>
        [new (authenticator, tickets), new];
${resources}
}
`;
}

export function agentsBal(state) {
  const list = agents(state);
  if (!list.length) return "";
  const decls = (wf) => agentActivities(state, wf).map((a) => {
    const approval = wf.approval;
    if (approval.on && approval.activity === a.id && approval.userRoles.length) {
      return `        {
            activity: ${a.id},
            description: ${lit(ACTIVITY_DESCRIPTIONS[a.id])},
            approvalPolicy: {
                userRoles: ${roleList(approval.userRoles)},${approval.adminRoles.length ? `
                administratorRoles: ${roleList(approval.adminRoles)},` : ""}
                title: ${lit("Approve " + a.id)},
                description: ${lit(`${wfNames(wf).display} wants to run ${a.id}; approve or reject it with a reason.`)}
            }
        }`;
    }
    return `        {activity: ${a.id}, description: ${lit(ACTIVITY_DESCRIPTIONS[a.id])}}`;
  });
  const instructions = (wf) => {
    const steps = wf.steps.filter((s) => s.trim()).map((s, i) => `${i + 1}. ${s.trim()}`).join("\n");
    return `You work one run from start to finish. The input has the run's ID (runId), the user who started it
(startedBy) and what they entered. Every tool takes the runId as its correlationId.

Everything that happens reaches you as a chat event: a JSON object with "from" (a user ID or system), "kind"
(MESSAGE, FORM_ANSWER, UPLOAD or REMINDER), "text" and "data".

Act only by calling tools. Never describe or promise what you are about to do: do it, in the same turn. Keep
messages short. Send each person at most one message per turn. When the step's tools are done, stop: reply with
exactly [done] and no tool call, which ends the turn. When a question comes in while you cannot use tools,
answer it directly in a sentence or two.

Do only the step for the event you just received, then end the turn and wait for the next event.${wf.chat && wf.greeting?.trim() ? `
The app has already greeted the user for you: "${wf.greeting.trim()}". Don't greet them again.` : ""}
${steps ? `
The process:
${steps}` : ""}`.replace(/`/g, "'").replace(/\$\{/g, "$ {");
  };
  return `import ballerina/ai;
import ballerina/workflow;

// The WSO2 default model provider (configure it with \`bal configure\`, or in Config.toml). Any ballerinax/ai.*
// provider works if it supports tool calling.
final ai:ModelProvider agentModel = check ai:getDefaultModelProvider();
${list.map((wf) => {
    const w = wfNames(wf);
    const decl = decls(wf);
    return `
// ${w.display}: one durable instance per run, for as long as the run takes.
final workflow:DurableAgent ${w.agentVar} = check new ({
    systemPrompt: {
        role: ${lit(wf.purpose || `${w.display} for ${state.app.name}.`)},
        instructions: string \`${instructions(wf)}\`
    },
    model: agentModel,
    inputType: ${w.start},
    activities: [${decl.length ? `
${decl.join(",\n")}
    ` : ""}],
    events: {
        chat: {request: AgentEvent, response: string, cardinality: workflow:MULTI_EVENT}
    },
    // A turn that goes over this fails the whole agent (ballerina-library#9225); the stop rule above prevents it.
    maxIter: 12
});`;
  }).join("\n")}
`;
}

// Plain workflows: their human tasks in order, then the run's status.
export function workflowsBal(state) {
  const list = flows(state);
  if (!list.length) return "";
  return `import ballerina/workflow;${tells(state, "runFinished") || tells(state, "taskAssigned") ? "\nimport commons/notification;" : ""}
${list.map((wf) => {
    const w = wfNames(wf);
    const tasks = wf.tasks ?? [];
    // What a task shows beside its form: the start fields the design chose for it (all by default).
    const about = (task) => {
      const shown = wf.input.filter((f) => !task.context || task.context.includes(fieldName(f)));
      return shown.length ? `{${shown.map((f) => `${lit(fieldName(f))}: input.${ident(fieldName(f))}`).join(", ")}}` : "{}";
    };
    const body = tasks.map((task, i) => {
      const key = camel(task.name || `task${i + 1}`);
      const type = `${w.start.replace(/Start$/, "")}${pascal(key)}`;
      const notify = tells(state, "taskAssigned") && task.roles.length ? `    string ${key}Notified = check ctx->callActivity(notifyReviewers, {runId: input.runId, roles: [${task.roles.map(lit).join(", ")}],
        title: ${lit(task.title || task.name)}});
    _ = ${key}Notified;
` : "";
      return `${notify}    ${type} ${key}Answer = check ctx->awaitHumanTask(${lit(key)}, ${about(task)}${task.roles.length ? `,
        userRoles = ${roleList(task.roles)}` : ""}, title = string \`${(task.title || task.name).replace(/`/g, "'").replace(/\$\{/g, "$ {")} · \${input.runId}\`${task.description ? `,
        description = ${lit(task.description)}` : ""});
    answers[${lit(key)}] = ${key}Answer.toJson();`;
    }).join("\n");
    return `
// ${w.display}${wf.purpose ? `: ${wf.purpose}` : ""}
@workflow:Workflow
function ${w.fn}(workflow:Context ctx, ${w.start} input) returns json|error {
    map<json> answers = {};
${body}
    string status = check ctx->callActivity(finishRun, {runId: input.runId, status: "DONE"});
    return {status, answers};
}`;
  }).join("\n")}

// Marks a run finished in the app's table, so the runs list shows it${tells(state, "runFinished") ? ", and tells whoever started it" : ""}.
@workflow:Activity
function finishRun(string runId, string status) returns string|error {
    check setRunStatus(runId, status);${tells(state, "runFinished") ? `
    Run? run = check runById(runId);
    if run is Run {
        tell(notification:USER, run.ownerId, string \`\${runId} is \${status.toLowerAscii()}\`, run.title, runId, runId + "/" + status);
    }` : ""}
    return status;
}
${tells(state, "taskAssigned") ? `
// Tells a task's reviewer roles that it is waiting for them.
@workflow:Activity
function notifyReviewers(string runId, string[] roles, string title) returns string|error {
    foreach string role in roles {
        tell(notification:ROLE, role, string \`\${title} · \${runId}\`, "A task is waiting for you in the task inbox.", runId,
            runId + "/" + title + "/" + role);
    }
    return "notified";
}
` : ""}`;
}

const ACTIVITY_DESCRIPTIONS = {
  updateStatus: "Sets the run's status, e.g. APPROVED, REJECTED or DONE; the runs list shows it.",
  notifyUser: "Notifies one user through their personal inbox. severity is INFO, WARNING, ERROR or SUCCESS (optional).",
  notifyRole: "Notifies everyone holding a role through their inbox. severity is INFO, WARNING, ERROR or SUCCESS (optional).",
  sendMessage: "Sends a chat message in the run's conversation.",
  askForm: "Sends a form in the run's conversation. Each field has a name, a label, a type (string, number, boolean or "
    + "date) and whether it is required. The answer arrives as a FORM_ANSWER event.",
  closeConversation: "Closes the run's conversation, with a reason.",
  requestUpload: "Asks a user to upload files: opens an upload case and posts an upload card in the conversation. "
    + "mimeTypes (e.g. image/*) and maxFiles are optional. An UPLOAD event arrives when they submit.",
  closeCase: "Closes an upload case (the caseId from requestUpload or the UPLOAD event), with a reason."
};

export function activitiesBal(state) {
  const ids = new Set(agents(state).flatMap((wf) => agentActivities(state, wf).map((a) => a.id)));
  if (!ids.size) return "";
  const chat = has(state, "chat");
  const imports = new Set(["import ballerina/workflow;"]);
  const blocks = [];
  if (ids.has("updateStatus") && tells(state, "runFinished")) {
    imports.add("import commons/notification;");
  }
  if (ids.has("notifyUser") || ids.has("notifyRole")) {
    imports.add("import commons/notification;");
    imports.add("import ballerina/crypto;");
  }
  if (["sendMessage", "askForm", "closeConversation"].some((a) => ids.has(a)) || (ids.has("requestUpload") && chat)) {
    imports.add("import commons/chat;");
  }
  if (ids.has("sendMessage")) {
    imports.add("import ballerina/crypto;");
    imports.add("import ballerina/lang.runtime;");
  }
  if (ids.has("requestUpload") || ids.has("closeCase")) {
    imports.add("import commons/attachment;");
  }
  if (ids.has("updateStatus")) {
    blocks.push(`@workflow:Activity
function updateStatus(string correlationId, string status) returns string|error {
    string id = re \`/\`.split(correlationId)[0];
    string value = status.trim().toUpperAscii();
    if value == "" {
        return error("status is required, e.g. APPROVED or DONE");
    }
    check setRunStatus(id, value);${tells(state, "runFinished") ? `
    if value == "DONE" {
        Run? run = check runById(id);
        if run is Run {
            tell(notification:USER, run.ownerId, string \`\${id} is done\`, run.title, id, id + "/DONE");
        }
    }` : ""}
    return string \`\${id} is now \${value}\`;
}`);
  }
  for (const [role, kind] of [["notifyUser", "USER"], ["notifyRole", "ROLE"]]) {
    if (!ids.has(role)) continue;
    const who = kind === "USER" ? "userId" : "role";
    blocks.push(`@workflow:Activity
function ${role}(string correlationId, string ${who}, string title, string body, string? severity = ())
        returns string|error {
    notification:Notification sent = check notifications->send({
        recipientType: notification:${kind},
        recipientId: ${who},
        severity: severityOf(severity),
        title,
        body,
        correlationId,
        // A retried activity sends the same notification once.
        idempotencyKey: crypto:hashSha256((correlationId + ${who} + title + body).toBytes()).toBase16()
    });
    return sent.id;
}`);
  }
  if (ids.has("notifyUser") || ids.has("notifyRole")) {
    blocks.push(`isolated function severityOf(string? severity) returns notification:Severity {
    match severity is string ? severity.toUpperAscii() : "" {
        "WARNING" => {
            return notification:WARNING;
        }
        "ERROR" => {
            return notification:ERROR;
        }
        "SUCCESS" => {
            return notification:SUCCESS;
        }
    }
    return notification:INFO;
}`);
  }
  if (ids.has("sendMessage")) {
    blocks.push(`@workflow:Activity
function sendMessage(string correlationId, string text) returns string|error {
    [string, string] [conversationId, agentId] = check conversationOf(correlationId);
    return postMessage(conversationId, agentId, text);
}

// Streams a message into a conversation as the agent. The same text to the same conversation keeps its ID, so a
// retried activity restarts the stream instead of posting the message twice.
function postMessage(string conversationId, string agentId, string text) returns string|error {
    string messageId = "agent-" + crypto:hashSha256((conversationId + text).toBytes()).toBase16().substring(0, 24);
    chat:Message opened = check chats->startStreaming(conversationId, messageId, agentId);
    if opened.status == chat:COMPLETE {
        return messageId;
    }
    string[] words = re \` \`.split(text);
    foreach int i in 0 ..< words.length() {
        check chats->appendChunk(conversationId, messageId, (i == 0 ? "" : " ") + words[i], agentId);
        runtime:sleep(0.03);
    }
    _ = check chats->completeMessage(conversationId, messageId, text, agentId);
    return messageId;
}`);
  }
  if (ids.has("askForm")) {
    blocks.push(`@workflow:Activity
function askForm(string correlationId, string title, FormField[] fields, string? submitLabel = ()) returns string|error {
    map<json> properties = {};
    string[] required = [];
    foreach FormField f in fields {
        string kind = f.'type == "number" || f.'type == "boolean" ? f.'type : "string";
        map<json> property = {'type: kind, title: f.label};
        if f.'type == "date" {
            property["format"] = "date";
        }
        properties[f.name] = property;
        if f.required {
            required.push(f.name);
        }
    }
    [string, string] [conversationId, agentId] = check conversationOf(correlationId);
    chat:Message form = check chats->sendMessage(conversationId, {
        kind: chat:FORM,
        senderId: agentId,
        content: {title, submitLabel: submitLabel ?: "Send", schema: {'type: "object", required, properties}}
    });
    return form.id;
}`);
  }
  if (ids.has("closeConversation")) {
    blocks.push(`@workflow:Activity
function closeConversation(string correlationId, string reason) returns string|error {
    [string, string] [conversationId, agentId] = check conversationOf(correlationId);
    chat:Conversation closed = check chats->close(conversationId, reason, agentId);
    return closed.id;
}`);
  }
  if (ids.has("requestUpload")) {
    const slots = state.behavior?.uploads?.slots?.length ? state.behavior.uploads.slots
      : [{name: "files", label: "Files", mimeTypes: [], maxFiles: 3, required: true}];
    blocks.push(`// The upload slots of the design: what an upload case asks for.
final attachment:NewSlot[] & readonly uploadSlots = [
${slots.map((sl) => `    {name: ${lit(identifier(sl.name || sl.label, "files"))}, label: ${lit(sl.label || sl.name)}, mimeTypes: [${(sl.mimeTypes ?? []).map(lit).join(", ")}], minFiles: ${sl.required ? 1 : 0}, maxFiles: ${Math.max(1, Number(sl.maxFiles) || 1)}}`).join(",\n")}
];

@workflow:Activity
function requestUpload(string correlationId, string userId, string title, string instructions,
        string[]? mimeTypes = (), int? maxFiles = ()) returns string|error {
    attachment:Case created = check attachments->createCase({
        // A retried activity finds the same case.
        idempotencyKey: correlationId + "/" + title,
        correlationId,
        title,
        description: instructions,
        subjects: [userId],
        // The slots the design configured, unless the agent asks for one-off types or a count.
        slots: mimeTypes is () && maxFiles is () ? uploadSlots.clone()
            : [{name: "files", label: title, mimeTypes: mimeTypes ?: [], maxFiles: maxFiles ?: 3}]
    });${chat ? `
    [string, string]|error conversation = conversationOf(correlationId);
    if conversation is [string, string] {
        _ = check chats->sendMessage(conversation[0], {
            id: "upload-" + created.id,
            kind: chat:ATTACHMENT_REF,
            senderId: conversation[1],
            content: {name: title, caseId: created.id, slot: created.slots[0].name}
        });
    }` : ""}
    return created.id;
}`);
  }
  if (ids.has("closeCase")) {
    blocks.push(`@workflow:Activity
function closeCase(string caseId, string reason) returns string|error {
    attachment:Case closed = check attachments->close(caseId, reason);
    return closed.id;
}`);
  }
  if (chat && ["sendMessage", "askForm", "closeConversation", "requestUpload"].some((a) => ids.has(a))) {
    blocks.push(`// The run's conversation and the agent that speaks in it.
function conversationOf(string correlationId) returns [string, string]|error {
    string id = re \`/\`.split(correlationId)[0];
    Run? run = check runById(id);
    string? conversationId = run is Run ? run.conversationId : ();
    if run is () || conversationId is () {
        return error(string \`Run \${id} has no conversation\`);
    }
    return [conversationId, agentIdOf(run.workflow)];
}`);
  }
  return `${[...imports].sort().join("\n")}

// Every side effect of an agent is one of these durable activities.

${blocks.join("\n\n")}
`;
}

// Webhook receivers and the dispatch from a run to its agent.
export function hooksBal(state) {
  if (!needsHooks(state)) return "";
  const list = agents(state);
  const chat = chatAgents(state).length > 0;
  const attachment = uploadAgents(state).length > 0;
  const imports = ["import ballerina/http;", "import ballerina/log;", "import commons/service_commons.webhook;"];
  if (chat) imports.push("import commons/chat;", "import ballerina/crypto;");
  if (attachment) imports.push("import commons/attachment;");
  const cases = (call) => list.map((wf) => `        ${lit(wfNames(wf).fn)} => {
            return ${call(wfNames(wf).agentVar)};
        }`).join("\n");
  const prefix = names(state).idPrefix;
  return `${imports.sort().join("\n")}

// Where the ${[chat && "chat", attachment && "attachment"].filter(Boolean).join(" and ")} service${chat && attachment ? "s" : ""} deliver the agents' webhooks (Config.toml registers them).
service /hooks on appListener {
${chat ? `
    resource function post chat(http:Request req) returns http:Accepted|http:Unauthorized|error {
        webhook:WebhookEvent|error event = webhook:verify(req, webhookSecret);
        if event is error {
            return http:UNAUTHORIZED;
        }
        if !check firstDelivery(event.eventId) {
            return http:ACCEPTED;
        }
        json data = event.data;
        if data !is map<json> {
            return http:ACCEPTED;
        }
        chat:Message message = check data["message"].cloneWithType();
        if message.senderId.startsWith("agent:") {
            return http:ACCEPTED;
        }
        boolean answer = event.event == chat:EVENT_FORM_SUBMITTED;
        AgentEvent agentEvent = {
            'from: message.senderId,
            kind: answer ? "FORM_ANSWER" : "MESSAGE",
            text: answer ? "Answered the form" : message.content is string ? <string>message.content : "",
            data: message.content
        };
        check deliver(event?.correlationId ?: "", agentEvent, message.conversationId, message.seq);
        return http:ACCEPTED;
    }
` : ""}${attachment ? `
    resource function post attachments(http:Request req) returns http:Accepted|http:Unauthorized|error {
        webhook:WebhookEvent|error event = webhook:verify(req, webhookSecret);
        if event is error {
            return http:UNAUTHORIZED;
        }
        if !check firstDelivery(event.eventId) {
            return http:ACCEPTED;
        }
        json data = event.data;
        if data !is map<json> || event.event != attachment:EVENT_CASE_SUBMITTED {
            return http:ACCEPTED;
        }
        json submitted = data["case"];
        json[] files = submitted is map<json> && submitted["files"] is json[] ? <json[]>submitted["files"] : [];
        AgentEvent agentEvent = {
            'from: "system",
            kind: "UPLOAD",
            text: string \`\${files.length()} file(s) submitted\`,
            data: {
                caseId: submitted is map<json> ? submitted["id"] : (),
                files: from json file in files
                    select file is map<json> ? {id: file["id"], fileName: file["fileName"], mimeType: file["mimeType"]} : ()
            }
        };
        check deliver(event?.correlationId ?: "", agentEvent, (), ());
        return http:ACCEPTED;
    }
` : ""}}

// Hands an event to the agent that runs it. A correlationId like "${prefix}-1001/other" belongs to run ${prefix}-1001.
function deliver(string correlationId, AgentEvent event, string? conversationId, int? afterSeq) returns error? {
    string id = re \`/\`.split(correlationId)[0];
    Run? run = check runById(id);
    if run is () {
        log:printDebug(string \`No run for \${correlationId}\`);
        return;
    }
    string token = check sendToAgent(run.workflow, run.instanceId, event);${chat ? `
    if conversationId is string && afterSeq is int {
        _ = start postReply(run, token, conversationId, afterSeq);
    }` : `
    _ = token;`}
}

function sendToAgent(string workflowName, string instanceId, AgentEvent event) returns string|error {
    match workflowName {
${cases((v) => `${v}.sendData(instanceId, "chat", event)`)}
    }
    return error(string \`\${workflowName} is not an agent\`);
}
${chat ? `
function replyOf(string workflowName, string instanceId, string token) returns string|error {
    match workflowName {
${cases((v) => `${v}.waitForDataResult(instanceId, token)`)}
    }
    return error(string \`\${workflowName} is not an agent\`);
}

// Posts a turn's final answer when it is a real reply: a side question answered while the agent was parked. Normal
// turns end with [done], because the agent has already messaged people through activities.
function postReply(Run run, string token, string conversationId, int afterSeq) {
    string|error reply = replyOf(run.workflow, run.instanceId, token);
    if reply is error {
        log:printWarn(string \`No reply for turn \${token}\`, 'error = reply);
        return;
    }
    string agentId = agentIdOf(run.workflow);
    string text = re \`\\[done\\]\`.replaceAll(reply, "").trim();
    chat:MessagePage|error page = chats->history(conversationId, afterSeq = afterSeq, 'limit = 100);
    boolean answered = page is chat:MessagePage && page.items.some(m => m.senderId == agentId);
    if text == "" || answered {
        return;
    }
    string messageId = "turn-" + crypto:hashSha256(token.toBytes()).toBase16().substring(0, 24);
    chat:Message|error posted = chats->sendText(conversationId, text, agentId, messageId);
    if posted is error {
        log:printError(string \`Could not post the reply of turn \${token}\`, posted);
    }
}
` : ""}`;
}

// ---------------------------------------------------------------- configuration

function authToml(state, section) {
  const idp = state.idp;
  if (idp.kind === "none") {
    // With no scheme on, the service trusts the headers; turning the API key on would reject every browser call.
    return `[${section}.auth]
# No identity provider: no token or API key is checked and the x-user-id / x-user-roles / x-user-scopes headers
# name the caller. Development only.
enableJwtAuth = false
enableApiKey = false
`;
  }
  return `[${section}.auth]
enableJwtAuth = true
jwtIssuer = ${lit(idp.issuer)}
jwksUrl = ${lit(idp.jwksUrl)}${idp.selfSigned ? `
# The IdP's development certificate is self-signed.
jwksVerifyTls = false` : ""}
userIdClaim = ${lit(idp.userIdClaim)}
rolesClaim = ${lit(idp.rolesClaim)}
enableApiKey = true
apiKeyValue = "change-me"
`;
}

function dbToml(state, section, n) {
  const url = {
    h2: `jdbc:h2:./target/data/${n.pkg};AUTO_SERVER=TRUE`,
    postgresql: `jdbc:postgresql://localhost:5432/${n.pkg}`,
    mysql: `jdbc:mysql://localhost:3306/${n.pkg}`
  }[state.db];
  const db = DATABASES.find((d) => d.id === state.db);
  return `[${section}.db]
${state.db === "h2" ? "" : `dbType = "${db.dbType}"\n`}url = ${lit(url)}${state.db === "h2" ? "" : `
user = "app"
password = "change-me"`}
`;
}

function managementToml(state) {
  const idp = state.idp;
  return `
# The workflow management API: the task inbox and task forms read and decide human tasks and approvals here.
[ballerina.workflow.management.rest]
enableManagementApi = true
port = 8234
corsAllowOrigins = ["http://localhost:5173"]
enableBasicAuth = false${idp.kind === "none" ? `
# Development: no token; identity comes from the x-user-id / x-user-roles headers.` : `
enableJwtAuth = true
jwtIssuer = ${lit(idp.issuer)}
# The access token's aud claim; the management API requires one.
jwtAudience = ${lit(idp.audience || idp.clientId)}
jwksUrl = ${lit(idp.jwksUrl)}
userIdClaim = ${lit(idp.userIdClaim)}
rolesClaim = ${lit(idp.rolesClaim)}`}
`;
}

export function configToml(state) {
  const n = names(state);
  const root = `${n.org}.${n.pkg}`;
  let out = `# Replace every change-me before you deploy; keep secrets out of version control.

[${root}]
serviceApiKey = "change-me"${needsHooks(state) ? `
webhookSecret = "change-me"` : ""}
corsAllowOrigins = ["http://localhost:5173"]

${authToml(state, root)}
${dbToml(state, root, n)}`;
  if (state.workflows.length) {
    out += `
[ballerina.workflow]
# LOCAL talks to \`temporal server start-dev\`; use SELF_HOSTED with a Temporal cluster.
mode = "${state.deploy === "compose" ? "SELF_HOSTED" : "LOCAL"}"
url = "${state.deploy === "compose" ? "temporal:7233" : "localhost:7233"}"
namespace = "default"
taskQueue = "${n.pkg.toUpperCase()}"
`;
  }
  if (usesManagementApi(state)) {
    out += managementToml(state);
  }
  for (const id of enabledServices(state)) {
    const section = `commons.${id}.server`;
    out += `
[${section}]
ns = "${n.pkg}"
corsAllowOrigins = ["http://localhost:5173"]${id === "attachment" ? `
linkSecret = "change-me"${state.app.adminRoles.length ? `
adminRoles = [
${state.app.adminRoles.map((r) => `    {role = ${lit(r)}, permissions = ["read", "delete", "reopen", "close"]}`).join(",\n")}
]` : ""}` : ""}

${authToml(state, section)}
${dbToml(state, section, n)}`;
    const hooked = id === "chat" ? chatAgents(state) : id === "attachment" ? uploadAgents(state) : [];
    for (const wf of hooked) {
      out += `
# ${wfNames(wf).display}: the service calls this app when something happens in the agent's ${id === "chat" ? "conversations" : "upload cases"}.
[[${section}.webhooks]]
participantId = ${lit(wfNames(wf).agentId)}
url = "http://localhost:9090/hooks/${id === "chat" ? "chat" : "attachments"}"
secret = "change-me"
events = ${id === "chat" ? `["message.created", "form.submitted"]` : `["case.submitted"]`}
`;
    }
  }
  return out;
}

export function dockerCompose(state) {
  const n = names(state);
  const idp = IDPS.find((i) => i.id === state.idp.kind);
  const wf = state.workflows.length > 0;
  const services = [];
  if (wf) {
    services.push(`  temporal-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: temporal
      POSTGRES_PASSWORD: temporal
    volumes:
      - temporal-db:/var/lib/postgresql/data

  temporal:
    image: temporalio/auto-setup:1.29.7
    depends_on: [temporal-db]
    environment:
      DB: postgres12
      DB_PORT: 5432
      POSTGRES_USER: temporal
      POSTGRES_PWD: temporal
      POSTGRES_SEEDS: temporal-db
    ports:
      - "7233:7233"`);
  }
  if (state.db === "postgresql") {
    services.push(`  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${n.pkg}
      POSTGRES_USER: app
      POSTGRES_PASSWORD: \${DB_PASSWORD:?set DB_PASSWORD in .env}
    volumes:
      - app-db:/var/lib/postgresql/data`);
  } else if (state.db === "mysql") {
    services.push(`  db:
    image: mysql:8.4
    environment:
      MYSQL_DATABASE: ${n.pkg}
      MYSQL_USER: app
      MYSQL_PASSWORD: \${DB_PASSWORD:?set DB_PASSWORD in .env}
      MYSQL_RANDOM_ROOT_PASSWORD: "yes"
    volumes:
      - app-db:/var/lib/mysql`);
  }
  if (idp.id === "keycloak") {
    services.push(`  keycloak:
    image: ${idp.image}
    command: ["start-dev", "--import-realm"]
    environment:
      KC_BOOTSTRAP_ADMIN_USERNAME: admin
      KC_BOOTSTRAP_ADMIN_PASSWORD: \${KEYCLOAK_ADMIN_PASSWORD:?set KEYCLOAK_ADMIN_PASSWORD in .env}
    volumes:
      - ./keycloak/realm.json:/opt/keycloak/data/import/realm.json:ro
    ports:
      - "8080:8080"`);
  } else if (idp.id === "thunder") {
    services.push(`  thunder:
    image: ${idp.image}
    environment:
      ADMIN_USERNAME: admin
      ADMIN_PASSWORD: \${THUNDER_ADMIN_PASSWORD:?set THUNDER_ADMIN_PASSWORD in .env}
    volumes:
      - ./thunder/resources.yaml:/opt/thunder/resources.yaml:ro
    ports:
      - "8090:8090"`);
  }
  const ports = ["9090", ...enabledServices(state).map((id) => String(SERVICES.find((s) => s.id === id).port)),
    ...(usesManagementApi(state) ? ["8234"] : [])];
  services.push(`  app:
    build: ./backend
    depends_on: [${[wf && "temporal", state.db !== "h2" && "db", idp.id === "keycloak" && "keycloak", idp.id === "thunder" && "thunder"].filter(Boolean).join(", ")}]
    volumes:
      - ./backend/Config.toml:/app/Config.toml:ro
      - app-data:/app/target/data
    ports:
${ports.map((p) => `      - "${p}:${p}"`).join("\n")}`,
  `  web:
    image: nginx:1.27-alpine
    depends_on: [app]
    volumes:
      - ./frontend/dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    ports:
      - "5173:80"`);
  const volumes = ["app-data", wf && "temporal-db", state.db !== "h2" && "app-db"].filter(Boolean);
  return `# ${state.app.name}: ${idp.id === "authentik" ? "authentik runs from its own compose file (it needs PostgreSQL and Redis). " : ""}secrets come from .env (git-ignored).
services:
${services.join("\n\n")}

volumes:
${volumes.map((v) => `  ${v}:`).join("\n")}
`;
}

// The browser-facing paths: [proxy path, where nginx sends it, where the dev server sends it].
// The development targets are the live URLs of step 5 when set, else the generated app's local ports.
export function proxies(state) {
  const live = (id, path, fallback) => {
    const c = state.connections?.[id];
    return c?.mode === "live" && c.url.trim() ? c.url.trim().replace(/\/+$/, "") + path : fallback;
  };
  return [
    ["/api/app", "http://app:9090/app", live("app", "/app", "http://localhost:9090/app")],
    ...(state.workflows.length ? [["/api/start", "http://app:9090/start", live("app", "/start", "http://localhost:9090/start")]] : []),
    ...(usesManagementApi(state) ? [["/api/workflow", "http://app:8234/workflow", live("workflow", "", "http://localhost:8234/workflow")]] : []),
    ...enabledServices(state).map((id) => {
      const s = SERVICES.find((x) => x.id === id);
      const path = id === "notification" ? "notifications" : id === "attachment" ? "attachments" : "chat";
      return [`/api/${path}`, `http://app:${s.port}${s.basePath}`, live(id, "", `http://localhost:${s.port}${s.basePath}`)];
    })
  ];
}

export function nginxConf(state) {
  return `server {
    listen 80;
    root /usr/share/nginx/html;

    location / {
        try_files $uri $uri/ /index.html;
    }
${proxies(state).map(([from, to]) => `
    location ${from}/ {
        proxy_pass ${to}/;
        # The components hold a server-sent events stream open: don't buffer it or time it out.
        proxy_buffering off;
        proxy_read_timeout 1h;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        client_max_body_size 20m;
    }`).join("\n")}
}
`;
}

// How the app tells people about runs and tasks.
export function notifyBal(state) {
  if (!notificationEvents(state).length) return "";
  return `import ballerina/log;
import commons/notification;

// Sends a notification about a run; a failure is logged and never fails the run or the request.
isolated function tell(notification:RecipientType recipientType, string recipientId, string title, string body,
        string correlationId, string idempotencyKey) {
    notification:Notification|error sent = notifications->send({recipientType, recipientId, title, body, correlationId,
        idempotencyKey});
    if sent is error {
        log:printWarn(string \`Could not notify \${recipientId}\`, 'error = sent);
    }
}
`;
}

// Every generated file, in the order a reader should see them.
export function files(state) {
  const list = [
    ["backend/Ballerina.toml", ballerinaToml(state)],
    ["backend/main.bal", mainBal(state)],
    ["backend/config.bal", configBal(state)],
    ["backend/types.bal", typesBal(state)],
    ["backend/clients.bal", clientsBal(state)],
    ["backend/store.bal", storeBal(state)],
    ["backend/app.bal", appBal(state)],
    ["backend/start.bal", startBal(state)],
    ["backend/agents.bal", agentsBal(state)],
    ["backend/workflows.bal", workflowsBal(state)],
    ["backend/activities.bal", activitiesBal(state)],
    ["backend/hooks.bal", hooksBal(state)],
    ["backend/notify.bal", notifyBal(state)],
    ["backend/Config.toml", configToml(state)]
  ].filter(([, content]) => content);
  if (state.deploy === "compose") {
    list.push(["docker-compose.yml", dockerCompose(state)], ["nginx.conf", nginxConf(state)]);
  }
  return list;
}
