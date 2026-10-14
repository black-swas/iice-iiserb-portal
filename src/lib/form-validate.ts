/**
 * The small validator shared by the browser and, in a hand-ported copy, by the Apps Script endpoint
 * (apps-script/Code.gs). It reads the JSON Schema subset that scripts/form-rules.ts generates from the Zod payload
 * schemas in src/content/forms.ts, so what the page checks, what the endpoint checks and what Zod checks are one rule
 * set. tests/unit/form-rules.test.ts runs the same fixtures through all three.
 *
 * Conventions both ports follow: strings are trimmed before any check; "" and null count as missing; an optional field
 * that is missing is skipped; a violation names the dotted path of the field (`applicant.email`, `preferredDates.0`).
 * Keep this file free of browser APIs and of syntax that Apps Script's V8 runtime lacks.
 */
import type { FormCondition } from "@/content/forms";

export interface FieldSchema {
  type?: "string" | "number" | "integer" | "boolean" | "array" | "object";
  format?: "email" | "uri" | "date" | "date-time";
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: readonly (string | number)[];
  const?: string | number | boolean;
  items?: FieldSchema;
  minItems?: number;
  maxItems?: number;
  properties?: Record<string, FieldSchema>;
  required?: readonly string[];
}

export interface FormRules {
  schema: FieldSchema;
  conditions: readonly FormCondition[];
}

export type ViolationCode =
  | "required"
  | "type"
  | "tooShort"
  | "tooLong"
  | "tooSmall"
  | "tooBig"
  | "number"
  | "integer"
  | "email"
  | "url"
  | "date"
  | "pattern"
  | "choice"
  | "mustAgree"
  | "tooFewItems"
  | "tooManyItems"
  | "condition";

export interface Violation {
  /** Dotted path of the field, e.g. `applicant.email` or `preferredDates.0`. */
  path: string;
  code: ViolationCode;
  /** The length, count or bound that was broken, for "at least {limit} characters". */
  limit?: number;
  /** For `condition`: the rule's code, e.g. `mentorRequired`. */
  condition?: string;
  /** For `condition`: the endpoint's English text. */
  message?: string;
}

const EMAIL =
  /^(?!\.)(?!.*\.\.)[A-Za-z0-9_'+\-.]*[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;
const HTTPS_URL = /^https:\/\/[^\s/$.?#][^\s]*$/i;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export function isMissing(value: unknown): boolean {
  return (
    value === undefined || value === null || (typeof value === "string" && value.trim() === "")
  );
}

function isRealDate(text: string): boolean {
  const m = DATE.exec(text);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function checkString(schema: FieldSchema, raw: string, path: string, out: Violation[]): void {
  const text = raw.trim();
  if (schema.enum && !schema.enum.includes(text)) {
    out.push({ path, code: "choice" });
    return;
  }
  if (schema.minLength !== undefined && text.length < schema.minLength)
    out.push({ path, code: "tooShort", limit: schema.minLength });
  if (schema.maxLength !== undefined && text.length > schema.maxLength)
    out.push({ path, code: "tooLong", limit: schema.maxLength });
  if (schema.format === "email" && !EMAIL.test(text)) out.push({ path, code: "email" });
  else if (schema.format === "uri" && !HTTPS_URL.test(text)) out.push({ path, code: "url" });
  else if (schema.format === "date" && !isRealDate(text)) out.push({ path, code: "date" });
  else if (schema.format === "date-time" && !DATE_TIME.test(text)) out.push({ path, code: "date" });
  else if (schema.pattern && !new RegExp(schema.pattern).test(text))
    out.push({ path, code: "pattern" });
}

function check(schema: FieldSchema, value: unknown, path: string, out: Violation[]): void {
  switch (schema.type) {
    case "string":
      if (typeof value !== "string") out.push({ path, code: "type" });
      else checkString(schema, value, path, out);
      return;
    case "number":
    case "integer": {
      if (typeof value !== "number" || Number.isNaN(value)) {
        out.push({ path, code: "number" });
        return;
      }
      if (schema.type === "integer" && !Number.isInteger(value))
        out.push({ path, code: "integer" });
      if (schema.minimum !== undefined && value < schema.minimum)
        out.push({ path, code: "tooSmall", limit: schema.minimum });
      if (schema.maximum !== undefined && value > schema.maximum)
        out.push({ path, code: "tooBig", limit: schema.maximum });
      return;
    }
    case "boolean":
      if (typeof value !== "boolean") out.push({ path, code: "type" });
      else if (schema.const !== undefined && value !== schema.const)
        out.push({ path, code: "mustAgree" });
      return;
    case "array": {
      if (!Array.isArray(value)) {
        out.push({ path, code: "type" });
        return;
      }
      if (schema.minItems !== undefined && value.length < schema.minItems)
        out.push({ path, code: "tooFewItems", limit: schema.minItems });
      if (schema.maxItems !== undefined && value.length > schema.maxItems)
        out.push({ path, code: "tooManyItems", limit: schema.maxItems });
      const items = schema.items;
      if (items)
        value.forEach((item, i) => {
          if (isMissing(item)) out.push({ path: `${path}.${i}`, code: "required" });
          else check(items, item, `${path}.${i}`, out);
        });
      return;
    }
    case "object": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        out.push({ path, code: "type" });
        return;
      }
      const record = value as Record<string, unknown>;
      const here = (key: string) => (path ? `${path}.${key}` : key);
      for (const key of schema.required ?? [])
        if (isMissing(record[key])) out.push({ path: here(key), code: "required" });
      for (const [key, child] of Object.entries(schema.properties ?? {}))
        if (!isMissing(record[key])) check(child, record[key], here(key), out);
      return;
    }
    default:
      return;
  }
}

