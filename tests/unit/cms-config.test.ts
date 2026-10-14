/**
 * CMS-drift test (TRD §9, CLAUDE.md rule 7): public/admin/config.yml must match the Zod schemas field for field.
 * The file is generated, so this checks two things independently: the committed file is up to date, and a separate
 * walk over the parsed YAML finds no field the schema lacks, no required field missing, and no wrong requiredness.
 */
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { z } from "zod";
import { describe, expect, it } from "vitest";
import {
  collectionKeys,
  collections,
  singletonKeys,
  singletons,
  type CollectionKey,
} from "@/content/registry";
import { CommitteeSlug, MediaPath } from "@/content/schema";
import {
  CMS_COLLECTIONS,
  NOT_IN_CMS,
  buildCmsConfigYaml,
  unwrapSchema,
} from "../../scripts/lib/cms-config";
import { ROOT } from "./helpers";

type Schema = z.core.$ZodType;
interface CmsField {
  name: string;
  widget?: string;
  required?: boolean;
  options?: { value: string }[];
  fields?: CmsField[];
  types?: { name: string; fields: CmsField[] }[];
  typeKey?: string;
  multiple?: boolean;
  collection?: string;
  search_fields?: string[];
  [key: string]: unknown;
}
interface CmsCollection {
  name: string;
  folder?: string;
  extension?: string;
  format?: string;
  files?: { name: string; file: string; fields: CmsField[] }[];
  fields?: CmsField[];
  identifier_field?: string;
}

const configPath = path.join(ROOT, "public", "admin", "config.yml");
const configText = fs.readFileSync(configPath, "utf8");
const config = YAML.parse(configText) as { collections: CmsCollection[]; [key: string]: unknown };

// ── The walk ───────────────────────────────────────────────────
interface Def {
  type: string;
  [key: string]: unknown;
}
const def = (s: Schema) => (s as unknown as { def: Def }).def;
const shapeOf = (s: Schema) => (s as unknown as { shape?: Record<string, Schema> }).shape ?? {};
const optionsOf = (s: Schema) => (s as unknown as { options?: string[] }).options ?? [];
const elementOf = (s: Schema) => unwrapSchema(def(s).element as Schema).core;

