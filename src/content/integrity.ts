/**
 * Cross-entry content rules (BACKEND_SCHEMA §2.2, TRD §5). Field-level rules live in schema.ts; these need to see
 * more than one entry: references, duplicates, stats against derived counts, media, forbidden copy and hosts.
 * Pure: file-system and environment access comes in through `IntegrityContext`, so tests can use fixtures.
 */
import type { DateInput } from "@/lib/dates";
import { CLAIM_FLOORS, computeDerived, type DerivedInput } from "./derived";
import type { ContentIssue, ContentSet, Loaded } from "./loaders";
import type { CollectionKey } from "./registry";
import { ENUMS, StageSlug, CommitteeSlug } from "./schema";
import { DEFAULT_STALE_DAYS, staleEntries } from "./stale";
import { display, isFlagged } from "./todo";

export interface IntegrityContext {
  now: DateInput;
  /** Does `content/<path>` exist? Used for Image and Logo sources ("media/…"). */
  contentFileExists: (path: string) => boolean;
  /** Does `public/<path>` exist? Used for PDFs ("documents/…"). */
  publicFileExists: (path: string) => boolean;
  /** The parsed messages/en.json, for enum labels. */
  messages: unknown;
  /** Routes the site serves, e.g. "/about/team/". When given, internal links to other routes are reported. */
  knownRoutes?: ReadonlySet<string>;
  /** Is this lucide icon (kebab-case) real? */
  iconExists?: (name: string) => boolean;
  /** Reviewed-on dates older than this raise a warning. Default 180. */
  staleAfterDays?: number;
}

const FORBIDDEN_COPY: [RegExp, string][] = [
  [/\blorem\b|\bipsum\b/i, "lorem ipsum"],
  [/course name/i, '"Course Name" template text'],
  [/article name here/i, '"Article Name Here" template text'],
  [/goodwill, sam/i, '"Goodwill, Sam" template text'],
  [/coming soon/i, '"Coming soon" (a page with no content is hidden, not announced)'],
  [/sample page/i, '"Sample Page"'],
  [/\bexample\.(com|org|net)\b/i, "an example.com address"],
];

const FORBIDDEN_HOSTS =
  /(^|\.)(googleusercontent\.com|drive\.google\.com)$|(^|\.)example\.(com|org|net)$|^localhost$|^127\.0\.0\.1$|\.vercel\.app$|\.netlify\.app$/i;

const HONORIFIC = /^(prof|dr|mr|ms|mx)\.?\s+/i;
const normaliseName = (n: string) =>
  n.replace(HONORIFIC, "").toLowerCase().replace(/\s+/g, " ").trim();
const normaliseText = (t: string) => display(t).toLowerCase().replace(/\s+/g, " ").trim();

