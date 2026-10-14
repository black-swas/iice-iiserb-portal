import { EventsExplorer, type EventItem } from "@/components/explorer/EventsExplorer";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EventActions } from "@/components/ui/EventActions";
import { FactList, type Fact } from "@/components/ui/FactList";
import { JsonLd } from "@/components/ui/JsonLd";
import { LocalTimeHint } from "@/components/ui/LocalTimeHint";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection } from "@/components/ui/PageSection";
import { Picture } from "@/components/ui/Picture";
import { Prose } from "@/components/ui/Prose";
import { SmartLink } from "@/components/ui/SmartLink";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { getCollection, getEntry } from "@/content/loaders";
import { sortEventsDescending } from "@/content/queries";
import { getKnownRoutes } from "@/content/routes";
import { PersonRole, type Event } from "@/content/schema";
import { display, knownNumber } from "@/content/todo";
import { formatDate, formatDateRange } from "@/lib/dates";
import { eventJsonLd } from "@/lib/jsonld";
import { enumLabel, t } from "@/lib/i18n";
import { googleCalendarUrl } from "@/lib/ics";
import { formatNumber } from "@/lib/money";
import { isBuilt } from "@/lib/nav";
import { absoluteUrl } from "@/lib/seo";
import { crumbs } from "./crumbs";
import type { PageDef } from "./types";
import { ScrollRegion } from "@/components/ui/ScrollRegion";

function toItem(event: Event, series: Map<string, string>): EventItem {
  return {
    slug: event.slug,
    title: display(event.title),
    edition: event.edition ?? null,
    type: event.type,
    mode: event.mode,
    venue: event.venue ? display(event.venue.name) : null,
    summary: display(event.summary),
    startsAt: event.startsAt,
    endsAt: event.endsAt ?? null,
    allDay: event.allDay,
    series:
      event.seriesSlug && series.has(event.seriesSlug)
        ? { slug: event.seriesSlug, name: series.get(event.seriesSlug) as string }
        : null,
    registrationClosesAt: event.registration?.closesAt ?? null,
    hasRegistration: event.registration !== undefined,
  };
}

const seriesNames = () =>
  new Map(getCollection("eventSeries").map((s) => [s.slug, display(s.name)]));

/** `/events/`: upcoming and past events, with filters, and an invitation to ask IICE to speak or co-host. */
export const eventsPage: PageDef = {
  meta: () => ({ title: t("pages.events.title"), description: t("pages.events.description") }),
  render: () => {
    const series = seriesNames();
    const items = getCollection("events").map((e) => toItem(e, series));
    return (
      <>
        <PageHeader
          trail={[{ label: t("pages.events.title") }]}
          eyebrow={t("pages.crumbs.events")}
          title={t("pages.events.title")}
          lead={t("pages.events.description")}
        />
        <div className="wrapper py-section">
          <EventsExplorer items={items} serverNow={new Date().toISOString()} />
        </div>
        <PageSection id="invite" title={t("pages.events.inviteTitle")} tone="surface">
          <p>{t("pages.events.inviteBody")}</p>
          <p className="button-row">
            <ButtonLink href="/contact/?topic=event-invite" variant="secondary">
              {t("pages.events.inviteAction")}
            </ButtonLink>
          </p>
        </PageSection>
      </>
    );
  },
};

const ROLE_ORDER = PersonRole.options;

