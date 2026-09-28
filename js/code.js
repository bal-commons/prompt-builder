import {ACTIVITIES, DATABASES, IDPS, SERVICES, VERSIONS} from "./catalog.js";
import {camel, enabledServices, identifier, pascal} from "./state.js";

// Generates a Ballerina backend for the selection: the commons servers in one process, typed clients, the app's
// own API and store, and (with an agent) the durable agent, its activities and the webhook receivers.
// The output compiles as is; test/compile.mjs checks that.

export function names(state) {
  const object = state.app.object.trim() || "item";
  const words = object.split(/\s+/);
  const last = words[words.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "") || "item";
  const prefix = identifier(state.app.idPrefix, "app").slice(0, 8) + "_";
  const agent = identifier(state.agent.name, "assistant");
  return {
    org: identifier(state.app.org, "myorg"),
    pkg: identifier(state.app.pkg, "app"),
    type: pascal(object),
    newType: "New" + pascal(object),
    path: last.endsWith("s") ? last : last + "s",
    table: prefix + "item",
    events: prefix + "event",
    prefix,
    idPrefix: (state.app.idPrefix || "ID").toUpperCase().replace(/[^A-Z0-9]/g, "") || "ID",
    agentVar: camel(agent) + "Agent",
    agentId: "agent:" + agent.replace(/_/g, "-"),
    object
  };
}

const lit = (value) => JSON.stringify(String(value));
const capitalA = (word) => (/^[aeiou]/i.test(word) ? "An " : "A ") + word;
const an = (word) => (/^[aeiou]/i.test(word) ? "an " : "a ") + word;
const roleList = (roles) => roles.length === 1 ? lit(roles[0]) : `[${roles.map(lit).join(", ")}]`;

function has(state, id) {
  return id === "app" || enabledServices(state).includes(id);
}

function agentOn(state) {
  return state.agent.on;
}

// The activities that can run with the services on; an activity needs its service.
export function activeActivities(state) {
  if (!agentOn(state)) {
    return [];
  }
  return ACTIVITIES.filter((a) => state.agent.activities.includes(a.id) && has(state, a.service));
}

export function ballerinaToml(state) {
  const n = names(state);
  const deps = [["ballerina", "workflow", VERSIONS.workflow],
    ...enabledServices(state).map((id) => ["commons", id, VERSIONS.commons]),
    ["commons", "service_commons", VERSIONS.commons]];
  return `[package]
org = "${n.org}"
name = "${n.pkg}"
version = "0.1.0"
distribution = "${VERSIONS.ballerina}"

[build-options]
observabilityIncluded = true
${deps.filter(([org, name]) => agentOn(state) || name !== "workflow").map(([org, name, version]) => `
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
  return `${imports.sort().join("\n")}

// One process runs the commons services${agentOn(state) ? ", the durable agent" : ""} and the app API.
function init() returns error? {
    check initStore();
    log:printInfo(string \`${state.app.name} API on port \${appPort}\`);
}
`;
}

export function configBal(state) {
  const lines = [
    "import commons/service_commons.auth as sauth;",
    "import commons/service_commons.db as sdb;",
    "",
    "# Port of the app API" + (agentOn(state) ? " and the webhook receivers." : "."),
    "configurable int appPort = 9090;"
  ];
  for (const id of enabledServices(state)) {
    const s = SERVICES.find((x) => x.id === id);
    lines.push(`# ${s.name} service, as this process reaches it.`,
      `configurable string ${camel(id)}Url = "http://localhost:${s.port}${s.basePath}";`);
  }
  lines.push("# API key this app presents to the commons services, as a service account.",
    `configurable string serviceApiKey = "change-me";`);
  if (agentOn(state) && (has(state, "chat") || has(state, "attachment"))) {
    lines.push("# Secret of the agent's webhooks; the services sign every delivery with it.",
      `configurable string webhookSecret = "change-me";`);
  }
  lines.push("# Auth of the app API; mirrors the commons services.", "configurable sauth:AuthConfig auth = {};",
    "# The app's own tables.", "configurable sdb:DbConfig db = {};",
    "# Origins allowed to call the app API from a browser.", `configurable string[] corsAllowOrigins = ["*"];`);
  return lines.join("\n") + "\n";
}

