/**
 * npm run rss: writes public/news/rss.xml from the news posts (TRD §11.1). With no posts there is no feed, and any old one
 * is removed, so the footer and `<link rel="alternate">` never point at an empty or missing file. Part of `prebuild`.
 */
import fs from "node:fs";
import path from "node:path";
import { readContent } from "../src/content/loaders";
import { CONTENT_DIR } from "../src/content/root";
import { display } from "../src/content/todo";
import { buildRss } from "../src/lib/rss";
import { SITE_URL } from "../src/lib/seo";

const ROOT = path.resolve(import.meta.dirname, "..");
const target = path.join(ROOT, "public", "news", "rss.xml");
const { content } = readContent({ root: CONTENT_DIR, includeDrafts: false });

const posts = content.collections.news.map(({ data }) => ({
  slug: data.slug,
  title: display(data.title),
  date: data.date,
  summary: display(data.summary),
  tags: data.tags,
}));

if (posts.length === 0) {
  fs.rmSync(target, { force: true });
  console.log("RSS: no news posts, no feed written.");
} else {
  const epoch = process.env.SOURCE_DATE_EPOCH;
  const builtAt = epoch ? new Date(Number(epoch) * 1000) : new Date();
  const site = content.singletons.site?.data;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(
    target,
    buildRss(
      posts,
      {
        url: SITE_URL,
        title: `${site?.shortName ?? "IICE"} news · ${site?.hostInstitute.name ?? "IISER Bhopal"}`,
        description:
          "News from the Innovation and Incubation Centre for Entrepreneurship (IICE) at IISER Bhopal.",
      },
      builtAt,
    ),
    "utf8",
  );
  console.log(
    `RSS: ${Math.min(posts.length, 20)} of ${posts.length} posts written to public/news/rss.xml.`,
  );
}
