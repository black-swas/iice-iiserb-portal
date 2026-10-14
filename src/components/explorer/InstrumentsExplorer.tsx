"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PictureView } from "@/components/ui/PictureView";
import { SmartLink } from "@/components/ui/SmartLink";
import type { FacetDef } from "@/lib/facets";
import { dynamicT, enumLabel, t } from "@/lib/i18n";
import type { PictureData } from "@/lib/images";
import { ExplorerToolbar, type ToolbarCopy } from "./ExplorerToolbar";
import { useExplorer } from "./useExplorer";
import { ScrollRegion } from "@/components/ui/ScrollRegion";

export interface RateRow {
  userCategory: string;
  /** The formatted rate, or null when it is not published ("On request"). */
  rate: string | null;
  unit: string;
  gstIncluded: boolean;
  minimumBilling: string | null;
}

export interface InstrumentItem {
  slug: string;
  name: string;
  category: string;
  make: string | null;
  model: string | null;
  specs: string[];
  useCases: string[];
  access: string;
  status: string;
  picture: PictureData | null;
  bookingNotes: string | null;
  /** Empty unless the rates are confirmed: there is one rate source per instrument, never two (SPEC §4.8a). */
  rates: RateRow[];
}

const searchText = (i: InstrumentItem) =>
  [i.name, i.make, i.model, ...i.specs, ...i.useCases].filter(Boolean).join(" ");

/** `/incubation/facilities/instruments/`: filter chips by category with counts, search, cards and an expandable rate card. */
export function InstrumentsExplorer({
  items,
  bookingHref,
}: {
  items: InstrumentItem[];
  /** Where "Request booking" goes, or null when no booking form exists. */
  bookingHref: string | null;
}) {
  const defs = useMemo<FacetDef<InstrumentItem>[]>(
    () => [
      {
        id: "category",
        label: t("pages.instruments.facetCategory"),
        values: (i) => i.category,
        labelFor: (v) => enumLabel("instrumentCategory", v),
        order: [
          "molecular-biology",
          "cell-culture",
          "analytical",
          "imaging",
          "electronics-prototyping",
          "computing",
          "other",
        ],
      },
      {
        id: "access",
        label: t("pages.instruments.facetAccess"),
        values: (i) => i.access,
        labelFor: (v) => enumLabel("instrumentAccess", v),
      },
    ],
    [],
  );
  const explorer = useExplorer({ items, defs, searchText });
  const copy: ToolbarCopy = {
    searchLabel: t("pages.instruments.searchLabel"),
    resultCount: t("explorer.resultCount", { count: "{count}", total: "{total}" }),
    clear: t("explorer.clear"),
    noResultsTitle: t("explorer.noResultsTitle"),
    noResultsBody: t("explorer.noResultsBody"),
    filters: t("explorer.filters"),
  };

  return (
    <div className="explorer">
      <ExplorerToolbar
        copy={copy}
        query={explorer.query}
        onQuery={explorer.setQuery}
        facets={explorer.facets}
        onToggle={explorer.toggle}
        count={explorer.results.length}
        total={items.length}
        filtered={explorer.filtered}
        onClear={explorer.clear}
      />
      {explorer.results.length === 0 ? (
        <EmptyState title={copy.noResultsTitle}>
          <p>{copy.noResultsBody}</p>
        </EmptyState>
      ) : (
        <ul className="card-grid card-grid--3">
          {explorer.results.map((item) => (
            <li key={item.slug} className="card instrument-card">
              {item.picture ? (
                <PictureView
                  data={item.picture}
                  sizes="(min-width: 64rem) 22rem, 90vw"
                  className="card__image"
                />
              ) : null}
              <p className="eyebrow">{enumLabel("instrumentCategory", item.category)}</p>
              <h3 className="card__title">{item.name}</h3>
              {item.make || item.model ? (
                <p className="muted">{[item.make, item.model].filter(Boolean).join(" ")}</p>
              ) : null}
              <p>
                <Badge>{enumLabel("instrumentAccess", item.access)}</Badge>{" "}
                {item.status !== "available" ? (
                  <Badge tone="muted">{enumLabel("instrumentStatus", item.status)}</Badge>
                ) : null}
              </p>
              {item.specs.length > 0 ? (
                <ul className="check-list">
                  {item.specs.slice(0, 3).map((spec) => (
                    <li key={spec}>{spec}</li>
                  ))}
                </ul>
              ) : null}
              {item.useCases.length > 0 ? (
                <p>
                  <strong>{t("pages.instruments.uses")}</strong> {item.useCases.join("; ")}
                </p>
              ) : null}
              {item.bookingNotes ? <p className="muted">{item.bookingNotes}</p> : null}
              {item.rates.length > 0 ? (
                <details className="rate-card">
                  <summary>{t("pages.instruments.rates")}</summary>
                  <ScrollRegion
                    className="table-scroll"
                    label={t("pages.instruments.ratesFor", { name: item.name })}
                  >
                    <table className="data-table">
                      <caption className="sr-only">
                        {t("pages.instruments.ratesFor", { name: item.name })}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">{t("pages.instruments.userCategory")}</th>
                          <th scope="col">{t("pages.instruments.rate")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.rates.map((row) => (
                          <tr key={row.userCategory}>
                            <th scope="row">{enumLabel("userCategory", row.userCategory)}</th>
                            <td>
                              {row.rate
                                ? t("pages.instruments.perUnit", {
                                    rate: row.rate,
                                    unit: dynamicT(`pages.instruments.unit.${row.unit}`),
                                  })
                                : t("pages.instruments.onRequest")}
                              {row.rate ? (
                                <span className="muted">
                                  {" "}
                                  {row.gstIncluded
                                    ? t("pages.instruments.gstIncluded")
                                    : t("pages.instruments.gstExtra")}
                                  {row.minimumBilling
                                    ? ` · ${t("pages.instruments.minimum", { minimum: row.minimumBilling })}`
                                    : ""}
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollRegion>
                </details>
              ) : null}
              {bookingHref ? (
                <p>
                  <SmartLink
                    href={bookingHref}
                    aria-label={t("pages.instruments.requestFor", { name: item.name })}
                  >
                    {t("pages.instruments.request")}
                  </SmartLink>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