/** `/events/{slug}/` (SPEC §4.4): the essentials first, then each section only if the event has data for it. */
export function eventPage(slug: string): PageDef {
  const load = () => {
    const event = getEntry("events", slug);
    if (!event) throw new Error(`content: event "${slug}" is missing`);
    return event;
  };
  return {
    meta: () => {
      const e = load();
      return {
        title: e.edition
          ? t("pages.events.withEdition", { title: display(e.title), edition: e.edition })
          : display(e.title),
        description: display(e.summary),
      };
    },
    render: () => {
      const event = load();
      const routes = getKnownRoutes();
      const series = event.seriesSlug ? getEntry("eventSeries", event.seriesSlug) : undefined;
      const partners = getCollection("partners").filter((p) => event.partnerSlugs.includes(p.slug));
      const title = event.edition
        ? t("pages.events.withEdition", { title: display(event.title), edition: event.edition })
        : display(event.title);
      const pageUrl = absoluteUrl(`/events/${event.slug}/`);
      const icsHref = isBuilt(`/events/${event.slug}.ics`, routes)
        ? `/events/${event.slug}.ics`
        : null;
      const when = formatDateRange(event.startsAt, event.endsAt);

      const facts: Fact[] = [
        { label: t("pages.events.when"), value: <time dateTime={event.startsAt}>{when}</time> },
        ...(event.venue
          ? [
              {
                label: t("pages.events.where"),
                value: (
                  <>
                    {display(event.venue.name)}
                    {event.venue.address ? `, ${display(event.venue.address)}` : ""}
                    {event.venue.mapUrl ? (
                      <>
                        {" "}
                        <SmartLink href={event.venue.mapUrl}>{t("pages.events.map")}</SmartLink>
                      </>
                    ) : null}
                  </>
                ),
              },
            ]
          : []),
        { label: t("pages.events.mode"), value: enumLabel("eventMode", event.mode) },
        { label: t("pages.events.organisers"), value: event.organisers.map(display).join("; ") },
        ...(event.sponsor
          ? [{ label: t("pages.events.sponsor"), value: display(event.sponsor) }]
          : []),
      ];

      const agendaDays = [...new Set(event.agenda.map((a) => a.day))].sort((a, b) => a - b);
      const agendaTable = (day: number) => (
        <ScrollRegion className="table-scroll" label={t("pages.events.agendaDay", { day })}>
          <table className="data-table">
            <caption className="sr-only">{t("pages.events.agendaDay", { day })}</caption>
            <thead>
              <tr>
                <th scope="col">{t("pages.events.time")}</th>
                <th scope="col">{t("pages.events.session")}</th>
                <th scope="col">{t("pages.events.room")}</th>
                <th scope="col">{t("pages.events.speakers")}</th>
              </tr>
            </thead>
            <tbody>
              {event.agenda
                .filter((a) => a.day === day)
                .sort((a, b) => a.start.localeCompare(b.start))
                .map((a) => (
                  <tr key={`${a.start}-${a.title}`}>
                    <th scope="row">{a.end ? `${a.start}–${a.end}` : a.start}</th>
                    <td>{display(a.title)}</td>
                    <td>{a.room ? display(a.room) : null}</td>
                    <td>{a.speakerNames.join(", ")}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </ScrollRegion>
      );
      const agendaTabs: TabItem[] = agendaDays.map((day) => ({
        id: `agenda-day-${day}`,
        label: t("pages.events.agendaDay", { day }),
        panel: agendaTable(day),
      }));

      const facts2 = event.facts.flatMap((f) => {
        const value = knownNumber(f.value);
        return value === null ? [] : [{ label: display(f.label), value: formatNumber(value) }];
      });

      return (
        <>
          <JsonLd data={eventJsonLd(event)} />
          <PageHeader
            trail={[crumbs.events(), { label: title }]}
            eyebrow={enumLabel("eventType", event.type)}
            title={title}
            lead={display(event.summary)}
          >
            <FactList facts={facts} className="fact-list--wide" />
            {event.mode !== "in-person" && !event.allDay ? (
              <LocalTimeHint startsAt={event.startsAt} />
            ) : null}
            <EventActions
              title={title}
              startsAt={event.startsAt}
              endsAt={event.endsAt ?? null}
              allDay={event.allDay}
              registration={
                event.registration
                  ? { url: event.registration.url, closesAt: event.registration.closesAt ?? null }
                  : null
              }
              recordingUrl={event.recordingUrl ?? null}
              icsHref={icsHref}
              googleHref={googleCalendarUrl({ ...event, title }, pageUrl)}
              serverNow={new Date().toISOString()}
            />
          </PageHeader>

          {event.body.trim() ? (
            <PageSection id="about" title={t("pages.events.about")}>
              <Prose source={event.body} />
            </PageSection>
          ) : null}

          {event.timeline.length > 0 ? (
            <PageSection id="timeline" title={t("pages.events.timeline")} tone="surface">
              <ol className="steps">
                {event.timeline.map((entry, index) => (
                  <li key={`${entry.date}-${entry.label}`} className="steps__item">
                    <span className="steps__number" aria-hidden="true">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="steps__label">{display(entry.label)}</h3>
                      <p>
                        <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </PageSection>
          ) : null}

          {event.agenda.length > 0 ? (
            <PageSection id="agenda" title={t("pages.events.agenda")}>
              {agendaTabs.length > 1 ? (
                <Tabs label={t("pages.events.agenda")} tabs={agendaTabs} />
              ) : (
                agendaTable(agendaDays[0] as number)
              )}
            </PageSection>
          ) : null}

          {event.people.length > 0 ? (
            <PageSection id="people" title={t("pages.events.people")} tone="surface">
              {ROLE_ORDER.map((role) => {
                const people = event.people.filter((p) => p.role === role);
                if (people.length === 0) return null;
                return (
                  <div key={role} className="people-group">
                    <h3>{enumLabel("personRole", role)}</h3>
                    <ul className="plain-list">
                      {people.map((person) => (
                        <li key={person.name}>
                          <strong>
                            {person.url ? (
                              <SmartLink href={person.url}>{person.name}</SmartLink>
                            ) : (
                              person.name
                            )}
                          </strong>
                          {person.designation || person.organisation ? (
                            <span className="muted">
                              {" "}
                              ·{" "}
                              {[person.designation, person.organisation]
                                .filter(Boolean)
                                .map((x) => display(x as string))
                                .join(", ")}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </PageSection>
          ) : null}

          {facts2.length > 0 ? (
            <PageSection id="numbers" title={t("pages.events.numbers")}>
              <FactList facts={facts2} />
            </PageSection>
          ) : null}

          {event.results.length > 0 ? (
            <PageSection id="results" title={t("pages.events.results")} tone="surface">
              <ul className="plain-list">
                {event.results.map((result) => (
                  <li key={`${result.award}-${result.name}`}>
                    <Badge tone="accent">{display(result.award)}</Badge>{" "}
                    {result.startupSlug && isBuilt(`/startups/${result.startupSlug}/`, routes) ? (
                      <SmartLink href={`/startups/${result.startupSlug}/`}>
                        {display(result.name)}
                      </SmartLink>
                    ) : (
                      display(result.name)
                    )}
                  </li>
                ))}
              </ul>
            </PageSection>
          ) : null}

          {event.gallery.length > 0 ? (
            <PageSection id="gallery" title={t("pages.events.gallery")}>
              <ul className="gallery">
                {event.gallery.map((image) => (
                  <li key={image.src}>
                    <Picture
                      image={image}
                      sizes="(min-width: 64rem) 18rem, 45vw"
                      className="gallery__image"
                    />
                  </li>
                ))}
              </ul>
            </PageSection>
          ) : null}

          {partners.length > 0 ? (
            <PageSection id="partners" title={t("pages.events.partners")} tone="surface">
              <ul className="plain-list">
                {partners.map((partner) => (
                  <li key={partner.slug}>
                    {partner.url ? (
                      <SmartLink href={partner.url}>{display(partner.name)}</SmartLink>
                    ) : (
                      display(partner.name)
                    )}
                  </li>
                ))}
              </ul>
            </PageSection>
          ) : null}

          <nav aria-label={t("pages.events.moreNav")} className="stage-nav wrapper">
            <SmartLink href="/events/">{t("pages.events.back")}</SmartLink>
            {series && isBuilt(`/events/series/${series.slug}/`, routes) ? (
              <SmartLink href={`/events/series/${series.slug}/`}>
                {t("pages.events.moreInSeries", { series: display(series.name) })}
              </SmartLink>
            ) : null}
            <a
              href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(pageUrl)}`}
            >
              {t("pages.events.share")}
            </a>
          </nav>
        </>
      );
    },
  };
}

/** `/events/series/{slug}/`: one workshop series and its editions, newest first. */
export function eventSeriesPage(slug: string): PageDef {
  const load = () => {
    const series = getEntry("eventSeries", slug);
    if (!series) throw new Error(`content: event series "${slug}" is missing`);
    return series;
  };
  return {
    meta: () => ({ title: display(load().name), description: display(load().tagline) }),
    render: () => {
      const series = load();
      const names = seriesNames();
      const now = new Date().toISOString();
      const items = sortEventsDescending(
        getCollection("events").filter((e) => e.seriesSlug === slug),
      ).map((e) => toItem(e, names));
      return (
        <>
          <PageHeader
            trail={[crumbs.events(), { label: display(series.name) }]}
            eyebrow={t("pages.events.seriesEyebrow")}
            title={display(series.name)}
            lead={display(series.tagline)}
          />
          <div className="wrapper py-section">
            <p className="lead-text">{display(series.description)}</p>
            <h2>{t("pages.events.editions")}</h2>
            <EventsExplorer items={items} serverNow={now} />
          </div>
        </>
      );
    },
  };
}
