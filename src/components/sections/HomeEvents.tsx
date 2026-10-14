"use client";

import { DateChip } from "@/components/ui/DateChip";
import { SmartLink } from "@/components/ui/SmartLink";
import { useNow } from "@/lib/clock";
import { formatDateRange, istDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { eventStatus } from "@/lib/status";

export interface HomeEvent {
  slug: string;
  title: string;
  edition: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  mode: string;
  venue: string | null;
  icsHref: string | null;
}

/**
 * The upcoming events of "What's happening" (up to three, soonest first), or the most recent ones with a "Recent events"
 * heading when nothing is upcoming. Judged by the visitor's clock as well as the build's (TRD §4.3).
 */
export function HomeEvents({
  events,
  serverNow,
  eventsHref,
}: {
  events: HomeEvent[];
  serverNow: string;
  eventsHref: string | null;
}) {
  const now = useNow(serverNow);
  const classified = events.map((e) => ({
    e,
    past: eventStatus({ ...e, endsAt: e.endsAt ?? undefined }, now) === "past",
  }));
  const upcoming = classified
    .filter((c) => !c.past)
    .map((c) => c.e)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const recent = classified
    .filter((c) => c.past)
    .map((c) => c.e)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const shown = (upcoming.length > 0 ? upcoming : recent).slice(0, 3);
  if (shown.length === 0) return null;
  return (
    <div className="happening__column">
      <h3 className="happening__title">
        {upcoming.length > 0 ? t("home.upcomingEvents") : t("home.recentEvents")}
      </h3>
      <ul className="happening__list">
        {shown.map((event) => (
          <li key={event.slug} className="happening__item">
            <DateChip date={event.startsAt} now={now} />
            <div>
              <p className="happening__item-title">
                <SmartLink href={`/events/${event.slug}/`}>
                  {event.edition
                    ? t("pages.events.withEdition", { title: event.title, edition: event.edition })
                    : event.title}
                </SmartLink>
              </p>
              <p className="muted">
                <time dateTime={istDate(event.startsAt)}>
                  {formatDateRange(event.startsAt, event.endsAt ?? undefined)}
                </time>
                {event.venue ? ` · ${event.venue}` : ""}
              </p>
              {upcoming.length > 0 && event.icsHref ? (
                <a
                  href={event.icsHref}
                  download
                  aria-label={t("home.addToCalendarFor", { title: event.title })}
                >
                  {t("home.addToCalendar")}
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {eventsHref ? (
        <p>
          <SmartLink href={eventsHref}>{t("home.allEvents")}</SmartLink>
        </p>
      ) : null}
    </div>
  );
}
