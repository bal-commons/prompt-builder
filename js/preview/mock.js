import {fieldName, sampleValue, startInputSchema, taskFormSchema, validateAnswer} from "../contracts.js";
import {wfNames} from "../code.js";

// The mock adapter: an in-memory implementation of the routes, payloads and events the bal-commons components and
// the generated start service use. It answers only URLs under MOCK_ORIGIN; everything else goes to the network.
//
// Routes (each follows the real service's contract; see the component clients and the generated code):
//   app          GET /app/runs, GET /app/runs/{id}, POST /start/{name}
//   workflow     GET /human-tasks, GET /human-tasks/{id}, POST /human-tasks/{id}/complete|fail,
//                GET /review-activities, GET /review-activities/{id}, POST /review-activities/{id}/proceed|proceed-with-input|reject,
//                GET /runtime, GET /human-tasks/pending-count
//   chat         GET /conversations, GET /conversations/{id}, GET|POST /conversations/{id}/messages,
//                PUT /conversations/{id}/read, POST /conversations/{id}/typing
//   attachment   GET /cases, GET /admin/cases, GET /cases/{id}, POST /cases/{id}/slots/{slot}/files,
//                DELETE /cases/{id}/files/{fileId}, POST /cases/{id}/files/{fileId}/link, GET .../content, POST /cases/{id}/submit
//   notification GET /notifications, GET /notifications/unread-count, PUT|DELETE /notifications/{id}/read,
//                POST /notifications/read-all
//   every        POST /stream-ticket, then the stream (MockEventSource) with the service's event names

export const MOCK_ORIGIN = "https://mock.preview";
export const MOCK_URLS = {
  app: `${MOCK_ORIGIN}/app-service`,
  workflow: `${MOCK_ORIGIN}/workflow`,
  chat: `${MOCK_ORIGIN}/chat/v1`,
  attachment: `${MOCK_ORIGIN}/attachments/v1`,
  notification: `${MOCK_ORIGIN}/notifications/v1`
};

