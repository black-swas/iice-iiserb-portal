/**
 * Builds the Decap CMS config (public/admin/config.yml) from the Zod schemas, so the editor can never offer a field
 * the schema rejects or omit one it requires (TRD §9, CLAUDE.md rule 7). `npm run cms:config` writes the file;
 * tests/unit/cms-config.test.ts walks the written file against the schemas and checks it is up to date.
 *
 * Collections edited by developers rather than editors stay out of the CMS: `pages` and `stages` (MDX, TRD §5).
 */
import YAML from "yaml";
import type { z } from "zod";
import messages from "../../messages/en.json";
import {
  collections,
  singletons,
  type CollectionKey,
  type SingletonKey,
} from "../../src/content/registry";
import { ENUMS } from "../../src/content/schema";

type Field = Record<string, unknown>;
type Schema = z.core.$ZodType;

// ── Zod introspection ──────────────────────────────────────────
interface Loose {
  def: { type: string; [key: string]: unknown };
  shape?: Record<string, Schema>;
  options?: readonly string[];
  minLength?: number | null;
  maxLength?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  isInt?: boolean;
  isOptional(): boolean;
}
const loose = (s: Schema) => s as unknown as Loose;

const WRAPPERS = new Set([
  "optional",
  "nullable",
  "default",
  "prefault",
  "readonly",
  "nonoptional",
]);

/** The schema under optional/nullable/default wrappers, and whether a missing value is acceptable. */
export function unwrapSchema(schema: Schema): { core: Schema; optional: boolean } {
  let core = schema;
  while (WRAPPERS.has(loose(core).def.type)) core = loose(core).def.innerType as Schema;
  return { core, optional: loose(schema).isOptional() };
}

const lengthBounds = (s: Schema) => {
  const checks = (loose(s).def.checks ?? []) as {
    _zod: { def: { check: string; minimum?: number; maximum?: number } };
  }[];
  const find = (kind: string) => checks.find((c) => c._zod.def.check === kind)?._zod.def;
  return { min: find("min_length")?.minimum, max: find("max_length")?.maximum };
};

// ── Naming ─────────────────────────────────────────────────────
const WORDS: Record<string, string> = {
  url: "URL",
  iiserb: "IISER Bhopal",
  ip: "IP",
  inr: "INR",
  cif: "CIF",
  gst: "GST",
  faq: "FAQ",
  og: "OG",
  id: "ID",
  iice: "IICE",
  pdf: "PDF",
  sq: "sq",
  ft: "ft",
};
const SOURCE_FIELDS: Record<string, string> = {
  _status: "Unconfirmed",
  _note: "What needs confirming",
  _source: "Source",
};

export function labelFor(name: string): string {
  if (SOURCE_FIELDS[name]) return SOURCE_FIELDS[name];
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => WORDS[w.toLowerCase()] ?? w.toLowerCase());
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Fields whose text is long enough to need a multi-line box, whatever its length limit. */
const TEXT_FIELDS = new Set([
  "description",
  "summary",
  "intro",
  "text",
  "long",
  "quote",
  "bio",
  "message",
  "problem",
  "approach",
  "outcome",
  "howToApply",
  "howToEngage",
  "bookingNotes",
  "a",
  "detail",
  "_note",
  "body",
  "blurb",
  "subcopy",
]);

const HINTS: Record<string, string> = {
  _status:
    "Set while any value in this entry is unconfirmed. Clear it once IICE has confirmed everything.",
  _note: "What to confirm, and with whom.",
  _source: "Where a fact came from, for example a document and its date.",
  draft: "Drafts are left out of the live site.",
  slug: "Lower-case words joined by hyphens. It must match the file name and cannot be changed later.",
  updatedAt: "Shown as 'Last updated'.",
};

/** A slug field and the collection it points to, for the relation picker. */
const RELATIONS: Record<string, CollectionKey> = {
  personSlug: "people",
  startupSlug: "startups",
  relatedStartupSlugs: "startups",
  employerStartupSlug: "startups",
  schemeSlug: "fundingSchemes",
  schemeSlugs: "fundingSchemes",
  seriesSlug: "eventSeries",
  partnerSlugs: "partners",
  facilitySlug: "facilities",
  faqGroup: "faqs",
  eventSlug: "events",
  relatedEventSlug: "events",
  supersededBy: "documents",
  relatedInstrumentSlugs: "instruments",
};

interface CollectionConfig {
  label: string;
  singular: string;
  /** The field that names an entry in lists and relation pickers. */
  title: string;
  summary: string;
  sortable: string[];
}

