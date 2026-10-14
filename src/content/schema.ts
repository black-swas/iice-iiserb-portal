/**
 * Zod schemas for every content collection: the single source of truth (TRD §5, BACKEND_SCHEMA §2–4).
 * TypeScript types are inferred from these. Objects are strict, so an unknown or misspelt key fails the build.
 * Field-level rules live here; cross-entry rules (references, duplicates, stats vs derived counts) are in integrity.ts.
 */
import { z } from "zod";
import { IST_OFFSET, toMs } from "@/lib/dates";
import { TODO } from "./todo";

// ── Identifiers ────────────────────────────────────────────────
export const Slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "kebab-case only")
  .max(80);

// ── Dates (all IST; stored as ISO 8601) ────────────────────────
export const IsoDate = z.iso.date();
export const IsoDateTime = z.iso
  .datetime({ offset: true })
  .refine(
    (s) => s.endsWith(IST_OFFSET),
    `use the IST offset ${IST_OFFSET}, e.g. 2026-08-08T10:00:00${IST_OFFSET}`,
  );

// ── TODO_CONFIRM convention (see todo.ts) ──────────────────────
export const Text = z.string().min(1); // may start with "TODO_CONFIRM:"
export const EntryStatus = z.strictObject({
  _status: z.literal(TODO).optional(), // entry-level flag: something here is unconfirmed
  _note: z.string().optional(), // what needs confirming, and from whom
  _source: z.string().optional(), // where a fact came from, e.g. "legacy site, downloaded 2026-10-12"
});

// ── Links ──────────────────────────────────────────────────────
export const InternalHref = z
  .string()
  .regex(/^\/(?!\/)[^\s#]*(#[\w-]+)?$/, "must be a site path like /apply/");
export const ExternalUrl = z.url({ protocol: /^https$/, error: "must be an https:// URL" });
const MailtoHref = z.string().regex(/^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+$/, "malformed mailto:");
const TelHref = z.string().regex(/^tel:\+?[\d-]{6,20}$/, "malformed tel:");
export const Href = z.union([InternalHref, ExternalUrl, MailtoHref, TelHref]); // "#" alone is never valid

// ── Media ──────────────────────────────────────────────────────
// Generic words seen as alt text on the audited reference sites.
const FORBIDDEN_ALT =
  /^(logo|image|img|photo|picture|index|card|web design|banner|icon|untitled|clients|loader image|thumbnail)$/i;
const looksLikeFilename = (a: string) =>
  /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(a) ||
  /^[0-9a-f-]{20,}$/i.test(a) ||
  /^\d+(\s*\(\d+\))?$/.test(a.trim());

export const AssetPath = z
  .string()
  .regex(/^[\w./-]+$/, "no spaces or special characters in asset filenames")
  .refine(
    (p) => !p.toLowerCase().endsWith(".gif"),
    "GIFs are not allowed; use video or animated WebP/AVIF",
  );
/** Relative to content/. CMS uploads land in media/uploads/. */
export const MediaPath = AssetPath.regex(
  /^media\//,
  'path must start with "media/" (relative to content/)',
);

export const Image = z
  .strictObject({
    src: MediaPath,
    alt: z
      .string()
      .refine((a) => !FORBIDDEN_ALT.test(a.trim()), "alt text must describe the image")
      .refine((a) => !looksLikeFilename(a), "alt text must not be a filename, number or ID"),
    decorative: z.boolean().default(false), // true ⇒ rendered with alt=""
    credit: z.string().optional(),
    focalPoint: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]).optional(),
  })
  .refine((i) => i.decorative || i.alt.trim().length >= 4, {
    message: "non-decorative images need real alt text",
    path: ["alt"],
  });

export const Logo = z.strictObject({
  src: MediaPath.regex(/\.(svg|png|webp)$/, "logos are svg, png or webp"),
  alt: z.string().regex(/ logo$/, 'logo alt must be "{Organisation} logo"'),
});

// ── People references ──────────────────────────────────────────
export const Email = z.email();
export const PhoneIN = z.string().regex(/^\+91[\s\d]{10,14}$/, "use the form +91 755 269 2384");
const LucideIcon = z.string().regex(/^[a-z0-9-]+$/); // checked against lucide's icon list by validate-content

/**
 * "Unknown" is null, and a missing key means the same. BACKEND_SCHEMA writes these as required-nullable, but Decap
 * omits an empty optional field, so a CMS save would otherwise fail validation.
 */
const unknown = <T extends z.ZodType>(schema: T) => schema.nullable().default(null);

