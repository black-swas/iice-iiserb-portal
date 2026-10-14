import { DateChip } from "@/components/ui/DateChip";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SmartLink } from "@/components/ui/SmartLink";
import { getCollection, getHomePage } from "@/content/loaders";
import { sortNewsDescending } from "@/content/queries";
import { getKnownRoutes } from "@/content/routes";
import { display } from "@/content/todo";
import { formatDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { isBuilt } from "@/lib/nav";
import { HomeEvents, type HomeEvent } from "./HomeEvents";
import { OpenCall, type OpenCallItem } from "./OpenCall";

export function prepareHappening() {
  const routes = getKnownRoutes();
  const calls = getCollection("opportunities").map((o): OpenCallItem => ({
    slug: o.slug,
    title: display(o.title),
    sponsor: display(o.sponsor),
    kind: o.kind,
    summary: display(o.summary),
    window: o.window,
    applyHref: o.applyHref,
  }));
  const events = getCollection("events").map((e): HomeEvent => ({
    slug: e.slug,
    title: display(e.title),
    edition: e.edition ?? null,
    startsAt: e.startsAt,
    endsAt: e.endsAt ?? null,
    allDay: e.allDay,
    mode: e.mode,
    venue: e.venue ? display(e.venue.name) : null,
    icsHref: isBuilt(`/events/${e.slug}.ics`, routes) ? `/events/${e.slug}.ics` : null,
  }));
  const news = sortNewsDescending(getCollection("news"))
    .slice(0, 4)
    .map((post) => ({
      slug: post.slug,
      title: display(post.title),
      date: post.date,
      summary: display(post.summary),
      href: `/news/${post.slug}/`,
    }))
    .filter((post) => isBuilt(post.href, routes));

  return calls.length + events.length + news.length > 0
    ? {
        calls,
        events,
        news,
        eventsHref: isBuilt("/events/", routes) ? "/events/" : null,
        newsHref: isBuilt("/news/", routes) ? "/news/" : null,
      }
    : null;
}

/** Home §10, "What's happening": the open call, upcoming/past events and the latest news (SPEC §3 #10). */
export function HappeningSection({
  data,
  number,
}: {
  data: NonNullable<ReturnType<typeof prepareHappening>>;
  number: number;
}) {
  const copy = getHomePage().sectionTitles.happening;
  const now = new Date();
  const serverNow = now.toISOString();
  return (
    <section aria-labelledby="happening-title" className="home-section py-section">
      <SectionHeader
        id="happening-title"
        eyebrow={copy.eyebrow}
        number={number}
        title={copy.title}
        subline={copy.subline}
      />
      <div className="wrapper-wide">
        <OpenCall items={data.calls} serverNow={serverNow} />
        <div className="happening">
          <HomeEvents events={data.events} serverNow={serverNow} eventsHref={data.eventsHref} />
          {data.news.length > 0 ? (
            <div className="happening__column">
              <h3 className="happening__title">{t("home.latestNews")}</h3>
              <ul className="happening__list">
                {data.news.map((post) => (
                  <li key={post.slug} className="happening__item">
                    <DateChip date={post.date} now={now} />
                    <div>
                      <p className="happening__item-title">
                        <SmartLink href={post.href}>{post.title}</SmartLink>
                      </p>
                      <p className="muted">
                        <time dateTime={post.date}>{formatDate(post.date)}</time>
                        {" · "}
                        {post.summary}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {data.newsHref ? (
                <p>
                  <SmartLink href={data.newsHref}>{t("home.allNews")}</SmartLink>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
