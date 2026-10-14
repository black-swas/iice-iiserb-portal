/**
 * Form payload contracts (BACKEND_SCHEMA §5, TRD §10): the one definition of what each form may send. The page
 * engine, the endpoint rules in apps-script/Code.gs and the tests all derive from these schemas.
 * `scripts/form-rules.ts` turns them into src/content/form-rules.json, which the browser validator and the Apps Script
 * endpoint share, so the three cannot drift. Server and test code only: the browser never imports Zod.
 *
 * Deviations from BACKEND_SCHEMA, with reasons (see also memory: content-schema-deviations):
 *  - PitchData `sector` and `affiliation` are optional. SPEC §3 #13 asks for a short pitch band (name, email, venture,
 *    one-liner, stage); requiring two more selects would make the form longer than the spec's own design.
 *  - The application page does not offer the repeated `venture.team` rows: a team-size number and the free-text
 *    sections carry the same information without a repeating-group editor. The field stays in the schema (optional).
 */
import { z } from "zod";
import {
  Affiliation,
  Email,
  ExternalUrl,
  IsoDate,
  MentorType,
  Sector,
  Slug,
  StageSlug,
  TrackSlug,
  UserCategory,
} from "./schema";

export const FORM_TYPES = [
  "contact",
  "pitch",
  "application",
  "mentor",
  "partner",
  "booking",
  "newsletter",
] as const;
export type FormType = (typeof FORM_TYPES)[number];

/** What a venture has built so far: the same five values on the pitch and application forms. */
export const VENTURE_STAGES = [
  "idea",
  "proof-of-concept",
  "prototype",
  "early-revenue",
  "scaling",
] as const;

export const CONTACT_TOPICS = [
  "incubation",
  "partnership-funding",
  "mentoring",
  "facilities-bookings",
  "media",
  "careers",
  "birac-edge",
  "event-invite",
  "other",
] as const;

export const ASSISTANCE = [
  "incubation-space",
  "lab-access",
  "mentoring",
  "funding",
  "ip-legal",
  "market-access",
] as const;
export const LEGAL_ENTITIES = [
  "pvt-ltd",
  "llp",
  "partnership",
  "proprietorship",
  "section-8",
  "not-yet",
] as const;
export const IP_STATUSES = ["none", "in-preparation", "filed", "granted", "licensed-in"] as const;
export const MENTORING_AREAS = [
  "technical",
  "business",
  "ip-legal",
  "regulatory",
  "fundraising",
  "marketing",
] as const;
export const ENGAGEMENTS = [
  "one-to-one",
  "workshops",
  "jury-evaluation",
  "office-hours",
  "investor-connect",
] as const;
export const PARTNERSHIP_TYPES = [
  "co-invest",
  "csr",
  "sponsor-challenge",
  "pilot-customer",
  "academic",
  "mentor-network",
  "other",
] as const;
export const NEWSLETTER_INTERESTS = ["calls", "events", "news"] as const;

/** An Indian or international phone number as people type it: +91 755 269 2384, 0755-2692384. */
export const PHONE_PATTERN = /^[+\d][\d\s-]{7,17}$/;
const Phone = z.string().regex(PHONE_PATTERN);

const Name = z.string().trim().min(2).max(100);

export const FormEnvelope = z.object({
  formType: z.enum(FORM_TYPES),
  schemaVersion: z.literal(1),
  submittedAt: z.iso.datetime({ offset: true }).optional(),
  startedAt: z.iso.datetime({ offset: true }).optional(),
  pageUrl: z.url(),
  locale: z.enum(["en", "hi"]).default("en"),
  website: z.string().max(0), // honeypot: a person leaves it empty
  consent: z.literal(true),
  data: z.unknown(),
});

export const ContactData = z.object({
  name: Name,
  email: Email,
  phone: Phone.optional(),
  organisation: z.string().max(120).optional(),
  topic: z.enum(CONTACT_TOPICS),
  message: z.string().trim().min(20).max(3000),
});