// ── Taxonomies (closed enums; changes are a code change) ───────
export const Sector = z.enum([
  "healthcare-bioengineering",
  "environment-agriculture",
  "iot-ai",
  "social-rural-development",
  "computational-sciences-it",
  "other",
]);
export const StageSlug = z.enum(["catalyse", "culture", "commercialise"]);
/**
 * `unconfirmed` is not in BACKEND_SCHEMA. The legacy site lists startups without saying whether each is current or
 * graduated, and the field is required, so guessing "current" would publish an invented fact. It is allowed only
 * on an entry flagged TODO_CONFIRM (see Startup) and is listed under "All" only.
 */
export const StartupStatus = z.enum([
  "current",
  "graduated",
  "pre-startup",
  "inactive",
  "unconfirmed",
]);
export const Affiliation = z.enum([
  "iiserb-faculty",
  "iiserb-former-faculty",
  "iiserb-student",
  "iiserb-alumni",
  "partner-university",
  "external",
]);
export const SpotlightBadge = z.enum([
  "Incubated",
  "Graduated",
  "Grant Won",
  "Patent",
  "Award",
  "Milestone",
]);
export const TrackSlug = z.enum(["physical", "virtual", "pre-incubation", "co-development"]); // shown only if confirmed
export const MentorType = z.enum([
  "business",
  "finance",
  "technical",
  "legal",
  "ip",
  "regulatory",
  "clinical-domain",
  "marketing",
]);
export const PartnerCategory = z.enum([
  "funder-government",
  "host",
  "corporate-csr",
  "hospital-clinical",
  "investor",
  "academic",
  "ecosystem",
  "media",
]);
export const InstrumentCategory = z.enum([
  "molecular-biology",
  "cell-culture",
  "analytical",
  "imaging",
  "electronics-prototyping",
  "computing",
  "other",
]);
export const UserCategory = z.enum(["incubatee", "iiserb", "external-academic", "industry"]);
export const OpportunityKind = z.enum([
  "cohort-intake",
  "scheme-call",
  "challenge",
  "accelerator",
  "corporate-programme",
  "fellowship",
]);
export const EventType = z.enum([
  "talk",
  "workshop",
  "webinar",
  "conclave",
  "programme",
  "outreach",
  "visit",
  "exhibition",
  "competition",
]);
export const EventMode = z.enum(["in-person", "online", "hybrid"]);
export const PersonRole = z.enum([
  "chief-guest",
  "guest-of-honour",
  "speaker",
  "panellist",
  "moderator",
  "jury",
  "host",
]);
export const DocumentCategory = z.enum([
  "policy",
  "resolution",
  "bylaws",
  "template",
  "report",
  "annual-report",
  "guideline",
  "usage-policy",
]);
export const FacilityCategory = z.enum([
  "workspace",
  "labs-instruments",
  "support-services",
  "campus-amenities",
]);
export const InstrumentAccess = z.enum(["self-use-after-training", "operator-assisted", "via-cif"]);
export const InstrumentStatus = z.enum(["available", "under-maintenance", "retired"]);
export const ServiceKind = z.enum([
  "ip-tech-transfer",
  "testing-validation",
  "co-development",
  "regulatory",
  "other",
]);
export const JobType = z.enum(["full-time", "part-time", "internship", "fellowship", "contract"]);
export const JobTrack = z.enum(["work-with-iice", "work-with-startups"]);
export const PressType = z.enum(["article", "video", "podcast"]);
export const AnnouncementKind = z.enum(["open-call", "hiring", "event-registration", "notice"]);
export const MentorAvailability = z.enum(["open", "limited", "closed"]);
export const RecognitionType = z.enum(["award", "grant", "patent", "funding", "other"]);
export const ContactIntent = z.enum([
  "incubation",
  "partnerships-investors",
  "facilities-bookings",
  "media",
  "general",
]);
export const Audience = z.enum(["founders", "students", "mentors", "investors-partners"]);
export const StatUnit = z.enum(["count", "inr", "sqft", "hours", "percent"]);
export const StatDerive = z.enum([
  "startups-total",
  "startups-current",
  "startups-graduated",
  "pre-startups",
  "events-held",
  "scheme-beneficiaries",
  "mentors",
  "partners",
  "instruments",
]);
export const HomeSectionId = z.enum([
  "impact",
  "whyIice",
  "journey",
  "paths",
  "spotlight",
  "happening",
  "testimonials",
  "backedBy",
]);

