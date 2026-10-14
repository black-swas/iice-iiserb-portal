import { cache } from "react";
import { getCollection, getNavigation, getSiteSettings } from "@/content/loaders";
import { getKnownRoutes } from "@/content/routes";
import { display, showTodoMarkers } from "@/content/todo";
import type { IntakeOpportunity } from "@/lib/intake";
import { isBuilt, resolveFooterGroups, resolveNavigation } from "@/lib/nav";
import type { TickerItem } from "./AnnouncementTicker";

/**
 * Everything the header, utility bar and footer share, worked out once per render: the navigation and footer links
 * reduced to pages that exist, live announcements, opportunities for the intake pill, and the build time.
 */
export const getChrome = cache(() => {
  const site = getSiteSettings();
  const routes = getKnownRoutes();
  const showUnbuilt = showTodoMarkers();
  const nav = resolveNavigation(getNavigation(), routes, showUnbuilt);
  const footerGroups = resolveFooterGroups(site.footerGroups, routes, showUnbuilt);

  const announcements: TickerItem[] = getCollection("announcements")
    .filter((a) => !a.draft)
    .map((a) => ({
      id: a.slug,
      text: display(a.text),
      // A link to a page that does not exist is dropped; the text stays.
      href: a.href && (isBuilt(a.href, routes) || showUnbuilt) ? a.href : undefined,
      startsAt: a.startsAt,
      expiresAt: a.expiresAt,
      priority: a.priority,
    }));

  const opportunities: IntakeOpportunity[] = getCollection("opportunities")
    .filter((o) => !o.draft)
    .map((o) => ({ slug: o.slug, window: o.window, headline: o.headline }));

  return {
    site,
    nav,
    footerGroups,
    announcements,
    opportunities,
    showUnbuilt,
    buildTime: new Date().toISOString(),
    applyHref: nav.cta?.href ?? null,
    opportunitiesHref: isBuilt("/opportunities/", routes) ? "/opportunities/" : null,
    email: site.incubationSupport.email,
  };
});