export function typesBal(state) {
  const n = names(state);
  let out = `# ${capitalA(n.object)}, as the app stores it.
type ${n.type} record {|
    string id;
    string ownerId;
    string title;
    string details;
    string status;
    string? conversationId;
    string? agentId;
    string createdAt;
|};

# What a user sends to open ${an(n.object)}.
type ${n.newType} record {|
    string title;
    string details = "";
|};
`;
  if (agentOn(state)) {
    out += `
# What the agent starts with.
type AgentInput record {|
    # The ${n.object}'s ID; every conversation, case and notification about it carries it as correlationId
    string correlationId;
    # The user who opened it
    string userId;
    string title;
    string details;
    # The user's conversation with the agent, when chat is on
    string? conversationId;
|};

# Everything that happens reaches the agent as one of these, on its \`chat\` event.
type AgentEvent record {|
    # Who it is from: a user ID, or "system"
    string 'from;
    # MESSAGE, FORM_ANSWER, UPLOAD or REMINDER
    string kind;
    string text;
    json data = ();
|};
`;
    if (activeActivities(state).some((a) => a.id === "askForm")) {
      out += `
# One field of a form the agent sends.
type FormField record {|
    # Key of the answer
    string name;
    # What the user sees
    string label;
    # string, number, boolean or date
    string 'type = "string";
    boolean required = false;
|};
`;
    }
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
        description: "${n.object}s and processed webhook events",
        statements: [
            string \`CREATE TABLE {prefix}item (
                id VARCHAR(32) NOT NULL PRIMARY KEY,
                owner_id VARCHAR(255) NOT NULL,
                title VARCHAR(500) NOT NULL,
                details VARCHAR(4000) NOT NULL,
                status VARCHAR(32) NOT NULL,
                conversation_id VARCHAR(26),
                agent_id VARCHAR(255),
                created_at BIGINT NOT NULL)\`,
            "CREATE INDEX {prefix}item_owner ON {prefix}item (owner_id)",
            string \`CREATE TABLE {prefix}event (
                event_id VARCHAR(64) NOT NULL PRIMARY KEY,
                received_at BIGINT NOT NULL)\`
        ]
    }
];

type ItemRow record {|
    string id;
    string owner_id;
    string title;
    string details;
    string status;
    string? conversation_id;
    string? agent_id;
    int created_at;
|};

final jdbc:Client appDb = check sdb:connect(db);

function initStore() returns error? {
    if db.initSchema {
        check sdb:migrate(appDb, db.dbType, "${n.prefix}", migrations);
    }
}

// ${n.idPrefix}-1001, ${n.idPrefix}-1002, ... Good enough for one process; use a sequence when you run several.
isolated function nextId() returns string|error {
    int count = check appDb->queryRow(\`SELECT COUNT(*) FROM ${n.table}\`);
    return string \`${n.idPrefix}-\${1001 + count}\`;
}

isolated function saveItem(${n.type} item) returns error? {
    _ = check appDb->execute(\`INSERT INTO ${n.table} (id, owner_id, title, details, status, conversation_id, agent_id,
        created_at) VALUES (\${item.id}, \${item.ownerId}, \${item.title}, \${item.details}, \${item.status},
        \${item.conversationId}, \${item.agentId}, \${service_commons:nowMillis()})\`);
}

isolated function setAgent(string id, string agentId) returns error? {
    _ = check appDb->execute(\`UPDATE ${n.table} SET agent_id = \${agentId} WHERE id = \${id}\`);
}

isolated function setStatus(string id, string status) returns error? {
    _ = check appDb->execute(\`UPDATE ${n.table} SET status = \${status} WHERE id = \${id}\`);
}

isolated function itemById(string id) returns ${n.type}?|error {
    ${n.type}[] found = check items(\`SELECT * FROM ${n.table} WHERE id = \${id}\`);
    return found.length() == 0 ? () : found[0];
}

// Everyone's when ownerId is (), for admin roles.
isolated function itemsFor(string? ownerId) returns ${n.type}[]|error {
    return ownerId is string
        ? items(\`SELECT * FROM ${n.table} WHERE owner_id = \${ownerId} ORDER BY created_at DESC\`)
        : items(\`SELECT * FROM ${n.table} ORDER BY created_at DESC\`);
}

isolated function items(sql:ParameterizedQuery query) returns ${n.type}[]|error {
    stream<ItemRow, sql:Error?> rows = appDb->query(query);
    return from ItemRow row in rows
        select {
            id: row.id,
            ownerId: row.owner_id,
            title: row.title,
            details: row.details,
            status: row.status,
            conversationId: row.conversation_id,
            agentId: row.agent_id,
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
  return `${services.map((s) => `import ${s.module};`).join("\n")}

${agentOn(state) ? `// The agent's participant ID in chat, its watcher ID on upload cases and the sender of its notifications.
const AGENT_ID = ${lit(n.agentId)};
const AGENT_NAME = ${lit(state.agent.displayName || "Assistant")};

` : ""}// The app acts as a service account: the API key admits it with every scope.
final map<string> & readonly serviceHeaders = {
    "x-api-key": serviceApiKey,
    "x-user-id": ${lit(n.pkg + "-app")},
    "x-user-scopes": "*"
};

${services.map((s) => `final ${s.id}:Client ${s.client} = check new (${camel(s.id)}Url, headers = serviceHeaders);`).join("\n")}
`;
}

export function appBal(state) {
  const n = names(state);
  const chat = has(state, "chat");
  const agent = agentOn(state);
  const approval = agent && state.agent.approval.on && activeActivities(state).some((a) => a.id === state.agent.approval.activity);
  const imports = ["import ballerina/http;", "import commons/service_commons;",
    "import commons/service_commons.auth as sauth;"];
  if (chat) imports.push("import commons/chat;");
  if (approval) imports.push("import ballerina/workflow.management;");
  const admins = state.app.adminRoles.length ? state.app.adminRoles : [];
  return `${imports.sort().join("\n")}

listener http:Listener appListener = new (appPort, timeout = 0);

final sauth:Authenticator authenticator = check new (auth);
final sauth:TicketStore tickets = new;

// Roles that see every ${n.object}.
final string[] & readonly adminRoles = [${admins.map(lit).join(", ")}];

// The UI's own API. The commons components call their services directly.
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

    // Opens ${an(n.object)}${chat ? ": the user's conversation" : ""}${agent ? `${chat ? "," : ":"} then the durable agent that owns it` : ""}.
    resource function post ${n.path}(http:RequestContext ctx, @http:Payload ${n.newType} body)
            returns http:Created|http:BadRequest|error {
        sauth:CallerIdentity caller = check sauth:callerOf(ctx);
        if body.title.trim() == "" {
            return service_commons:badRequest("title is required");
        }
        string id = check nextId();
        string? conversationId = ();${chat ? `
        chat:Conversation conversation = check chats->createConversation({
            correlationId: id,
            title: string \`\${id} · \${body.title}\`,
            participants: [
                {participantId: caller.userId},
                {participantType: chat:AGENT, participantId: ${agent ? "AGENT_ID" : lit("agent:" + n.pkg)}, displayName: ${agent ? "AGENT_NAME" : lit("Assistant")}}
            ]
        });
        conversationId = conversation.id;` : ""}
        ${n.type} item = {id, ownerId: caller.userId, title: body.title, details: body.details, status: "OPEN",
            conversationId, agentId: (), createdAt: service_commons:toIso(service_commons:nowMillis())};
        check saveItem(item);${agent ? `
        AgentInput input = {correlationId: id, userId: caller.userId, title: body.title, details: body.details,
            conversationId};
        string agentId = check ${n.agentVar}.run(string \`New ${n.object} \${id}\`, input);
        check setAgent(id, agentId);
        item.agentId = agentId;` : ""}
        return <http:Created>{body: item};
    }

    // Admin roles see every ${n.object}; everyone else sees their own.
    resource function get ${n.path}(http:RequestContext ctx) returns ${n.type}[]|error {
        sauth:CallerIdentity caller = check sauth:callerOf(ctx);
        return itemsFor(isAdmin(caller) ? () : caller.userId);
    }

    resource function get ${n.path}/[string id](http:RequestContext ctx) returns ${n.type}|http:NotFound|error {
        sauth:CallerIdentity caller = check sauth:callerOf(ctx);
        ${n.type}? item = check itemById(id);
        if item is () || (!isAdmin(caller) && item.ownerId != caller.userId) {
            return service_commons:notFound(string \`${pascal(n.path).replace(/s$/, "")} \${id} not found\`);
        }
        return item;
    }${approval ? reviewResources(state) : ""}
}

isolated function isAdmin(sauth:CallerIdentity caller) returns boolean =>
    caller.roles.some(role => adminRoles.indexOf(role) != ());
`;
}

function reviewResources(state) {
  return `

    // Pending approvals of the agent's guarded activity that the caller's roles may decide.
    resource function get reviews(http:RequestContext ctx) returns json[]|error {
        sauth:CallerIdentity caller = check sauth:callerOf(ctx);
        management:ReviewActivitySummary[] pending = check management:listAllReviewActivities("PENDING",
            taskQueue = management:getWorkflowTaskQueue());
        json[] visible = [];
        foreach management:ReviewActivitySummary review in pending {
            if !caller.roles.some(role => review.userRoles.indexOf(role) != ()
                    || review.administratorRoles.indexOf(role) != ()) {
                continue;
            }
            management:ReviewActivityInfo info = check management:getReviewActivityInfo(review.taskId);
            // taskInput is declared map<json> but arrives as map<anydata> (ballerina-library#9226).
            json input = info.taskInput.toJson();
            visible.push({taskId: review.taskId, activity: review.activityName, title: review.title,
                description: review.description, startTime: review.startTime, input});
        }
        return visible;
    }

    // Approves (proceed) or rejects the activity call; a rejection always carries feedback for the agent.
    resource function post reviews/[string taskId](http:RequestContext ctx, @http:Payload ReviewDecision decision)
            returns json|http:Forbidden|error {
        sauth:CallerIdentity caller = check sauth:callerOf(ctx);
        if caller.roles.length() == 0 {
            return service_commons:forbidden("Only role holders decide reviews");
        }
        [string, string...] roles = [caller.roles[0], ...caller.roles.slice(1)];
        string comment = (decision?.comment ?: "").trim();
        management:ReviewDecision review = decision.approved
            ? {action: "proceed", feedback: comment == "" ? () : comment}
            : {action: "reject", feedback: comment == "" ? "Rejected" : comment};
        check management:completeReviewActivity(taskId, review, roles, caller.userId);
        return {taskId, completed: true};
    }`;
}

export function reviewTypes(state) {
  return `
# A reviewer's decision on a guarded activity call.
type ReviewDecision record {|
    boolean approved;
    string comment?;
|};
`;
}

export function agentBal(state) {
  const n = names(state);
  const acts = activeActivities(state);
  const decls = acts.map((a) => {
    const description = ACTIVITY_DESCRIPTIONS[a.id];
    const approval = state.agent.approval;
    if (approval.on && approval.activity === a.id && approval.userRoles.length) {
      return `        {
            activity: ${a.id},
            description: ${lit(description)},
            approvalPolicy: {
                userRoles: ${roleList(approval.userRoles)},${approval.adminRoles.length ? `
                administratorRoles: ${roleList(approval.adminRoles)},` : ""}
                title: ${lit("Approve " + a.id)},
                description: ${lit(`The agent wants to call ${a.id}; approve or reject it with a reason.`)}
            }
        }`;
    }
    return `        {activity: ${a.id}, description: ${lit(description)}}`;
  });
  const steps = state.agent.steps.filter((s) => s.trim()).map((s, i) => `${i + 1}. ${s.trim()}`).join("\n");
  const instructions = `You own one ${n.object} from start to finish. The input names it (correlationId) and the user who
opened it (userId). Every tool takes the correlationId.

Everything that happens reaches you as a chat event: a JSON object with "from" (a user ID or system), "kind"
(MESSAGE, FORM_ANSWER, UPLOAD or REMINDER), "text" and "data".

Act only by calling tools. Never describe or promise what you are about to do: do it, in the same turn. People see
what you send with the tools; keep messages short. Send each person at most one message per turn. When the step's
tools are done, stop: reply with exactly [done] and no tool call, which ends the turn. When a question comes in
while you cannot use tools, answer it directly in a sentence or two.

Do only the step for the event you just received, then end the turn and wait for the next event.
${steps ? `
The process:
${steps}` : ""}`;
  return `import ballerina/ai;
import ballerina/workflow;

// The WSO2 default model provider (configure it with \`bal configure\`, or in Config.toml). Any ballerinax/ai.*
// provider works if it supports tool calling.
final ai:ModelProvider agentModel = check ai:getDefaultModelProvider();

// One durable agent instance owns one ${n.object}, for as long as it takes.
final workflow:DurableAgent ${n.agentVar} = check new ({
    systemPrompt: {
        role: ${lit(state.agent.purpose || `Coordinator of ${n.object}s.`)},
        instructions: string \`${instructions.replace(/`/g, "'").replace(/\$\{/g, "$ {")}\`
    },
    model: agentModel,
    inputType: AgentInput,
    activities: [
${decls.join(",\n")}
    ],
    events: {
        chat: {request: AgentEvent, response: string, cardinality: workflow:MULTI_EVENT}
    },
    // A turn that goes over this fails the whole agent (ballerina-library#9225); the stop rule above prevents it.
    maxIter: 12
});
`;
}

const ACTIVITY_DESCRIPTIONS = {
  updateStatus: "Sets the status of the business object the correlationId names, e.g. APPROVED, REJECTED or DONE.",
  notifyUser: "Notifies one user through their personal inbox. severity is INFO, WARNING, ERROR or SUCCESS (optional).",
  notifyRole: "Notifies everyone holding a role through their inbox. severity is INFO, WARNING, ERROR or SUCCESS (optional).",
  sendMessage: "Sends a chat message in the conversation about the correlationId.",
  askForm: "Sends a form in the conversation about the correlationId. Each field has a name, a label, a type (string, "
    + "number, boolean or date) and whether it is required. The answer arrives as a FORM_ANSWER event.",
  closeConversation: "Closes the conversation about the correlationId, with a reason.",
  requestUpload: "Asks a user to upload files: opens an upload case and posts an upload card in the conversation. "
    + "mimeTypes (e.g. image/*) and maxFiles are optional. An UPLOAD event arrives when they submit.",
  closeCase: "Closes an upload case (the caseId from requestUpload or the UPLOAD event), with a reason."
};

export function activitiesBal(state) {
  const acts = activeActivities(state).map((a) => a.id);
  const chat = has(state, "chat");
  const imports = new Set(["import ballerina/workflow;"]);
  const blocks = [];
  if (acts.some((a) => a === "notifyUser" || a === "notifyRole")) {
    imports.add("import commons/notification;");
    imports.add("import ballerina/crypto;");
  }
  if (acts.some((a) => ["sendMessage", "askForm", "closeConversation"].includes(a)) || (acts.includes("requestUpload") && chat)) {
    imports.add("import commons/chat;");
  }
  if (acts.includes("sendMessage")) {
    imports.add("import ballerina/crypto;");
    imports.add("import ballerina/lang.runtime;");
  }
  if (acts.includes("requestUpload") || acts.includes("closeCase")) {
    imports.add("import commons/attachment;");
  }
  if (acts.includes("updateStatus")) {
    blocks.push(`@workflow:Activity
function updateStatus(string correlationId, string status) returns string|error {
    string id = re \`/\`.split(correlationId)[0];
    string value = status.trim().toUpperAscii();
    if value == "" {
        return error("status is required, e.g. APPROVED or DONE");
    }
    check setStatus(id, value);
    return string \`\${id} is now \${value}\`;
}`);
  }
  for (const [role, kind] of [["notifyUser", "USER"], ["notifyRole", "ROLE"]]) {
    if (!acts.includes(role)) continue;
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
        sender: AGENT_ID,
        // A retried activity sends the same notification once.
        idempotencyKey: crypto:hashSha256((correlationId + ${who} + title + body).toBytes()).toBase16()
    });
    return sent.id;
}`);
  }
  if (acts.includes("notifyUser") || acts.includes("notifyRole")) {
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
  if (acts.includes("sendMessage")) {
    blocks.push(`@workflow:Activity
function sendMessage(string correlationId, string text) returns string|error {
    return postMessage(check conversationOf(correlationId), text);
}

// Streams a message into a conversation as the agent. The same text to the same conversation keeps its ID, so a
// retried activity restarts the stream instead of posting the message twice.
function postMessage(string conversationId, string text) returns string|error {
    string messageId = "agent-" + crypto:hashSha256((conversationId + text).toBytes()).toBase16().substring(0, 24);
    chat:Message opened = check chats->startStreaming(conversationId, messageId, AGENT_ID);
    if opened.status == chat:COMPLETE {
        return messageId;
    }
    string[] words = re \` \`.split(text);
    foreach int i in 0 ..< words.length() {
        check chats->appendChunk(conversationId, messageId, (i == 0 ? "" : " ") + words[i], AGENT_ID);
        runtime:sleep(0.03);
    }
    _ = check chats->completeMessage(conversationId, messageId, text, AGENT_ID);
    return messageId;
}`);
  }
  if (acts.includes("askForm")) {
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
    chat:Message form = check chats->sendMessage(check conversationOf(correlationId), {
        kind: chat:FORM,
        senderId: AGENT_ID,
        content: {
            title,
            submitLabel: submitLabel ?: "Send",
            schema: {'type: "object", required, properties}
        }
    });
    return form.id;
}`);
  }
  if (acts.includes("closeConversation")) {
    blocks.push(`@workflow:Activity
function closeConversation(string correlationId, string reason) returns string|error {
    chat:Conversation closed = check chats->close(check conversationOf(correlationId), reason, AGENT_ID);
    return closed.id;
}`);
  }
  if (acts.includes("requestUpload")) {
    blocks.push(`@workflow:Activity
function requestUpload(string correlationId, string userId, string title, string instructions,
        string[]? mimeTypes = (), int? maxFiles = ()) returns string|error {
    attachment:Case created = check attachments->createCase({
        // A retried activity finds the same case.
        idempotencyKey: correlationId + "/" + title,
        correlationId,
        title,
        description: instructions,
        subjects: [userId],
        watchers: [AGENT_ID],
        slots: [{name: "files", label: title, mimeTypes: mimeTypes ?: [], maxFiles: maxFiles ?: 3}]
    });${chat ? `
    _ = check chats->sendMessage(check conversationOf(correlationId), {
        id: "upload-" + created.id,
        kind: chat:ATTACHMENT_REF,
        senderId: AGENT_ID,
        content: {name: title, caseId: created.id, slot: "files"}
    });` : ""}
    return created.id;
}`);
  }
  if (acts.includes("closeCase")) {
    blocks.push(`@workflow:Activity
function closeCase(string caseId, string reason) returns string|error {
    attachment:Case closed = check attachments->close(caseId, reason);
    return closed.id;
}`);
  }
  if (chat && acts.some((a) => ["sendMessage", "askForm", "closeConversation", "requestUpload"].includes(a))) {
    blocks.push(`// The conversation about a correlationId; the app opens it with the ${names(state).object}.
function conversationOf(string correlationId) returns string|error {
    chat:Conversation? conversation = check chats->findByCorrelation(correlationId);
    if conversation is () {
        return error(string \`No conversation for \${correlationId}\`);
    }
    return conversation.id;
}`);
  }
  return `${[...imports].sort().join("\n")}

// Every side effect of the agent is one of these durable activities.

${blocks.join("\n\n")}
`;
}

export function hooksBal(state) {
  const n = names(state);
  const chat = has(state, "chat");
  const attachment = has(state, "attachment");
  if (!agentOn(state) || (!chat && !attachment)) {
    return "";
  }
  const imports = ["import ballerina/http;", "import ballerina/log;", "import commons/service_commons.webhook;"];
  if (chat) imports.push("import commons/chat;", "import ballerina/crypto;");
  if (attachment) imports.push("import commons/attachment;");
  return `${imports.sort().join("\n")}

// Where the ${[chat && "chat", attachment && "attachment"].filter(Boolean).join(" and ")} service${chat && attachment ? "s" : ""} deliver the agent's webhooks (Config.toml registers them).
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
        if message.senderId == AGENT_ID {
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

// Hands an event to the agent that owns the ${n.object}. A correlationId like "${n.idPrefix}-1001/contractor" belongs to ${n.idPrefix}-1001.
function deliver(string correlationId, AgentEvent event, string? conversationId, int? afterSeq) returns error? {
    string id = re \`/\`.split(correlationId)[0];
    ${n.type}? item = check itemById(id);
    string? agentId = item is ${n.type} ? item.agentId : ();
    if agentId is () {
        log:printDebug(string \`No agent for \${correlationId}\`);
        return;
    }
    string token = check ${n.agentVar}.sendData(agentId, "chat", event);${chat ? `
    if conversationId is string && afterSeq is int {
        _ = start postReply(agentId, token, conversationId, afterSeq);
    }` : `
    _ = token;`}
}
${chat ? `
// Posts a turn's final answer when it is a real reply: a side question answered while the agent was parked. Normal
// turns end with [done], because the agent has already messaged people through activities.
function postReply(string agentId, string token, string conversationId, int afterSeq) {
    string|error reply = ${n.agentVar}.waitForDataResult(agentId, token);
    if reply is error {
        log:printWarn(string \`No reply for turn \${token}\`, 'error = reply);
        return;
    }
    string text = re \`\\[done\\]\`.replaceAll(reply, "").trim();
    chat:MessagePage|error page = chats->history(conversationId, afterSeq = afterSeq, 'limit = 100);
    boolean answered = page is chat:MessagePage && page.items.some(m => m.senderId == AGENT_ID);
    if text == "" || answered {
        return;
    }
    string messageId = "turn-" + crypto:hashSha256(token.toBytes()).toBase16().substring(0, 24);
    chat:Message|error posted = chats->sendText(conversationId, text, AGENT_ID, messageId);
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
    return `[${section}.auth]
# No identity provider: the service trusts x-user-id / x-user-roles headers. Development only.
enableApiKey = true
apiKeyValue = "change-me"
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

export function configToml(state) {
  const n = names(state);
  const agent = agentOn(state);
  const root = `${n.org}.${n.pkg}`;
  let out = `# Replace every change-me before you deploy; keep secrets out of version control.

[${root}]
serviceApiKey = "change-me"${agent && (has(state, "chat") || has(state, "attachment")) ? `
webhookSecret = "change-me"` : ""}
corsAllowOrigins = ["http://localhost:5173"]

${authToml(state, root)}
${dbToml(state, root, n)}`;
  if (agent) {
    out += `
[ballerina.workflow]
# LOCAL talks to \`temporal server start-dev\`; use SELF_HOSTED with a Temporal cluster.
mode = "${state.deploy === "compose" ? "SELF_HOSTED" : "LOCAL"}"
url = "${state.deploy === "compose" ? "temporal:7233" : "localhost:7233"}"
namespace = "default"
taskQueue = "${n.pkg.toUpperCase()}"
`;
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
]` : ""}` : ""}${id === "chat" && agent ? `
# A conversation holds the user and the agent; raise this for group chats.
maxParticipants = 2` : ""}

${authToml(state, section)}
${dbToml(state, section, n)}`;
    if (agent && id === "chat") {
      out += `
[[${section}.webhooks]]
participantId = ${lit(n.agentId)}
url = "http://localhost:9090/hooks/chat"
secret = "change-me"
events = ["message.created", "form.submitted"]
`;
    }
    if (agent && id === "attachment") {
      out += `
[[${section}.webhooks]]
participantId = ${lit(n.agentId)}
url = "http://localhost:9090/hooks/attachments"
secret = "change-me"
events = ["case.submitted"]
`;
    }
  }
  return out;
}

export function dockerCompose(state) {
  const n = names(state);
  const agent = agentOn(state);
  const idp = IDPS.find((i) => i.id === state.idp.kind);
  const services = [];
  if (agent) {
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
  services.push(`  app:
    build: ./backend
    depends_on: [${[agent && "temporal", state.db !== "h2" && "db", idp.id === "keycloak" && "keycloak", idp.id === "thunder" && "thunder"].filter(Boolean).join(", ")}]
    volumes:
      - ./backend/Config.toml:/app/Config.toml:ro
      - app-data:/app/target/data
    ports:
      - "9090:9090"
${enabledServices(state).map((id) => `      - "${SERVICES.find((s) => s.id === id).port}:${SERVICES.find((s) => s.id === id).port}"`).join("\n")}`,
  `  web:
    image: nginx:1.27-alpine
    depends_on: [app]
    volumes:
      - ./frontend/dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    ports:
      - "5173:80"`);
  const volumes = ["app-data", agent && "temporal-db", state.db !== "h2" && "app-db"].filter(Boolean);
  return `# ${state.app.name}: ${idp.id === "authentik" ? "authentik runs from its own compose file (it needs PostgreSQL and Redis). " : ""}secrets come from .env (git-ignored).
services:
${services.join("\n\n")}

volumes:
${volumes.map((v) => `  ${v}:`).join("\n")}
`;
}

export function nginxConf(state) {
  const proxies = [["/api/app/", "http://app:9090/app/"],
    ...enabledServices(state).map((id) => {
      const s = SERVICES.find((x) => x.id === id);
      return [`/api/${id === "notification" ? "notifications" : id === "attachment" ? "attachments" : "chat"}/`,
        `http://app:${s.port}${s.basePath}/`];
    })];
  return `server {
    listen 80;
    root /usr/share/nginx/html;

    location / {
        try_files $uri $uri/ /index.html;
    }
${proxies.map(([from, to]) => `
    location ${from} {
        proxy_pass ${to};
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

// Every generated file, in the order a reader should see them.
export function files(state) {
  const agent = agentOn(state);
  const approval = agent && state.agent.approval.on && activeActivities(state).some((a) => a.id === state.agent.approval.activity);
  const list = [
    ["backend/Ballerina.toml", ballerinaToml(state)],
    ["backend/main.bal", mainBal(state)],
    ["backend/config.bal", configBal(state)],
    ["backend/types.bal", typesBal(state) + (approval ? reviewTypes(state) : "")],
    ["backend/clients.bal", clientsBal(state)],
    ["backend/store.bal", storeBal(state)],
    ["backend/app.bal", appBal(state)]
  ];
  if (agent) {
    list.push(["backend/agent.bal", agentBal(state)], ["backend/activities.bal", activitiesBal(state)]);
    const hooks = hooksBal(state);
    if (hooks) list.push(["backend/hooks.bal", hooks]);
  }
  list.push(["backend/Config.toml", configToml(state)]);
  if (state.deploy === "compose") {
    list.push(["docker-compose.yml", dockerCompose(state)], ["nginx.conf", nginxConf(state)]);
  }
  return list;
}