function normaliseUrl(raw: string): string | undefined {
  try {
    const u = new URL(raw);
    return `${u.hostname.replace(/^www\./, "").toLowerCase()}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return undefined;
  }
}

const routeOf = (href: string) => (href.split(/[?#]/)[0] as string) || "/";

type AnyEntry = Loaded<Record<string, unknown> & { slug: string; draft: boolean }>;

export function checkIntegrity(content: ContentSet, ctx: IntegrityContext): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const error = (file: string, path: string, message: string) =>
    issues.push({ severity: "error", file, path, message });
  const warn = (file: string, path: string, message: string) =>
    issues.push({ severity: "warning", file, path, message });

  const col = <K extends CollectionKey>(key: K) => content.collections[key];
  const entries = (key: CollectionKey) => content.collections[key] as unknown as AnyEntry[];

  // ── References ───────────────────────────────────────────────
  const slugSets = Object.fromEntries(
    (Object.keys(content.collections) as CollectionKey[]).map((key) => [
      key,
      {
        all: new Set(entries(key).map((e) => e.data.slug)),
        published: new Set(
          entries(key)
            .filter((e) => !e.data.draft)
            .map((e) => e.data.slug),
        ),
      },
    ]),
  ) as Record<CollectionKey, { all: Set<string>; published: Set<string> }>;

  function ref(
    file: string,
    path: string,
    slug: string | undefined,
    key: CollectionKey,
    referrerIsDraft = false,
  ) {
    if (slug === undefined) return;
    const sets = slugSets[key];
    if (!sets.all.has(slug)) error(file, path, `references ${key} "${slug}", which does not exist`);
    else if (!referrerIsDraft && !sets.published.has(slug))
      error(file, path, `references ${key} "${slug}", which is a draft`);
  }

  for (const { data: s, file } of col("startups")) {
    s.schemeSlugs.forEach((slug, i) =>
      ref(file, `schemeSlugs[${i}]`, slug, "fundingSchemes", s.draft),
    );
  }
  for (const { data: s, file } of col("stages")) {
    s.schemeSlugs.forEach((slug, i) =>
      ref(file, `schemeSlugs[${i}]`, slug, "fundingSchemes", s.draft),
    );
    ref(file, "faqGroup", s.faqGroup, "faqs", s.draft);
  }
  for (const { data: s, file } of col("fundingSchemes")) {
    s.cohorts.forEach((c, ci) =>
      c.beneficiaries.forEach((b, bi) =>
        ref(
          file,
          `cohorts[${ci}].beneficiaries[${bi}].startupSlug`,
          b.startupSlug,
          "startups",
          s.draft,
        ),
      ),
    );
    ref(file, "faqGroup", s.faqGroup, "faqs", s.draft);
  }
  for (const { data: o, file } of col("opportunities")) {
    ref(file, "schemeSlug", o.schemeSlug, "fundingSchemes", o.draft);
    ref(file, "eventSlug", o.eventSlug, "events", o.draft);
    ref(file, "trackSlug", o.trackSlug, "tracks", o.draft);
  }
  for (const { data: e, file } of col("events")) {
    ref(file, "seriesSlug", e.seriesSlug, "eventSeries", e.draft);
    e.partnerSlugs.forEach((slug, i) => ref(file, `partnerSlugs[${i}]`, slug, "partners", e.draft));
    e.people.forEach((p, i) =>
      ref(file, `people[${i}].personSlug`, p.personSlug, "people", e.draft),
    );
    e.results.forEach((r, i) =>
      ref(file, `results[${i}].startupSlug`, r.startupSlug, "startups", e.draft),
    );
    if (e.agendaPdf && !ctx.publicFileExists(e.agendaPdf)) {
      (isFlagged(e) ? warn : error)(file, "agendaPdf", `file public/${e.agendaPdf} does not exist`);
    }
  }
  for (const { data: n, file } of col("news")) {
    ref(file, "relatedEventSlug", n.relatedEventSlug, "events", n.draft);
    n.relatedStartupSlugs.forEach((slug, i) =>
      ref(file, `relatedStartupSlugs[${i}]`, slug, "startups", n.draft),
    );
  }
  for (const { data: p, file } of col("press")) {
    ref(file, "startupSlug", p.startupSlug, "startups", p.draft);
    ref(file, "eventSlug", p.eventSlug, "events", p.draft);
  }
  for (const { data: c, file } of col("committees")) {
    const seen = new Set<string>();
    c.members.forEach((m, i) => {
      ref(file, `members[${i}].personSlug`, m.personSlug, "people", c.draft);
      if (seen.has(m.personSlug))
        error(
          file,
          `members[${i}].personSlug`,
          `"${m.personSlug}" is listed twice in this committee`,
        );
      seen.add(m.personSlug);
    });
  }
  const mentorOf = new Map<string, string>();
  for (const { data: m, file } of col("mentors")) {
    ref(file, "personSlug", m.personSlug, "people", m.draft);
    const earlier = mentorOf.get(m.personSlug);
    if (earlier)
      error(file, "personSlug", `person "${m.personSlug}" is already the mentor entry ${earlier}`);
    mentorOf.set(m.personSlug, file);
  }
  const startupBySlug = new Map(col("startups").map((e) => [e.data.slug, e.data]));
  for (const { data: t, file } of col("testimonials")) {
    ref(file, "startupSlug", t.startupSlug, "startups", t.draft);
    const startup = t.startupSlug ? startupBySlug.get(t.startupSlug) : undefined;
    if (startup && startup.founders.length > 0) {
      if (!startup.founders.some((f) => normaliseName(f.name) === normaliseName(t.name))) {
        error(
          file,
          "name",
          `"${t.name}" is not a listed founder of ${startup.name}; testimonials must be attributed to a founder`,
        );
      }
    } else if (startup) {
      warn(file, "name", `${startup.name} lists no founders, so the attribution cannot be checked`);
    }
  }
  for (const { data: j, file } of col("jobs")) {
    ref(file, "employerStartupSlug", j.employerStartupSlug, "startups", j.draft);
  }
  for (const { data: i, file } of col("instruments")) {
    ref(file, "facilitySlug", i.facilitySlug, "facilities", i.draft);
    const seen = new Set<string>();
    i.rateCard.forEach((row, ri) => {
      if (seen.has(row.userCategory))
        error(
          file,
          `rateCard[${ri}].userCategory`,
          `a second rate for "${row.userCategory}"; keep one source per category`,
        );
      seen.add(row.userCategory);
    });
  }
  for (const { data: s, file } of col("services")) {
    s.relatedInstrumentSlugs.forEach((slug, i) =>
      ref(file, `relatedInstrumentSlugs[${i}]`, slug, "instruments", s.draft),
    );
  }
  for (const { data: d, file } of col("documents")) {
    ref(file, "supersededBy", d.supersededBy, "documents", d.draft);
    if (d.supersededBy === d.slug)
      error(file, "supersededBy", "a document cannot supersede itself");
    if (!ctx.publicFileExists(d.file)) {
      (isFlagged(d) ? warn : error)(
        file,
        "file",
        `file public/${d.file} does not exist${isFlagged(d) ? " yet (flagged TODO_CONFIRM)" : ""}`,
      );
    }
  }
  const site = content.singletons.site;
  if (site)
    ref(site.file, "intakeStatusOpportunity", site.data.intakeStatusOpportunity, "opportunities");

  const spotlight = content.singletons.spotlight;
  if (spotlight) {
    spotlight.data.items.forEach((item, i) =>
      ref(spotlight.file, `items[${i}].startupSlug`, item.startupSlug, "startups"),
    );
  }

  // ── Required members and uniqueness ──────────────────────────
  for (const slug of StageSlug.options) {
    if (!slugSets.stages.all.has(slug))
      error(
        "stages",
        "",
        `missing stage "${slug}"; there must be exactly catalyse, culture and commercialise`,
      );
  }
  for (const slug of CommitteeSlug.options) {
    if (!slugSets.committees.all.has(slug)) error("committees", "", `missing committee "${slug}"`);
  }
  const stageOrders = new Map<number, string>();
  for (const { data: s, file } of col("stages")) {
    const other = stageOrders.get(s.order);
    if (other) error(file, "order", `order ${s.order} is also used by ${other}`);
    stageOrders.set(s.order, s.slug);
  }

  const uniqueIds = (file: string, label: string, ids: string[]) => {
    const seen = new Set<string>();
    ids.forEach((id, i) => {
      if (seen.has(id)) error(file, `items[${i}].id`, `duplicate ${label} id "${id}"`);
      seen.add(id);
    });
  };
  const stats = content.singletons.stats;
  if (stats)
    uniqueIds(
      stats.file,
      "stat",
      stats.data.items.map((s) => s.id),
    );
  if (spotlight)
    uniqueIds(
      spotlight.file,
      "spotlight",
      spotlight.data.items.map((s) => s.id),
    );
  const tiles = content.singletons.ecosystemTiles;
  if (tiles)
    uniqueIds(
      tiles.file,
      "ecosystem tile",
      tiles.data.items.map((s) => s.id),
    );
  const milestones = content.singletons.milestones;
  if (milestones)
    uniqueIds(
      milestones.file,
      "milestone",
      milestones.data.items.map((s) => s.id),
    );
  const paths = content.singletons.paths;
  if (paths) {
    const seen = new Set<string>();
    paths.data.items.forEach((p, i) => {
      if (seen.has(p.audience))
        error(paths.file, `items[${i}].audience`, `audience "${p.audience}" appears twice`);
      seen.add(p.audience);
    });
  }

  // ── No duplicate card copy within a collection ───────────────
  const duplicates = (items: { file: string; path: string; text: string }[], label: string) => {
    const seen = new Map<string, string>();
    for (const item of items) {
      const key = normaliseText(item.text);
      const first = seen.get(key);
      if (first !== undefined)
        error(item.file, item.path, `${label} duplicates ${first}; every card needs unique copy`);
      else seen.set(key, item.path ? `${item.file} › ${item.path}` : item.file);
    }
  };
  const oneLiners = (list: { file: string; data: { oneLiner: string } }[]) =>
    list.map((e) => ({ file: e.file, path: "oneLiner", text: e.data.oneLiner }));
  duplicates(oneLiners(col("fundingSchemes")), "oneLiner");
  duplicates(oneLiners(col("stages")), "oneLiner");
  duplicates(oneLiners(col("startups")), "oneLiner");
  if (tiles)
    duplicates(
      tiles.data.items.map((t, i) => ({
        file: tiles.file,
        path: `items[${i}].short`,
        text: t.short,
      })),
      "short",
    );
  if (paths)
    duplicates(
      paths.data.items.map((p, i) => ({
        file: paths.file,
        path: `items[${i}].blurb`,
        text: p.blurb,
      })),
      "blurb",
    );

  // ── Stats: a claim may not be lower than what the listings prove ──
  if (stats) {
    const derived = computeDerived(
      {
        startups: col("startups").map((e) => e.data),
        events: col("events").map((e) => e.data),
        fundingSchemes: col("fundingSchemes").map((e) => e.data),
        mentors: col("mentors").map((e) => e.data),
        partners: col("partners").map((e) => e.data),
        instruments: col("instruments").map((e) => e.data),
      } satisfies DerivedInput,
      ctx.now,
    );
    stats.data.items.forEach((stat, i) => {
      if (stat.kind !== "manual" || stat.value === null) return;
      const floor = CLAIM_FLOORS[stat.id];
      if (floor !== undefined && stat.value < derived[floor]) {
        error(
          stats.file,
          `items[${i}].value`,
          `claims ${stat.value} but the listings show ${derived[floor]} (${floor}); a claim cannot be lower than the count`,
        );
      }
    });
  }

  // ── Whole-content scans: media, copy, hosts, mail, internal links ──
  const everything: { file: string; data: unknown }[] = [
    ...(Object.keys(content.collections) as CollectionKey[]).flatMap((k) => entries(k)),
    ...Object.values(content.singletons).filter((s): s is NonNullable<typeof s> => s !== undefined),
  ];

  for (const { file, data } of everything) {
    const flagged = isFlagged(data);
    const walk = (value: unknown, path: string, key: string) => {
      if (typeof value === "string") {
        scanString(file, path, key, value);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((v, i) => walk(v, `${path}[${i}]`, key));
        return;
      }
      if (typeof value !== "object" || value === null) return;
      const obj = value as Record<string, unknown>;
      if (
        typeof obj.src === "string" &&
        obj.src.startsWith("media/") &&
        !ctx.contentFileExists(obj.src)
      ) {
        (flagged ? warn : error)(
          file,
          path ? `${path}.src` : "src",
          `file content/${obj.src} does not exist${flagged ? " yet (flagged TODO_CONFIRM)" : ""}`,
        );
      }
      for (const [k, v] of Object.entries(obj)) walk(v, path ? `${path}.${k}` : k, k);
    };

    const scanString = (f: string, path: string, key: string, text: string) => {
      for (const [re, what] of FORBIDDEN_COPY) {
        if (re.test(text)) error(f, path, `contains ${what}`);
      }
      for (const m of text.matchAll(/https?:\/\/([^\s/)"'<>\]]+)/gi)) {
        if (FORBIDDEN_HOSTS.test((m[1] as string).replace(/:\d+$/, ""))) {
          error(
            f,
            path,
            `links to ${m[1]}, which is not allowed (hotlinked Google media, placeholder or preview host)`,
          );
        }
      }
      for (const m of text.matchAll(/\[([^\]]+)\]\(mailto:([^)\s]+)\)/g)) {
        if (/@/.test(m[1] as string) && m[1] !== m[2])
          error(f, path, `link text "${m[1]}" differs from its mailto target "${m[2]}"`);
      }
      if (text.startsWith("mailto:") && !/^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(text)) {
        error(f, path, `malformed mailto: link "${text}"`);
      }
      if (ctx.knownRoutes && (key === "href" || key === "applyHref") && /^\/(?!\/)/.test(text)) {
        const route = routeOf(text);
        if (!ctx.knownRoutes.has(route))
          warn(f, path, `links to ${route}, which is not built yet; hide it until the page exists`);
      }
      if (ctx.iconExists && key === "icon" && !ctx.iconExists(text))
        error(f, path, `"${text}" is not a lucide icon`);
    };

    walk(data, "", "");
  }

  // Footer and contact links whose label is an email address must match their mailto target.
  if (site) {
    site.data.footerGroups.forEach((g, gi) =>
      g.links.forEach((l, li) => {
        if (
          /^mailto:/.test(l.href) &&
          /@/.test(l.label) &&
          l.label !== l.href.slice("mailto:".length)
        ) {
          error(
            site.file,
            `footerGroups[${gi}].links[${li}]`,
            `label "${l.label}" differs from its mailto target "${l.href}"`,
          );
        }
      }),
    );
  }

  // ── Same website or LinkedIn under two entities (warning) ────
  const owners = new Map<string, string>();
  const claimUrl = (file: string, path: string, raw: string | undefined) => {
    if (!raw) return;
    const url = normaliseUrl(raw);
    if (!url) return;
    const first = owners.get(url);
    if (first && first !== file) warn(file, path, `${raw} is also used by ${first}`);
    else owners.set(url, file);
  };
  for (const { data: s, file } of col("startups")) {
    claimUrl(file, "website", s.website);
    claimUrl(file, "socials.linkedin", s.socials?.linkedin);
  }
  for (const { data: p, file } of col("partners")) claimUrl(file, "url", p.url);
  for (const { data: m, file } of col("mentors")) {
    const person = col("people").find((p) => p.data.slug === m.personSlug)?.data;
    claimUrl(file, "personSlug", person?.links?.linkedin);
  }

  // ── Stale review dates (warning) ─────────────────────────────
  const staleDays = ctx.staleAfterDays ?? DEFAULT_STALE_DAYS;
  for (const entry of staleEntries(content, ctx.now, staleDays))
    warn(
      entry.file,
      entry.path,
      `last reviewed ${entry.ageDays} days ago (limit ${staleDays}); re-confirm it`,
    );

  // ── Every enum value has a label (facets never show raw slugs) ──
  const labels = (ctx.messages as { enums?: Record<string, Record<string, unknown>> }).enums ?? {};
  for (const [name, schema] of Object.entries(ENUMS)) {
    for (const value of schema.options) {
      if (typeof labels[name]?.[value] !== "string") {
        error("messages/en.json", `enums.${name}.${value}`, "missing label for an enum value");
      }
    }
  }

  return issues;
}
