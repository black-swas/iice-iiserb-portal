/**
 * Structured data (TRD §11.1): `Organization` site-wide, `Event` per event, `BreadcrumbList` per internal page and
 * `NewsArticle` per news item. Plain objects so they can be tested; `JsonLd` renders them.
 * `sameAs` lists only socials IICE has confirmed.
 */
import type { Event, NewsPost, SiteSettings } from "@/content/schema";
import { displayDeep } from "@/content/todo";
import { absoluteUrl } from "./seo";

type Json = Record<string, unknown>;

export function organizationJsonLd(site: SiteSettings): Json {
  const sameAs = Object.values(site.socials).filter((u): u is string => Boolean(u));
  return displayDeep({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    alternateName: site.shortName,
    url: absoluteUrl("/"),
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: site.hostInstitute.name,
      url: site.hostInstitute.url,
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.lines.join(", "),
      addressLocality: site.address.city,
      postalCode: site.address.postalCode,
      addressRegion: site.address.region,
      addressCountry: site.address.country,
    },
    telephone: site.phones[0]?.number,
    email: site.emails[0]?.address,
    ...(sameAs.length > 0 ? { sameAs } : {}),
  });
}

export interface Crumb {
  label: string;
  /** Omitted on the current page. */
  href?: string;
}

export function breadcrumbJsonLd(trail: readonly Crumb[]): Json {
  return displayDeep({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.label,
      ...(crumb.href ? { item: absoluteUrl(crumb.href) } : {}),
    })),
  });
}

const ATTENDANCE: Record<Event["mode"], string> = {
  "in-person": "https://schema.org/OfflineEventAttendanceMode",
  online: "https://schema.org/OnlineEventAttendanceMode",
  hybrid: "https://schema.org/MixedEventAttendanceMode",
};

export function eventJsonLd(event: Event): Json {
  return displayDeep({
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.summary,
    startDate: event.allDay ? event.startsAt.slice(0, 10) : event.startsAt,
    ...(event.endsAt ? { endDate: event.allDay ? event.endsAt.slice(0, 10) : event.endsAt } : {}),
    eventAttendanceMode: ATTENDANCE[event.mode],
    eventStatus: "https://schema.org/EventScheduled",
    url: absoluteUrl(`/events/${event.slug}/`),
    ...(event.venue
      ? {
          location: {
            "@type": "Place",
            name: event.venue.name,
            ...(event.venue.address ? { address: event.venue.address } : {}),
          },
        }
      : {}),
    organizer: event.organisers.map((name) => ({ "@type": "Organization", name })),
  });
}

export function newsArticleJsonLd(post: NewsPost): Json {
  return displayDeep({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    author: { "@type": "Organization", name: post.author },
    url: absoluteUrl(`/news/${post.slug}/`),
  });
}

/** JSON for a <script> tag: `<` is escaped so content can never close the tag. */
export function jsonLdScript(data: Json): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
