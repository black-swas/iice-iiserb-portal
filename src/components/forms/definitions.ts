/**
 * The forms on the site, described as data and translated on the server (TRD §10.1). Each form lists its fields in order;
 * what a field accepts comes from the generated rules, and every word comes from messages/en.json (CLAUDE.md rule 8),
 * keyed by the field's dotted path: `forms.fields.applicant.email.label`. Server-only.
 */
import {
  CONTACT_TOPICS,
  ENGAGEMENTS,
  IP_STATUSES,
  LEGAL_ENTITIES,
  MENTORING_AREAS,
  PARTNERSHIP_TYPES,
  VENTURE_STAGES,
  type FormType,
} from "@/content/forms";
import {
  Affiliation,
  MentorType,
  Sector,
  StageSlug,
  TrackSlug,
  UserCategory,
  type SiteSettings,
} from "@/content/schema";
import { display } from "@/content/todo";
import { dynamicT, enumLabel, messageIfPresent, t, type EnumName } from "@/lib/i18n";
import type { FieldKind, Option, ResolvedField, ResolvedForm, ResolvedStep } from "./types";

type OptionGroup =
  | "contactTopic"
  | "ventureStage"
  | "legalEntity"
  | "ipStatus"
  | "mentoringArea"
  | "engagement"
  | "partnershipType"
  | "yesNo";

type OptionSource =
  | { enum: EnumName; values: readonly string[] }
  | { group: OptionGroup; values: readonly string[] }
  | { custom: readonly Option[] };

interface Spec {
  name: string;
  kind: FieldKind;
  options?: OptionSource;
  autoComplete?: string;
  inputMode?: ResolvedField["inputMode"];
  rows?: number;
  showWhen?: ResolvedField["showWhen"];
  valueHints?: Record<string, string>;
  fromQuery?: string;
}

const ENUM_VALUES = {
  sector: Sector.options,
  affiliation: Affiliation.options,
  mentorType: MentorType.options,
  userCategory: UserCategory.options,
  stage: StageSlug.options,
  track: TrackSlug.options,
} as const;

const optionsOf = (source: OptionSource): Option[] => {
  if ("custom" in source) return [...source.custom];
  if ("enum" in source)
    return source.values.map((value) => ({ value, label: enumLabel(source.enum, value) }));
  return source.values.map((value) => ({
    value,
    label: dynamicT(`forms.options.${source.group}.${value}`),
  }));
};

function resolve(spec: Spec): ResolvedField {
  const base = `forms.fields.${spec.name}`;
  const hint = messageIfPresent(`${base}.hint`);
  return {
    name: spec.name,
    kind: spec.kind,
    label: dynamicT(`${base}.label`),
    ...(hint ? { hint } : {}),
    ...(spec.options ? { options: optionsOf(spec.options) } : {}),
    ...(spec.autoComplete ? { autoComplete: spec.autoComplete } : {}),
    ...(spec.inputMode ? { inputMode: spec.inputMode } : {}),
    ...(spec.rows ? { rows: spec.rows } : {}),
    ...(spec.showWhen ? { showWhen: spec.showWhen } : {}),
    ...(spec.valueHints ? { valueHints: spec.valueHints } : {}),
    ...(spec.fromQuery ? { fromQuery: spec.fromQuery } : {}),
  };
}

const text = (name: string, extra: Partial<Spec> = {}): Spec => ({ name, kind: "text", ...extra });
const email = (name: string, extra: Partial<Spec> = {}): Spec => ({
  name,
  kind: "email",
  autoComplete: "email",
  ...extra,
});
const phone = (name: string): Spec => ({
  name,
  kind: "tel",
  autoComplete: "tel",
  inputMode: "tel",
});
const url = (name: string): Spec => ({ name, kind: "url", inputMode: "url" });
const area = (name: string, rows?: number): Spec => ({
  name,
  kind: "textarea",
  ...(rows ? { rows } : {}),
});
const select = (name: string, options: OptionSource, extra: Partial<Spec> = {}): Spec => ({
  name,
  kind: "select",
  options,
  ...extra,
});
const radio = (name: string, options: OptionSource, extra: Partial<Spec> = {}): Spec => ({
  name,
  kind: "radio",
  options,
  ...extra,
});
const checks = (name: string, options: OptionSource): Spec => ({
  name,
  kind: "checkboxes",
  options,
});
const yesNo: OptionSource = { group: "yesNo", values: ["true", "false"] };

