/**
 * Builds the form rules from the Zod payload schemas (BACKEND_SCHEMA §5.7, TRD §10.2). The result is one JSON document
 * with a JSON Schema and the cross-field conditions for every form type. It is written to src/content/form-rules.json
 * (read by the browser validator) and embedded in apps-script/Code.gs (read by the endpoint), so the page, the endpoint
 * and the Zod schemas cannot drift. `npm run form-rules` writes both; tests/unit/form-rules.test.ts checks they are
 * current and that all three agree on a set of fixtures.
 */
import { z } from "zod";
import { FORM_CONDITIONS, FORM_DATA, FORM_TYPES, type FormType } from "../../src/content/forms";
import type { FieldSchema, FormRules } from "../../src/lib/form-validate";

type Node = Record<string, unknown>;

/** Formats the validator checks itself; Zod also emits a long regex for them, which only bloats the rules. */
const BUILT_IN_FORMATS = new Set(["email", "uri", "date", "date-time"]);

function clean(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(clean);
  if (typeof node !== "object" || node === null) return node;
  const out: Node = {};
  for (const [key, value] of Object.entries(node as Node)) {
    if (key === "$schema" || key === "default" || key === "additionalProperties") continue;
    if (key === "pattern" && BUILT_IN_FORMATS.has(String((node as Node).format))) continue;
    out[key] = clean(value);
  }
  return out;
}

export function buildRules(): Record<FormType, FormRules> {
  const forms = {} as Record<FormType, FormRules>;
  for (const type of FORM_TYPES) {
    const schema = z.toJSONSchema(FORM_DATA[type], { io: "input", unrepresentable: "any" });
    forms[type] = {
      schema: clean(schema) as FieldSchema,
      conditions: FORM_CONDITIONS[type] ?? [],
    };
  }
  return forms;
}

export interface RulesFile {
  version: 1;
  forms: Record<FormType, FormRules>;
}

export function buildRulesFile(): RulesFile {
  return { version: 1, forms: buildRules() };
}

export const rulesJson = (file: RulesFile = buildRulesFile()) =>
  `${JSON.stringify(file, null, 2)}\n`;

export const RULES_BEGIN = "// <generated:rules> Do not edit: run `npm run form-rules`.";
export const RULES_END = "// </generated:rules>";

/** Replaces the generated block of Code.gs with the current rules. Throws if the markers are missing. */
export function embedRules(source: string, file: RulesFile = buildRulesFile()): string {
  const start = source.indexOf(RULES_BEGIN);
  const end = source.indexOf(RULES_END);
  if (start < 0 || end < start) {
    throw new Error(
      "apps-script/Code.gs has no generated rules block (see scripts/lib/form-rules.ts)",
    );
  }
  const literal = JSON.stringify(file, null, 2);
  return `${source.slice(0, start)}${RULES_BEGIN}\nconst RULES_ = ${literal};\n${source.slice(end)}`;
}
