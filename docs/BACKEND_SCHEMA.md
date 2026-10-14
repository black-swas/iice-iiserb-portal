# Backend Schema: Content Model and Form Contracts
**Version:** 0.2 (draft) · **Date:** 2026-10-13. 0.2 adds the collections and fields learned from the reference-site audit (SRD Appendix A): tracks, opportunities, instruments with rate cards, services, press, a richer scheme/event/startup model, and the mentor, partner, booking and newsletter forms.
**Read with:** [TRD.md](TRD.md) §5, §10 · [SRD.md](SRD.md)

## 1. What "backend" means for this project
The site is a **static export** (`requirements.txt` §8), so there is no application database or API server of our own. The backend has three parts:

| Layer | Storage | Owner | Section |
|---|---|---|---|
| **Content store** | Typed JSON / Markdown / MDX files in `/content`, versioned in Git and edited via Decap CMS | IICE editors | §3–4 |
| **Form submissions** | Google Sheet, written by a Google Apps Script web app (swappable endpoint) | IICE office | §5–6 |
| **Derived artefacts** | Generated at build: `search-index.json`, `.ics` files, image manifest, sitemap, redirects | CI | §7 |

The schemas below are written as **Zod** (the implementation's single source of truth: `src/content/schema.ts`, `src/content/forms.ts`). TS types are `z.infer<…>`, and JSON Schemas for editor autocompletion are generated from them. If the project ever moves to a database, each collection maps 1:1 to a table, with `slug` as the natural key and the reference fields as foreign keys (§8).

---

## 2. Shared primitives

```ts
import { z } from "zod";

// ── Identifiers ────────────────────────────────────────────────
export const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "kebab-case only").max(80);

// ── Dates (all IST; stored as ISO 8601) ────────────────────────
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);                      // 2026-08-08
export const IsoDateTime = z.string().datetime({ offset: true });                     // 2026-08-08T10:00:00+05:30

// ── TODO_CONFIRM convention (see §2.3) ─────────────────────────
export const TODO = "TODO_CONFIRM" as const;
export const Text = z.string().min(1);                       // may start with "TODO_CONFIRM:"
export const EntryStatus = z.object({
  _status: z.literal(TODO).optional(),                       // entry-level flag: something here is unconfirmed
  _note: z.string().optional(),                              // what needs confirming, and from whom
  _source: z.string().optional(),                            // where a fact came from (e.g. "legacy site 2026-10-12")
});

// ── Links ──────────────────────────────────────────────────────
export const InternalHref = z.string().regex(/^\/(?!\/)[^\s#]*(#[\w-]+)?$/, "must be a site path like /apply/");
export const ExternalUrl = z.string().url().startsWith("https://");
export const Href = z.union([InternalHref, ExternalUrl, z.string().regex(/^mailto:|^tel:/)]);
// "#" alone is never valid (SRD FR-GLOBAL-9).

// ── Media ──────────────────────────────────────────────────────
// Generic words seen as alt text on the audited reference sites.
const FORBIDDEN_ALT = /^(logo|image|img|photo|picture|index|card|web design|banner|icon|untitled|clients|loader image|thumbnail)$/i;
const looksLikeFilename = (a: string) => /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(a) || /^[0-9a-f-]{20,}$/i.test(a) || /^\d+(\s*\(\d+\))?$/.test(a.trim());
export const AssetPath = z.string().regex(/^[\w./-]+$/, "no spaces or special characters in asset filenames")
  .refine(p => !p.toLowerCase().endsWith(".gif"), "GIFs are not allowed; use video or animated WebP/AVIF");
export const Image = z.object({
  src: AssetPath.regex(/^(media|uploads)\//, "path under content/media/"),  // optimised at build
  alt: z.string()
    .refine(a => !FORBIDDEN_ALT.test(a.trim()), "alt text must describe the image")
    .refine(a => !looksLikeFilename(a), "alt text must not be a filename, number or ID"),
  decorative: z.boolean().default(false),                    // true ⇒ rendered with alt=""
  credit: z.string().optional(),
  focalPoint: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]).optional(),
}).refine(i => i.decorative || i.alt.trim().length >= 4, "non-decorative images need real alt text");

export const Logo = z.object({
  src: AssetPath.regex(/\.(svg|png|webp)$/),
  alt: z.string().regex(/ logo$/, 'logo alt must be "{Organisation} logo"'),
});

// ── People references ──────────────────────────────────────────
export const PersonRef = z.object({ personSlug: Slug });
export const Email = z.string().email();
export const PhoneIN = z.string().regex(/^\+91[\s\d]{10,14}$/);

// ── Taxonomies (closed enums; changes are a code change) ───────
export const Sector = z.enum([            // legacy IICE thrust areas + "other"
  "healthcare-bioengineering",
  "environment-agriculture",
  "iot-ai",
  "social-rural-development",
  "computational-sciences-it",
  "other",
]);
export const StageSlug = z.enum(["catalyse", "culture", "commercialise"]);
export const StartupStatus = z.enum(["current", "graduated", "pre-startup", "inactive"]);
export const Affiliation = z.enum([
  "iiserb-faculty", "iiserb-former-faculty", "iiserb-student", "iiserb-alumni",
  "partner-university", "external",
]);
export const SpotlightBadge = z.enum(["Incubated", "Graduated", "Grant Won", "Patent", "Award", "Milestone"]);
export const LucideIcon = z.string().regex(/^[a-z0-9-]+$/);  // validated against lucide's icon list at build

// Added in 0.2 (reference audit)
export const TrackSlug = z.enum(["physical", "virtual", "pre-incubation", "co-development"]);  // shown only if confirmed
export const MentorType = z.enum(["business", "finance", "technical", "legal", "ip", "regulatory", "clinical-domain", "marketing"]);
export const PartnerCategory = z.enum([
  "funder-government", "host", "corporate-csr", "hospital-clinical", "investor", "academic", "ecosystem", "media",
]);
export const InstrumentCategory = z.enum([
  "molecular-biology", "cell-culture", "analytical", "imaging", "electronics-prototyping", "computing", "other",
]);
export const UserCategory = z.enum(["incubatee", "iiserb", "external-academic", "industry"]);
export const OpportunityKind = z.enum([
  "cohort-intake", "scheme-call", "challenge", "accelerator", "corporate-programme", "fellowship",
]);

// Application window → status is DERIVED by src/lib/status.ts (never stored)
export const Window = z.object({
  opensAt: IsoDateTime.optional(),
  closesAt: IsoDateTime.optional(),
  rolling: z.boolean().default(false),
}).refine(w => !(w.rolling && w.closesAt), "a rolling window cannot have a closing date")
  .refine(w => !w.opensAt || !w.closesAt || w.closesAt > w.opensAt, "closesAt must be after opensAt");
```

### 2.1 Common entry fields
Every collection entry is merged with:
```ts
export const Base = EntryStatus.extend({
  slug: Slug,                       // = filename without extension; validator enforces the match
  draft: z.boolean().default(false),// drafts are excluded from production builds
  updatedAt: IsoDate.optional(),    // shown as "Last updated" (GIGW); defaults to git mtime
});
```

### 2.2 Validation rules beyond types (run by `scripts/validate-content.ts`)
| Rule | Applies to |
|---|---|
| `slug` equals the filename and is unique within its collection | all collections |
| Every `*Slug` reference resolves | startups ↔ stages; events ↔ series/people/partners; committees ↔ people; spotlight ↔ startups; jobs ↔ startups; testimonials ↔ startups |
| Every `Image.src` / `Logo.src` file exists under `content/media/` | all |
| No duplicate `oneLiner` / `short` text inside a collection | funding schemes, ecosystem tiles, stages, startups, paths |
| No forbidden copy (`lorem`, `ipsum`, `Course Name`, `Article Name Here`, `Goodwill, Sam`) | all text |
| No hotlinked Google image/Drive URLs (`googleusercontent.com`, `drive.google.com`) | all URLs |
| `expiresAt > startsAt`; `endsAt ≥ startsAt` | announcements, events, jobs |
| 3–8 items | `spotlight.json` |
| ≤ 7 items | `ecosystem-tiles.json` (FR-HOME-3), `settings/navigation` top level |
| A claimed stat must not be lower than its derived count (e.g. `startups-incubated` ≥ startups listed) | stats ↔ derived |
| Testimonial `name` must appear in the referenced startup's `founders[].name` | testimonials ↔ startups |
| No two entities share a `website` / `linkedin` URL (warning) | startups, mentors, partners |
| No `example.com`, `localhost`, `*.vercel.app`, `*.netlify.app` URLs; every email is valid and `mailto:` targets match the displayed address | all |
| Rate cards: at most one entry per (instrument, user category) | instruments |
| `lastReviewed` / `asOf` older than 180 days produces a stale warning | schemes, instruments, committees, stats, services |
| Every enum value used in content has a label in `messages/en.json` (facets never show raw slugs) | all enums |

### 2.3 TODO_CONFIRM encoding
| Situation | Encoding | Production rendering |
|---|---|---|
| Placeholder copy | `"bio": "TODO_CONFIRM: Coordinator of IICE and faculty in the Department of Chemistry."` | Prefix stripped; text shown |
| Unknown number or amount | `"value": null` + `"_status": "TODO_CONFIRM"` | Item hidden or "To be announced" (per component) |
| Unknown date | omit the optional date + `"_status": "TODO_CONFIRM"` + `_note` | Date not shown |
| Whole entry unverified | `"_status": "TODO_CONFIRM", "_note": "Confirm current membership"` | Rendered; listed in reports |

`npm run todo:confirm` finds all three by scanning for the literal `TODO_CONFIRM`.

---

## 3. Content directory layout

```
content/
  settings/site.json            singleton  SiteSettings
  settings/navigation.json      singleton  Navigation
  pages/*.mdx                   collection Page            (about, directors-message, ecosystem, support-funding,
                                                            birac-edge, student-innovators, privacy, terms, …)
  pages/home.json               singleton  HomePage
  announcements/*.json          collection Announcement
  stats.json                    singleton  Stat[]
  ecosystem-tiles.json          singleton  EcosystemTile[]
  paths.json                    singleton  PathCard[]
  stages/*.mdx                  collection Stage           (exactly: catalyse, culture, commercialise)
  tracks/*.json                 collection Track           (subset of: physical, virtual, pre-incubation, co-development)
  funding-schemes/*.json        collection FundingScheme
  opportunities/*.json          collection Opportunity     (open calls; drives the status pill)
  startups/*.md                 collection Startup
  spotlight.json                singleton  SpotlightItem[]
  milestones.json               singleton  Milestone[]
  events/*.md                   collection Event
  event-series/*.json           collection EventSeries
  news/*.md                     collection NewsPost
  press/*.json                  collection PressItem       (In the News)
  documents/*.json              collection Document        (files in public/documents/)
  people/*.json                 collection Person
  committees/*.json             collection Committee       (exactly: managing, executive,
                                                            technical-evaluation, management-advisory)
  mentors/*.json                collection Mentor
  testimonials/*.json           collection Testimonial
  partners/*.json               collection Partner
  facilities/*.json             collection Facility
  instruments/*.json            collection Instrument      (with rate cards)
  services/*.json               collection Service         (IP & tech transfer, testing, co-development, regulatory)
  jobs/*.md                     collection Job
  faqs/*.json                   collection FaqGroup        (apply, general, stage-specific)
  innovation-club.json          singleton  InnovationClub
  media/…                       binary     images and logos (originals)
```

---

## 4. Collection schemas

### 4.1 SiteSettings (`settings/site.json`)
```ts
export const SiteSettings = z.object({
  name: z.literal("Innovation and Incubation Centre for Entrepreneurship"),
  shortName: z.literal("IICE"),
  hostInstitute: z.object({ name: z.string(), url: ExternalUrl, logo: Logo }),
  coBranding: z.array(z.object({ name: z.string(), logo: Logo, url: ExternalUrl })),  // DST, NSTEDB, …
  logo: z.object({ light: Logo, dark: Logo }),
  address: z.object({
    lines: z.array(z.string()).min(2),   // ["2nd Floor, Main Building, IISER Bhopal", "Bhauri, Bhopal Bypass Road"]
    city: z.literal("Bhopal"), postalCode: z.literal("462066"),
    region: z.literal("Madhya Pradesh"), country: z.literal("IN"),
    geo: z.object({ lat: z.number(), lng: z.number() }).optional(),     // TODO_CONFIRM
  }),
  phones: z.array(z.object({ label: z.string(), number: PhoneIN })),
  emails: z.array(z.object({ label: z.string(), address: Email })),
  incubationSupport: z.object({ phone: PhoneIN, email: Email }),
  contactChannels: z.array(z.object({        // contact by intent (FR-CONTACT-2)
    intent: z.enum(["incubation", "partnerships-investors", "facilities-bookings", "media", "general"]),
    label: z.string(), email: Email.optional(), phone: PhoneIN.optional(), person: z.string().optional(),
  })).min(1),
  officeHours: z.string().optional(),        // e.g. "Mon–Fri 9:30 am–5:30 pm IST" (TODO_CONFIRM)
  directionsUrl: ExternalUrl.optional(),
  responseTime: z.string().optional(),       // shown only if IICE commits, e.g. "within 2 working days"
  grievanceOfficer: z.object({ name: z.string(), designation: z.string(), email: Email }).optional(),  // FR-LEGAL-1
  intakeStatusOpportunity: Slug.optional(),  // which opportunity drives the header pill (else soonest-closing headline)
  socials: z.object({                    // only real profile URLs; missing ⇒ icon hidden
    linkedin: ExternalUrl.optional(), x: ExternalUrl.optional(), instagram: ExternalUrl.optional(),
    youtube: ExternalUrl.optional(), facebook: ExternalUrl.optional(),
  }).refine(s => Object.values(s).every(u => !u || !/^https:\/\/(www\.)?(linkedin|x|twitter|instagram|youtube|facebook)\.com\/?$/.test(u)),
            "social URL must point to a profile, not the platform homepage"),
  startupPortalUrl: ExternalUrl.optional(),
  mapEmbedUrl: ExternalUrl.optional(),
  footerGroups: z.array(z.object({ title: z.string(), links: z.array(z.object({ label: z.string(), href: Href })) })).length(4),
}).merge(EntryStatus);
```
Seed values (from `requirements.txt` §2): phones `+91 755 269 2384/85/86/87` (stored as four entries), emails `iice@iiserb.ac.in`, `office_iice@iiserb.ac.in`.

### 4.2 Navigation (`settings/navigation.json`)
```ts
const NavLink = z.object({ label: z.string().max(40), href: InternalHref, description: z.string().max(90).optional() });
export const Navigation = z.object({
  primary: z.array(z.object({
    label: z.string(), href: InternalHref.optional(),
    groups: z.array(z.object({ title: z.string(), links: z.array(NavLink).min(1) })).optional(),
  })).max(7),
  cta: z.object({ label: z.literal("Apply for Incubation"), href: z.literal("/apply/") }),
});
// Build check: every href resolves to a generated route (no "#", no 404).
```

### 4.3 Page (`pages/*.mdx` front matter) and HomePage (`pages/home.json`)
```ts
export const Page = Base.extend({
  title: Text, description: z.string().max(160), eyebrow: z.string().optional(),
  hero: Image.optional(), ogImage: Image.optional(),
  sections: z.array(z.string()).optional(),        // optional on-page TOC
});  // body = MDX

export const HomePage = z.object({
  hero: z.object({
    headline: z.string(),                         // emphasis marked with *word*
    subcopy: z.string().max(180),
    primaryCta: z.object({ label: z.string(), href: Href }),
    secondaryCta: z.object({ label: z.string(), href: Href }),
    poster: Image.optional(),
  }),
  sectionTitles: z.record(z.string(), z.object({ eyebrow: z.string(), title: z.string(), subline: z.string().optional() })),
  pitchBand: z.object({ title: z.string(), body: z.string() }),
}).merge(EntryStatus);
```

### 4.4 Announcement (`announcements/*.json`)
```ts
export const Announcement = Base.extend({
  text: z.string().max(120),
  kind: z.enum(["open-call", "hiring", "event-registration", "notice"]),
  href: Href.optional(),
  startsAt: IsoDateTime,
  expiresAt: IsoDateTime,                          // required: nothing lives forever
  priority: z.number().int().min(0).max(9).default(5),
});
```

### 4.5 Stat (`stats.json`)
```ts
export const Stat = z.discriminatedUnion("kind", [
  EntryStatus.extend({
    kind: z.literal("manual"),
    id: Slug,
    label: z.string().max(40),                     // "Startups incubated"
    value: z.number().nonnegative().nullable(),    // null ⇒ unconfirmed, hidden in production
    unit: z.enum(["count", "inr", "sqft", "hours", "percent"]).default("count"),  // formatted by formatINR/formatNumber
    plus: z.boolean().default(false),              // renders "+" once (never "600++")
    asOf: IsoDate.optional(),
    source: z.string().optional(),                 // required when value !== null
    order: z.number().int(),
    showOnHome: z.boolean().default(true),
  }).refine(s => s.value === null || !!s.source, "confirmed stats need a source"),
  EntryStatus.extend({
    kind: z.literal("derived"),                    // computed by src/content/derived.ts; cannot contradict listings
    id: Slug,
    label: z.string().max(40),
    derive: z.enum(["startups-total", "startups-current", "startups-graduated", "pre-startups",
                    "events-held", "scheme-beneficiaries", "mentors", "partners", "instruments"]),
    order: z.number().int(),
    showOnHome: z.boolean().default(true),
  }),
]);
```
Candidate manual stats (all TODO_CONFIRM, from the reference audit): funds raised by startups · employment generated · startup revenue · patents filed · awards · mentoring hours · sector experts.
Seed: `incubation-space` with value `10000`, suffix ` sq ft`, source "IICE website (legacy) / requirements.txt". All other stats are `null` + TODO_CONFIRM. The legacy list of 14 startup names supports a "startups incubated" stat **only once IICE confirms that the total is current**.

### 4.6 EcosystemTile (`ecosystem-tiles.json`) and PathCard (`paths.json`)
```ts
export const EcosystemTile = EntryStatus.extend({
  id: Slug, icon: LucideIcon, title: z.string().max(32),
  short: z.string().max(70), long: z.string().max(240), href: InternalHref.optional(),
});
export const PathCard = EntryStatus.extend({
  audience: z.enum(["founders", "students", "mentors", "investors-partners"]),
  title: z.string(), blurb: z.string().max(140), icon: LucideIcon,
  links: z.array(z.object({ label: z.string(), href: InternalHref })).min(2).max(3),
});
```

### 4.7 Stage (`stages/*.mdx`) and FundingScheme (`funding-schemes/*.json`)
```ts
export const Money = z.object({
  min: z.number().nonnegative().nullable(), max: z.number().nonnegative().nullable(),
  currency: z.literal("INR"), display: z.string().optional(),   // "Up to ₹10 lakh"; derived if absent
});

export const Stage = Base.extend({
  slug: StageSlug,
  order: z.number().int().min(1).max(3),
  name: z.string(),                    // "Catalyse"
  phase: z.enum(["Pre-incubation", "Incubation", "Acceleration"]),
  tagline: z.string().max(60),         // stage-strip line
  oneLiner: z.string().max(140),
  audience: z.array(z.string()).min(1),
  duration: z.string().nullable(),     // "Up to 6 months" | null ⇒ TBA
  fundingBand: Money.nullable(),
  schemeSlugs: z.array(Slug),
  offerings: z.array(z.string()).min(3),          // "What you get" checklist
  programFlow: z.array(z.object({ label: z.string(), detail: z.string().optional() })).default([]),  // workshops → demo day
  outcomes: z.array(z.string()).default([]),      // what a team has at the end
  selectionSteps: z.array(z.object({ label: z.string(), detail: z.string().optional() })).default([]),
  sectors: z.array(Sector).default([]),
  exitCriteria: z.array(z.string()).optional(),   // milestones to graduate to next stage
  faqGroup: Slug.optional(),
});  // body = MDX; next stage is derived from `order`

export const Track = Base.extend({
  slug: TrackSlug,
  name: z.string(),                               // "Virtual incubation"
  forWhom: z.string().max(160),
  duration: z.string().nullable(),
  includes: z.array(z.string()).min(2),
  terms: z.string().nullable(),                   // fees/equity; null ⇒ "To be confirmed"
  order: z.number().int(),
});  // Apply link is derived: /apply/?track={slug}

const Step = z.object({ label: z.string(), detail: z.string().optional() });
export const FundingScheme = Base.extend({
  name: z.string(),                    // official scheme name as spelt by its owner
  provider: z.string(),                // "DST NIDHI", "BIRAC", …
  oneLiner: z.string().max(140),       // must be unique across schemes
  atAGlance: z.object({                // FR-SCHEME-1; null fields render "To be confirmed"
    maxSupport: Money.nullable(),
    duration: z.string().nullable(),
    purpose: z.string().nullable(),
    fundingAgency: z.string().nullable(),
    expectedOutput: z.string().nullable(),
    whoCanApply: z.string().nullable(),
  }),
  benefits: z.array(z.string()).default([]),
  eligibility: z.array(z.string()),
  coveredUses: z.array(z.string()).default([]),
  nonPermittedUses: z.array(z.string()).default([]),
  importantPoints: z.array(z.string()).default([]),   // e.g. no parallel grants
  selectionSteps: z.array(Step).default([]),
  screeningDuration: z.string().nullable().optional(), // "6–8 weeks" (TODO_CONFIRM)
  documentsRequired: z.array(z.string()).default([]),
  window: Window,                                      // status derived (FR-SCHEME-4)
  stageSlugs: z.array(StageSlug).min(1),
  sectorFocus: z.array(Sector).default([]),
  cohorts: z.array(z.object({                          // FR-SCHEME-3
    label: z.string(),                                 // "Cohort 1"
    year: z.number().int().optional(),
    beneficiaries: z.array(z.object({ name: z.string(), oneLiner: z.string().max(140), startupSlug: Slug.optional() })),
  })).default([]),
  howToApply: z.string().optional(),
  externalPortalUrl: ExternalUrl.optional(),
  officialUrl: ExternalUrl.optional(),
  contact: z.object({ email: Email.optional(), phone: PhoneIN.optional() }).optional(),
  faqGroup: Slug.optional(),
  image: Image.optional(),
  lastReviewed: IsoDate.nullable(),
});

export const Opportunity = Base.extend({
  title: z.string().max(110),
  kind: OpportunityKind,
  sponsor: z.string(),                            // "IICE", "BIRAC", a corporate partner…
  summary: z.string().max(240),
  eligibilityLine: z.string().max(140).optional(),
  window: Window,
  applyHref: Href,
  schemeSlug: Slug.optional(), eventSlug: Slug.optional(), trackSlug: TrackSlug.optional(),
  headline: z.boolean().default(false),           // eligible to drive the header status pill
});
```
Every scheme starts as `_status: "TODO_CONFIRM"` until IICE confirms that it administers the scheme (SRD Q4). Tracks exist as files only once IICE confirms them (SRD Q8).

### 4.8 Startup (`startups/*.md`)
```ts
export const Startup = Base.extend({
  name: z.string(),
  legalName: z.string().optional(),               // "Xtalsphere Pvt Ltd"
  logo: Logo.optional(),                          // missing ⇒ monogram
  oneLiner: z.string().max(120),
  sectors: z.array(Sector).min(1),
  stage: StageSlug.nullable(),
  status: StartupStatus,
  track: TrackSlug.nullable().optional(),
  schemeSlugs: z.array(Slug).default([]),         // funded by (FR-START-5)
  location: z.object({ city: z.string(), state: z.string() }).optional(),
  tags: z.array(z.string().max(30)).max(8).default([]),   // finer-grained than sectors, e.g. "MedTech"
  story: z.object({                               // FR-START-6; Problem → Approach → Outcome
    problem: z.string().max(600), approach: z.string().max(600), outcome: z.string().max(600),
  }).optional(),
  cohortYear: z.number().int().min(2015).max(2100).nullable(),
  foundedYear: z.number().int().nullable().optional(),
  affiliation: Affiliation.nullable(),
  founders: z.array(z.object({ name: z.string(), role: z.string().optional(), linkedin: ExternalUrl.optional() })).default([]),
  website: ExternalUrl.optional(),
  socials: z.object({ linkedin: ExternalUrl.optional(), x: ExternalUrl.optional() }).optional(),
  recognitions: z.array(z.object({
    type: z.enum(["award", "grant", "patent", "funding", "other"]),
    title: z.string(), year: z.number().int().optional(), url: ExternalUrl.optional(),
  })).default([]),
  featured: z.boolean().default(false),           // eligible for the home logo carousel
  gallery: z.array(Image).max(8).default([]),
});  // body = Markdown description
```
**Seed (names only, from legacy `startups.html`; everything else TODO_CONFIRM):** Plabeltech Pvt Ltd · Intisen Technology Pvt Ltd · Adit Bioscience Pvt Ltd · Powernet Technology Pvt Ltd · Richnex Skinscience Laboratory Pvt Ltd · Konarq Technologies · Protomate AI Pvt Ltd · SimDaas Autonomy Pvt Ltd · Miniguru T-Labs · Beyond Limit Devices · Xtalsphere Pvt Ltd · Luminojen Pvt Ltd · MBiosys Pvt Ltd · Cytoforge Therapeutics Pvt Ltd.

### 4.9 SpotlightItem (`spotlight.json`) and Milestone (`milestones.json`)
```ts
export const SpotlightItem = EntryStatus.extend({
  id: Slug,
  badge: SpotlightBadge,
  title: z.string().max(48),
  description: z.string().max(140),
  image: Image.optional(),                        // absent ⇒ text-card treatment
  href: Href,
  startupSlug: Slug.optional(),
});
export const Spotlight = z.array(SpotlightItem).min(3).max(8);

export const Milestone = EntryStatus.extend({
  id: Slug, year: z.number().int(), title: z.string().max(48),
  description: z.string().max(200), image: Image.optional(), href: Href.optional(),
});
```

### 4.10 Event (`events/*.md`) and EventSeries (`event-series/*.json`)
```ts
export const Event = Base.extend({
  title: z.string(),
  type: z.enum(["talk", "workshop", "webinar", "conclave", "programme", "outreach", "visit", "exhibition", "competition"]),
  seriesSlug: Slug.optional(),
  edition: z.string().max(20).optional(),         // "3.0", "Episode 2" (FR-EVENTS-6)
  startsAt: IsoDateTime,                          // IST offset +05:30
  endsAt: IsoDateTime.optional(),
  allDay: z.boolean().default(false),
  mode: z.enum(["in-person", "online", "hybrid"]),
  venue: z.object({ name: z.string(), address: z.string().optional(), mapUrl: ExternalUrl.optional() }).optional(),
  summary: z.string().max(200),
  people: z.array(z.object({                      // grouped by role on the page
    role: z.enum(["chief-guest", "guest-of-honour", "speaker", "panellist", "moderator", "jury", "host"]),
    name: z.string(), designation: z.string().optional(), organisation: z.string().optional(),
    personSlug: Slug.optional(), url: ExternalUrl.optional(),
  })).default([]),
  timeline: z.array(z.object({ date: IsoDate, label: z.string() })).default([]),   // rounds (FR-EVENTS-7)
  agenda: z.array(z.object({
    day: z.number().int().min(1), start: z.string().regex(/^\d{2}:\d{2}$/), end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    title: z.string(), room: z.string().optional(), speakerNames: z.array(z.string()).default([]),
  })).default([]),
  results: z.array(z.object({ award: z.string(), name: z.string(), startupSlug: Slug.optional() })).default([]),
  facts: z.array(z.object({ label: z.string(), value: z.number().nullable() })).default([]),  // e.g. applications received; null ⇒ hidden
  agendaPdf: z.string().regex(/^documents\/[\w.-]+\.pdf$/).optional(),
  organisers: z.array(z.string()).default(["IICE, IISER Bhopal"]),
  partnerSlugs: z.array(Slug).default([]),
  sponsor: z.string().optional(),                 // "ESDP Division, Ministry of MSME, Govt. of India"
  registration: z.object({ url: Href, closesAt: IsoDateTime.optional() }).optional(),
  recordingUrl: ExternalUrl.optional(),           // shown after the event (youtube-nocookie embed on click)
  cover: Image.optional(),
  gallery: z.array(Image).max(24).default([]),
  legacyPath: z.string().optional(),              // e.g. "/activities/aesdp" → redirect source
});  // body = Markdown

export const EventSeries = Base.extend({
  name: z.string(), tagline: z.string().max(100), description: z.string(), cover: Image.optional(),
});
```
Derived (never stored): `status` = `upcoming | ongoing | past` (computed in IST at build **and** on the client); `registrationOpen`; `.ics` file.

**Legacy events to migrate** (dates from the legacy site; verify with IICE):
| Slug (proposed) | Title | Date(s) | Type | Notes |
|---|---|---|---|---|
| `iisf-2022-startup-conclave` | IICE at the 8th India International Science Festival (IISF) 2022 | 2023-01-21 → 2023-01-24 | exhibition | Bhopal |
| `startup-studio-lab-to-market` | The Start-up Studio: Lab to Market, paths and opportunities for commercialisation | 2023-03-29 16:30 | webinar | Series `the-start-up-studio`. **Legacy says "Thursday", but 29 Mar 2023 was a Wednesday: TODO_CONFIRM**. Recording link was stripped in the mirror |
| `truba-pharmacy-visit-2023` | Visit by Truba Institute of Pharmacy students | 2023-04-11 | visit | |
| `birac-big-call-23-outreach` | BIRAC BIG Call '23: outreach session | 2023-07-21 16:00–17:00 | outreach | With FITT, IIT Delhi; LHC L-2 |
| `nurturing-sustainable-incubation-ecosystem` | Talk: Nurturing a Sustainable Incubation Ecosystem | 2024-01-16 | talk | |
| `e-cell-launch-startup-mentoring` | Launch of the IISER Bhopal E-Cell and startup mentoring sessions | TODO_CONFIRM | programme | No date on the legacy site |
| `a-esdp-data-science-2026` | Advanced Entrepreneurship and Skill Development Programme: Data Science and Data Analytics | 2026-02-23 → 2026-02-27 | programme | With EECS; sponsor MSME ESDP |
| `ramp-mp-laghu-udyog-nigam-orientation-2026` | RAMP exposure-cum-orientation programme with MP Laghu Udyog Nigam | 2026-05-07 | programme | ≈30 participants |
| `ramp-msme-exposure-session-2026` | RAMP MSME exposure session on incubation ecosystem development | 2026-05-11 | programme | |
| `industry-academia-conclave-2026` | Industry–Academia Conclave 2.0 | 2026-08-08 | conclave | BIRAC EDGE scheme announced |

### 4.11 NewsPost (`news/*.md`)
```ts
export const NewsPost = Base.extend({
  title: z.string().max(110), date: IsoDate, summary: z.string().max(200),
  cover: Image.optional(), tags: z.array(z.string()).default([]),
  author: z.string().default("IICE Team"),
  relatedEventSlug: Slug.optional(), relatedStartupSlugs: z.array(Slug).default([]),
  externalUrl: ExternalUrl.optional(),            // for press coverage items
});  // body = Markdown

export const PressItem = Base.extend({            // In the News (FR-ABOUT-10)
  title: z.string().max(140), outlet: z.string(), date: IsoDate,
  type: z.enum(["article", "video", "podcast"]),
  url: ExternalUrl,
  startupSlug: Slug.optional(), eventSlug: Slug.optional(),
});
```

### 4.12 Document (`documents/*.json`)
```ts
export const Document = Base.extend({
  title: z.string(),
  category: z.enum(["policy", "resolution", "bylaws", "template", "report", "annual-report", "guideline", "usage-policy"]),
  // "tender" is added only if IICE publishes tenders (SRD Q13)
  date: IsoDate.nullable(),
  version: z.string().regex(/^v?\d+(\.\d+)*$/).optional(),
  file: z.string().regex(/^documents\/[\w.-]+\.pdf$/),     // public/documents/…
  fileSizeKB: z.number().int().positive().optional(),       // filled by the build if absent
  pages: z.number().int().positive().optional(),
  summary: z.string().max(240).optional(),
  supersededBy: Slug.optional(),                            // older versions point to the newer one
  language: z.enum(["en", "hi", "en-hi"]).default("en"),
});
```
Seed (files to be supplied): `incubation-policy` ("IICE Incubation Policy", legacy file `IICE Incubation Policy (IICE TBI IISERB)-3-22.pdf`), `by-laws` ("IICE By-Laws", legacy `IICE BY Laws_merged.pdf`), `business-proposal-format` (template; the legacy Apply page linked it, but it was never available in the mirror), and `pitch-deck-template` (template, new). Rename the legacy files on import: no spaces or parentheses (`incubation-policy-2022.pdf`).

### 4.13 Person (`people/*.json`), Committee (`committees/*.json`), Mentor (`mentors/*.json`)
```ts
export const Person = Base.extend({
  name: z.string(),                               // "Bharathwaj Sathyamoorthy"
  honorific: z.enum(["Prof.", "Dr.", "Mr.", "Ms.", "Mx."]).optional(),
  designation: z.string().optional(),             // institutional title, e.g. "Dean, R&D"
  team: z.object({ role: z.string(), order: z.number().int() }).optional(),  // present ⇒ listed on Team tab
  email: Email.optional(), phone: PhoneIN.optional(),
  photo: Image.optional(),
  bio: z.string().max(600).optional(),
  links: z.object({ profile: ExternalUrl.optional(), linkedin: ExternalUrl.optional() }).optional(),
});

export const Committee = Base.extend({
  slug: z.enum(["managing", "executive", "technical-evaluation", "management-advisory"]),
  name: z.string(), description: z.string().optional(),
  asOf: IsoDate.nullable(),
  members: z.array(z.object({
    personSlug: Slug,
    committeeRole: z.string(),                    // "President", "Member Secretary", "Coordinator", "Member"
    order: z.number().int(),
  })),                                            // may be empty ⇒ "Composition being updated"
});

export const Mentor = Base.extend({
  personSlug: Slug,
  title: z.string(),                              // separate from organisation (no combined "role @ org" line)
  organisation: z.string(),
  types: z.array(MentorType).min(1),              // facet
  sectors: z.array(Sector).default([]),           // facet
  location: z.string().optional(),                // facet (city)
  expertise: z.array(z.string()).min(1),          // tags
  availability: z.enum(["open", "limited", "closed"]).default("open"),
});
```
Seed: Team (Coordinator, CEO, Project Office Associate) and the members of Managing (7), Executive (6) and TEC (9) from the legacy pages, **all with `_status: TODO_CONFIRM`, `_note: "Verify current roster"`** (SRD L10, Q1–Q2). Fix the legacy typos "Tresurer" → "Treasurer" and "Deputing" → "Deputy". The Management Advisory Committee starts empty.

### 4.14 Testimonial, Partner, Facility, Job, FAQ, InnovationClub
```ts
export const Testimonial = Base.extend({
  quote: z.string().min(40).max(320),
  name: z.string(), role: z.string(), startupSlug: Slug.optional(),
  track: TrackSlug.optional(), stage: StageSlug.optional(), year: z.number().int().optional(),
  photo: Image.optional(),
  // validation: when startupSlug is set, `name` must be one of that startup's founders (audit: misattributed quotes)
  consent: z.object({ given: z.literal(true), date: IsoDate, method: z.enum(["email", "form", "signed"]) }),
  // No consent ⇒ the entry fails validation. Testimonials are never invented.
});

export const Partner = Base.extend({
  name: z.string(), logo: Logo, url: ExternalUrl.optional(),
  category: PartnerCategory,
  showOnHome: z.boolean().default(false),         // home wall shows funders/host + selected partners
  since: z.number().int().optional(),
  order: z.number().int().default(100),
});

export const Facility = Base.extend({
  name: z.string(),
  category: z.enum(["workspace", "labs-instruments", "support-services", "campus-amenities"]),
  description: z.string().max(240),
  facts: z.object({                               // FR-FAC-2; null ⇒ hidden
    areaSqFt: z.number().nullable(), seats: z.number().int().nullable(),
    privateOffices: z.number().int().nullable(), meetingRooms: z.number().int().nullable(),
    accessHours: z.string().nullable(),
  }).partial().default({}),
  externalUrl: ExternalUrl.optional(),            // e.g. IISER Bhopal CIF page (link instead of duplicating)
  bookable: z.boolean().default(false),
  images: z.array(Image).max(6).default([]),
});

export const Instrument = Base.extend({            // FR-FAC-3
  name: z.string(),
  category: InstrumentCategory,
  make: z.string().optional(), model: z.string().optional(),
  specs: z.array(z.string()).max(6).default([]),
  useCases: z.array(z.string()).max(4).default([]),
  image: Image.optional(),
  access: z.enum(["self-use-after-training", "operator-assisted", "via-cif"]),
  facilitySlug: Slug.optional(),
  status: z.enum(["available", "under-maintenance", "retired"]).default("available"),
  rateCard: z.array(z.object({
    userCategory: UserCategory,
    rate: z.number().nonnegative().nullable(),    // null ⇒ "On request" / TODO_CONFIRM
    unit: z.enum(["hour", "sample", "day", "run"]),
    gstIncluded: z.boolean(),
    minimumBilling: z.string().optional(),
  })).default([]),                                // ≤ 1 row per userCategory (validated)
  bookingNotes: z.string().max(300).optional(),
  lastReviewed: IsoDate.nullable(),
});

export const Service = Base.extend({               // FR-SERV-1
  name: z.string(),
  kind: z.enum(["ip-tech-transfer", "testing-validation", "co-development", "regulatory", "other"]),
  summary: z.string().max(200),
  whoCanUse: z.array(z.string()).min(1),
  turnaround: z.string().nullable(),
  howToEngage: z.string(),
  contactEmail: Email.optional(),
  relatedInstrumentSlugs: z.array(Slug).default([]),
  lastReviewed: IsoDate.nullable(),
});

export const Job = Base.extend({
  title: z.string(),
  track: z.enum(["work-with-iice", "work-with-startups"]),
  employer: z.union([z.literal("IICE"), z.object({ startupSlug: Slug })]),
  type: z.enum(["full-time", "part-time", "internship", "fellowship", "contract"]),
  location: z.string().default("IISER Bhopal"),
  skills: z.array(z.string()).max(10).default([]),
  contactPerson: z.string().optional(),
  postedAt: IsoDate, closesAt: IsoDate,           // auto-hidden after closesAt (client + daily rebuild)
  apply: z.object({ url: ExternalUrl.optional(), email: Email.optional() })
           .refine(a => a.url || a.email, "provide an apply URL or email"),
  advertPdf: z.string().regex(/^documents\/.+\.pdf$/).optional(),
});  // body = Markdown

export const FaqGroup = Base.extend({
  title: z.string(),
  items: z.array(z.object({ q: z.string(), a: z.string() })).min(1),   // a = Markdown
});

export const InnovationClub = EntryStatus.extend({
  tagline: z.string(),                            // "An idea to reality"
  intro: z.string(),
  pillars: z.array(z.object({ name: z.string(), text: z.string() })).length(3),  // Culture · Conduct · Connect
  objectives: z.array(z.string()).min(1),
  currentMembers: z.array(z.object({ name: z.string(), programme: z.string(), batch: z.number().int() })).default([]),
  pastMembers: z.array(z.object({ name: z.string(), programme: z.string(), batch: z.number().int() })),
});
```
Innovation Club seed: 11 legacy entries, deduplicated to **10** ("Shashank Singh, BS-MS 2019" was listed twice).

---

## 5. Form submission contracts (endpoint API)

### 5.1 Transport
```
POST {NEXT_PUBLIC_FORM_ENDPOINT}
Content-Type: text/plain;charset=utf-8       ← JSON string body; avoids CORS preflight (TRD §10.1)
Body: FormEnvelope (JSON)
```

### 5.2 Envelope (all forms)
```ts
export const FormEnvelope = z.object({
  formType: z.enum(["contact", "pitch", "application", "mentor", "partner", "booking", "newsletter"]),
  schemaVersion: z.literal(1),
  submittedAt: IsoDateTime,                     // client clock; the server also stamps receivedAt
  startedAt: IsoDateTime,                       // fill-time check (≥ 3 s)
  pageUrl: z.string().url(),
  locale: z.enum(["en", "hi"]).default("en"),
  website: z.string().max(0),                   // HONEYPOT: must be empty
  consent: z.literal(true),                     // privacy notice accepted
  data: z.unknown(),                            // validated by formType below
});
```

### 5.3 Contact
```ts
export const ContactData = z.object({
  name: z.string().trim().min(2).max(100),
  email: Email,
  phone: z.string().regex(/^[+\d][\d\s-]{7,17}$/).optional(),
  organisation: z.string().max(120).optional(),
  topic: z.enum(["incubation", "partnership-funding", "mentoring", "facilities-bookings", "media", "careers", "birac-edge", "event-invite", "other"]),
  message: z.string().trim().min(20).max(3000),
});
```

### 5.4 Pitch to Us (short form)
```ts
export const PitchData = z.object({
  name: z.string().trim().min(2).max(100),
  email: Email,
  phone: z.string().regex(/^[+\d][\d\s-]{7,17}$/).optional(),
  ventureName: z.string().trim().min(2).max(100),
  oneLiner: z.string().trim().min(20).max(200),
  stage: z.enum(["idea", "proof-of-concept", "prototype", "early-revenue", "scaling"]),
  sector: Sector,
  affiliation: Affiliation,
  assistanceSought: z.array(z.enum(["incubation-space", "lab-access", "mentoring", "funding", "ip-legal", "market-access"])).default([]),
  deckUrl: ExternalUrl.optional(),               // optional: never block a pitch for lack of a deck
});
```

### 5.5 Application for incubation (multi-step)
```ts
export const ApplicationData = z.object({
  context: z.object({                            // pre-filled from ?track=&stage=&scheme= (FR-APPLY-7); editable
    track: TrackSlug.optional(), stage: StageSlug.optional(), schemeSlug: Slug.optional(), opportunitySlug: Slug.optional(),
  }).default({}),
  applicant: z.object({
    name: z.string().trim().min(2).max(100),
    email: Email,
    phone: z.string().regex(/^[+\d][\d\s-]{7,17}$/),
    affiliation: Affiliation,
    institution: z.string().max(160).optional(),
    iiserbMentor: z.object({ name: z.string().min(2), email: Email, department: z.string().optional() }).optional(),
    linkedin: ExternalUrl.optional(),
  }),
  venture: z.object({
    name: z.string().min(2).max(100),
    incorporated: z.boolean(),
    legalEntity: z.enum(["pvt-ltd", "llp", "partnership", "proprietorship", "section-8", "not-yet"]).optional(),
    incorporationDate: IsoDate.optional(),
    website: ExternalUrl.optional(),
    sector: Sector,                             // = legacy thrust area
    stage: z.enum(["idea", "proof-of-concept", "prototype", "early-revenue", "scaling"]),
    problem: z.string().min(50).max(1500),
    solution: z.string().min(50).max(1500),
    market: z.string().min(30).max(1500),
    teamSize: z.number().int().min(1).max(500),
    team: z.array(z.object({ name: z.string(), role: z.string(), email: Email.optional() })).max(10).default([]),
    fundingToDate: z.string().max(300).optional(),   // free text; no invented structure
  }),
  technology: z.object({
    ipStatus: z.enum(["none", "in-preparation", "filed", "granted", "licensed-in"]),
    developedAtIiserb: z.boolean(),
    ipDetails: z.string().max(1500).optional(),
    patentNumbers: z.array(z.string().max(40)).max(10).default([]),
    ipDocsUrl: ExternalUrl.optional(),          // shareable link (v1 has no uploads)
  }),
  needs: z.object({
    preferredStage: StageSlug,
    officeSeats: z.number().int().min(0).max(50),
    labSpace: z.boolean(),
    equipment: z.string().max(800).optional(),
    mentoringAreas: z.array(z.enum(["technical", "business", "ip-legal", "regulatory", "fundraising", "marketing"])).default([]),
  }),
  documents: z.object({
    businessPlanUrl: ExternalUrl,               // required (legacy requirement: business plan)
  }),
  declarations: z.object({
    infoAccurate: z.literal(true),
    agreeToPolicy: z.literal(true),             // IICE Incubation Policy
  }),
})
.superRefine((d, ctx) => {
  if (["partner-university", "external"].includes(d.applicant.affiliation) && !d.applicant.iiserbMentor)
    ctx.addIssue({ code: "custom", path: ["applicant", "iiserbMentor"],
      message: "Applicants from partner universities or outside IISER Bhopal need an IISER Bhopal faculty mentor or collaborator." });
  if (d.technology.developedAtIiserb && ["filed", "granted"].includes(d.technology.ipStatus) && !d.technology.ipDocsUrl)
    ctx.addIssue({ code: "custom", path: ["technology", "ipDocsUrl"],
      message: "For IP developed at IISER Bhopal, share a link to the filed or granted patent application." });
  if (d.venture.incorporated && !d.venture.legalEntity)
    ctx.addIssue({ code: "custom", path: ["venture", "legalEntity"], message: "Select the legal entity type." });
});
```
Multi-step mapping: Step 1 `applicant` · Step 2 `venture` · Step 3 `technology` + `documents` · Step 4 `needs` · Step 5 review + `declarations`. Each step validates with `ApplicationData.shape.<key>`, and the full schema runs on submit.

### 5.5a Become a mentor
```ts
export const MentorData = z.object({
  name: z.string().trim().min(2).max(100),
  email: Email,
  phone: z.string().regex(/^[+\d][\d\s-]{7,17}$/).optional(),
  linkedin: ExternalUrl.optional(),
  title: z.string().max(100), organisation: z.string().max(120),
  types: z.array(MentorType).min(1),
  sectors: z.array(Sector).min(1),
  expertise: z.string().min(20).max(800),
  engagement: z.array(z.enum(["one-to-one", "workshops", "jury-evaluation", "office-hours", "investor-connect"])).min(1),
  hoursPerMonth: z.number().int().min(1).max(40).optional(),
});
```

### 5.5b Partner / co-invest / CSR
```ts
export const PartnerData = z.object({
  name: z.string().trim().min(2).max(100),
  designation: z.string().max(100),
  organisation: z.string().max(160),
  email: Email,
  phone: z.string().regex(/^[+\d][\d\s-]{7,17}$/).optional(),
  partnershipType: z.array(z.enum(["co-invest", "csr", "sponsor-challenge", "pilot-customer", "academic", "mentor-network", "other"])).min(1),
  sectorFocus: z.array(Sector).default([]),
  fundsAvailable: z.string().max(100).optional(),   // free text; never required
  message: z.string().trim().min(20).max(2000),
});
```

### 5.5c Facility / instrument booking request
```ts
export const BookingData = z.object({
  name: z.string().trim().min(2).max(100),
  email: Email,
  phone: z.string().regex(/^[+\d][\d\s-]{7,17}$/),
  organisation: z.string().max(160),
  userCategory: UserCategory,
  facilitySlug: Slug.optional(), instrumentSlug: Slug.optional(),
  preferredDates: z.array(IsoDate).min(1).max(3),
  durationEstimate: z.string().max(60),           // "4 hours", "12 samples"
  sampleDetails: z.string().max(800).optional(),  // type, number, hazards
  notes: z.string().max(800).optional(),
}).refine(d => d.facilitySlug || d.instrumentSlug, { message: "Choose a facility or an instrument.", path: ["instrumentSlug"] });
```

### 5.5d Newsletter (could)
```ts
export const NewsletterData = z.object({ email: Email, interests: z.array(z.enum(["calls", "events", "news"])).default(["calls", "events", "news"]) });
```

### 5.6 Responses
```ts
type FormResponse =
  | { ok: true; id: string }                                  // id = "APP-2026-000123" style reference
  | { ok: false; errors: Record<string /* dot.path */, string>; message?: string };
```
| Situation | HTTP (Apps Script always 200) | Body |
|---|---|---|
| Valid | 200 | `{ ok: true, id }` |
| Invalid fields | 200 | `{ ok: false, errors: { "applicant.email": "Enter a valid email" } }` |
| Honeypot filled / too fast | 200 | `{ ok: true, id: "SPAM" }` (silently discarded) |
| Rate-limited | 200 | `{ ok: false, errors: {}, message: "Too many submissions. Please try again later." }` |
| Server error | 200/5xx | `{ ok: false, errors: {}, message }`. The client shows a retry plus a mailto fallback |

### 5.7 Endpoint-side validation rules (mirror of Zod, for `apps-script/Code.gs`)
The endpoint re-checks: required fields present; string length limits as above; email regex; enum membership; `website` empty; `submittedAt - startedAt ≥ 3s`; `consent === true`; the three cross-field rules in §5.5. These are maintained as a JSON rules table (`apps-script/rules.json`) generated from the Zod schemas by `scripts/form-rules.ts`, so the two sides cannot drift.

---

## 6. Submission store (Google Sheet)

One spreadsheet, owned by an IICE account, with three tabs. Row 1 holds the headers. Nested data is flattened with dot paths, and arrays are stored as JSON strings.

### 6.1 Tab `contact`
| id | receivedAt | submittedAt | pageUrl | name | email | phone | organisation | topic | message | status | assignee | notes |

### 6.2 Tab `pitch`
| id | receivedAt | submittedAt | pageUrl | name | email | phone | ventureName | oneLiner | stage | sector | affiliation | deckUrl | status | assignee | notes |

### 6.3 Tab `applications`
| id | receivedAt | submittedAt | pageUrl | applicant.name | applicant.email | applicant.phone | applicant.affiliation | applicant.institution | applicant.iiserbMentor.name | applicant.iiserbMentor.email | venture.name | venture.incorporated | venture.legalEntity | venture.incorporationDate | venture.website | venture.sector | venture.stage | venture.problem | venture.solution | venture.market | venture.teamSize | venture.team (JSON) | venture.fundingToDate | technology.ipStatus | technology.developedAtIiserb | technology.ipDetails | technology.patentNumbers (JSON) | technology.ipDocsUrl | needs.preferredStage | needs.officeSeats | needs.labSpace | needs.equipment | needs.mentoringAreas (JSON) | documents.businessPlanUrl | status | assignee | notes |

### 6.4 Tabs added in 0.2
| Tab | Columns (after `id, receivedAt, submittedAt, pageUrl`) | Status flow |
|---|---|---|
| `mentors` | name, email, phone, linkedin, title, organisation, types (JSON), sectors (JSON), expertise, engagement (JSON), hoursPerMonth | `new` → `contacted` → `onboarded` / `declined` |
| `partners` | name, designation, organisation, email, phone, partnershipType (JSON), sectorFocus (JSON), fundsAvailable, message | `new` → `in-discussion` → `signed` / `closed` |
| `bookings` | name, email, phone, organisation, userCategory, facilitySlug, instrumentSlug, preferredDates (JSON), durationEstimate, sampleDetails, notes | `new` → `confirmed` → `completed` / `declined` |
| `newsletter` | email, interests (JSON), consentAt | `subscribed` / `unsubscribed` |

Each form type can have its own notification address (endpoint config, e.g. bookings → the facilities in-charge).

- `id` format: `{CON|PIT|APP|MEN|PAR|BKG|NWS}-{YYYY}-{6-digit sequence}`, generated with `LockService` to avoid duplicates.
- `status` (editable by the office): `new` → `in-review` → `shortlisted` → `tec-scheduled` → `accepted` / `declined` / `withdrawn` (applications); `new` → `responded` → `closed` (contact/pitch).
- A hidden tab `_spam` stores discarded payloads for 30 days for tuning, then a time-driven trigger purges them.
- Retention for real submissions: TODO_CONFIRM with IICE (stated on `/privacy/`).

---

## 7. Derived build artefacts
| Artefact | Path | Shape |
|---|---|---|
| Search index | `public/search-index.json` | `{ v: 1, docs: [{ id, type: "page"|"startup"|"event"|"opportunity"|"news"|"document"|"person"|"instrument", title, url, summary, keywords: string[], hint?, date? }] }` (serialised MiniSearch) |
| RSS | `public/news/rss.xml` | RSS 2.0, latest 20 news items |
| Derived counts | in-memory (`src/content/derived.ts`) | `{ startupsTotal, startupsCurrent, startupsGraduated, preStartups, eventsHeld, schemeBeneficiaries, mentors, partners, instruments }` |
| Calendar files | `public/events/{slug}.ics` | VCALENDAR / VEVENT with `UID={slug}@iice.iiserb.ac.in`, `DTSTART;TZID=Asia/Kolkata`, `SUMMARY`, `LOCATION`, `URL`, `DESCRIPTION` |
| Image manifest | `.cache/images/manifest.json` | `{ [src]: { width, height, dominant: "#hex", variants: { avif: [{w, path}], webp: [...] } } }` |
| Redirects | `public/.htaccess`, `public/_redirects`, `out/<legacy>/index.html` stubs | From one table: `src/content/redirects.ts` |
| Sitemap / robots | `out/sitemap.xml`, `out/robots.txt` | Standard |
| TODO report | stdout / CI artifact `todo-report.md` | `file · field path · note` |

---

## 8. Entity relationships

```
Stage 1──* FundingScheme (stageSlugs)          Startup *──1 Stage (stage)
Startup 1──* SpotlightItem (startupSlug)       Startup 1──* Testimonial (startupSlug)
Startup 1──* Job (employer.startupSlug)        Startup *──* NewsPost (relatedStartupSlugs)
EventSeries 1──* Event (seriesSlug)            Event *──* Partner (partnerSlugs)
Event 1──* NewsPost (relatedEventSlug)         Event *──* Person (people[].personSlug, optional)
Committee *──* Person (members[].personSlug)   Mentor 1──1 Person (personSlug)
Document 1──1 Document (supersededBy)          Stage 1──1 FaqGroup (faqGroup)
Startup *──* FundingScheme (schemeSlugs)       FundingScheme 1──* Beneficiary ──0..1 Startup (cohorts[].beneficiaries[].startupSlug)
Startup *──1 Track (track)                     Opportunity *──0..1 FundingScheme / Event / Track
Instrument *──0..1 Facility (facilitySlug)     Service *──* Instrument (relatedInstrumentSlugs)
PressItem *──0..1 Startup / Event              Testimonial ──► Startup.founders (name check)
```

If the project later moves to a relational database: one table per collection (PK `slug`); join tables for `committee_members`, `event_partners`, `news_startups` and `scheme_stages`; arrays of scalars stored as `text[]`/JSON; `_status`/`_note` kept as columns so the TODO_CONFIRM workflow survives.