const step = (id: string, specs: Spec[], extra: Partial<ResolvedStep> = {}): ResolvedStep => {
  const lead = messageIfPresent(`forms.steps.${id}.lead`);
  return {
    id,
    title: messageIfPresent(`forms.steps.${id}.title`) ?? "",
    ...(lead ? { description: lead } : {}),
    fields: specs.map(resolve),
    ...extra,
  };
};

/** A bookable facility or instrument, as the booking form lists it. */
export interface BookingTarget {
  slug: string;
  name: string;
}

export interface FormOptions {
  site: SiteSettings;
  /** Contact: which topic to start on. */
  topic?: string | undefined;
  /** Application: the engagement tracks, funding schemes and stages that exist. Absent lists leave the field out. */
  tracks?: readonly BookingTarget[];
  schemes?: readonly BookingTarget[];
  facilities?: readonly BookingTarget[];
  instruments?: readonly BookingTarget[];
}

const TOPIC_INTENT: Record<string, string> = {
  incubation: "incubation",
  "birac-edge": "incubation",
  "partnership-funding": "partnerships-investors",
  "facilities-bookings": "facilities-bookings",
  media: "media",
  careers: "general",
  "event-invite": "general",
  other: "general",
};

/** "Incubation support: iice@iiserb.ac.in · +91 755 269 2384" for each topic that has a direct channel. */
function topicHints(site: SiteSettings): Record<string, string> {
  const hints: Record<string, string> = {};
  for (const [topic, intent] of Object.entries(TOPIC_INTENT)) {
    const channel = site.contactChannels.find((c) => c.intent === intent);
    if (!channel) continue;
    const contact = [channel.email, channel.phone].filter(Boolean).join(" · ");
    if (contact)
      hints[topic] = t("forms.contact.channel", { label: display(channel.label), contact });
  }
  return hints;
}

const custom = (items: readonly BookingTarget[]): OptionSource => ({
  custom: items.map((i) => ({ value: i.slug, label: i.name })),
});