/** Every closed enum that reaches the UI as a label. Each value needs a `messages/en.json` → `enums.<key>.<value>` entry. */
export const ENUMS = {
  sector: Sector,
  stage: StageSlug,
  startupStatus: StartupStatus,
  affiliation: Affiliation,
  spotlightBadge: SpotlightBadge,
  track: TrackSlug,
  mentorType: MentorType,
  partnerCategory: PartnerCategory,
  instrumentCategory: InstrumentCategory,
  userCategory: UserCategory,
  opportunityKind: OpportunityKind,
  eventType: EventType,
  eventMode: EventMode,
  personRole: PersonRole,
  documentCategory: DocumentCategory,
  facilityCategory: FacilityCategory,
  instrumentAccess: InstrumentAccess,
  instrumentStatus: InstrumentStatus,
  serviceKind: ServiceKind,
  jobType: JobType,
  jobTrack: JobTrack,
  pressType: PressType,
  announcementKind: AnnouncementKind,
  mentorAvailability: MentorAvailability,
  recognitionType: RecognitionType,
  contactIntent: ContactIntent,
  audience: Audience,
} as const;

// Application window → status is DERIVED by src/lib/status.ts, never stored
export const Window = z
  .strictObject({
    opensAt: IsoDateTime.optional(),
    closesAt: IsoDateTime.optional(),
    rolling: z.boolean().default(false),
  })
  .refine((w) => !(w.rolling && w.closesAt), "a rolling window cannot have a closing date")
  .refine(
    (w) => !w.opensAt || !w.closesAt || toMs(w.closesAt) > toMs(w.opensAt),
    "closesAt must be after opensAt",
  );

// ── Common entry fields ────────────────────────────────────────
/** Every collection entry. `slug` must equal the filename (checked by the loader). */
export const Base = EntryStatus.extend({
  slug: Slug,
  draft: z.boolean().default(false), // drafts are excluded from production builds
  updatedAt: IsoDate.optional(), // shown as "Last updated" (GIGW)
});

const Step = z.strictObject({ label: z.string(), detail: z.string().optional() });

/**
 * Amounts are numbers only. `display` from BACKEND_SCHEMA is dropped: a typed "₹10 lakh" string is a second source of
 * truth that can contradict the numbers, and CLAUDE.md rule 11 says amounts go through formatINR() only.
 */
export const Money = z
  .strictObject({
    min: unknown(z.number().nonnegative()),
    max: unknown(z.number().nonnegative()),
    currency: z.literal("INR"),
  })
  .refine((m) => m.min === null || m.max === null || m.min <= m.max, "min must not exceed max");

// ── 4.1 SiteSettings (settings/site.json) ──────────────────────
const SOCIAL_HOMEPAGE =
  /^https:\/\/(www\.)?(linkedin|x|twitter|instagram|youtube|facebook)\.com\/?$/;
const SocialUrl = ExternalUrl.refine(
  (u) => !SOCIAL_HOMEPAGE.test(u),
  "must point to a profile, not the platform homepage",
);

/**
 * Logos are optional here although BACKEND_SCHEMA requires them: the logo files are a handover item, and a made-up
 * placeholder logo would be worse than the text name, which is the fallback.
 */
export const SiteSettings = EntryStatus.extend({
  name: z.literal("Innovation and Incubation Centre for Entrepreneurship"),
  shortName: z.literal("IICE"),
  hostInstitute: z.strictObject({ name: z.string(), url: ExternalUrl, logo: Logo.optional() }),
  coBranding: z.array(
    z.strictObject({
      name: z.string(),
      /** The short form for the header lockup: "DST", "NSTEDB". */
      shortName: z.string().max(12).optional(),
      logo: Logo.optional(),
      url: ExternalUrl.optional(),
    }),
  ), // DST, NSTEDB…
  logo: z.strictObject({ light: Logo, dark: Logo }).optional(),
  address: z.strictObject({
    lines: z.array(z.string()).min(2),
    city: z.literal("Bhopal"),
    postalCode: z.literal("462066"),
    region: z.literal("Madhya Pradesh"),
    country: z.literal("IN"),
    geo: z.strictObject({ lat: z.number(), lng: z.number() }).optional(),
  }),
  phones: z.array(z.strictObject({ label: z.string(), number: PhoneIN })),
  emails: z.array(z.strictObject({ label: z.string(), address: Email })),
  incubationSupport: z.strictObject({ phone: PhoneIN, email: Email }),
  contactChannels: z
    .array(
      z.strictObject({
        intent: ContactIntent,
        label: z.string(),
        email: Email.optional(),
        phone: PhoneIN.optional(),
        person: z.string().optional(),
      }),
    )
    .min(1),
  officeHours: z.string().optional(),
  directionsUrl: ExternalUrl.optional(),
  responseTime: z.string().optional(), // shown only if IICE commits to one
  grievanceOfficer: z
    .strictObject({ name: z.string(), designation: z.string(), email: Email })
    .optional(),
  intakeStatusOpportunity: Slug.optional(),
  socials: z.strictObject({
    linkedin: SocialUrl.optional(),
    x: SocialUrl.optional(),
    instagram: SocialUrl.optional(),
    youtube: SocialUrl.optional(),
    facebook: SocialUrl.optional(),
  }), // only real profile URLs; missing ⇒ icon hidden
  startupPortalUrl: ExternalUrl.optional(),
  mapEmbedUrl: ExternalUrl.optional(),
  footerGroups: z
    .array(
      z.strictObject({
        title: z.string(),
        links: z.array(z.strictObject({ label: z.string(), href: Href })),
      }),
    )
    .length(4),
});

