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

interface InstitutionalNewsItem {
  slug: string;
  title: string;
  date: string;
  summary: string;
  href: string;
}

const VERIFIED_INSTITUTIONAL_NEWS: InstitutionalNewsItem[] = [
  {
    slug: "iiserb-bcil-moa-2026",
    title: "IISER Bhopal Signs MoA with Biotech Consortium India Limited (BCIL), New Delhi for Technology Transfer",
    date: "2026-09-10",
    summary: "Signed in the presence of Prof. Shekhar C. Mande, Dr. Purnima Sharma, Prof. Gobardhan Das, and Dr. Chandan Sahi (Dean R&D) to accelerate IP licensing and startup spin-outs at IICE.",
    href: "https://www.iiserb.ac.in",
  },
  {
    slug: "iiserb-atri-campus-2026",
    title: "₹485 Crore Advanced Technology & Research Innovation (ATRI) Translational Campus at IISER Bhopal",
    date: "2026-07-17",
    summary: "Foundation stone laid for IISER Bhopal's translational research expansion across Quantum Materials, Drone Technology, Sustainable Systems, Medical Devices, and AI & Robotics.",
    href: "https://news.iiserb.ac.in/?p=3465",
  },
  {
    slug: "mpsedc-ai-dronetech-hub-2026",
    title: "₹85.51 Crore AI-Driven DroneTech Centre & Innovation Hub Established with MPSeDC, Govt. of MP",
    date: "2026-06-15",
    summary: "Joint initiative between Madhya Pradesh State Electronics Development Corporation (MPSeDC) and IISER Bhopal supporting autonomous aerial systems and deep-tech incubation.",
    href: "https://news.iiserb.ac.in/?p=3233",
  },
  {
    slug: "global-bio-india-boeing-build",
    title: "IICE Showcases Bio-Incubation Portfolio at Global Bio-India & Hosts BOEING BUILD Outreach",
    date: "2024-10-16",
    summary: "IICE represented IISER Bhopal's bio-incubation ecosystem at Global Bio-India (BIRAC & DBT) and partnered with IIEC IIT Gandhinagar for the Boeing University Innovation Leadership Development programme.",
    href: "https://www.facebook.com/iiceiiserb/",
  },
];

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
  const rawNews = sortNewsDescending(getCollection("news")).slice(0, 4);
  const news: InstitutionalNewsItem[] =
    rawNews.length > 0
      ? rawNews.map((post) => ({
          slug: post.slug,
          title: display(post.title),
          date: post.date,
          summary: display(post.summary),
          href: isBuilt(`/news/${post.slug}/`, routes)
            ? `/news/${post.slug}/`
            : (post.externalUrl ?? "https://www.iiserb.ac.in"),
        }))
      : VERIFIED_INSTITUTIONAL_NEWS;

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

/** Home §10, "What's happening": the open call, upcoming events and the latest news (SPEC §3 #10). */
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
