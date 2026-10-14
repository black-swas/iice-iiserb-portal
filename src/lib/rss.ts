/**
 * The news feed (TRD §11.1, BACKEND_SCHEMA §7): RSS 2.0, the latest 20 posts, absolute URLs. Pure; scripts/rss.ts writes it
 * to `public/news/rss.xml` during the prebuild. Dates are the post's own IST date, written as RFC 822 in GMT.
 */
import { toMs } from "./dates";

export interface FeedPost {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: readonly string[];
  /** Press items link out; the feed still points at the post's own page. */
}

export interface FeedSite {
  /** No trailing slash. */
  url: string;
  title: string;
  description: string;
}

export const FEED_LIMIT = 20;

export const escapeXml = (text: string) =>
  text.replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string,
  );

/** "Sat, 08 Aug 2026 00:00:00 GMT" is how RSS writes a date; the instant is midnight IST of the post's date. */
export const rfc822 = (input: string | number | Date) => new Date(toMs(input)).toUTCString();

export function buildRss(posts: readonly FeedPost[], site: FeedSite, builtAt: Date): string {
  const latest = [...posts].sort((a, b) => toMs(b.date) - toMs(a.date)).slice(0, FEED_LIMIT);
  const items = latest.map((post) => {
    const link = `${site.url}/news/${post.slug}/`;
    return [
      "    <item>",
      `      <title>${escapeXml(post.title)}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `      <pubDate>${rfc822(post.date)}</pubDate>`,
      `      <description>${escapeXml(post.summary)}</description>`,
      ...post.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`),
      "    </item>",
    ].join("\n");
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.title)}</title>
    <link>${escapeXml(site.url)}/news/</link>
    <description>${escapeXml(site.description)}</description>
    <language>en-IN</language>
    <lastBuildDate>${builtAt.toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(site.url)}/news/rss.xml" rel="self" type="application/rss+xml"/>
${items.join("\n")}
  </channel>
</rss>
`;
}