/** Collections editors manage. Everything else in the registry must appear in NOT_IN_CMS. */
export const CMS_COLLECTIONS: Partial<Record<CollectionKey, CollectionConfig>> = {
  announcements: {
    label: "Announcements",
    singular: "announcement",
    title: "text",
    summary: "{{text}}",
    sortable: ["startsAt", "expiresAt"],
  },
  startups: {
    label: "Startups",
    singular: "startup",
    title: "name",
    summary: "{{name}} · {{status}}",
    sortable: ["name", "cohortYear"],
  },
  events: {
    label: "Events",
    singular: "event",
    title: "title",
    summary: "{{title}} · {{startsAt}}",
    sortable: ["startsAt", "title"],
  },
  eventSeries: {
    label: "Event series",
    singular: "event series",
    title: "name",
    summary: "{{name}}",
    sortable: ["name"],
  },
  news: {
    label: "News",
    singular: "news post",
    title: "title",
    summary: "{{title}} · {{date}}",
    sortable: ["date", "title"],
  },
  press: {
    label: "In the news (press)",
    singular: "press item",
    title: "title",
    summary: "{{outlet}} · {{title}}",
    sortable: ["date", "outlet"],
  },
  documents: {
    label: "Documents",
    singular: "document",
    title: "title",
    summary: "{{title}} · {{category}}",
    sortable: ["title", "date"],
  },
  people: {
    label: "People",
    singular: "person",
    title: "name",
    summary: "{{name}}",
    sortable: ["name"],
  },
  mentors: {
    label: "Mentors",
    singular: "mentor",
    title: "personSlug",
    summary: "{{personSlug}} · {{organisation}}",
    sortable: ["personSlug"],
  },
  testimonials: {
    label: "Testimonials",
    singular: "testimonial",
    title: "name",
    summary: "{{name}} · {{role}}",
    sortable: ["name", "year"],
  },
  partners: {
    label: "Partners",
    singular: "partner",
    title: "name",
    summary: "{{name}} · {{category}}",
    sortable: ["name", "order"],
  },
  facilities: {
    label: "Facilities",
    singular: "facility",
    title: "name",
    summary: "{{name}} · {{category}}",
    sortable: ["name"],
  },
  instruments: {
    label: "Instruments",
    singular: "instrument",
    title: "name",
    summary: "{{name}} · {{category}}",
    sortable: ["name"],
  },
  services: {
    label: "Services",
    singular: "service",
    title: "name",
    summary: "{{name}}",
    sortable: ["name"],
  },
  jobs: {
    label: "Jobs",
    singular: "job",
    title: "title",
    summary: "{{title}} · closes {{closesAt}}",
    sortable: ["postedAt", "closesAt"],
  },
  faqs: {
    label: "FAQ groups",
    singular: "FAQ group",
    title: "title",
    summary: "{{title}}",
    sortable: ["title"],
  },
  fundingSchemes: {
    label: "Funding schemes",
    singular: "funding scheme",
    title: "name",
    summary: "{{name}} · {{provider}}",
    sortable: ["name"],
  },
  opportunities: {
    label: "Open calls",
    singular: "open call",
    title: "title",
    summary: "{{title}} · {{sponsor}}",
    sortable: ["title"],
  },
  tracks: {
    label: "Engagement tracks",
    singular: "track",
    title: "name",
    summary: "{{name}}",
    sortable: ["order"],
  },
};

/** Developer-owned MDX collections and the committees (edited as four fixed files). */
export const NOT_IN_CMS: CollectionKey[] = ["pages", "stages", "committees"];

const SINGLETON_LABELS: Record<SingletonKey, string> = {
  site: "Site settings",
  navigation: "Navigation",
  home: "Home page copy",
  stats: "Impact stats",
  ecosystemTiles: "Why IICE tiles",
  paths: "Choose your path cards",
  spotlight: "Startup spotlight",
  milestones: "Milestones",
  innovationClub: "Innovation Club",
};

// ── Field builders ─────────────────────────────────────────────
const enumKeyOf = (core: Schema) =>
  Object.entries(ENUMS).find(([, e]) => (e as unknown) === core)?.[0];

function selectOptions(core: Schema): { label: string; value: string }[] {
  const key = enumKeyOf(core);
  const labels = ((messages as { enums: Record<string, Record<string, string>> }).enums[
    key ?? ""
  ] ?? {}) as Record<string, string>;
  return (loose(core).options ?? []).map((value) => ({ label: labels[value] ?? value, value }));
}

