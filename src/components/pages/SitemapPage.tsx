import { getChrome } from "@/components/layout/chrome";
import { PageHeader } from "@/components/ui/PageHeader";
import { SmartLink } from "@/components/ui/SmartLink";
import { getCollection } from "@/content/loaders";
import { sortEventsDescending, sortNewsDescending } from "@/content/queries";
import { display } from "@/content/todo";
import { t } from "@/lib/i18n";
import type { PageDef } from "./types";

/** `/sitemap/` (GIGW): the site's structure as plain lists, from the same navigation as the header and footer. */
export const sitemapPage: PageDef = {
  meta: () => ({ title: t("pages.sitemap.title"), description: t("pages.sitemap.description") }),
  render: () => {
    const { nav, footerGroups } = getChrome();
    const startups = [...getCollection("startups")].sort((a, b) => a.name.localeCompare(b.name));
    const events = sortEventsDescending(getCollection("events"));
    const news = sortNewsDescending(getCollection("news"));
    const lists = [
      {
        id: "startups",
        title: t("pages.sitemap.startups"),
        items: startups.map((s) => ({ label: display(s.name), href: `/startups/${s.slug}/` })),
      },
      {
        id: "events",
        title: t("pages.sitemap.events"),
        items: events.map((e) => ({ label: display(e.title), href: `/events/${e.slug}/` })),
      },
      {
        id: "news",
        title: t("pages.sitemap.news"),
        items: news.map((n) => ({ label: display(n.title), href: `/news/${n.slug}/` })),
      },
    ].filter((list) => list.items.length > 0);

    return (
      <>
        <PageHeader
          trail={[{ label: t("pages.sitemap.title") }]}
          eyebrow={t("pages.sitemap.eyebrow")}
          title={t("pages.sitemap.title")}
          lead={t("pages.sitemap.description")}
        />
        <div className="sitemap wrapper py-section">
          {nav.primary.map((item, index) => (
            <section key={item.label} aria-labelledby={`sitemap-nav-${index}`}>
              <h2 id={`sitemap-nav-${index}`}>
                {item.href ? <SmartLink href={item.href}>{item.label}</SmartLink> : item.label}
              </h2>
              {item.groups?.map((group) => (
                <div key={group.title}>
                  <h3>{group.title}</h3>
                  <ul className="plain-list">
                    {group.links.map((link) => (
                      <li key={link.href}>
                        <SmartLink href={link.href}>{link.label}</SmartLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
          {footerGroups.map((group, index) => (
            <section key={group.title} aria-labelledby={`sitemap-footer-${index}`}>
              <h2 id={`sitemap-footer-${index}`}>{group.title}</h2>
              <ul className="plain-list">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <SmartLink href={link.href}>{link.label}</SmartLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {lists.map((list) => (
            <section key={list.id} aria-labelledby={`sitemap-${list.id}`}>
              <h2 id={`sitemap-${list.id}`}>{list.title}</h2>
              <ul className="plain-list">
                {list.items.map((link) => (
                  <li key={link.href}>
                    <SmartLink href={link.href}>{link.label}</SmartLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </>
    );
  },
};