// ── 4.2 Navigation (settings/navigation.json) ──────────────────
const NavLink = z.strictObject({
  label: z.string().max(40),
  href: InternalHref,
  description: z.string().max(90).optional(),
});
export const Navigation = z.strictObject({
  primary: z
    .array(
      z
        .strictObject({
          label: z.string(),
          href: InternalHref.optional(),
          groups: z
            .array(z.strictObject({ title: z.string(), links: z.array(NavLink).min(1) }))
            .optional(),
        })
        .refine(
          (i) => i.href !== undefined || (i.groups?.length ?? 0) > 0,
          "a nav item needs an href or groups",
        ),
    )
    .max(7),
  cta: z.strictObject({ label: z.literal("Apply for Incubation"), href: z.literal("/apply/") }),
});

// ── 4.3 Page (pages/*.mdx front matter) and HomePage (pages/home.json) ──
export const Page = Base.extend({
  title: Text,
  description: z.string().max(160),
  eyebrow: z.string().optional(),
  hero: Image.optional(),
  ogImage: Image.optional(),
  sections: z.array(z.string()).optional(), // optional on-page TOC
}); // body = MDX

/** Section eyebrows hold the label only; the "01 /" ordinal is derived at render so it survives a hidden section. */
export const HomePage = EntryStatus.extend({
  hero: z.strictObject({
    headline: z.string(), // emphasis marked with *word*
    subcopy: z.string().max(180),
    primaryCta: z.strictObject({ label: z.string(), href: Href }),
    secondaryCta: z.strictObject({ label: z.string(), href: Href }),
    poster: Image.optional(),
  }),
  sectionTitles: z.record(
    HomeSectionId,
    z.strictObject({ eyebrow: z.string(), title: z.string(), subline: z.string().optional() }),
  ),
  pitchBand: z.strictObject({ title: z.string(), body: z.string() }),
});

// ── 4.4 Announcement ───────────────────────────────────────────
export const Announcement = Base.extend({
  text: z.string().max(120),
  kind: AnnouncementKind,
  href: Href.optional(),
  startsAt: IsoDateTime,
  expiresAt: IsoDateTime, // required: nothing lives forever
  priority: z.number().int().min(0).max(9).default(5),
}).refine((a) => toMs(a.expiresAt) > toMs(a.startsAt), {
  message: "expiresAt must be after startsAt",
  path: ["expiresAt"],
});

// ── 4.5 Stat (stats.json) ──────────────────────────────────────
export const Stat = z.discriminatedUnion("kind", [
  EntryStatus.extend({
    kind: z.literal("manual"),
    id: Slug,
    label: z.string().max(40),
    value: unknown(z.number().nonnegative()), // null ⇒ unconfirmed, hidden in production
    unit: StatUnit.default("count"),
    plus: z.boolean().default(false), // renders "+" once, never "600++"
    asOf: IsoDate.optional(),
    source: z.string().optional(), // required when value !== null
    order: z.number().int(),
    showOnHome: z.boolean().default(true),
  }).refine((s) => s.value === null || !!s.source, {
    message: "confirmed stats need a source",
    path: ["source"],
  }),
  EntryStatus.extend({
    kind: z.literal("derived"), // computed by derived.ts; cannot contradict the listings
    id: Slug,
    label: z.string().max(40),
    derive: StatDerive,
    order: z.number().int(),
    showOnHome: z.boolean().default(true),
  }),
]);

// ── 4.6 EcosystemTile and PathCard ─────────────────────────────
export const EcosystemTile = EntryStatus.extend({
  id: Slug,
  icon: LucideIcon,
  title: z.string().max(32),
  short: z.string().max(70),
  long: z.string().max(240),
  href: InternalHref.optional(),
});
export const PathCard = EntryStatus.extend({
  audience: Audience,
  title: z.string(),
  blurb: z.string().max(140),
  icon: LucideIcon,
  links: z
    .array(z.strictObject({ label: z.string(), href: InternalHref }))
    .min(2)
    .max(3),
});

