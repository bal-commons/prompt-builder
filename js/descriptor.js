import {camel, identifier, newId, newIntegration} from "./state.js";

// Imports an existing integration from its Workflow Definition Descriptor (workflow.def.json, packed in every
// executable JAR the ballerina/workflow 0.10 compiler plugin builds: `unzip -p target/bin/<app>.jar workflow.def.json`).
// The descriptor has the structure (workflows, input and human task schemas, agents); roles, titles and other
// per-instance parameters live in code, so the user adds them.

const humanize = (name) => {
  const words = String(name).split(".").pop().replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim().toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : name;
};

// A JSON Schema property as a builder field. `lossy` marks what the descriptor couldn't describe exactly.
function field(name, schema, required) {
  const types = Array.isArray(schema?.type) ? schema.type.filter((t) => t !== "null") : [schema?.type];
  const type = types[0];
  const base = {name, label: humanize(name), required, imported: true};
  if (schema?.enum) return {...base, type: "choice", options: schema.enum.filter((v) => v !== null).map(String)};
  if (type === "boolean") return {...base, type: "boolean"};
  if (type === "integer") return {...base, type: "integer"};
  if (type === "number") return {...base, type: "number"};
  if (type === "string") return {...base, type: schema.format === "date" ? "date" : "string"};
  // Objects, arrays and unions the descriptor flags as lossy: keep the field as text so nothing is dropped.
  return {...base, type: "string", lossy: true};
}

function fieldsOf(schema) {
  const required = new Set(schema?.required ?? []);
  return Object.entries(schema?.properties ?? {}).map(([name, p]) => field(name, p, required.has(name)));
}

// A workflow's input is described as its parameter list: one record parameter becomes that record's fields.
function inputFields(input) {
  const props = input?.schema?.properties ?? {};
  const names = Object.keys(props);
  if (names.length === 1 && props[names[0]]?.type === "object") return fieldsOf(props[names[0]]);
  return fieldsOf(input?.schema);
}

// Returns {integration, notes} or {error}. `taken` are the integrations already in the design.
export function importDescriptor(text, taken) {
  let d;
  try {
    d = JSON.parse(text);
  } catch {
    return {error: "The file isn't JSON. Use the workflow.def.json inside the integration's JAR."};
  }
  if (!d?.descriptorVersion || !Array.isArray(d.workflows)) {
    return {error: "This isn't a workflow descriptor: it has no descriptorVersion or workflows."};
  }
  if (!String(d.descriptorVersion).startsWith("1.")) {
    return {error: `Descriptor version ${d.descriptorVersion} isn't supported; the builder reads version 1.x.`};
  }
  const notes = [];
  // Workflow IDs are global (components name them), so skip the ones other integrations use.
  const wfIds = taken.flatMap((i) => i.workflows.map((w) => w.id));
  const nextWf = () => {
    const id = newId("x", wfIds);
    wfIds.push(id);
    return id;
  };
  const workflows = d.workflows.map((w) => {
    const tasks = (w.humanTasks ?? []).map((t) => {
      const fields = fieldsOf(t.result?.schema);
      if (t.result?.lossy) notes.push(`${w.name}.${t.name}: some answer fields are typed loosely in the descriptor (kept as text).`);
      if (!t.result?.schema) notes.push(`${w.name}.${t.name}: the descriptor has no answer schema; add the fields by hand.`);
      return {name: camel(t.name), fixedName: t.name, title: humanize(t.name), description: "", roles: [], fields, imported: true};
    });
    return {id: nextWf(), kind: "workflow", name: w.name, fixedName: w.name, title: humanize(w.name), purpose: "", imported: true,
      input: inputFields(w.input), tasks, chat: false, uploads: false, steps: [], activities: [],
      approval: {on: false, activity: "", userRoles: [], adminRoles: []},
      reviewActivities: (w.reviewActivities ?? []).map((r) => r.name ?? r)};
  });
  for (const a of d.agents ?? []) {
    workflows.push({id: nextWf(), kind: "agent", name: a.name, fixedName: a.name, title: humanize(a.name), displayName: humanize(a.name), imported: true,
      purpose: "", greeting: "", chat: false, uploads: false, input: inputFields(a.input), steps: [], activities: [], tasks: [],
      approval: {on: false, activity: "", userRoles: [], adminRoles: []}});
  }
  if (workflows.some((w) => (w.tasks ?? []).length)) notes.push("Reviewer roles aren't in the descriptor (they're set in code): add them so the preview routes tasks to the right people.");
  const pkg = d.package ?? {};
  const integration = newIntegration(taken, {source: "existing", title: humanize(pkg.name ?? "integration"), org: pkg.org ?? "", pkg: identifier(pkg.name, "integration"),
    version: pkg.version ?? "", checksum: d.checksum ?? "", workflows});
  return {integration, notes};
}