function checkFields(
  fields: CmsField[],
  objectSchema: Schema,
  where: string,
  opts: { body?: boolean; skip?: string } = {},
): string[] {
  const problems: string[] = [];
  const shape = shapeOf(objectSchema);
  const seen = new Set<string>();

  for (const f of fields) {
    const at = `${where}.${f.name}`;
    seen.add(f.name);
    if (opts.body && f.name === "body") {
      if (f.widget !== "markdown") problems.push(`${at}: body must be a markdown widget`);
      continue;
    }
    const fieldSchema = shape[f.name];
    if (!fieldSchema) {
      problems.push(`${at}: not in the schema`);
      continue;
    }
    const { core, optional } = unwrapSchema(fieldSchema);
    const type = def(core).type;

    if ((f.required !== false) === optional) {
      problems.push(
        `${at}: the schema says ${optional ? "optional" : "required"} but the CMS says ${f.required === false ? "optional" : "required"}`,
      );
    }

    switch (f.widget) {
      case "select": {
        const source = type === "array" ? elementOf(core) : core;
        const expected =
          def(source).type === "literal" ? (def(source).values as string[]) : optionsOf(source);
        const actual = (f.options ?? []).map((o) => o.value);
        if (JSON.stringify([...actual].sort()) !== JSON.stringify([...expected].sort())) {
          problems.push(`${at}: options [${actual}] differ from the schema's [${expected}]`);
        }
        if ((type === "array") !== (f.multiple === true))
          problems.push(`${at}: multiple must match an array in the schema`);
        break;
      }
      case "relation": {
        const target = config.collections.find((c) => c.name === f.collection);
        if (!target) problems.push(`${at}: relation to unknown collection ${String(f.collection)}`);
        else {
          const targetSchema = collections[f.collection as CollectionKey].schema as Schema;
          for (const field of f.search_fields ?? []) {
            if (!shapeOf(targetSchema)[field])
              problems.push(`${at}: search field ${field} is not in ${f.collection}`);
          }
        }
        if (!["string", "array"].includes(type))
          problems.push(`${at}: a relation needs a string or list of strings`);
        break;
      }
      case "list": {
        if (type !== "array") {
          problems.push(`${at}: a list needs an array in the schema`);
          break;
        }
        const inner = elementOf(core);
        if (f.types) {
          const du = def(def(core).element as Schema) as {
            discriminator?: string;
            options?: Schema[];
          };
          if (f.typeKey !== du.discriminator)
            problems.push(
              `${at}: typeKey ${String(f.typeKey)} differs from ${String(du.discriminator)}`,
            );
          const names = new Set(f.types.map((t) => t.name));
          for (const option of du.options ?? []) {
            const value = (
              def(shapeOf(option)[du.discriminator as string] as Schema).values as string[]
            )[0] as string;
            const t = f.types.find((x) => x.name === value);
            if (!t) problems.push(`${at}: no type for "${value}"`);
            else
              problems.push(
                ...checkFields(t.fields, option, `${at}<${value}>`, { skip: du.discriminator }),
              );
            names.delete(value);
          }
          for (const extra of names) problems.push(`${at}: type "${extra}" is not in the schema`);
        } else if (f.fields) {
          if (def(inner).type !== "object")
            problems.push(`${at}: sub-fields need an object element`);
          else problems.push(...checkFields(f.fields, inner, `${at}[]`));
        } else if (!["string", "number"].includes(def(inner).type)) {
          problems.push(`${at}: a plain list needs string or number elements`);
        }
        break;
      }
      case "object": {
        if (type === "record") {
          const keys = optionsOf(def(core).keyType as Schema);
          const valueSchema = def(core).valueType as Schema;
          const present = (f.fields ?? []).map((x) => x.name);
          for (const key of keys)
            if (!present.includes(key)) problems.push(`${at}: missing section ${key}`);
          for (const sub of f.fields ?? []) {
            if (!keys.includes(sub.name))
              problems.push(`${at}.${sub.name}: not a key of the schema record`);
            else problems.push(...checkFields(sub.fields ?? [], valueSchema, `${at}.${sub.name}`));
          }
        } else if (type !== "object") {
          problems.push(`${at}: an object widget needs an object in the schema`);
        } else {
          problems.push(...checkFields(f.fields ?? [], core, at));
        }
        break;
      }
      case "datetime":
        if (type !== "string" || !["date", "datetime"].includes(def(core).format as string)) {
          problems.push(`${at}: a datetime widget needs an ISO date or datetime`);
        }
        break;
      case "number":
        if (type !== "number") problems.push(`${at}: a number widget needs a number`);
        break;
      case "boolean":
        if (type !== "boolean") problems.push(`${at}: a boolean widget needs a boolean`);
        break;
      case "image":
        if (f.name !== "src" || type !== "string")
          problems.push(`${at}: the image widget is only for a media src string`);
        break;
      case "hidden":
        if (type !== "literal") problems.push(`${at}: a hidden widget is only for a fixed literal`);
        break;
      case "string":
      case "text":
        if (type !== "string" && type !== "union")
          problems.push(`${at}: a text widget needs a string`);
        break;
      default:
        problems.push(`${at}: unexpected widget ${String(f.widget)}`);
    }
  }

  for (const [key, schema] of Object.entries(shape)) {
    if (key === opts.skip || seen.has(key)) continue;
    if (!unwrapSchema(schema).optional)
      problems.push(`${where}.${key}: required by the schema but missing from the CMS`);
  }
  return problems;
}

const collectionByName = (name: string) =>
  config.collections.find((c) => c.name === name) as CmsCollection;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// ── Tests ──────────────────────────────────────────────────────