// ── 4.7 Stage, Track, FundingScheme, Opportunity ───────────────
export const Stage = Base.extend({
  slug: StageSlug,
  order: z.number().int().min(1).max(3),
  name: z.string(),
  phase: z.enum(["Pre-incubation", "Incubation", "Acceleration"]),
  tagline: z.string().max(60), // stage-strip line
  oneLiner: z.string().max(140),
  audience: z.array(z.string()).min(1),
  duration: unknown(z.string()), // null ⇒ "To be announced"
  fundingBand: unknown(Money),
  schemeSlugs: z.array(Slug),
  offerings: z.array(z.string()).min(3), // "What you get" checklist
  programFlow: z.array(Step).default([]),
  outcomes: z.array(z.string()).default([]),
  selectionSteps: z.array(Step).default([]),
  sectors: z.array(Sector).default([]),
  exitCriteria: z.array(z.string()).optional(),
  faqGroup: Slug.optional(),
}); // body = MDX; the next stage is derived from `order`

export const Track = Base.extend({
  slug: TrackSlug,
  name: z.string(),
  forWhom: z.string().max(160),
  duration: unknown(z.string()),
  includes: z.array(z.string()).min(2),
  terms: unknown(z.string()), // fees/equity; null ⇒ "To be confirmed"
  order: z.number().int(),
}); // the Apply link is derived: /apply/?track={slug}

export const FundingScheme = Base.extend({
  name: z.string(), // official scheme name as spelt by its owner
  provider: z.string(),
  oneLiner: z.string().max(140), // unique across schemes
  atAGlance: z.strictObject({
    maxSupport: unknown(Money),
    duration: unknown(z.string()),
    purpose: unknown(z.string()),
    fundingAgency: unknown(z.string()),
    expectedOutput: unknown(z.string()),
    whoCanApply: unknown(z.string()),
  }),
  benefits: z.array(z.string()).default([]),
  eligibility: z.array(z.string()),
  coveredUses: z.array(z.string()).default([]),
  nonPermittedUses: z.array(z.string()).default([]),
  importantPoints: z.array(z.string()).default([]),
  selectionSteps: z.array(Step).default([]),
  screeningDuration: z.string().nullable().optional(),
  documentsRequired: z.array(z.string()).default([]),
  window: Window,
  stageSlugs: z.array(StageSlug).min(1),
  sectorFocus: z.array(Sector).default([]),
  cohorts: z
    .array(
      z.strictObject({
        label: z.string(),
        year: z.number().int().optional(),
        beneficiaries: z.array(
          z.strictObject({
            name: z.string(),
            oneLiner: z.string().max(140),
            startupSlug: Slug.optional(),
          }),
        ),
      }),
    )
    .default([]),
  howToApply: z.string().optional(),
  externalPortalUrl: ExternalUrl.optional(),
  officialUrl: ExternalUrl.optional(),
  contact: z.strictObject({ email: Email.optional(), phone: PhoneIN.optional() }).optional(),
  faqGroup: Slug.optional(),
  image: Image.optional(),
  lastReviewed: unknown(IsoDate),
});

export const Opportunity = Base.extend({
  title: z.string().max(110),
  kind: OpportunityKind,
  sponsor: z.string(),
  summary: z.string().max(240),
  eligibilityLine: z.string().max(140).optional(),
  window: Window,
  applyHref: Href,
  schemeSlug: Slug.optional(),
  eventSlug: Slug.optional(),
  trackSlug: TrackSlug.optional(),
  headline: z.boolean().default(false), // eligible to drive the header status pill
});

// ── 4.8 Startup (startups/*.md) ────────────────────────────────
export const Startup = Base.extend({
  name: z.string(),
  legalName: z.string().optional(),
  logo: Logo.optional(), // missing ⇒ monogram
  oneLiner: z.string().max(120),
  sectors: z.array(Sector).min(1),
  stage: unknown(StageSlug),
  status: StartupStatus,
  track: TrackSlug.nullable().optional(),
  schemeSlugs: z.array(Slug).default([]), // funded by
  location: z.strictObject({ city: z.string(), state: z.string() }).optional(),
  tags: z.array(z.string().max(30)).max(8).default([]),
  story: z
    .strictObject({
      problem: z.string().max(600),
      approach: z.string().max(600),
      outcome: z.string().max(600),
    })
    .optional(),
  cohortYear: unknown(z.number().int().min(2015).max(2100)),
  foundedYear: z.number().int().nullable().optional(),
  affiliation: unknown(Affiliation),
  founders: z
    .array(
      z.strictObject({
        name: z.string(),
        role: z.string().optional(),
        linkedin: ExternalUrl.optional(),
      }),
    )
    .default([]),
  website: ExternalUrl.optional(),
  socials: z
    .strictObject({ linkedin: ExternalUrl.optional(), x: ExternalUrl.optional() })
    .optional(),
  recognitions: z
    .array(
      z.strictObject({
        type: RecognitionType,
        title: z.string(),
        year: z.number().int().optional(),
        url: ExternalUrl.optional(),
      }),
    )
    .default([]),
  featured: z.boolean().default(false), // eligible for the home logo carousel
  gallery: z.array(Image).max(8).default([]),
}).refine((s) => s.status !== "unconfirmed" || s._status === TODO, {
  message: 'status "unconfirmed" is only allowed on an entry flagged _status: TODO_CONFIRM',
  path: ["status"],
}); // body = Markdown description

