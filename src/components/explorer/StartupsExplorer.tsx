"use client";

import { useMemo } from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Monogram } from "@/components/ui/Monogram";
import { PictureView } from "@/components/ui/PictureView";
import { SmartLink } from "@/components/ui/SmartLink";
import type { FacetDef } from "@/lib/facets";
import { enumLabel, t } from "@/lib/i18n";
import type { PictureData } from "@/lib/images";
import { ChoiceBar, ExplorerToolbar, type ToolbarCopy } from "./ExplorerToolbar";
import { useExplorer } from "./useExplorer";

export interface StartupItem {
  slug: string;
  name: string;
  oneLiner: string;
  sectors: string[];
  stage: string | null;
  status: string;
  track: string | null;
  schemes: { slug: string; name: string }[];
  cohortYear: number | null;
  tags: string[];
  founders: string[];
  logo: PictureData | null;
}

/** The status tabs the page offers, in order. Other statuses are listed under "All" only (SPEC §4.2). */
const TAB_STATUSES = ["current", "graduated", "pre-startup"];
const STATUS_ORDER = ["current", "graduated", "pre-startup", "unconfirmed", "inactive"];
const TONES: Record<string, BadgeTone> = {
  current: "success",
  graduated: "accent",
  "pre-startup": "neutral",
  inactive: "muted",
  unconfirmed: "muted",
};

const searchText = (s: StartupItem) =>
  [s.name, s.oneLiner, ...s.founders, ...s.tags, ...s.schemes.map((x) => x.name)].join(" ");

/** `/startups/`: status tabs, search, filter chips with counts, and a grid of cards with one link each (SPEC §4.2). */
export function StartupsExplorer({ items }: { items: StartupItem[] }) {
  const defs = useMemo<FacetDef<StartupItem>[]>(() => {
    const schemeNames = new Map(items.flatMap((i) => i.schemes).map((s) => [s.slug, s.name]));
    return [
      {
        id: "status",
        label: t("pages.startups.facetStatus"),
        values: (s) => s.status,
        labelFor: (v) => enumLabel("startupStatus", v),
        order: STATUS_ORDER,
      },
      {
        id: "sector",
        label: t("pages.startups.facetSector"),
        values: (s) => s.sectors,
        labelFor: (v) => enumLabel("sector", v),
      },
      {
        id: "stage",
        label: t("pages.startups.facetStage"),
        values: (s) => s.stage,
        labelFor: (v) => enumLabel("stage", v),
        order: ["catalyse", "culture", "commercialise"],
      },
      {
        id: "track",
        label: t("pages.startups.facetTrack"),
        values: (s) => s.track,
        labelFor: (v) => enumLabel("track", v),
      },
      {
        id: "scheme",
        label: t("pages.startups.facetScheme"),
        values: (s) => s.schemes.map((x) => x.slug),
        labelFor: (v) => schemeNames.get(v) ?? v,
      },
      {
        id: "year",
        label: t("pages.startups.facetYear"),
        values: (s) => (s.cohortYear === null ? null : String(s.cohortYear)),
      },
    ];
  }, [items]);

  const explorer = useExplorer({ items, defs, searchText });
  const statusFacet = explorer.facets.find((f) => f.id === "status");
  const tabs = statusFacet
    ? { ...statusFacet, options: statusFacet.options.filter((o) => TAB_STATUSES.includes(o.value)) }
    : undefined;

  const results = useMemo(
    () =>
      [...explorer.results].sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
          a.name.localeCompare(b.name),
      ),
    [explorer.results],
  );
  const copy: ToolbarCopy = {
    searchLabel: t("pages.startups.searchLabel"),
    searchHint: t("pages.startups.searchHint"),
    resultCount: t("explorer.resultCount", { count: "{count}", total: "{total}" }),
    clear: t("explorer.clear"),
    noResultsTitle: t("pages.startups.noResultsTitle"),
    noResultsBody: t("explorer.noResultsBody"),
    filters: t("explorer.filters"),
  };

  return (
    <div className="explorer">
      {tabs && tabs.options.length > 0 ? (
        <ChoiceBar
          label={t("pages.startups.facetStatus")}
          facet={tabs}
          selection={explorer.selection}
          allLabel={t("explorer.all")}
          total={items.length}
          onChoose={(value) => explorer.choose("status", value)}
        />
      ) : null}
      <ExplorerToolbar
        copy={copy}
        query={explorer.query}
        onQuery={explorer.setQuery}
        facets={explorer.facets}
        onToggle={explorer.toggle}
        count={results.length}
        total={items.length}
        filtered={explorer.filtered}
        onClear={explorer.clear}
        skip={["status"]}
      />
      {results.length === 0 ? (
        <EmptyState title={copy.noResultsTitle}>
          <p>{copy.noResultsBody}</p>
          <button
            type="button"
            data-action="clear-filters"
            className="btn btn--secondary"
            onClick={explorer.clear}
          >
            {copy.clear}
          </button>
        </EmptyState>
      ) : (
        <ul className="card-grid card-grid--3">
          {results.map((startup) => (
            <li key={startup.slug} className="card card--link startup-card">
              <div className="startup-card__head">
                {startup.logo ? (
                  <PictureView
                    data={{ ...startup.logo, decorative: true }}
                    sizes="4rem"
                    className="startup-card__logo"
                  />
                ) : (
                  <Monogram name={startup.name} className="startup-card__logo" />
                )}
                <h2 className="card__title">
                  <SmartLink href={`/startups/${startup.slug}/`} className="card__link">
                    {startup.name}
                  </SmartLink>
                </h2>
              </div>
              <p>{startup.oneLiner}</p>
              <p className="card__meta">
                <Badge tone={TONES[startup.status] ?? "neutral"}>
                  {enumLabel("startupStatus", startup.status)}
                </Badge>
                {startup.sectors[0] ? (
                  <Badge>{enumLabel("sector", startup.sectors[0])}</Badge>
                ) : null}
              </p>
              {startup.schemes.length > 0 ? (
                <ul className="tag-list">
                  {startup.schemes.map((scheme) => (
                    <li key={scheme.slug}>{scheme.name}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
