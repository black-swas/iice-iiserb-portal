import {
  InstrumentsExplorer,
  type InstrumentItem,
} from "@/components/explorer/InstrumentsExplorer";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCollection } from "@/content/loaders";
import { getKnownRoutes } from "@/content/routes";
import { display, isFlagged, knownNumber } from "@/content/todo";
import { t } from "@/lib/i18n";
import { resolvePicture } from "@/lib/images";
import { formatINR } from "@/lib/money";
import { isBuilt } from "@/lib/nav";
import { crumbs } from "./crumbs";
import type { PageDef } from "./types";

/**
 * `/incubation/facilities/instruments/` (SPEC §4.8a). Rates appear only for an instrument whose entry is confirmed, so
 * a rate card is never half-filled or contradicted by a second table; an unpublished rate reads "On request".
 */
export const instrumentsPage: PageDef = {
  meta: () => ({
    title: t("pages.instruments.title"),
    description: t("pages.instruments.description"),
  }),
  render: () => {
    const routes = getKnownRoutes();
    const bookingHref = isBuilt("/incubation/facilities/#booking", routes)
      ? "/incubation/facilities/#booking"
      : null;
    const items = getCollection("instruments")
      .filter((i) => i.status !== "retired")
      .map((i): InstrumentItem => {
        const confirmed = !isFlagged(i);
        return {
          slug: i.slug,
          name: display(i.name),
          category: i.category,
          make: i.make ?? null,
          model: i.model ?? null,
          specs: i.specs.map(display),
          useCases: i.useCases.map(display),
          access: i.access,
          status: i.status,
          picture: i.image ? resolvePicture(i.image) : null,
          bookingNotes: i.bookingNotes ? display(i.bookingNotes) : null,
          rates: confirmed
            ? i.rateCard.map((row) => {
                const rate = knownNumber(row.rate);
                return {
                  userCategory: row.userCategory,
                  rate: rate === null ? null : formatINR(rate),
                  unit: row.unit,
                  gstIncluded: row.gstIncluded,
                  minimumBilling: row.minimumBilling ? display(row.minimumBilling) : null,
                };
              })
            : [],
        };
      });
    return (
      <>
        <PageHeader
          trail={[
            crumbs.incubation(),
            crumbs.facilities(),
            { label: t("pages.instruments.title") },
          ]}
          eyebrow={t("pages.crumbs.incubation")}
          title={t("pages.instruments.title")}
          lead={t("pages.instruments.description")}
        />
        <div className="wrapper py-section">
          <InstrumentsExplorer items={items} bookingHref={bookingHref} />
        </div>
      </>
    );
  },
};