export function buildForm(type: FormType, options: FormOptions): ResolvedForm {
  switch (type) {
    case "contact":
      return {
        type,
        defaults: options.topic ? { topic: options.topic } : {},
        steps: [
          step("contact", [
            text("name", { autoComplete: "name" }),
            email("email"),
            phone("phone"),
            text("organisation", { autoComplete: "organization" }),
            select(
              "topic",
              { group: "contactTopic", values: CONTACT_TOPICS },
              { valueHints: topicHints(options.site), fromQuery: "topic" },
            ),
            area("message", 6),
          ]),
        ],
      };

    case "pitch":
      return {
        type,
        defaults: {},
        steps: [
          step("pitch", [
            text("name", { autoComplete: "name" }),
            email("email"),
            text("ventureName"),
            area("oneLiner", 3),
            select("stage", { group: "ventureStage", values: VENTURE_STAGES }),
          ]),
        ],
      };

    case "application": {
      const mentorFor = { name: "applicant.affiliation", in: ["partner-university", "external"] };
      return {
        type,
        defaults: {},
        draftKey: "iice:apply:draft:v1",
        steps: [
          step("applicant", [
            ...(options.tracks?.length
              ? [select("context.track", custom(options.tracks), { fromQuery: "track" })]
              : []),
            select(
              "context.stage",
              { enum: "stage", values: ENUM_VALUES.stage },
              { fromQuery: "stage" },
            ),
            ...(options.schemes?.length
              ? [select("context.schemeSlug", custom(options.schemes), { fromQuery: "scheme" })]
              : []),
            text("applicant.name", { autoComplete: "name" }),
            email("applicant.email"),
            phone("applicant.phone"),
            select("applicant.affiliation", {
              enum: "affiliation",
              values: ENUM_VALUES.affiliation,
            }),
            text("applicant.institution", { autoComplete: "organization" }),
            text("applicant.iiserbMentor.name", { showWhen: mentorFor }),
            email("applicant.iiserbMentor.email", { showWhen: mentorFor }),
            text("applicant.iiserbMentor.department", { showWhen: mentorFor }),
            url("applicant.linkedin"),
          ]),
          step("venture", [
            text("venture.name"),
            radio("venture.incorporated", yesNo),
            select(
              "venture.legalEntity",
              { group: "legalEntity", values: LEGAL_ENTITIES },
              { showWhen: { name: "venture.incorporated", in: ["true"] } },
            ),
            {
              name: "venture.incorporationDate",
              kind: "date",
              showWhen: { name: "venture.incorporated", in: ["true"] },
            },
            url("venture.website"),
            select("venture.sector", { enum: "sector", values: ENUM_VALUES.sector }),
            select("venture.stage", { group: "ventureStage", values: VENTURE_STAGES }),
            area("venture.problem", 6),
            area("venture.solution", 6),
            area("venture.market", 5),
            { name: "venture.teamSize", kind: "number", inputMode: "numeric" },
            text("venture.fundingToDate"),
          ]),
          step("technology", [
            select("technology.ipStatus", { group: "ipStatus", values: IP_STATUSES }),
            radio("technology.developedAtIiserb", yesNo),
            area("technology.ipDetails", 5),
            { name: "technology.patentNumbers", kind: "list" },
            url("technology.ipDocsUrl"),
            url("documents.businessPlanUrl"),
          ]),
          step("needs", [
            select("needs.preferredStage", { enum: "stage", values: ENUM_VALUES.stage }),
            { name: "needs.officeSeats", kind: "number", inputMode: "numeric" },
            radio("needs.labSpace", yesNo),
            area("needs.equipment", 4),
            checks("needs.mentoringAreas", { group: "mentoringArea", values: MENTORING_AREAS }),
          ]),
          step(
            "submit",
            [
              { name: "declarations.infoAccurate", kind: "checkbox" },
              { name: "declarations.agreeToPolicy", kind: "checkbox" },
            ],
            { review: true },
          ),
        ],
      };
    }

    case "booking":
      return {
        type,
        defaults: {},
        steps: [
          step("booking", [
            text("name", { autoComplete: "name" }),
            email("email"),
            phone("phone"),
            text("organisation", { autoComplete: "organization" }),
            select("userCategory", { enum: "userCategory", values: ENUM_VALUES.userCategory }),
            ...(options.facilities?.length
              ? [select("facilitySlug", custom(options.facilities))]
              : []),
            ...(options.instruments?.length
              ? [select("instrumentSlug", custom(options.instruments))]
              : []),
            { name: "preferredDates.0", kind: "date" },
            { name: "preferredDates.1", kind: "date" },
            { name: "preferredDates.2", kind: "date" },
            text("durationEstimate"),
            area("sampleDetails", 4),
            area("notes", 3),
          ]),
        ],
      };

    case "mentor":
      return {
        type,
        defaults: {},
        steps: [
          step("mentor", [
            text("name", { autoComplete: "name" }),
            email("email"),
            phone("phone"),
            url("linkedin"),
            text("title", { autoComplete: "organization-title" }),
            text("organisation", { autoComplete: "organization" }),
            checks("types", { enum: "mentorType", values: ENUM_VALUES.mentorType }),
            checks("sectors", { enum: "sector", values: ENUM_VALUES.sector }),
            area("expertise", 5),
            checks("engagement", { group: "engagement", values: ENGAGEMENTS }),
            { name: "hoursPerMonth", kind: "number", inputMode: "numeric" },
          ]),
        ],
      };

    case "partner":
      return {
        type,
        defaults: {},
        steps: [
          step("partner", [
            text("name", { autoComplete: "name" }),
            text("designation", { autoComplete: "organization-title" }),
            text("organisation", { autoComplete: "organization" }),
            email("email"),
            phone("phone"),
            checks("partnershipType", { group: "partnershipType", values: PARTNERSHIP_TYPES }),
            checks("sectorFocus", { enum: "sector", values: ENUM_VALUES.sector }),
            text("fundsAvailable"),
            area("message", 5),
          ]),
        ],
      };

    case "newsletter":
      throw new Error(
        "The newsletter form has no page yet (BACKEND_SCHEMA §5.5d is a could-have).",
      );
  }
}