export const PitchData = z.object({
  name: Name,
  email: Email,
  phone: Phone.optional(),
  ventureName: z.string().trim().min(2).max(100),
  oneLiner: z.string().trim().min(20).max(200),
  stage: z.enum(VENTURE_STAGES),
  sector: Sector.optional(),
  affiliation: Affiliation.optional(),
  assistanceSought: z.array(z.enum(ASSISTANCE)).default([]),
  deckUrl: ExternalUrl.optional(), // never block a pitch for lack of a deck
});

export const ApplicationData = z
  .object({
    context: z
      .object({
        track: TrackSlug.optional(),
        stage: StageSlug.optional(),
        schemeSlug: Slug.optional(),
        opportunitySlug: Slug.optional(),
      })
      .default({}),
    applicant: z.object({
      name: Name,
      email: Email,
      phone: Phone,
      affiliation: Affiliation,
      institution: z.string().max(160).optional(),
      iiserbMentor: z
        .object({ name: z.string().min(2), email: Email, department: z.string().optional() })
        .optional(),
      linkedin: ExternalUrl.optional(),
    }),
    venture: z.object({
      name: z.string().min(2).max(100),
      incorporated: z.boolean(),
      legalEntity: z.enum(LEGAL_ENTITIES).optional(),
      incorporationDate: IsoDate.optional(),
      website: ExternalUrl.optional(),
      sector: Sector,
      stage: z.enum(VENTURE_STAGES),
      problem: z.string().min(50).max(1500),
      solution: z.string().min(50).max(1500),
      market: z.string().min(30).max(1500),
      teamSize: z.number().int().min(1).max(500),
      team: z
        .array(z.object({ name: z.string(), role: z.string(), email: Email.optional() }))
        .max(10)
        .default([]),
      fundingToDate: z.string().max(300).optional(),
    }),
    technology: z.object({
      ipStatus: z.enum(IP_STATUSES),
      developedAtIiserb: z.boolean(),
      ipDetails: z.string().max(1500).optional(),
      patentNumbers: z.array(z.string().max(40)).max(10).default([]),
      ipDocsUrl: ExternalUrl.optional(),
    }),
    needs: z.object({
      preferredStage: StageSlug,
      officeSeats: z.number().int().min(0).max(50),
      labSpace: z.boolean(),
      equipment: z.string().max(800).optional(),
      mentoringAreas: z.array(z.enum(MENTORING_AREAS)).default([]),
    }),
    documents: z.object({ businessPlanUrl: ExternalUrl }),
    declarations: z.object({ infoAccurate: z.literal(true), agreeToPolicy: z.literal(true) }),
  })
  .superRefine((d, ctx) => {
    if (
      ["partner-university", "external"].includes(d.applicant.affiliation) &&
      !d.applicant.iiserbMentor
    )
      ctx.addIssue({
        code: "custom",
        path: ["applicant", "iiserbMentor"],
        message:
          "Applicants from partner universities or outside IISER Bhopal need an IISER Bhopal faculty mentor or collaborator.",
      });
    if (
      d.technology.developedAtIiserb &&
      ["filed", "granted"].includes(d.technology.ipStatus) &&
      !d.technology.ipDocsUrl
    )
      ctx.addIssue({
        code: "custom",
        path: ["technology", "ipDocsUrl"],
        message:
          "For IP developed at IISER Bhopal, share a link to the filed or granted patent application.",
      });
    if (d.venture.incorporated && !d.venture.legalEntity)
      ctx.addIssue({
        code: "custom",
        path: ["venture", "legalEntity"],
        message: "Select the legal entity type.",
      });
  });

export const MentorData = z.object({
  name: Name,
  email: Email,
  phone: Phone.optional(),
  linkedin: ExternalUrl.optional(),
  title: z.string().max(100),
  organisation: z.string().max(120),
  types: z.array(MentorType).min(1),
  sectors: z.array(Sector).min(1),
  expertise: z.string().min(20).max(800),
  engagement: z.array(z.enum(ENGAGEMENTS)).min(1),
  hoursPerMonth: z.number().int().min(1).max(40).optional(),
});

