import { COLLECTION_ROUTES } from "@/content/page-routes";
import { aboutPage } from "./AboutPage";
import { applyPage } from "./ApplyPage";
import { biracEdgePage } from "./BiracEdgePage";
import { careersPage } from "./CareersPage";
import { contactPage } from "./ContactPage";
import { crumbs } from "./crumbs";
import { documentsPage } from "./DocumentsPage";
import { eventPage, eventSeriesPage, eventsPage } from "./EventsPages";
import { facilitiesPage } from "./FacilitiesPage";
import { fundingListPage, fundingSchemePage } from "./FundingPages";
import { impactPage } from "./ImpactPage";
import { incubationPage } from "./IncubationPage";
import { innovationClubPage } from "./InnovationClubPage";
import { inTheNewsPage } from "./InTheNewsPage";
import { instrumentsPage } from "./InstrumentsPage";
import { mdxPage } from "./MdxPage";
import { mentorsPage } from "./MentorsPage";
import { newsPage, newsPostPage } from "./NewsPages";
import { opportunitiesPage } from "./OpportunitiesPage";
import { partnersPage } from "./PartnersPage";
import { servicesPage } from "./ServicesPage";
import { sitemapPage } from "./SitemapPage";
import { stagePage } from "./StagePage";
import { startupPage, startupsPage } from "./StartupsPages";
import { teamPage } from "./TeamPage";
import type { PageDef } from "./types";

/** Fixed pages by path. Every path in `page-routes.ts` needs an entry here (tests/unit/pages.test.ts checks it). */
export const PAGES: Record<string, PageDef> = {
  "/about/": aboutPage,
  "/about/directors-message/": mdxPage("directors-message", crumbs.about()),
  "/about/team/": teamPage,
  "/about/impact/": impactPage,
  "/about/partners/": partnersPage,
  "/about/in-the-news/": inTheNewsPage,
  "/about/mentors/": mentorsPage,
  "/about/innovation-club/": innovationClubPage,
  "/about/ecosystem/": mdxPage("ecosystem", crumbs.about()),
  "/about/support-funding/": mdxPage("support-funding", crumbs.about()),
  "/incubation/": incubationPage,
  "/incubation/funding/": fundingListPage,
  "/incubation/facilities/": facilitiesPage,
  "/incubation/facilities/instruments/": instrumentsPage,
  "/incubation/services/": servicesPage,
  "/incubation/student-innovators/": mdxPage("student-innovators", crumbs.incubation()),
  "/opportunities/": opportunitiesPage,
  "/startups/": startupsPage,
  "/events/": eventsPage,
  "/news/": newsPage,
  "/documents/": documentsPage,
  "/apply/": applyPage,
  "/contact/": contactPage,
  "/careers/": careersPage,
  "/birac-edge/": biracEdgePage,
  "/accessibility/": mdxPage("accessibility"),
  "/privacy/": mdxPage("privacy"),
  "/terms/": mdxPage("terms"),
  "/hyperlink-policy/": mdxPage("hyperlink-policy"),
  "/screen-reader-access/": mdxPage("screen-reader-access"),
  "/sitemap/": sitemapPage,
};

/** One page per entry of a collection route (page-routes.ts), keyed by the URL prefix. */
const COLLECTION_PAGES: Record<
  (typeof COLLECTION_ROUTES)[number]["prefix"],
  (slug: string) => PageDef
> = {
  incubation: stagePage,
  "incubation/funding": fundingSchemePage,
  startups: startupPage,
  events: eventPage,
  "events/series": eventSeriesPage,
  news: newsPostPage,
};

/** The page for a path such as "/events/the-conclave/", or undefined if no route builds it. */
export function resolvePage(path: string): PageDef | undefined {
  const fixed = PAGES[path];
  if (fixed) return fixed;
  const parts = path.split("/").filter(Boolean);
  const slug = parts.pop();
  const prefix = parts.join("/") as keyof typeof COLLECTION_PAGES;
  const build = slug ? COLLECTION_PAGES[prefix] : undefined;
  return build && slug ? build(slug) : undefined;
}