function buildField(name: string, schema: Schema, parent?: string): Field | undefined {
  const { core, optional } = unwrapSchema(schema);
  const c = loose(core);
  const field: Field = { label: labelFor(name), name };
  if (optional) field.required = false;
  if (HINTS[name]) field.hint = HINTS[name];

  // Only a free slug becomes a relation picker; a closed enum (e.g. trackSlug) stays a select.
  const isSlugText =
    c.def.type === "string" ||
    (c.def.type === "array" &&
      loose(unwrapSchema(c.def.element as Schema).core).def.type === "string");
  const relation = isSlugText ? RELATIONS[name] : undefined;
  if (relation) {
    const target = CMS_COLLECTIONS[relation];
    if (!target)
      throw new Error(
        `cms-config: relation ${name} points at ${relation}, which is not in the CMS`,
      );
    const multiple = c.def.type === "array";
    return {
      ...field,
      widget: "relation",
      collection: relation,
      search_fields: [target.title],
      value_field: "slug",
      display_fields: [target.title],
      ...(multiple ? { multiple: true } : {}),
    };
  }

  switch (c.def.type) {
    case "string": {
      const format = c.def.format as string | undefined;
      if (format === "date") {
        return {
          ...field,
          widget: "datetime",
          format: "YYYY-MM-DD",
          date_format: "YYYY-MM-DD",
          time_format: false,
        };
      }
      if (format === "datetime") {
        return {
          ...field,
          widget: "datetime",
          format: "YYYY-MM-DDTHH:mm:ssZ",
          date_format: "YYYY-MM-DD",
          time_format: "HH:mm",
          picker_utc: false,
          hint: "Use Indian Standard Time (+05:30).",
        };
      }
      if (name === "src")
        return {
          ...field,
          widget: "image",
          hint: "Upload to content/media/uploads. No spaces in the file name; no GIFs.",
        };
      const max = c.maxLength ?? undefined;
      const long = TEXT_FIELDS.has(name) || (max !== undefined && max >= 150);
      const out: Field = { ...field, widget: long ? "text" : "string" };
      if (max !== undefined) {
        out.pattern = [`^[\\s\\S]{0,${max}}$`, `Up to ${max} characters`];
        out.hint = out.hint
          ? `${String(out.hint)} (up to ${max} characters)`
          : `Up to ${max} characters.`;
      }
      return out;
    }
    case "number": {
      const out: Field = { ...field, widget: "number", value_type: c.isInt ? "int" : "float" };
      if (c.minValue != null) out.min = c.minValue;
      if (c.maxValue != null) out.max = c.maxValue;
      return out;
    }
    case "boolean":
      return {
        ...field,
        widget: "boolean",
        default: (core as unknown as Loose).def.defaultValue ?? false,
      };
    case "enum":
      return { ...field, widget: "select", options: selectOptions(core) };
    case "literal": {
      const [value] = c.def.values as string[];
      if (name === "_status")
        return { ...field, widget: "select", options: [{ label: "Needs confirming", value }] };
      return { label: field.label, name, widget: "hidden", default: value };
    }
    case "array": {
      const element = loose(c.def.element as Schema);
      const { min, max } = lengthBounds(core);
      const bounds = {
        ...(min !== undefined ? { min } : {}),
        ...(max !== undefined ? { max } : {}),
      };
      const inner = unwrapSchema(c.def.element as Schema).core;
      const innerType = loose(inner).def.type;
      if (innerType === "enum")
        return {
          ...field,
          widget: "select",
          multiple: true,
          options: selectOptions(inner),
          ...bounds,
        };
      if (innerType === "string") return { ...field, widget: "list", ...bounds };
      if (innerType === "number") {
        return {
          ...field,
          widget: "list",
          field: { label: "Value", name: "value", widget: "number", value_type: "int" },
          ...bounds,
        };
      }
      if (innerType === "object")
        return { ...field, widget: "list", fields: objectFields(inner, name), ...bounds };
      if (
        element.def.type === "union" &&
        (element.def as { discriminator?: string }).discriminator
      ) {
        const du = element.def as unknown as { discriminator: string; options: Schema[] };
        return {
          ...field,
          widget: "list",
          typeKey: du.discriminator,
          types: du.options.map((option) => {
            const shape = loose(option).shape ?? {};
            const key = (
              loose(shape[du.discriminator] as Schema).def.values as string[]
            )[0] as string;
            return {
              label: labelFor(key),
              name: key,
              widget: "object",
              fields: objectFields(option, key, du.discriminator),
            };
          }),
          ...bounds,
        };
      }
      throw new Error(`cms-config: cannot edit a list of ${innerType} (${parent ?? ""}.${name})`);
    }
    case "object":
      return { ...field, widget: "object", fields: objectFields(core, name) };
    case "record": {
      const keys = loose(c.def.keyType as Schema).options ?? [];
      const valueShape = loose(c.def.valueType as Schema).shape ?? {};
      return {
        ...field,
        widget: "object",
        fields: keys.map((key) => ({
          label: labelFor(key),
          name: key,
          widget: "object",
          fields: Object.entries(valueShape)
            .map(([k, v]) => buildField(k, v, key))
            .filter(Boolean),
        })),
      };
    }
    case "union": {
      const options = c.def.options as Schema[];
      if (options.every((o) => loose(unwrapSchema(o).core).def.type === "string")) {
        return {
          ...field,
          widget: "string",
          hint: "A site path such as /apply/, an https:// link, mailto: or tel:.",
        };
      }
      throw new Error(`cms-config: cannot edit the union at ${parent ?? ""}.${name}`);
    }
    case "tuple":
      if (!optional)
        throw new Error(`cms-config: required tuple ${parent ?? ""}.${name} cannot be edited`);
      return undefined; // e.g. an image focal point: optional, set by a developer if ever needed
    default:
      throw new Error(
        `cms-config: unsupported schema type "${c.def.type}" at ${parent ?? ""}.${name}`,
      );
  }
}