export const PartnerData = z.object({
  name: Name,
  designation: z.string().max(100),
  organisation: z.string().max(160),
  email: Email,
  phone: Phone.optional(),
  partnershipType: z.array(z.enum(PARTNERSHIP_TYPES)).min(1),
  sectorFocus: z.array(Sector).default([]),
  fundsAvailable: z.string().max(100).optional(), // free text; never required
  message: z.string().trim().min(20).max(2000),
});

export const BookingData = z
  .object({
    name: Name,
    email: Email,
    phone: Phone,
    organisation: z.string().max(160),
    userCategory: UserCategory,
    facilitySlug: Slug.optional(),
    instrumentSlug: Slug.optional(),
    preferredDates: z.array(IsoDate).min(1).max(3),
    durationEstimate: z.string().max(60), // "4 hours", "12 samples"
    sampleDetails: z.string().max(800).optional(),
    notes: z.string().max(800).optional(),
  })
  .refine((d) => d.facilitySlug || d.instrumentSlug, {
    message: "Choose a facility or an instrument.",
    path: ["instrumentSlug"],
  });

export const NewsletterData = z.object({
  email: Email,
  interests: z.array(z.enum(NEWSLETTER_INTERESTS)).default(["calls", "events", "news"]),
});

export const FORM_DATA = {
  contact: ContactData,
  pitch: PitchData,
  application: ApplicationData,
  mentor: MentorData,
  partner: PartnerData,
  booking: BookingData,
  newsletter: NewsletterData,
} as const satisfies Record<FormType, z.ZodType>;

/**
 * Cross-field rules that JSON Schema cannot express. They are written once here, copied into form-rules.json, and
 * checked against the Zod refinements above by tests/unit/form-rules.test.ts.
 *  - `when`: every entry must hold (the value at `path` is in `in`, or equals `equals`).
 *  - `require`: each listed path must then be filled in.   `requireAny`: at least one must be.
 *  - `code`: a stable name the page maps to its own wording; `message` is the endpoint's English text.
 */
export interface FormCondition {
  code: string;
  when: { path: string; in?: readonly (string | boolean)[]; equals?: string | boolean }[];
  require?: readonly string[];
  requireAny?: readonly string[];
  /** The field the error is shown on. */
  errorPath: string;
  message: string;
}

export const FORM_CONDITIONS: Partial<Record<FormType, readonly FormCondition[]>> = {
  application: [
    {
      code: "mentorRequired",
      when: [{ path: "applicant.affiliation", in: ["partner-university", "external"] }],
      require: ["applicant.iiserbMentor.name", "applicant.iiserbMentor.email"],
      errorPath: "applicant.iiserbMentor.name",
      message:
        "Applicants from partner universities or outside IISER Bhopal need an IISER Bhopal faculty mentor or collaborator.",
    },
    {
      code: "ipDocsRequired",
      when: [
        { path: "technology.developedAtIiserb", equals: true },
        { path: "technology.ipStatus", in: ["filed", "granted"] },
      ],
      require: ["technology.ipDocsUrl"],
      errorPath: "technology.ipDocsUrl",
      message:
        "For IP developed at IISER Bhopal, share a link to the filed or granted patent application.",
    },
    {
      code: "legalEntityRequired",
      when: [{ path: "venture.incorporated", equals: true }],
      require: ["venture.legalEntity"],
      errorPath: "venture.legalEntity",
      message: "Select the legal entity type.",
    },
  ],
  booking: [
    {
      code: "targetRequired",
      when: [],
      requireAny: ["facilitySlug", "instrumentSlug"],
      errorPath: "instrumentSlug",
      message: "Choose a facility or an instrument.",
    },
  ],
};
