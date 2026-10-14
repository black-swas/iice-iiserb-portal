/**
 * Legacy URL redirects (SRD §7.2, FR-GLOBAL-10): the one table every generated redirect file comes from. The old Google Site
 * had no trailing slashes and different names; people have these links in emails, PDFs and search results.
 * Event redirects are not listed here: an event's old address is its own `legacyPath` front matter, so it cannot drift.
 * tests/unit/redirects.test.ts checks that every target is a page the site can build.
 */
export interface Redirect {
  /** The old path, without a trailing slash. */
  from: string;
  /** The new path, with the trailing slash, and optionally a query or an anchor. */
  to: string;
}

export const REDIRECTS: readonly Redirect[] = [
  { from: "/home", to: "/" },
  { from: "/birac-edge", to: "/birac-edge/" },
  { from: "/about-us", to: "/about/" },
  { from: "/about-us/ecosystem", to: "/about/ecosystem/" },
  { from: "/about-us/team", to: "/about/team/" },
  { from: "/about-us/committees", to: "/about/team/#committees" },
  { from: "/about-us/committees/managing-committee", to: "/about/team/#managing-committee" },
  { from: "/about-us/committees/executive-committee", to: "/about/team/#executive-committee" },
  {
    from: "/about-us/committees/technical-evaluation-committee",
    to: "/about/team/#technical-evaluation-committee",
  },
  {
    from: "/about-us/committees/management-advisory-committee",
    to: "/about/team/#management-advisory-committee",
  },
  { from: "/about-us/innovation-club", to: "/about/innovation-club/" },
  { from: "/about-us/support-funding", to: "/about/support-funding/" },
  { from: "/about-us/resolutions", to: "/documents/?category=resolution" },
  { from: "/about-us/incubation-policy", to: "/documents/?category=policy" },
  { from: "/incubation", to: "/incubation/" },
  { from: "/incubation/apply", to: "/apply/" },
  { from: "/incubation/facilities", to: "/incubation/facilities/" },
  { from: "/startups", to: "/startups/" },
  { from: "/activities", to: "/events/" },
  { from: "/activities/upcoming-events", to: "/events/" },
  { from: "/activities/past-events", to: "/events/?view=past" },
  { from: "/careers", to: "/careers/" },
  { from: "/docs/application-form", to: "/apply/" },
];

/** The route of a redirect target: no query, no anchor. */
export const targetRoute = (to: string): string => (to.split(/[?#]/)[0] as string) || "/";

export interface EventLegacy {
  slug: string;
  legacyPath?: string | undefined;
}

/** `/activities/aesdp` → `/events/a-esdp-data-science-2026/`, from each event's own `legacyPath`. */
export function eventRedirects(events: readonly EventLegacy[]): Redirect[] {
  return events.flatMap((event) =>
    event.legacyPath
      ? [{ from: event.legacyPath.replace(/\/+$/, ""), to: `/events/${event.slug}/` }]
      : [],
  );
}

/**
 * Every redirect, with those whose target page is not built left out. A redirect to a missing page would swap one 404 for
 * another, so it is better absent; the caller reports what was skipped.
 */
export function activeRedirects(
  events: readonly EventLegacy[],
  isBuilt: (route: string) => boolean,
): { active: Redirect[]; skipped: Redirect[] } {
  const all = [...REDIRECTS, ...eventRedirects(events)];
  return {
    active: all.filter((r) => isBuilt(targetRoute(r.to))),
    skipped: all.filter((r) => !isBuilt(targetRoute(r.to))),
  };
}
