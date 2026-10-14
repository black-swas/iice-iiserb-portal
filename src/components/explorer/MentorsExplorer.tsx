"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Monogram } from "@/components/ui/Monogram";
import { PictureView } from "@/components/ui/PictureView";
import { SmartLink } from "@/components/ui/SmartLink";
import type { FacetDef } from "@/lib/facets";
import { enumLabel, t } from "@/lib/i18n";
import type { PictureData } from "@/lib/images";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExplorerToolbar, type ToolbarCopy } from "./ExplorerToolbar";
import { useExplorer } from "./useExplorer";

export interface MentorItem {
  slug: string;
  name: string;
  title: string;
  organisation: string;
  types: string[];
  sectors: string[];
  location: string | null;
  expertise: string[];
  availability: string;
  picture: PictureData | null;
  linkedin: string | null;
}

const searchText = (m: MentorItem) =>
  [m.name, m.title, m.organisation, m.location, ...m.expertise].filter(Boolean).join(" ");

/** `/about/mentors/`: filter chips with counts by type, sector and location; photo, name, title and organisation as separate lines. */
export function MentorsExplorer({ items }: { items: MentorItem[] }) {
  const defs = useMemo<FacetDef<MentorItem>[]>(
    () => [
      {
        id: "type",
        label: t("pages.mentors.facetType"),
        values: (m) => m.types,
        labelFor: (v) => enumLabel("mentorType", v),
      },
      {
        id: "sector",
        label: t("pages.mentors.facetSector"),
        values: (m) => m.sectors,
        labelFor: (v) => enumLabel("sector", v),
      },
      { id: "location", label: t("pages.mentors.facetLocation"), values: (m) => m.location },
    ],
    [],
  );
  const explorer = useExplorer({ items, defs, searchText });
  const copy: ToolbarCopy = {
    searchLabel: t("pages.mentors.searchLabel"),
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
        <ul className="mentor-grid">
          {explorer.results.map((mentor) => (
            <li key={mentor.slug} className="mentor-card">
              {mentor.picture ? (
                <PictureView data={mentor.picture} sizes="5rem" className="mentor-card__photo" />
              ) : (
                <Monogram name={mentor.name} className="mentor-card__photo" />
              )}
              <div className="mentor-card__body">
                <h3 className="mentor-card__name">{mentor.name}</h3>
                <p className="mentor-card__title">{mentor.title}</p>
                <p className="mentor-card__org">{mentor.organisation}</p>
                {mentor.availability !== "open" ? (
                  <p>
                    <Badge tone="muted">
                      {enumLabel("mentorAvailability", mentor.availability)}
                    </Badge>
                  </p>
                ) : null}
                <ul className="tag-list">
                  {mentor.expertise.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
                {mentor.linkedin ? (
                  <SmartLink
                    href={mentor.linkedin}
                    hideExternalIcon
                    aria-label={t("pages.mentors.linkedin", { name: mentor.name })}
                  >
                    {t("pages.mentors.linkedinText")}
                  </SmartLink>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