describe("public/admin/config.yml", () => {
  it("is exactly what `npm run cms:config` generates", () => {
    expect(configText).toBe(buildCmsConfigYaml());
  });

  it("uses no YAML anchors or aliases", () => {
    expect(configText).not.toMatch(/^\s*[\w-]*:?\s*[&*]a\d+/m);
  });

  it("covers every collection: in the CMS, or listed as developer-owned", () => {
    const names = new Set(config.collections.map((c) => c.name));
    for (const key of collectionKeys) {
      const covered = names.has(key) || NOT_IN_CMS.includes(key) || key === "committees";
      expect(covered, `${key} is neither in the CMS nor in NOT_IN_CMS`).toBe(true);
    }
    expect(
      Object.keys(CMS_COLLECTIONS).every((k) => collectionKeys.includes(k as CollectionKey)),
    ).toBe(true);
    expect(new Set(config.collections.map((c) => c.name)).size).toBe(config.collections.length);
  });

  it("points media uploads at paths the Image schema accepts", () => {
    expect(config.media_folder).toBe(`content/${String(config.public_folder)}`);
    expect(MediaPath.safeParse(`${String(config.public_folder)}/photo.jpg`).success).toBe(true);
    expect(config.publish_mode).toBe("editorial_workflow");
  });

  describe.each(collectionKeys.filter((k) => CMS_COLLECTIONS[k]))("collection %s", (key) => {
    const cms = collectionByName(key);
    const def = collections[key];

    it("reads the same folder, extension and format as the loaders", () => {
      expect(cms.folder).toBe(`content/${def.dir}`);
      expect(cms.extension).toBe(def.format);
      expect(cms.format).toBe(def.format === "json" ? "json" : "frontmatter");
    });

    it("names entries by a field the schema has", () => {
      expect(shapeOf(def.schema as Schema)).toHaveProperty(cms.identifier_field as string);
    });

    it("mirrors the schema field for field", () => {
      const problems = checkFields(cms.fields ?? [], def.schema as Schema, key, {
        body: def.format !== "json",
      });
      expect(problems).toEqual([]);
    });
  });

  it("mirrors every singleton file, at the path the loaders read", () => {
    const settings = collectionByName("settings");
    for (const key of singletonKeys) {
      const entry = settings.files?.find((f) => f.name === key);
      expect(entry, `singleton ${key} is not in the CMS`).toBeDefined();
      expect(entry?.file).toBe(`content/${singletons[key].file}`);
      expect(checkFields(entry?.fields ?? [], singletons[key].schema as Schema, key)).toEqual([]);
    }
  });

  it("offers each committee as a fixed file, never as a new entry", () => {
    const committees = collectionByName("committees");
    expect(committees.files?.map((f) => f.name)).toEqual(CommitteeSlug.options);
    for (const file of committees.files ?? []) {
      expect(file.file).toBe(`content/committees/${file.name}.json`);
      expect(checkFields(file.fields, collections.committees.schema as Schema, file.name)).toEqual(
        [],
      );
    }
  });
});

describe("the drift check itself", () => {
  const startups = () => clone(collectionByName("startups").fields as CmsField[]);
  const check = (fields: CmsField[]) =>
    checkFields(fields, collections.startups.schema as Schema, "startups", { body: true });

  it("passes on the real config", () => {
    expect(check(startups())).toEqual([]);
  });

  it("catches a field that is not in the schema", () => {
    const fields = startups();
    fields.push({ name: "twitterHandle", widget: "string" });
    expect(check(fields)).toContain("startups.twitterHandle: not in the schema");
  });

  it("catches a required field removed from the CMS", () => {
    const fields = startups().filter((f) => f.name !== "oneLiner");
    expect(check(fields)).toContain(
      "startups.oneLiner: required by the schema but missing from the CMS",
    );
  });

  it("catches an optional field made required, and a required one made optional", () => {
    const made = startups();
    delete made.find((f) => f.name === "legalName")!.required;
    expect(
      check(made).some((p) => p.startsWith("startups.legalName: the schema says optional")),
    ).toBe(true);
    const loosened = startups();
    loosened.find((f) => f.name === "name")!.required = false;
    expect(
      check(loosened).some((p) => p.startsWith("startups.name: the schema says required")),
    ).toBe(true);
  });

  it("catches an enum option the schema does not allow, or one it dropped", () => {
    const extra = startups();
    extra.find((f) => f.name === "status")!.options!.push({ value: "thriving" });
    expect(check(extra).some((p) => p.includes("startups.status: options"))).toBe(true);
    const dropped = startups();
    dropped.find((f) => f.name === "status")!.options!.pop();
    expect(check(dropped).some((p) => p.includes("startups.status: options"))).toBe(true);
  });

  it("catches a widget of the wrong kind for the schema type", () => {
    const fields = startups();
    fields.find((f) => f.name === "cohortYear")!.widget = "boolean";
    expect(check(fields)).toContain("startups.cohortYear: a boolean widget needs a boolean");
  });

  it("catches a nested field missing inside a list of objects", () => {
    const fields = startups();
    const founders = fields.find((f) => f.name === "founders")!;
    founders.fields = founders.fields!.filter((f) => f.name !== "name");
    expect(check(fields)).toContain(
      "startups.founders[].name: required by the schema but missing from the CMS",
    );
  });

  it("catches a missing variant in a typed list", () => {
    const stats = clone(
      collectionByName("settings").files!.find((f) => f.name === "stats")!.fields,
    );
    stats[0]!.types = stats[0]!.types!.filter((t) => t.name !== "derived");
    expect(checkFields(stats, singletons.stats.schema as Schema, "stats")).toContain(
      'stats.items: no type for "derived"',
    );
  });
});