function objectFields(schema: Schema, parent: string, skip?: string): Field[] {
  const shape = loose(schema).shape ?? {};
  return Object.entries(shape)
    .filter(([key]) => key !== skip)
    .map(([key, value]) => buildField(key, value, parent))
    .filter((f): f is Field => f !== undefined);
}

// ── Collections ────────────────────────────────────────────────
const SLUG_FIELD_PATTERN = ["^[a-z0-9]+(?:-[a-z0-9]+)*$", "Lower-case words joined by hyphens"];

function entryFields(key: CollectionKey): Field[] {
  const def = collections[key];
  const fields = objectFields(def.schema as Schema, key).map((f) =>
    f.name === "slug" && f.widget === "string" ? { ...f, pattern: SLUG_FIELD_PATTERN } : f,
  );
  if (def.format !== "json") {
    fields.push({ label: "Body", name: "body", widget: "markdown", required: false });
  }
  return fields;
}

function folderCollection(key: CollectionKey, cfg: CollectionConfig): Field {
  const def = collections[key];
  return {
    name: key,
    label: cfg.label,
    label_singular: cfg.singular,
    folder: `content/${def.dir}`,
    extension: def.format,
    format: def.format === "json" ? "json" : "frontmatter",
    create: true,
    slug: "{{fields.slug}}",
    identifier_field: cfg.title,
    summary: cfg.summary,
    sortable_fields: cfg.sortable,
    fields: entryFields(key),
  };
}

export function buildCmsConfig(): Field {
  const folderCollections = (Object.keys(collections) as CollectionKey[])
    .filter((key) => CMS_COLLECTIONS[key])
    .map((key) => folderCollection(key, CMS_COLLECTIONS[key] as CollectionConfig));

  const committeeFiles = {
    name: "committees",
    label: "Committees",
    delete: false,
    files: (["managing", "executive", "technical-evaluation", "management-advisory"] as const).map(
      (slug) => ({
        name: slug,
        label: labelFor(slug),
        file: `content/committees/${slug}.json`,
        fields: objectFields(collections.committees.schema as Schema, "committees"),
      }),
    ),
  };

  const settingsFiles = {
    name: "settings",
    label: "Site content",
    delete: false,
    files: (Object.keys(singletons) as SingletonKey[]).map((key) => ({
      name: key,
      label: SINGLETON_LABELS[key],
      file: `content/${singletons[key].file}`,
      fields: objectFields(singletons[key].schema as Schema, key),
    })),
  };

  return {
    // Placeholder until the hosting and auth decision (SRD Q3): the repo and the OAuth route depend on it.
    backend: { name: "github", repo: "black-swas/IICE-project", branch: "main" },
    local_backend: true,
    publish_mode: "editorial_workflow",
    media_folder: "content/media/uploads",
    public_folder: "media/uploads",
    locale: "en",
    collections: [...folderCollections, committeeFiles, settingsFiles],
  };
}

export const CMS_CONFIG_HEADER =
  "# Generated by `npm run cms:config` from src/content/schema.ts. Do not edit by hand: change the schema or\n" +
  "# scripts/lib/cms-config.ts and regenerate. tests/unit/cms-config.test.ts fails if this file drifts.\n";

export function buildCmsConfigYaml(): string {
  // No YAML anchors or aliases: Decap's loader is not guaranteed to resolve them.
  return (
    CMS_CONFIG_HEADER +
    YAML.stringify(buildCmsConfig(), { lineWidth: 0, aliasDuplicateObjects: false })
  );
}