/** The value at a dotted path of a nested payload, or undefined. */
export function getAt(payload: unknown, path: string): unknown {
  let node: unknown = payload;
  for (const part of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

function holds(payload: unknown, when: FormCondition["when"][number]): boolean {
  const value = getAt(payload, when.path);
  if (when.in) return (when.in as readonly unknown[]).includes(value);
  return value === when.equals;
}

/** True when every `when` clause of the rule holds for the payload, so the rule's requirements apply. */
export function conditionApplies(rule: FormCondition, payload: unknown): boolean {
  return rule.when.every((w) => holds(payload, w));
}

function checkConditions(
  conditions: readonly FormCondition[],
  payload: unknown,
  out: Violation[],
): void {
  for (const rule of conditions) {
    if (!conditionApplies(rule, payload)) continue;
    const base = { code: "condition" as const, condition: rule.code, message: rule.message };
    for (const path of rule.require ?? [])
      if (isMissing(getAt(payload, path))) out.push({ path, ...base });
    const any = rule.requireAny;
    if (any && any.every((path) => isMissing(getAt(payload, path))))
      out.push({ path: rule.errorPath, ...base });
  }
}

/**
 * Adds an empty object wherever the schema requires one and the payload has none, so that a form with nothing filled in
 * reports each missing field (`applicant.name`, `applicant.email`…) instead of one error for the whole `applicant` object.
 */
function withRequiredObjects(schema: FieldSchema, payload: unknown): unknown {
  if (schema.type !== "object") return payload;
  const record: Record<string, unknown> =
    typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? { ...(payload as Record<string, unknown>) }
      : {};
  for (const [key, child] of Object.entries(schema.properties ?? {})) {
    const present = !isMissing(record[key]);
    if (child.type === "object" && (present || schema.required?.includes(key)))
      record[key] = withRequiredObjects(child, record[key]);
  }
  return record;
}

/**
 * Every rule that the payload breaks, one violation per field (the first found wins). Empty means valid.
 * The page asks for `expandObjects`, to name every empty field; the endpoint reports a missing object once, as Zod does.
 */
export function validate(
  rules: FormRules,
  payload: unknown,
  options: { expandObjects?: boolean } = {},
): Violation[] {
  const found: Violation[] = [];
  const data = options.expandObjects ? withRequiredObjects(rules.schema, payload) : payload;
  check(rules.schema, data ?? {}, "", found);
  checkConditions(rules.conditions, data, found);
  const seen = new Set<string>();
  return found.filter((v) => (seen.has(v.path) ? false : (seen.add(v.path), true)));
}

/** Flat field values as a form holds them: text, a list of checked values, or a single checkbox. */
export type FlatValues = Record<string, string | string[] | boolean | undefined>;

function schemaAt(root: FieldSchema, segments: readonly string[]): FieldSchema | undefined {
  let node: FieldSchema | undefined = root;
  for (const segment of segments) {
    if (!node) return undefined;
    node = node.type === "array" && /^\d+$/.test(segment) ? node.items : node.properties?.[segment];
  }
  return node;
}

function coerce(schema: FieldSchema, raw: string | string[] | boolean | undefined): unknown {
  if (raw === undefined) return undefined;
  switch (schema.type) {
    case "boolean": {
      if (typeof raw === "boolean") return raw;
      const text = String(raw).trim().toLowerCase();
      if (text === "true" || text === "on" || text === "yes") return true;
      if (text === "false" || text === "off" || text === "no") return false;
      return undefined;
    }
    case "number":
    case "integer": {
      const text = String(raw).trim();
      if (text === "") return undefined;
      const n = Number(text);
      return Number.isFinite(n) ? n : text; // a non-number is kept as text so the validator can name it
    }
    case "array": {
      const parts = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[\n,]/) : [];
      const items = parts
        .map((part) => (schema.items ? coerce(schema.items, part) : part))
        .filter((item) => !isMissing(item));
      return items.length > 0 ? items : undefined;
    }
    default: {
      if (typeof raw === "boolean") return raw;
      const text = Array.isArray(raw) ? raw.join(", ") : raw.trim();
      return text === "" ? undefined : text;
    }
  }
}

function setAt(target: Record<string, unknown>, segments: readonly string[], value: unknown): void {
  let node: Record<string, unknown> | unknown[] = target;
  segments.forEach((segment, i) => {
    const key = Array.isArray(node) ? Number(segment) : segment;
    if (i === segments.length - 1) {
      (node as Record<string | number, unknown>)[key] = value;
      return;
    }
    const next = segments[i + 1] as string;
    const existing = (node as Record<string | number, unknown>)[key];
    const child = existing ?? (/^\d+$/.test(next) ? [] : {});
    (node as Record<string | number, unknown>)[key] = child;
    node = child as Record<string, unknown> | unknown[];
  });
}

function compact(value: unknown): unknown {
  if (Array.isArray(value)) return value.filter((v) => v !== undefined).map(compact);
  if (typeof value === "object" && value !== null)
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, compact(v)]));
  return value;
}

/**
 * Turns flat field values (`{ "applicant.name": "Asha", "needs.officeSeats": "4" }`) into the nested, typed payload the
 * schema describes. Empty values are dropped, numbers and booleans are converted using the schema, and a field the
 * schema does not know is ignored. An object left empty is not sent.
 */
export function toPayload(schema: FieldSchema, flat: FlatValues): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(flat)) {
    const segments = key.split(".");
    const leaf = schemaAt(schema, segments);
    if (!leaf) continue;
    const value = coerce(leaf, raw);
    if (value !== undefined) setAt(out, segments, value);
  }
  return compact(out) as Record<string, unknown>;
}
