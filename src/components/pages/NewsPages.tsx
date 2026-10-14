import { Badge } from "@/components/ui/Badge";
import { DateChip } from "@/components/ui/DateChip";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageHeader } from "@/components/ui/PageHeader";
import { Picture } from "@/components/ui/Picture";
import { Prose } from "@/components/ui/Prose";
import { SmartLink } from "@/components/ui/SmartLink";
import { getCollection, getEntry } from "@/content/loaders";
import { sortNewsDescending } from "@/content/queries";
import { getKnownRoutes } from "@/content/routes";
import type { NewsPost } from "@/content/schema";
import { display } from "@/content/todo";
import { formatDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { newsArticleJsonLd } from "@/lib/jsonld";
import { isBuilt } from "@/lib/nav";
import { absoluteUrl } from "@/lib/seo";
import { crumbs } from "./crumbs";
import type { PageDef } from "./types";

/** Whole minutes to read at about 200 words a minute, never less than one. */
export const readingMinutes = (body: string) =>
  Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200));

/** `/news/`: every post, newest first. */
export const newsPage: PageDef = {
  meta: () => ({ title: t("pages.news.title"), description: t("pages.news.description") }),
  render: () => {
    const now = new Date();
    const posts = sortNewsDescending(getCollection("news"));
    return (
      <>
        <PageHeader
          trail={[{ label: t("pages.news.title") }]}
          eyebrow={t("pages.crumbs.events")}
          title={t("pages.news.title")}
          lead={t("pages.news.description")}
        />
        <div className="wrapper py-section">
          <ul className="card-grid card-grid--2">
            {posts.map((post) => (
              <li key={post.slug}>
                <article className="card card--link event-card">
                  <DateChip date={post.date} now={now} />
                  <div className="event-card__body">
                    <h2 className="card__title">
                      <SmartLink href={`/news/${post.slug}/`} className="card__link">
                        {display(post.title)}
                      </SmartLink>
                    </h2>
                    <p>{display(post.summary)}</p>
                    <p className="muted">
                      <time dateTime={post.date}>{formatDate(post.date)}</time>
                    </p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </>
    );
  },
};

/** `/news/{slug}/` (SPEC §4.12): the article, its tags and related links, and the posts either side of it. */
export function newsPostPage(slug: string): PageDef {
  const load = (): NewsPost & { body: string } => {
    const post = getEntry("news", slug);
    if (!post) throw new Error(`content: news post "${slug}" is missing`);
    return post;
  };
  return {
    meta: () => ({ title: display(load().title), description: display(load().summary) }),
    render: () => {
      const post = load();
      const routes = getKnownRoutes();
      const all = sortNewsDescending(getCollection("news"));
      const index = all.findIndex((p) => p.slug === slug);
      const newer = all[index - 1];
      const older = all[index + 1];
      const event = post.relatedEventSlug ? getEntry("events", post.relatedEventSlug) : undefined;
      const startups = getCollection("startups").filter((s) =>
        post.relatedStartupSlugs.includes(s.slug),
      );
      const url = absoluteUrl(`/news/${post.slug}/`);
      return (
        <>
          <JsonLd data={newsArticleJsonLd(post)} />
          <PageHeader
            trail={[crumbs.news(), { label: display(post.title) }]}
            eyebrow={t("pages.crumbs.news")}
            title={display(post.title)}
            lead={display(post.summary)}
          >
            <p className="muted">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              {" · "}
              {t("pages.news.by", { author: display(post.author) })}
              {" · "}
              {t("pages.news.readingTime", { minutes: readingMinutes(post.body) })}
            </p>
          </PageHeader>
          <article className="wrapper py-section">
            {post.cover ? (
              <Picture
                image={post.cover}
                sizes="(min-width: 75rem) 70rem, 100vw"
                className="news-cover"
              />
            ) : null}
            <Prose source={post.body} />
            {post.tags.length > 0 ? (
              <ul className="tag-list" aria-label={t("pages.news.tags")}>
                {post.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            ) : null}
            {event || startups.length > 0 ? (
              <aside aria-label={t("pages.news.related")} className="callout">
                <h2 className="callout__title">{t("pages.news.related")}</h2>
                <ul className="plain-list">
                  {event ? (
                    <li>
                      <SmartLink href={`/events/${event.slug}/`}>{display(event.title)}</SmartLink>
                      <Badge>{t("pages.news.event")}</Badge>
                    </li>
                  ) : null}
                  {startups.map((startup) => (
                    <li key={startup.slug}>
                      {isBuilt(`/startups/${startup.slug}/`, routes) ? (
                        <SmartLink href={`/startups/${startup.slug}/`}>
                          {display(startup.name)}
                        </SmartLink>
                      ) : (
                        display(startup.name)
                      )}
                    </li>
                  ))}
                </ul>
              </aside>
            ) : null}
            <p>
              <a
                href={`mailto:?subject=${encodeURIComponent(display(post.title))}&body=${encodeURIComponent(url)}`}
              >
                {t("pages.news.share")}
              </a>
              {post.externalUrl ? (
                <>
                  {" · "}
                  <SmartLink href={post.externalUrl}>{t("pages.news.original")}</SmartLink>
                </>
              ) : null}
            </p>
          </article>
          <nav aria-label={t("pages.news.moreNav")} className="stage-nav wrapper">
            {newer ? (
              <SmartLink href={`/news/${newer.slug}/`} rel="next">
                {t("pages.news.newer", { title: display(newer.title) })}
              </SmartLink>
            ) : (
              <span />
            )}
            {older ? (
              <SmartLink href={`/news/${older.slug}/`} rel="prev">
                {t("pages.news.older", { title: display(older.title) })}
              </SmartLink>
            ) : null}
          </nav>
        </>
      );
    },
  };
}
