import {camel} from "./state.js";

// Contracts shared by the preview's mock services and the generators, so the preview behaves like the generated app.

export const fieldName = (field) => camel(field.name || field.label || "field");

export const choices = (field) => (field.options ?? []).map((o) => String(o).trim()).filter(Boolean);

// The JSON Schema a start form renders: the builder writes it, so it carries titles and formats.
export function startInputSchema(fields) {
  const properties = {};
  for (const f of fields) {
    const p = {title: f.label || f.name};
    p.type = f.type === "number" || f.type === "integer" || f.type === "boolean" ? f.type : "string";
    if (f.type === "date") p.format = "date";
    if (f.type === "text") p.format = "textarea";
    if (f.type === "choice") p.enum = choices(f);
    properties[fieldName(f)] = p;
  }
  return {type: "object", required: fields.filter((f) => f.required).map(fieldName), properties};
}

// The form schema workflow 0.10.0 generates for a human task from its answer record type (see code.js): no titles
// or formats, optional fields as a ["<type>", "null"] union, a union of string literals as an enum.
export function taskFormSchema(fields) {
  const properties = {};
  for (const f of fields) {
    const type = f.type === "number" ? "number" : f.type === "integer" ? "integer" : f.type === "boolean" ? "boolean" : "string";
    const p = {type: f.required ? type : [type, "null"]};
    if (f.type === "choice" && choices(f).length) p.enum = choices(f);
    properties[fieldName(f)] = p;
  }
  return {type: "object", properties, required: fields.filter((f) => f.required).map(fieldName)};
}

// A value of the right type for a field, for sample data.
export function sampleValue(field, index = 0) {
  switch (field.type) {
    case "number": return 120 + index * 35.5;
    case "integer": return 3 + index;
    case "boolean": return index % 2 === 0;
    case "date": return "2026-10-0" + ((index % 8) + 1);
    case "choice": return choices(field)[index % Math.max(1, choices(field).length)] ?? "";
    case "text": return "Sample details for the preview.";
    default: return `Sample ${(field.label || field.name || "value").toLowerCase()}`;
  }
}

// Checks a submitted answer against a task schema, as the workflow runtime does before it accepts the result.
export function validateAnswer(schema, values) {
  const missing = (schema.required ?? []).filter((name) => values?.[name] === undefined || values?.[name] === null || values?.[name] === "");
  if (missing.length) return `Missing required field${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`;
  for (const [name, p] of Object.entries(schema.properties ?? {})) {
    const value = values?.[name];
    if (value === undefined || value === null) continue;
    const type = Array.isArray(p.type) ? p.type[0] : p.type;
    if ((type === "number" || type === "integer") && typeof value !== "number") return `${name} must be a number`;
    if (type === "boolean" && typeof value !== "boolean") return `${name} must be true or false`;
    if (p.enum && !p.enum.includes(value)) return `${name} must be one of ${p.enum.join(", ")}`;
  }
  return undefined;
}
