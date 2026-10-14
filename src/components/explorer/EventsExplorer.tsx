"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { DateChip } from "@/components/ui/DateChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { SmartLink } from "@/components/ui/SmartLink";
import { useNow } from "@/lib/clock";
import { formatDateRange, formatTime, istDate, type DateInput } from "@/lib/dates";
import type { FacetDef } from "@/lib/facets";
import { enumLabel, t } from "@/lib/i18n";
import { eventStatus, registrationOpen } from "@/lib/status";
import { replaceUrlSearch, useUrlSearch } from "@/lib/url-state";
import { ExplorerToolbar, type ToolbarCopy } from "./ExplorerToolbar";
import { useExplorer } from "./useExplorer";

export interface EventItem {
  slug: string;
  title: string;
  edition: string | null;
  type: string;
  mode: string;
  venue: string | null;
  summary: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  series: { slug: string; name: string } | null;
  registrationClosesAt: string | null;
  hasRegistration: boolean;
}

type View = "upcoming" | "past";
const VIEW_PARAM = "view";

/** The date line of a card: a range for a multi-day event, plus the time for a timed one. */
export function eventWhen(event: Pick<EventItem, "startsAt" | "endsAt" | "allDay">): string {
  const range = formatDateRange(event.startsAt, event.endsAt ?? undefined);
  return event.allDay ? range : `${range}, ${formatTime(event.startsAt)}`;
}

export function EventCard({
  event,
  now,
  showRegister,
}: {
  event: EventItem;
  now: DateInput;
  showRegister: boolean;
}) {
  return (
    <article className="card card--link event-card">
      <DateChip date={event.startsAt} now={now} />
      <div className="event-card__body">
        <p className="card__meta">
          <Badge>{enumLabel("eventType", event.type)}</Badge>
          <span>{enumLabel("eventMode", event.mode)}</span>
          {showRegister ? <Badge tone="success">{t("pages.events.registerOpen")}</Badge> : null}
        </p>
        <h2 className="card__title">
          <SmartLink href={`/events/${event.slug}/`} className="card__link">
            {event.edition
              ? t("pages.events.withEdition", { title: event.title, edition: event.edition })
              : event.title}
          </SmartLink>
        </h2>
        <p className="muted">
          <time dateTime={istDate(event.startsAt)}>{eventWhen(event)}</time>
          {event.venue ? ` · ${event.venue}` : ""}
        </p>
      </div>
    </article>
  );
}

/**
 * `/events/`: Upcoming and Past views, filters by type, series and year (SPEC §4.4). Which events are upcoming is decided
 * from the visitor's clock, so a stale build never lists a finished event as upcoming (TRD §4.3). The view is the `?view=`
 * query (`/events/?view=past` is a legacy redirect target); with no query it is Upcoming, or Past if nothing is upcoming.
 */
export function EventsExplorer({ items, serverNow }: { items: EventItem[]; serverNow: string }) {
  const now = useNow(serverNow);
  const phased = useMemo(
    () =>
      items.map((item) => ({
        item,
        past: eventStatus({ ...item, endsAt: item.endsAt ?? undefined }, now) === "past",
      })),
    [items, now],
  );
  const upcomingCount = phased.filter((p) => !p.past).length;

  const param = new URLSearchParams(useUrlSearch()).get(VIEW_PARAM);
  const chosen: View | null = param === "past" || param === "upcoming" ? param : null;
  const view: View = chosen ?? (upcomingCount > 0 ? "upcoming" : "past");

  const pool = useMemo(
    () =>
      phased
        .filter((p) => (view === "past") === p.past)
        .map((p) => p.item)
        .sort((a, b) =>
          view === "past"
            ? b.startsAt.localeCompare(a.startsAt)
            : a.startsAt.localeCompare(b.startsAt),
        ),
    [phased, view],
  );

  const defs = useMemo<FacetDef<EventItem>[]>(() => {
    const seriesNames = new Map(
      items.flatMap((i) => (i.series ? [[i.series.slug, i.series.name] as const] : [])),
    );
    return [
      {
        id: "type",
        label: t("pages.events.facetType"),
        values: (e) => e.type,
        labelFor: (v) => enumLabel("eventType", v),
      },
      {
        id: "series",
        label: t("pages.events.facetSeries"),
        values: (e) => e.series?.slug,
        labelFor: (v) => seriesNames.get(v) ?? v,
      },
      {
        id: "year",
        label: t("pages.events.facetYear"),
        values: (e) => istDate(e.startsAt).slice(0, 4),
      },
    ];
  }, [items]);
  const searchText = useMemo(
    () => (e: EventItem) => [e.title, e.summary, e.venue ?? ""].join(" "),
    [],
  );
  const explorer = useExplorer({ items: pool, defs, searchText });

  const choose = (next: View) => {
    const params = new URLSearchParams(window.location.search);
    params.set(VIEW_PARAM, next);
    replaceUrlSearch(params.toString());
  };

  const copy: ToolbarCopy = {
    searchLabel: t("pages.events.searchLabel"),
    resultCount: t("explorer.resultCount", { count: "{count}", total: "{total}" }),
    clear: t("explorer.clear"),
    noResultsTitle: t("explorer.noResultsTitle"),
    noResultsBody: t("explorer.noResultsBody"),
    filters: t("explorer.filters"),
  };
  const pastCount = phased.length - upcomingCount;

  return (
    <div className="explorer">
      <div role="group" aria-label={t("pages.events.viewLabel")} className="choice-bar">
        {(["upcoming", "past"] as const).map((v) => (
          <button
            key={v}
            type="button"
            data-action="choose-view"
            className="choice-bar__button"
            aria-pressed={view === v}
            onClick={() => choose(v)}
          >
            {t(v === "upcoming" ? "pages.events.upcoming" : "pages.events.past")}
            <span className="chip__count"> ({v === "upcoming" ? upcomingCount : pastCount})</span>
          </button>
        ))}
      </div>
      <ExplorerToolbar
        copy={copy}
        query={explorer.query}
        onQuery={explorer.setQuery}
        facets={explorer.facets}
        onToggle={explorer.toggle}
        count={explorer.results.length}
        total={pool.length}
        filtered={explorer.filtered}
        onClear={explorer.clear}
      />
      {explorer.results.length === 0 ? (
        <EmptyState
          title={
            view === "upcoming" && pool.length === 0
              ? t("pages.events.noneUpcoming")
              : copy.noResultsTitle
          }
        >
          <p>
            {view === "upcoming" && pool.length === 0
              ? t("pages.events.noneUpcomingBody")
              : copy.noResultsBody}
          </p>
        </EmptyState>
      ) : (
        <ul className="card-grid card-grid--2">
          {explorer.results.map((event) => (
            <li key={event.slug}>
              <EventCard
                event={event}
                now={now}
                showRegister={
                  event.hasRegistration &&
                  registrationOpen(
                    {
                      ...event,
                      endsAt: event.endsAt ?? undefined,
                      registration: { closesAt: event.registrationClosesAt ?? undefined },
                    },
                    now,
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