const NAMES = ["Alex", "Sam", "Priya", "Jordan", "Mei", "Tom", "Ana", "Kofi"];
const now = () => new Date().toISOString();
const later = (ms) => new Promise((r) => setTimeout(r, ms));
let counter = 0;
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`;

// One persona per role, named so the preview reads naturally.
export function personasOf(config) {
  return config.app.roles.map((role, i) => ({id: NAMES[i % NAMES.length].toLowerCase(), name: NAMES[i % NAMES.length], roles: [role]}));
}

const ok = (body, status = 200) => ({status, body});
const fail = (status, message, shape = "commons") => ({status, body: shape === "workflow" ? {error: {message}} : {code: `HTTP_${status}`, message}});

export class MockBackend {
  constructor(config, saved) {
    this.listeners = new Set();
    this.tickets = new Map();
    this.latency = 0;
    this.failNext = false;
    this.config = config;
    this.db = saved ?? this.seed(config);
  }

  // A new configuration keeps the data; workflows added since get sample runs.
  configure(config) {
    this.config = config;
    const known = new Set(this.db.seeded);
    for (const wf of config.workflows) {
      if (!known.has(wf.id)) this.seedWorkflow(wf);
    }
    this.seedNotifications();
    for (const t of this.db.tasks.filter((x) => x.status === "PENDING")) {
      const wf = config.workflows.find((w) => wfNames(w).fn === t.parentWorkflowType);
      const def = wf?.tasks?.find((d) => (d.name || "") === t.taskName.split(".").pop() || d.key === t.taskName);
      if (def) {
        t.formSchema = JSON.stringify(taskFormSchema(def.fields));
        t.title = `${def.title || def.name} · ${t.runId}`;
        t.description = def.description ?? "";
        t.userRoles = def.roles;
      }
    }
  }

  persona(id) {
    return personasOf(this.config).find((p) => p.id === id);
  }

  // ------------------------------------------------------------ seed data

  seed(config) {
    this.db = {runs: [], conversations: [], messages: [], notifications: [], cases: [], files: [], tasks: [], seeded: []};
    for (const wf of config.workflows) this.seedWorkflow(wf);
    this.seedNotifications();
    return this.db;
  }

  // Sample notifications once the capability is on: a welcome, and one about a run so clicking it opens the run.
  seedNotifications() {
    if (!this.config.capabilities.notifications || this.db.notificationsSeeded) return;
    this.db.notificationsSeeded = true;
    const owner = personasOf(this.config)[0];
    const run = this.db.runs.find((r) => r.ownerId === owner.id);
    this.notify("USER", owner.id, "Welcome to the preview", "Sample notifications appear here as runs move.", "", "INFO");
    if (run) this.notify("USER", owner.id, `${run.id} has an update`, `Open it to see the latest (sample).`, run.id, "SUCCESS");
    const pending = this.db.tasks.find((t) => t.status === "PENDING" && t.userRoles.length);
    if (pending) this.notify("ROLE", pending.userRoles[0], pending.title, "A task is waiting for you in the task inbox (sample).", pending.runId, "WARNING");
  }

  seedWorkflow(wf) {
    const config = this.config;
    const people = personasOf(config);
    const owner = people[0];
    this.db.seeded.push(wf.id);
    const values = Object.fromEntries(wf.input.map((f, i) => [fieldName(f), sampleValue(f, i)]));
    const run = this.createRun(wf, owner.id, values, true);
    if (wf.kind === "agent" && wf.chat && run.conversationId) {
      this.post(run.conversationId, owner.id, "TEXT", "Can you give me an update?");
      this.post(run.conversationId, wfNames(wf).agentId, "TEXT", "Sure: I'm working on it and will message you here when it's done. (Sample conversation.)");
    }
    if (wf.kind === "agent" && wf.approval.on) {
      this.db.tasks.push(this.review(wf, run, {runId: run.id, correlationId: run.id}));
    }
  }

  createRun(wf, ownerId, values, sample = false) {
    const w = wfNames(wf);
    const id = `${(this.config.app.idPrefix || "RUN").toUpperCase()}-${1001 + this.db.runs.length}`;
    const run = {id, workflow: w.fn, ownerId, title: String(values.title ?? values[Object.keys(values)[0]] ?? w.display), status: "RUNNING",
      conversationId: null, instanceId: uid("wf"), createdAt: now(), sample};
    this.db.runs.unshift(run);
    if (wf.kind === "agent" && wf.chat) {
      const conv = {id: uid("conv"), correlationId: id, status: "OPEN", title: `${w.display} · ${id}`, lastSeq: 0, createdBy: ownerId,
        createdAt: now(), updatedAt: now(), participants: [
          {participantType: "USER", participantId: ownerId, displayName: this.persona(ownerId)?.name ?? ownerId, lastReadSeq: 0},
          {participantType: "AGENT", participantId: w.agentId, displayName: wf.displayName || w.display, lastReadSeq: 0}]};
      this.db.conversations.unshift(conv);
      run.conversationId = conv.id;
      this.emit("chat", "conversation.created", conv, [ownerId]);
      if (wf.greeting?.trim()) this.post(conv.id, w.agentId, "TEXT", wf.greeting.trim());
      if (wf.uploads && this.config.capabilities.uploads) this.openCase(run, wf, ownerId, !sample);
    }
    if (wf.kind === "workflow") this.nextTask(wf, run, 0, values);
    const events = this.config.behavior?.notifications?.events ?? {};
    if (this.config.capabilities.notifications && events.runStarted && !sample) {
      this.notify("USER", ownerId, `Started ${id}`, `${w.display} is working on it.`, id, "INFO");
    }
    return run;
  }

  openCase(run, wf, ownerId, announce) {
    const slots = (this.config.behavior?.uploads?.slots ?? []).map((s) => ({name: s.name || "files", label: s.label || s.name,
      description: "", mimeTypes: s.mimeTypes ?? [], maxBytes: 10 * 1024 * 1024, minFiles: s.required ? 1 : 0,
      maxFiles: Math.max(1, Number(s.maxFiles) || 1), fileCount: 0, satisfied: !s.required}));
    const c = {id: uid("case"), correlationId: run.id, title: `Files for ${run.id}`, description: "Upload what the agent asked for.",
      status: "OPEN", subjects: [ownerId], watchers: [wfNames(wf).agentId], slots, files: [], autoSubmit: false, createdBy: wfNames(wf).agentId,
      createdAt: now(), updatedAt: now()};
    this.db.cases.unshift(c);
    this.emit("attachment", "case.created", this.caseView(c), [ownerId]);
    if (run.conversationId) {
      if (announce) this.post(run.conversationId, wfNames(wf).agentId, "TEXT", "Please upload the files below; I'll check them when you submit.");
      this.post(run.conversationId, wfNames(wf).agentId, "ATTACHMENT_REF", {name: c.title, caseId: c.id, slot: slots[0]?.name});
    }
    return c;
  }

  nextTask(wf, run, index, values) {
    const def = (wf.tasks ?? [])[index];
    if (!def) {
      run.status = "DONE";
      const events = this.config.behavior?.notifications?.events ?? {};
      if (this.config.capabilities.notifications && events.runFinished) this.notify("USER", run.ownerId, `${run.id} is done`, run.title, run.id, "SUCCESS");
      return;
    }
    const key = def.name || `task${index + 1}`;
    const task = {kind: "HUMAN_TASK", taskId: uid("task"), taskName: `${wfNames(wf).fn}.${key}`, title: `${def.title || def.name} · ${run.id}`,
      description: def.description ?? "", parentWorkflowId: run.instanceId, parentWorkflowType: wfNames(wf).fn, stepId: `${key}#1`,
      status: "PENDING", startTime: now(), closeTime: null, userRoles: def.roles, users: [], excludedUsers: [], excludedRoles: [],
      administratorRoles: [], administratorUsers: [], completedBy: null, completedAt: null, completedAs: null, canComplete: true,
      canAdminister: false, createdAt: now(), formSchema: JSON.stringify(taskFormSchema(def.fields)),
      taskInput: Object.fromEntries(Object.entries(values).filter(([k]) => !def.context || def.context.includes(k))), result: null,
      runId: run.id, index};
    this.db.tasks.unshift(task);
    run.status = "WAITING";
    const events = this.config.behavior?.notifications?.events ?? {};
    if (this.config.capabilities.notifications && events.taskAssigned) {
      for (const role of def.roles) this.notify("ROLE", role, `${def.title || def.name} · ${run.id}`, "A task is waiting for you in the task inbox.", run.id, "WARNING");
    }
  }

  review(wf, run, args) {
    const w = wfNames(wf);
    return {kind: "REVIEW_ACTIVITY", taskId: uid("review"), taskName: `${w.fn}.${wf.approval.activity}`, title: `Approve ${wf.approval.activity}`,
      description: `${w.display} wants to run ${wf.approval.activity}; approve or reject it with a reason.`, parentWorkflowId: run.instanceId,
      parentWorkflowType: w.fn, stepId: null, status: "PENDING", startTime: now(), closeTime: null, userRoles: wf.approval.userRoles,
      users: [], excludedUsers: [], excludedRoles: [], administratorRoles: wf.approval.adminRoles ?? [], administratorUsers: [],
      completedBy: null, completedAt: null, completedAs: null, canComplete: false, canAdminister: false, createdAt: now(),
      activityName: `${w.fn}.${wf.approval.activity}`, trigger: "PRE_RUN", errorMessage: "", taskInput: args, decision: null,
      formSchema: null, runId: run.id};
  }

  // ------------------------------------------------------------ helpers

  post(conversationId, senderId, kind, content, extra = {}) {
    const conv = this.db.conversations.find((c) => c.id === conversationId);
    conv.lastSeq += 1;
    conv.updatedAt = now();
    const m = {id: extra.id ?? uid("msg"), conversationId, seq: conv.lastSeq, senderId, kind, status: extra.status ?? "COMPLETE",
      content, replyTo: extra.replyTo, createdAt: now(), completedAt: extra.status === "STREAMING" ? undefined : now()};
    this.db.messages.push(m);
    this.emit("chat", "message.created", m, conv.participants.map((p) => p.participantId));
    return m;
  }

  notify(recipientType, recipientId, title, body, correlationId, severity) {
    const n = {id: uid("ntf"), recipientType, recipientId, severity, title, body, correlationId: correlationId || undefined,
      createdAt: now(), readBy: []};
    this.db.notifications.unshift(n);
    this.emit("notification", "notification.created", this.notificationView(n, null), recipientType === "USER" ? [recipientId] : [`role:${recipientId}`]);
  }

  notificationView(n, user) {
    const read = user ? n.readBy.includes(user) : false;
    const {readBy, ...rest} = n;
    return {...rest, read, readAt: read ? n.createdAt : undefined};
  }

  caseView(c) {
    const files = this.db.files.filter((f) => f.caseId === c.id).map(({blob, url, ...f}) => f);
    const slots = c.slots.map((s) => {
      const count = files.filter((f) => f.slot === s.name).length;
      return {...s, fileCount: count, satisfied: count >= s.minFiles};
    });
    return {...c, slots, files};
  }

  visible(user, roles, task) {
    return task.users.includes(user) || task.userRoles.some((r) => roles.includes(r)) || task.administratorRoles.some((r) => roles.includes(r))
      || (!task.userRoles.length && !task.users.length);
  }

  // ------------------------------------------------------------ events

  subscribe(service, user, roles, listener) {
    const entry = {service, user, roles, listener};
    this.listeners.add(entry);
    return () => this.listeners.delete(entry);
  }

  // Targets are user IDs, or "role:<name>" for everyone holding a role.
  emit(service, event, data, targets) {
    const id = uid("evt");
    for (const l of this.listeners) {
      if (l.service !== service) continue;
      if (targets && !targets.some((t) => t === l.user || (t.startsWith("role:") && l.roles.includes(t.slice(5))))) continue;
      queueMicrotask(() => l.listener(event, JSON.stringify(data), id));
    }
    this.save?.();
  }

  // ------------------------------------------------------------ routing

  async handle(method, url, body, headers) {
    if (this.latency) await later(this.latency);
    if (this.failNext) {
      this.failNext = false;
      return fail(503, "The preview simulated a service failure. Try again.", url.startsWith(MOCK_URLS.workflow) ? "workflow" : "commons");
    }
    const user = headers["x-user-id"] ?? "";
    const roles = (headers["x-user-roles"] ?? "").split(",").map((r) => r.trim()).filter(Boolean);
    const u = new URL(url);
    const service = Object.entries(MOCK_URLS).find(([, base]) => url.startsWith(base))?.[0];
    if (!service) return fail(404, `No mock service at ${url}`);
    const path = u.pathname.slice(new URL(MOCK_URLS[service]).pathname.length) || "/";
    const q = Object.fromEntries(u.searchParams);
    if (method === "POST" && path === "/stream-ticket") {
      const ticket = uid("tkt");
      this.tickets.set(ticket, {service, user, roles});
      return ok({ticket});
    }
    const route = {app: this.app, workflow: this.workflow, chat: this.chat, attachment: this.attachment, notification: this.notifications}[service];
    const result = await route.call(this, method, path.split("/").filter(Boolean).map(decodeURIComponent), q, body, user, roles);
    this.save?.();
    return result;
  }

  app(method, parts, q, body, user, roles) {
    const admin = roles.some((r) => this.config.app.adminRoles.includes(r));
    if (method === "GET" && parts[0] === "app" && parts[1] === "runs") {
      const mine = this.db.runs.filter((r) => admin || r.ownerId === user);
      if (parts[2]) {
        const run = mine.find((r) => r.id === parts[2]);
        return run ? ok(run) : fail(404, `Run ${parts[2]} not found`);
      }
      return ok(mine);
    }
    if (method === "POST" && parts[0] === "start" && parts[1]) {
      const wf = this.config.workflows.find((w) => wfNames(w).path === parts[1]);
      if (!wf) return fail(404, `No start service /start/${parts[1]}`);
      const schema = startInputSchema(wf.input);
      const missing = schema.required.filter((k) => body?.[k] === undefined || body?.[k] === null || body?.[k] === "");
      if (missing.length) return fail(400, `Missing required field: ${missing.join(", ")}`);
      const run = this.createRun(wf, user, body ?? {});
      if (wf.kind === "agent" && run.conversationId) void this.agentTurn(wf, run, {kind: "START", text: String(Object.values(body ?? {})[0] ?? "")});
      return ok({runId: run.id, instanceId: run.instanceId, conversationId: run.conversationId}, 201);
    }
    return fail(404, "Not a route of the generated app");
  }

  // The simulated agent: a short scripted turn, streamed like a real one.
  async agentTurn(wf, run, event) {
    const w = wfNames(wf);
    const conv = this.db.conversations.find((c) => c.id === run.conversationId);
    if (!conv || conv.status !== "OPEN") return;
    await later(400);
    this.emit("chat", "typing", {conversationId: conv.id, participantId: w.agentId}, conv.participants.map((p) => p.participantId));
    await later(700);
    const openCase = this.db.cases.find((c) => c.correlationId === run.id && c.status === "OPEN");
    let text;
    if (event.kind === "START") {
      text = `Thanks, I'm on it${event.text ? `: “${event.text.slice(0, 80)}”` : ""}. (Simulated reply: the real agent answers with your model.)`;
    } else if (event.kind === "FORM_ANSWER") {
      text = "Thanks, I have your answers. (Simulated reply.)";
    } else if (event.kind === "UPLOAD") {
      text = `I received ${event.count} file(s) and I'm checking them. (Simulated reply.)`;
    } else if (wf.uploads && this.config.capabilities.uploads && !openCase && !this.db.cases.some((c) => c.correlationId === run.id)) {
      text = "To continue I need a few files from you. (Simulated reply.)";
    } else {
      text = `Got it: “${event.text.slice(0, 80)}”. I'll get back to you here. (Simulated reply: the real agent answers with your model.)`;
    }
    const m = this.post(conv.id, w.agentId, "TEXT", "", {status: "STREAMING"});
    for (const word of text.split(" ")) {
      await later(45);
      m.content += (m.content ? " " : "") + word;
      this.emit("chat", "message.delta", {conversationId: conv.id, messageId: m.id, text: (m.content === word ? "" : " ") + word},
        conv.participants.map((p) => p.participantId));
    }
    m.status = "COMPLETE";
    m.completedAt = now();
    this.emit("chat", "message.completed", m, conv.participants.map((p) => p.participantId));
    if (event.kind === "MESSAGE" && wf.uploads && this.config.capabilities.uploads && !this.db.cases.some((c) => c.correlationId === run.id)) {
      this.openCase(run, wf, run.ownerId, false);
    }
    if (event.kind === "UPLOAD") run.status = "SUBMITTED";
  }

  workflow(method, parts, q, body, user, roles) {
    if (method === "GET" && parts[0] === "runtime") return ok({taskQueue: "PREVIEW"});
    const kind = parts[0] === "human-tasks" ? "HUMAN_TASK" : parts[0] === "review-activities" ? "REVIEW_ACTIVITY" : null;
    if (!kind) return fail(404, "Not a management API route", "workflow");
    if (method === "GET" && parts[1] === "pending-count") {
      return ok({count: this.db.tasks.filter((t) => t.kind === kind && t.status === "PENDING" && this.visible(user, roles, t)).length});
    }
    if (method === "GET" && !parts[1]) {
      const items = this.db.tasks.filter((t) => t.kind === kind && this.visible(user, roles, t) && (!q.status || t.status === q.status)
        && (!q.parentWorkflowId || t.parentWorkflowId === q.parentWorkflowId));
      return ok({items: items.map(({formSchema, taskInput, result, decision, errorMessage, createdAt, runId, index, ...summary}) => summary),
        nextPageToken: null, hasMore: false});
    }
    const task = this.db.tasks.find((t) => t.taskId === parts[1] && t.kind === kind);
    if (!task) return fail(404, `Task ${parts[1]} not found`, "workflow");
    if (!this.visible(user, roles, task)) return fail(403, "Unauthorized: caller is not allowed to access this task", "workflow");
    if (method === "GET" && parts.length === 2) {
      const {runId, index, ...info} = task;
      return ok(info);
    }
    if (task.status !== "PENDING") {
      return fail(409, `The task was already ${task.status.toLowerCase()} by ${task.completedBy ?? "someone else"}`, "workflow");
    }
    const run = this.db.runs.find((r) => r.id === task.runId);
    const wf = this.config.workflows.find((w) => wfNames(w).fn === task.parentWorkflowType);
    const close = (status, as = "audience") => Object.assign(task, {status, completedBy: user, completedAt: now(), completedAs: as, closeTime: now()});
    if (kind === "HUMAN_TASK" && parts[2] === "complete") {
      const problem = validateAnswer(JSON.parse(task.formSchema), body?.result);
      if (problem) return fail(400, `Invalid result: ${problem}`, "workflow");
      close("COMPLETED");
      task.result = body.result;
      if (run && wf) this.nextTask(wf, run, task.index + 1, task.taskInput);
      return ok({taskId: task.taskId, status: "COMPLETED"});
    }
    if (kind === "HUMAN_TASK" && parts[2] === "fail") {
      close("FAILED");
      if (run) run.status = "FAILED";
      return ok({taskId: task.taskId, status: "FAILED"});
    }
    if (kind === "REVIEW_ACTIVITY") {
      const action = parts[2];
      if (action === "reject" && !body?.feedback) return fail(400, "A rejection needs feedback", "workflow");
      close("COMPLETED");
      task.decision = {action, input: body?.input ?? null, feedback: body?.feedback ?? null};
      if (run?.conversationId && wf) {
        this.post(run.conversationId, wfNames(wf).agentId, "TEXT", action === "reject"
          ? `${task.completedBy} rejected ${wf.approval.activity}: ${body.feedback} (Simulated reply.)`
          : `${task.completedBy} approved ${wf.approval.activity}, so I went ahead. (Simulated reply.)`);
      }
      return ok({taskId: task.taskId, status: "COMPLETED"});
    }
    return fail(404, "Not a management API route", "workflow");
  }

  chat(method, parts, q, body, user) {
    if (parts[0] !== "conversations") return fail(404, "Not a chat route");
    const mine = this.db.conversations.filter((c) => c.participants.some((p) => p.participantId === user));
    if (!parts[1] && method === "GET") {
      const items = mine.filter((c) => (!q.status || c.status === q.status) && (!q.correlationId || c.correlationId === q.correlationId))
        .map((c) => ({...c, unread: c.lastSeq - (c.participants.find((p) => p.participantId === user)?.lastReadSeq ?? 0)}));
      return ok({items});
    }
    const conv = mine.find((c) => c.id === parts[1]);
    if (!conv) return fail(404, `Conversation ${parts[1]} not found`);
    if (method === "GET" && parts.length === 2) return ok(conv);
    if (parts[2] === "messages" && method === "GET") {
      const all = this.db.messages.filter((m) => m.conversationId === conv.id).sort((a, b) => a.seq - b.seq);
      const limit = Number(q.limit ?? 100);
      return ok({items: all.slice(-limit), hasMore: all.length > limit});
    }
    if (parts[2] === "messages" && method === "POST") {
      const kind = body?.kind ?? "TEXT";
      const m = this.post(conv.id, user, kind, body?.content, {replyTo: body?.replyTo});
      const run = this.db.runs.find((r) => r.conversationId === conv.id);
      const wf = run && this.config.workflows.find((w) => wfNames(w).fn === run.workflow);
      if (kind === "FORM_RESPONSE" && body.replyTo) {
        const form = this.db.messages.find((x) => x.id === body.replyTo);
        if (form) {
          form.answeredAt = now();
          this.emit("chat", "message.updated", form, conv.participants.map((p) => p.participantId));
        }
      }
      if (wf) void this.agentTurn(wf, run, {kind: kind === "FORM_RESPONSE" ? "FORM_ANSWER" : "MESSAGE", text: typeof body?.content === "string" ? body.content : ""});
      return ok(m, 201);
    }
    if (parts[2] === "read" && method === "PUT") {
      const me = conv.participants.find((p) => p.participantId === user);
      if (me) me.lastReadSeq = Math.max(me.lastReadSeq, Number(body?.seq ?? 0));
      return ok({conversationId: conv.id, seq: me?.lastReadSeq ?? 0});
    }
    if (parts[2] === "typing" && method === "POST") return ok({});
    return fail(404, "Not a chat route");
  }

  attachment(method, parts, q, body, user, roles) {
    const admin = roles.some((r) => this.config.app.adminRoles.includes(r));
    if (method === "GET" && (parts[0] === "cases" || (parts[0] === "admin" && parts[1] === "cases")) && parts.length === (parts[0] === "admin" ? 2 : 1)) {
      if (parts[0] === "admin" && !admin) return fail(403, "Requires an admin role with 'read'");
      const items = this.db.cases.filter((c) => (parts[0] === "admin" || c.subjects.includes(user))
        && (!q.status || c.status === q.status) && (!q.correlationId || c.correlationId === q.correlationId)).map((c) => this.caseView(c));
      return ok({items});
    }
    if (parts[0] !== "cases") return fail(404, "Not an attachment route");
    const c = this.db.cases.find((x) => x.id === parts[1]);
    if (!c || !(c.subjects.includes(user) || c.createdBy === user || admin)) return fail(404, `Case ${parts[1]} not found`);
    if (method === "GET" && parts.length === 2) return ok(this.caseView(c));
    const targets = [...c.subjects, c.createdBy, ...this.config.app.adminRoles.map((r) => `role:${r}`)];
    if (method === "POST" && parts[2] === "slots" && parts[4] === "files") {
      if (!c.subjects.includes(user)) return fail(403, "Only the case's subjects upload");
      if (c.status !== "OPEN") return fail(409, "The case is not open");
      const slot = c.slots.find((s) => s.name === parts[3]);
      if (!slot) return fail(404, `Slot ${parts[3]} not found`);
      const count = this.db.files.filter((f) => f.caseId === c.id && f.slot === slot.name).length;
      if (count >= slot.maxFiles) return fail(409, `${slot.label} is full`);
      const type = body?.type || "application/octet-stream";
      if (slot.mimeTypes.length && !slot.mimeTypes.some((p) => p.endsWith("/*") ? type.startsWith(p.slice(0, -1)) : type === p)) {
        return fail(400, `${slot.label} accepts ${slot.mimeTypes.join(", ")}`);
      }
      if ((body?.size ?? 0) > slot.maxBytes) return fail(413, `The file is larger than ${Math.round(slot.maxBytes / 1048576)} MB`);
      const file = {id: uid("file"), caseId: c.id, slot: slot.name, fileName: q.fileName ?? "file", mimeType: type, sizeBytes: body?.size ?? 0,
        sha256: "", uploadedBy: user, uploadedAt: now(), blob: body, url: URL.createObjectURL(body)};
      this.db.files.push(file);
      c.updatedAt = now();
      const {blob, url, ...attachment} = file;
      this.emit("attachment", "attachment.uploaded", {caseId: c.id, attachment}, targets);
      return ok(attachment, 201);
    }
    const file = this.db.files.find((f) => f.caseId === c.id && f.id === parts[3]);
    if (parts[2] === "files" && file && method === "DELETE") {
      if (file.uploadedBy !== user && !admin) return fail(403, "Only the uploader or an admin role deletes a file");
      if (c.status !== "OPEN" && !admin) return fail(409, "The case is not open");
      this.db.files = this.db.files.filter((f) => f !== file);
      const {blob, url, ...attachment} = file;
      this.emit("attachment", "attachment.deleted", {caseId: c.id, attachment}, targets);
      return ok(null, 204);
    }
    if (parts[2] === "files" && file && parts[4] === "link" && method === "POST") {
      return ok({url: file.url ?? "", expiresAt: new Date(Date.now() + 300_000).toISOString()});
    }
    if (parts[2] === "files" && file && parts[4] === "content" && method === "GET") {
      return file.blob ? {status: 200, body: file.blob} : fail(410, "The preview lost this file's content when it reloaded");
    }
    if (parts[2] === "submit" && method === "POST") {
      const view = this.caseView(c);
      if (!view.slots.every((s) => s.satisfied)) return fail(409, "Every required slot needs a file first");
      c.status = "SUBMITTED";
      const submitted = this.caseView(c);
      this.emit("attachment", "case.submitted", submitted, targets);
      const run = this.db.runs.find((r) => r.id === c.correlationId);
      const wf = run && this.config.workflows.find((w) => wfNames(w).fn === run.workflow);
      if (wf) void this.agentTurn(wf, run, {kind: "UPLOAD", count: submitted.files.length});
      return ok(submitted);
    }
    return fail(404, "Not an attachment route");
  }

  notifications(method, parts, q, body, user, roles) {
    const mine = this.db.notifications.filter((n) => (n.recipientType === "USER" && n.recipientId === user)
      || (n.recipientType === "ROLE" && roles.includes(n.recipientId)));
    if (parts[0] !== "notifications") return fail(404, "Not a notification route");
    if (method === "GET" && !parts[1]) {
      const items = mine.filter((n) => (!q.box || q.box === "all" || (q.box === "personal") === (n.recipientType === "USER"))
        && (!q.severity || n.severity === q.severity) && (!q.correlationId || n.correlationId === q.correlationId)
        && (q.read === undefined || (q.read === "true") === n.readBy.includes(user)));
      return ok({items: items.slice(0, Number(q.limit ?? 20)).map((n) => this.notificationView(n, user))});
    }
    if (method === "GET" && parts[1] === "unread-count") {
      const unread = mine.filter((n) => !n.readBy.includes(user));
      const rolesCount = Object.fromEntries(roles.map((r) => [r, unread.filter((n) => n.recipientType === "ROLE" && n.recipientId === r).length]));
      return ok({total: unread.length, personal: unread.filter((n) => n.recipientType === "USER").length, roles: rolesCount});
    }
    if (method === "POST" && parts[1] === "read-all") {
      let count = 0;
      for (const n of mine) {
        if ((!body?.box || body.box === "all" || (body.box === "personal") === (n.recipientType === "USER"))
          && (!body?.correlationId || n.correlationId === body.correlationId) && !n.readBy.includes(user)) {
          n.readBy.push(user);
          count++;
        }
      }
      if (count) this.emit("notification", "notification.read-all", {count}, [user]);
      return ok({count});
    }
    const n = mine.find((x) => x.id === parts[1]);
    if (!n) return fail(404, `Notification ${parts[1]} not found`);
    if (parts[2] === "read" && method === "PUT") {
      if (!n.readBy.includes(user)) n.readBy.push(user);
      this.emit("notification", "notification.read", {id: n.id, readAt: now()}, [user]);
      return ok(this.notificationView(n, user));
    }
    if (parts[2] === "read" && method === "DELETE") {
      n.readBy = n.readBy.filter((x) => x !== user);
      this.emit("notification", "notification.unread", {id: n.id}, [user]);
      return ok(this.notificationView(n, user));
    }
    return fail(404, "Not a notification route");
  }

  // The data without file contents, for sessionStorage.
  snapshot() {
    return {...this.db, files: this.db.files.map(({blob, url, ...f}) => f)};
  }
}

// An EventSource for the mock streams: it delivers the backend's events for the ticket's user.
export function mockEventSource(backend, NativeEventSource) {
  return class MockEventSource extends EventTarget {
    constructor(url, init) {
      super();
      if (!String(url).startsWith(MOCK_ORIGIN)) return new NativeEventSource(url, init);
      this.url = url;
      this.readyState = 0;
      const ticket = backend.tickets.get(new URL(url).searchParams.get("ticket"));
      queueMicrotask(() => {
        if (!ticket) {
          this.readyState = 2;
          this.onerror?.(new Event("error"));
          return;
        }
        this.readyState = 1;
        this.onopen?.(new Event("open"));
        this.stop = backend.subscribe(ticket.service, ticket.user, ticket.roles, (event, data, id) => {
          if (this.readyState !== 1) return;
          this.dispatchEvent(new MessageEvent(event, {data, lastEventId: id}));
        });
      });
    }

    close() {
      this.readyState = 2;
      this.stop?.();
    }
  };
}