// ── 4.9 SpotlightItem and Milestone ────────────────────────────
export const SpotlightItem = EntryStatus.extend({
  id: Slug,
  badge: SpotlightBadge,
  title: z.string().max(48),
  description: z.string().max(140),
  image: Image.optional(), // absent ⇒ text-card treatment
  href: Href,
  startupSlug: Slug.optional(),
});
/** Singleton collections are wrapped in `{ items }`: Decap CMS cannot edit a file whose root is an array. */
export const Spotlight = z.strictObject({ items: z.array(SpotlightItem).min(3).max(8) });

export const Milestone = EntryStatus.extend({
  id: Slug,
  year: z.number().int(),
  title: z.string().max(48),
  description: z.string().max(200),
  image: Image.optional(),
  href: Href.optional(),
});
export const Milestones = z.strictObject({ items: z.array(Milestone) });

export const Stats = z.strictObject({ items: z.array(Stat) });
export const EcosystemTiles = z.strictObject({ items: z.array(EcosystemTile).max(7) }); // FR-HOME-3
export const Paths = z.strictObject({ items: z.array(PathCard).length(4) });

// ── 4.10 Event (events/*.md) and EventSeries ───────────────────
/**
 * For `allDay` events only the IST calendar dates of `startsAt` / `endsAt` matter; the time of day is ignored.
 * Use T00:00:00+05:30 for the start and T23:59:59+05:30 for a multi-day end.
 */
