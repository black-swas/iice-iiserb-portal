/**
 * Pure helpers that connect the form definitions to the generated rules: which fields are required, which are on screen,
 * and which words a violation gets. Kept apart from the React engine so they can be unit-tested.
 */
import {
  conditionApplies,
  toPayload,
  type FieldSchema,
  type FlatValues,
  type FormRules,
  type Violation,
} from "@/lib/form-validate";
import { fill } from "@/lib/forms";
import type { FormCopy, ResolvedField, ResolvedForm } from "./types";

/** The schema of the field at a dotted path (`preferredDates.0` finds the array's item schema). */
export function schemaFor(root: FieldSchema, name: string): FieldSchema | undefined {
  let node: FieldSchema | undefined = root;
  for (const segment of name.split(".")) {
    if (!node) return undefined;
    node = node.type === "array" && /^\d+$/.test(segment) ? node.items : node.properties?.[segment];
  }
  return node;
}

/**
 * Required by the schema alone. A field inside an optional object is optional, whatever its own rules say; the rule that
 * makes it required in some cases lives in the conditions (see `requiredNow`). Only the first item of an array that must
 * have items is required.
 */
export function requiredByRules(root: FieldSchema, name: string): boolean {
  let node: FieldSchema | undefined = root;
  for (const segment of name.split(".")) {
    if (!node) return false;
    if (node.type === "array" && /^\d+$/.test(segment)) {
      if (!(node.minItems && node.minItems >= 1) || segment !== "0") return false;
      node = node.items;
    } else {
      if (!node.required?.includes(segment)) return false;
      node = node.properties?.[segment];
    }
  }
  return true;
}

export interface Constraints {
  maxLength?: number;
  min?: number;
  max?: number;
}

/** Length and range limits the input should carry as attributes, read from the rules. */
export function constraintsFor(root: FieldSchema, name: string): Constraints {
  const schema = schemaFor(root, name);
  if (!schema) return {};
  return {
    ...(schema.maxLength !== undefined ? { maxLength: schema.maxLength } : {}),
    ...(schema.minimum !== undefined ? { min: schema.minimum } : {}),
    ...(schema.maximum !== undefined ? { max: schema.maximum } : {}),
  };
}

/** Whether the field is on screen: it has no `showWhen`, or the field it depends on holds one of the listed values. */
export function isVisible(field: ResolvedField, values: FlatValues): boolean {
  if (!field.showWhen) return true;
  const current = values[field.showWhen.name];
  return typeof current === "string" && field.showWhen.in.includes(current);
}

export function visibleFields(form: ResolvedForm, values: FlatValues): ResolvedField[] {
  return form.steps.flatMap((step) => step.fields).filter((field) => isVisible(field, values));
}

/** The values to send: everything the form holds except what is hidden, so an old answer in a hidden field is dropped. */
export function visibleValues(form: ResolvedForm, values: FlatValues): FlatValues {
  const out: FlatValues = {};
  for (const field of visibleFields(form, values)) {
    const value = values[field.name];
    if (value !== undefined) out[field.name] = value;
  }
  return out;
}

/** Required now: by the schema, or because a condition that currently applies names it (a mentor for an outside applicant). */
export function requiredNow(rules: FormRules, field: ResolvedField, values: FlatValues): boolean {
  if (requiredByRules(rules.schema, field.name)) return true;
  const payload = toPayload(rules.schema, values);
  return rules.conditions.some(
    (rule) => rule.require?.includes(field.name) && conditionApplies(rule, payload),
  );
}

/** The field a violation belongs to: the same path, a list field's item, or the first field of an object-level error. */
export function fieldForPath(
  fields: readonly ResolvedField[],
  path: string,
): ResolvedField | undefined {
  return (
    fields.find((f) => f.name === path) ??
    fields.find((f) => path.startsWith(`${f.name}.`)) ??
    fields.find((f) => f.name.startsWith(`${path}.`))
  );
}

/** The words for a violation, from the translated templates. */
export function messageFor(
  violation: Violation,
  field: ResolvedField | undefined,
  copy: FormCopy,
): string {
  const params = { field: field?.label ?? "", limit: violation.limit ?? "" };
  if (violation.code === "condition") {
    const known = violation.condition ? copy.errors.conditions[violation.condition] : undefined;
    return fill(known ?? violation.message ?? copy.errors.required, params);
  }
  if (violation.code === "pattern" && field?.kind === "tel") return fill(copy.errors.phone, params);
  // An unticked box that must be ticked is not "required", it is "tick this box".
  if (violation.code === "required" && field?.kind === "checkbox")
    return fill(copy.errors.mustAgree, params);
  return fill(copy.errors[violation.code], params);
}

export interface FieldError {
  field: ResolvedField;
  message: string;
}

/** Violations as messages by field name. Several violations on one field keep the first. */
export function errorsByField(
  violations: readonly Violation[],
  fields: readonly ResolvedField[],
  copy: FormCopy,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const violation of violations) {
    const field = fieldForPath(fields, violation.path);
    const key = field?.name ?? violation.path;
    if (!(key in errors)) errors[key] = messageFor(violation, field, copy);
  }
  return errors;
}
