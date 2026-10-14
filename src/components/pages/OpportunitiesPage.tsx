import { OpportunitiesList, type CallItem } from "@/components/explorer/OpportunitiesList";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCollection } from "@/content/loaders";
import { getKnownRoutes } from "@/content/routes";
import { display } from "@/content/todo";
import { t } from "@/lib/i18n";
import { isBuilt } from "@/lib/nav";
import { crumbs } from "./crumbs";
import type { PageDef } from "./types";

/**
 * `/opportunities/` (SPEC §4.1c): every call with its live status, Open and Past. The page exists only when at least one
 * call is on file (page-routes.ts); the header's intake pill links here.
 */
export const opportunitiesPage: PageDef = {
  meta: () => ({
    title: t("pages.opportunities.title"),
    description: t("pages.opportunities.description"),
  }),
  render: () => {
    const routes = getKnownRoutes();
    const items = getCollection("opportunities").map((o): CallItem => {
      const scheme = o.schemeSlug ? `/incubation/funding/${o.schemeSlug}/` : null;
      const event = o.eventSlug ? `/events/${o.eventSlug}/` : null;
      const details =
        [scheme, event].find((href) => href !== null && isBuilt(href, routes)) ?? null;
      return {
        slug: o.slug,
        title: display(o.title),
        kind: o.kind,
        sponsor: display(o.sponsor),
        summary: display(o.summary),
        eligibilityLine: o.eligibilityLine ? display(o.eligibilityLine) : null,
        window: o.window,
        applyHref: o.applyHref,
        detailsHref: details,
      };
    });
    return (
      <>
        <PageHeader
          trail={[crumbs.incubation(), { label: t("pages.opportunities.title") }]}
          eyebrow={t("pages.crumbs.incubation")}
          title={t("pages.opportunities.title")}
          lead={t("pages.opportunities.description")}
        />
        <div className="wrapper py-section">
          <OpportunitiesList items={items} serverNow={new Date().toISOString()} />
        </div>
      </>
    );
  },
};