export const Event = Base.extend({
  title: z.string(),
  type: EventType,
  seriesSlug: Slug.optional(),
  edition: z.string().max(20).optional(), // "3.0", "Episode 2"
  startsAt: IsoDateTime,
  endsAt: IsoDateTime.optional(),
  allDay: z.boolean().default(false),
  mode: EventMode,
  venue: z
    .strictObject({
      name: z.string(),
      address: z.string().optional(),
      mapUrl: ExternalUrl.optional(),
    })
    .optional(),
  summary: z.string().max(200),
  people: z
    .array(
      z.strictObject({
        role: PersonRole,
        name: z.string(),
        designation: z.string().optional(),
        organisation: z.string().optional(),
        personSlug: Slug.optional(),
        url: ExternalUrl.optional(),
      }),
    )
    .default([]),
  timeline: z.array(z.strictObject({ date: IsoDate, label: z.string() })).default([]),
  agenda: z
    .array(
      z.strictObject({
        day: z.number().int().min(1),
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional(),
        title: z.string(),
        room: z.string().optional(),
        speakerNames: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  results: z
    .array(z.strictObject({ award: z.string(), name: z.string(), startupSlug: Slug.optional() }))
    .default([]),
  facts: z.array(z.strictObject({ label: z.string(), value: unknown(z.number()) })).default([]), // null ⇒ hidden
  agendaPdf: z
    .string()
    .regex(/^documents\/[\w.-]+\.pdf$/)
    .optional(),
  organisers: z.array(z.string()).default(["IICE, IISER Bhopal"]),
  partnerSlugs: z.array(Slug).default([]),
  sponsor: z.string().optional(),
  registration: z.strictObject({ url: Href, closesAt: IsoDateTime.optional() }).optional(),
  recordingUrl: ExternalUrl.optional(), // shown after the event
  cover: Image.optional(),
  gallery: z.array(Image).max(24).default([]),
  legacyPath: z.string().optional(), // e.g. "/activities/aesdp" → redirect source
}).refine((e) => e.endsAt === undefined || toMs(e.endsAt) >= toMs(e.startsAt), {
  message: "endsAt must not be before startsAt",
  path: ["endsAt"],
}); // body = Markdown

export const EventSeries = Base.extend({
  name: z.string(),
  tagline: z.string().max(100),
  description: z.string(),
  cover: Image.optional(),
});

// ── 4.11 NewsPost and PressItem ────────────────────────────────
export const NewsPost = Base.extend({
  title: z.string().max(110),
  date: IsoDate,
  summary: z.string().max(200),
  cover: Image.optional(),
  tags: z.array(z.string()).default([]),
  author: z.string().default("IICE Team"),
  relatedEventSlug: Slug.optional(),
  relatedStartupSlugs: z.array(Slug).default([]),
  externalUrl: ExternalUrl.optional(), // for press coverage items
}); // body = Markdown

export const PressItem = Base.extend({
  title: z.string().max(140),
  outlet: z.string(),
  date: IsoDate,
  type: PressType,
  url: ExternalUrl,
  startupSlug: Slug.optional(),
  eventSlug: Slug.optional(),
});

// ── 4.12 Document ──────────────────────────────────────────────
export const Document = Base.extend({
  title: z.string(),
  category: DocumentCategory,
  date: unknown(IsoDate),
  version: z
    .string()
    .regex(/^v?\d+(\.\d+)*$/)
    .optional(),
  file: z.string().regex(/^documents\/[\w.-]+\.pdf$/), // public/documents/…
  fileSizeKB: z.number().int().positive().optional(), // filled by the build if absent
  pages: z.number().int().positive().optional(),
  summary: z.string().max(240).optional(),
  supersededBy: Slug.optional(),
  language: z.enum(["en", "hi", "en-hi"]).default("en"),
});

// ── 4.13 Person, Committee, Mentor ─────────────────────────────
export const Person = Base.extend({
  name: z.string(),
  honorific: z.enum(["Prof.", "Dr.", "Mr.", "Ms.", "Mx."]).optional(),
  designation: z.string().optional(), // institutional title, e.g. "Dean, R&D"
  team: z.strictObject({ role: z.string(), order: z.number().int() }).optional(), // present ⇒ listed on the Team tab
  email: Email.optional(),
  phone: PhoneIN.optional(),
  photo: Image.optional(),
  bio: z.string().max(600).optional(),
  links: z
    .strictObject({ profile: ExternalUrl.optional(), linkedin: ExternalUrl.optional() })
    .optional(),
});

export const CommitteeSlug = z.enum([
  "managing",
  "executive",
  "technical-evaluation",
  "management-advisory",
]);
export const Committee = Base.extend({
  slug: CommitteeSlug,
  name: z.string(),
  description: z.string().optional(),
  asOf: unknown(IsoDate),
  members: z.array(
    z.strictObject({
      personSlug: Slug,
      committeeRole: z.string(), // "President", "Member Secretary", "Coordinator", "Member"
      order: z.number().int(),
    }),
  ), // may be empty ⇒ "Composition being updated"
});

export const Mentor = Base.extend({
  personSlug: Slug,
  title: z.string(), // separate from organisation (no combined "role @ org" line)
  organisation: z.string(),
  types: z.array(MentorType).min(1),
  sectors: z.array(Sector).default([]),
  location: z.string().optional(),
  expertise: z.array(z.string()).min(1),
  availability: MentorAvailability.default("open"),
});

// ── 4.14 Testimonial, Partner, Facility, Instrument, Service, Job, FAQ, InnovationClub ──
export const Testimonial = Base.extend({
  quote: z.string().min(40).max(320),
  name: z.string(),
  role: z.string(),
  startupSlug: Slug.optional(),
  track: TrackSlug.optional(),
  stage: StageSlug.optional(),
  year: z.number().int().optional(),
  photo: Image.optional(),
  // No consent ⇒ the entry fails validation. Testimonials are never invented.
  consent: z.strictObject({
    given: z.literal(true),
    date: IsoDate,
    method: z.enum(["email", "form", "signed"]),
  }),
});

export const Partner = Base.extend({
  name: z.string(),
  logo: Logo.optional(), // optional until supplied; the name is always shown
  url: ExternalUrl.optional(),
  category: PartnerCategory,
  showOnHome: z.boolean().default(false),
  since: z.number().int().optional(),
  order: z.number().int().default(100),
});

export const Facility = Base.extend({
  name: z.string(),
  category: FacilityCategory,
  description: z.string().max(240),
  facts: z
    .strictObject({
      areaSqFt: z.number().nullable(),
      seats: z.number().int().nullable(),
      privateOffices: z.number().int().nullable(),
      meetingRooms: z.number().int().nullable(),
      accessHours: z.string().nullable(),
    })
    .partial()
    .default({}), // null ⇒ hidden
  externalUrl: ExternalUrl.optional(),
  bookable: z.boolean().default(false),
  images: z.array(Image).max(6).default([]),
});

export const Instrument = Base.extend({
  name: z.string(),
  category: InstrumentCategory,
  make: z.string().optional(),
  model: z.string().optional(),
  specs: z.array(z.string()).max(6).default([]),
  useCases: z.array(z.string()).max(4).default([]),
  image: Image.optional(),
  access: InstrumentAccess,
  facilitySlug: Slug.optional(),
  status: InstrumentStatus.default("available"),
  rateCard: z
    .array(
      z.strictObject({
        userCategory: UserCategory,
        rate: unknown(z.number().nonnegative()), // null ⇒ "On request" / TODO_CONFIRM
        unit: z.enum(["hour", "sample", "day", "run"]),
        gstIncluded: z.boolean(),
        minimumBilling: z.string().optional(),
      }),
    )
    .default([]), // at most one row per userCategory (integrity.ts)
  bookingNotes: z.string().max(300).optional(),
  lastReviewed: unknown(IsoDate),
});

export const Service = Base.extend({
  name: z.string(),
  kind: ServiceKind,
  summary: z.string().max(200),
  whoCanUse: z.array(z.string()).min(1),
  turnaround: unknown(z.string()),
  howToEngage: z.string(),
  contactEmail: Email.optional(),
  relatedInstrumentSlugs: z.array(Slug).default([]),
  lastReviewed: unknown(IsoDate),
});

export const Job = Base.extend({
  title: z.string(),
  track: JobTrack,
  /** Absent ⇒ the job is at IICE itself. (BACKEND_SCHEMA models this as a union, which Decap cannot edit.) */
  employerStartupSlug: Slug.optional(),
  type: JobType,
  location: z.string().default("IISER Bhopal"),
  skills: z.array(z.string()).max(10).default([]),
  contactPerson: z.string().optional(),
  postedAt: IsoDate,
  closesAt: IsoDate, // auto-hidden after closesAt (client + daily rebuild)
  apply: z
    .strictObject({ url: ExternalUrl.optional(), email: Email.optional() })
    .refine((a) => a.url || a.email, "provide an apply URL or email"),
  advertPdf: z
    .string()
    .regex(/^documents\/.+\.pdf$/)
    .optional(),
})
  .refine((j) => j.closesAt >= j.postedAt, {
    message: "closesAt must not be before postedAt",
    path: ["closesAt"],
  })
  .refine((j) => (j.track === "work-with-startups") === (j.employerStartupSlug !== undefined), {
    message:
      "work-with-startups jobs need employerStartupSlug, and work-with-iice jobs must not have one",
    path: ["employerStartupSlug"],
  }); // body = Markdown

export const FaqGroup = Base.extend({
  title: z.string(),
  items: z.array(z.strictObject({ q: z.string(), a: z.string() })).min(1), // a = Markdown
});

const ClubMember = z.strictObject({
  name: z.string(),
  programme: z.string(),
  batch: z.number().int(),
});
export const InnovationClub = EntryStatus.extend({
  tagline: z.string(),
  intro: z.string(),
  pillars: z.array(z.strictObject({ name: z.string(), text: z.string() })).length(3), // Culture · Conduct · Connect
  objectives: z.array(z.string()).min(1),
  currentMembers: z.array(ClubMember).default([]),
  pastMembers: z.array(ClubMember),
});

// ── Inferred types ─────────────────────────────────────────────
export type Money = z.infer<typeof Money>;
export type Image = z.infer<typeof Image>;
export type Logo = z.infer<typeof Logo>;
export type Window = z.infer<typeof Window>;
export type SiteSettings = z.infer<typeof SiteSettings>;
export type Navigation = z.infer<typeof Navigation>;
export type Page = z.infer<typeof Page>;
export type HomePage = z.infer<typeof HomePage>;
export type Announcement = z.infer<typeof Announcement>;
export type Stat = z.infer<typeof Stat>;
export type EcosystemTile = z.infer<typeof EcosystemTile>;
export type PathCard = z.infer<typeof PathCard>;
export type Stage = z.infer<typeof Stage>;
export type Track = z.infer<typeof Track>;
export type FundingScheme = z.infer<typeof FundingScheme>;
export type Opportunity = z.infer<typeof Opportunity>;
export type Startup = z.infer<typeof Startup>;
export type SpotlightItem = z.infer<typeof SpotlightItem>;
export type Milestone = z.infer<typeof Milestone>;
export type Event = z.infer<typeof Event>;
export type EventSeries = z.infer<typeof EventSeries>;
export type NewsPost = z.infer<typeof NewsPost>;
export type PressItem = z.infer<typeof PressItem>;
export type Document = z.infer<typeof Document>;
export type Person = z.infer<typeof Person>;
export type Committee = z.infer<typeof Committee>;
export type Mentor = z.infer<typeof Mentor>;
export type Testimonial = z.infer<typeof Testimonial>;
export type Partner = z.infer<typeof Partner>;
export type Facility = z.infer<typeof Facility>;
export type Instrument = z.infer<typeof Instrument>;
export type Service = z.infer<typeof Service>;
export type Job = z.infer<typeof Job>;
export type FaqGroup = z.infer<typeof FaqGroup>;
export type InnovationClub = z.infer<typeof InnovationClub>;
export type StatUnit = z.infer<typeof StatUnit>;
