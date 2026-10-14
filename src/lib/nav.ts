/**
 * Navigation and footer links, resolved against the routes that exist (CLAUDE.md rule 4: no nav entry without a real
 * page). Pure, so it is unit-tested; the server components feed it `getKnownRoutes()`.
 * When `showUnbuilt` is on (development, or a preview with NEXT_PUBLIC_SHOW_TODOS=1) unbuilt links are kept and flagged
 * so the full information architecture can be reviewed while pages are still missing. Production never sets it.
 */
import type { Navigation } from "@/content/schema";

export type RouteSet = ReadonlySet<string>;

const INTERNAL = /^\/(?!\/)/;

/** "/events/?view=past#x" → "/events/". */
export function routeOf(href: string): string {
  return (href.split(/[?#]/)[0] as string) || "/";
}

export function isInternal(href: string): boolean {
  return INTERNAL.test(href);
}

/** External links, mailto: and tel: are always fine; a site path must be a route (a page or a public file). */
export function isBuilt(href: string, routes: RouteSet): boolean {
  if (!isInternal(href)) return true;
  if (routes.has(`!${href}`)) return false; // a section the page only has when there is content for it
  const route = routeOf(href);
  return routes.has(route) || routes.has(route.endsWith("/") ? route.slice(0, -1) : `${route}/`);
}

export interface ResolvedLink {
  label: string;
  href: string;
  description?: string;
  /** True only when `showUnbuilt` kept a link to a page that does not exist yet. */
  unbuilt: boolean;
}

export interface ResolvedGroup {
  title: string;
  links: ResolvedLink[];
}

export interface ResolvedNavItem {
  label: string;
  href?: string;
  groups?: ResolvedGroup[];
  unbuilt: boolean;
}

export interface ResolvedNav {
  primary: ResolvedNavItem[];
  cta: ResolvedLink | null;
}

interface RawLink {
  label: string;
  href: string;
  description?: string | undefined;
}

function resolveLink(link: RawLink, routes: RouteSet, showUnbuilt: boolean): ResolvedLink | null {
  const built = isBuilt(link.href, routes);
  if (!built && !showUnbuilt) return null;
  return {
    label: link.label,
    href: link.href,
    ...(link.description ? { description: link.description } : {}),
    unbuilt: !built,
  };
}

function resolveGroups<G extends { title: string; links: RawLink[] }>(
  groups: G[],
  routes: RouteSet,
  showUnbuilt: boolean,
): ResolvedGroup[] {
  return groups
    .map((group) => ({
      title: group.title,
      links: group.links.flatMap((l) => resolveLink(l, routes, showUnbuilt) ?? []),
    }))
    .filter((group) => group.links.length > 0);
}

/** Drops links to unbuilt pages, then groups left empty, then parents left with nothing to open. */
export function resolveNavigation(
  nav: Navigation,
  routes: RouteSet,
  showUnbuilt = false,
): ResolvedNav {
  const primary = nav.primary.flatMap((item): ResolvedNavItem[] => {
    if (item.groups) {
      const groups = resolveGroups(item.groups, routes, showUnbuilt);
      return groups.length > 0
        ? [
            {
              label: item.label,
              groups,
              unbuilt: groups.every((g) => g.links.every((l) => l.unbuilt)),
            },
          ]
        : [];
    }
    const link = item.href
      ? resolveLink({ label: item.label, href: item.href }, routes, showUnbuilt)
      : null;
    return link ? [{ label: item.label, href: link.href, unbuilt: link.unbuilt }] : [];
  });
  return { primary, cta: resolveLink(nav.cta, routes, showUnbuilt) };
}

/** Footer groups: same rules; a group with no live links disappears. */
export function resolveFooterGroups(
  groups: { title: string; links: RawLink[] }[],
  routes: RouteSet,
  showUnbuilt = false,
): ResolvedGroup[] {
  return resolveGroups(groups, routes, showUnbuilt);
}

const withSlash = (p: string) => (p.endsWith("/") ? p : `${p}/`);

/** True when `pathname` is the page `href` points at. Both are compared as site paths with a trailing slash. */
export function isCurrentPage(href: string, pathname: string): boolean {
  return isInternal(href) && withSlash(routeOf(href)) === withSlash(pathname);
}

/** True when `pathname` is inside the section a parent item opens (any of its links, or a deeper page below one). */
export function isCurrentSection(item: ResolvedNavItem, pathname: string): boolean {
  const here = withSlash(pathname);
  const hrefs = item.href
    ? [item.href]
    : (item.groups ?? []).flatMap((g) => g.links.map((l) => l.href));
  return hrefs.some((href) => {
    if (!isInternal(href)) return false;
    const route = withSlash(routeOf(href));
    return route === "/" ? here === "/" : here === route || here.startsWith(route);
  });
}
