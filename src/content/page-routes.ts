/**
 * Every fixed page of the site, with the condition for it to exist (CLAUDE.md rule 4: hide what does not exist yet).
 * `src/app/[...slug]` builds exactly the routes listed here whose gate passes, so a page with nothing to say is absent
 * from the build, the navigation, the sitemap and search instead of being an empty shell. The
 * collection routes below (startups, events, news, funding schemes, event series, stages) add one page per entry.
 *
 * Pure: the caller supplies the content and file checks, so the same table drives the app, the sitemap and the scripts.
 */
import type { DateInput } from "@/lib/dates";
import { MIN_PUBLIC_STATS, downloadableDocuments, publicStatsOf } from "./queries";
import type { ContentSet } from "./loaders";
import type { CollectionKey } from "./registry";

export interface GateContext {
  content: ContentSet;
  now: DateInput;
  /** Is `public/<file>` in the build? Used for downloadable documents. */
  publicFileExists: (file: string) => boolean;
}

export type Gate = (ctx: GateContext) => boolean;

const always: Gate = () => true;
const has =
  (key: CollectionKey): Gate =>
  ({ content }) =>
    content.collections[key].length > 0;
/** The MDX page with this slug exists and is not a draft (the loader leaves drafts out of production). */
const hasPage =
  (slug: string): Gate =>
  ({ content }) =>
    content.collections.pages.some((p) => p.data.slug === slug);

const teamListed: Gate = ({ content }) =>
  content.collections.people.some((p) => p.data.team !== undefined) ||
  content.collections.committees.some((c) => c.data.members.length > 0);

const documentsDownloadable: Gate = ({ content, publicFileExists }) =>
  downloadableDocuments(
    content.collections.documents.map((d) => d.data),
    publicFileExists,
  ).length > 0;

export interface PageRoute {
  path: string;
  gate: Gate;
}

export const PAGE_ROUTES: readonly PageRoute[] = [
  { path: "/about/", gate: hasPage("about") },
  { path: "/about/directors-message/", gate: hasPage("directors-message") },
  { path: "/about/team/", gate: teamListed },
  {
    path: "/about/impact/",
    gate: ({ content, now }) => publicStatsOf(content, now).length >= MIN_PUBLIC_STATS,
  },
  { path: "/about/partners/", gate: has("partners") },
  { path: "/about/in-the-news/", gate: has("press") },
  { path: "/about/mentors/", gate: always },
  {
    path: "/about/innovation-club/",
    gate: ({ content }) => content.singletons.innovationClub !== undefined,
  },
  { path: "/about/ecosystem/", gate: hasPage("ecosystem") },
  { path: "/about/support-funding/", gate: hasPage("support-funding") },
  { path: "/incubation/", gate: hasPage("incubation") },
  { path: "/incubation/funding/", gate: has("fundingSchemes") },
  { path: "/opportunities/", gate: has("opportunities") },
  { path: "/incubation/facilities/", gate: has("facilities") },
  { path: "/incubation/facilities/instruments/", gate: has("instruments") },
  { path: "/incubation/services/", gate: has("services") },
  { path: "/incubation/student-innovators/", gate: hasPage("student-innovators") },
  { path: "/startups/", gate: has("startups") },
  { path: "/events/", gate: has("events") },
  { path: "/news/", gate: has("news") },
  { path: "/documents/", gate: documentsDownloadable },
  { path: "/apply/", gate: always },
  { path: "/contact/", gate: always },
  { path: "/careers/", gate: always },
  { path: "/birac-edge/", gate: hasPage("birac-edge") },
  { path: "/accessibility/", gate: hasPage("accessibility") },
  { path: "/privacy/", gate: hasPage("privacy") },
  { path: "/terms/", gate: hasPage("terms") },
  { path: "/hyperlink-policy/", gate: hasPage("hyperlink-policy") },
  { path: "/screen-reader-access/", gate: hasPage("screen-reader-access") },
  { path: "/sitemap/", gate: always },
];

/**
 * Pages with one URL per entry of a collection: `/startups/{slug}/` and so on. They are built by the same catch-all,
 * not by `[slug]` folders, because Next's static export fails on a `[slug]` route whose collection is empty.
 */
export const COLLECTION_ROUTES = [
  { prefix: "incubation", collection: "stages" },
  { prefix: "incubation/funding", collection: "fundingSchemes" },
  { prefix: "startups", collection: "startups" },
  { prefix: "events", collection: "events" },
  { prefix: "events/series", collection: "eventSeries" },
  { prefix: "news", collection: "news" },
] as const satisfies readonly { prefix: string; collection: CollectionKey }[];

/** The paths to build: every fixed page whose gate passes, then one page per entry of each collection route. */
export function pagePaths(ctx: GateContext): string[] {
  const fixed = PAGE_ROUTES.filter((r) => r.gate(ctx)).map((r) => r.path);
  const entries = COLLECTION_ROUTES.flatMap(({ prefix, collection }) =>
    ctx.content.collections[collection].map(
      (entry) => `/${prefix}/${(entry.data as { slug: string }).slug}/`,
    ),
  );
  return [...fixed, ...entries];
}

/**
 * In-page sections that exist only with content, so a link to them must be hidden when they do not. Each entry names
 * the link target as written in navigation and footer content.
 */
export const GATED_ANCHORS: readonly { href: string; gate: Gate }[] = [
  { href: "/incubation/#tracks", gate: has("tracks") },
  {
    href: "/incubation/facilities/#booking",
    gate: ({ content }) =>
      content.collections.facilities.some((f) => f.data.bookable) ||
      content.collections.instruments.some((i) => i.data.status !== "retired"),
  },
];

/** Entries marked "!<href>" in the route set: anchors that exist in no built page. */
export function missingAnchors(ctx: GateContext): string[] {
  return GATED_ANCHORS.filter((a) => !a.gate(ctx)).map((a) => `!${a.href}`);
}
