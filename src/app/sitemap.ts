import type { MetadataRoute } from "next";
import { COLLECTION_ROUTES } from "@/content/page-routes";
import { getCollection, getPage } from "@/content/loaders";
import { getPagePaths } from "@/content/routes";
import { toMs } from "@/lib/dates";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

/**
 * `/sitemap.xml` (TRD §11.1): the home page and every page that is built, which already leaves out drafts and pages with
 * nothing to show. `lastModified` is the entry's own date when it has one, otherwise the build date.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const built = new Date();
  const modified = new Map<string, Date>();

  for (const { prefix, collection } of COLLECTION_ROUTES) {
    for (const entry of getCollection(collection)) {
      const data = entry as { slug: string; updatedAt?: string; date?: string };
      const stamp = data.updatedAt ?? data.date;
      if (stamp) modified.set(`/${prefix}/${data.slug}/`, new Date(toMs(stamp)));
    }
  }
  const about = getPage("about");
  if (about?.updatedAt) modified.set("/about/", new Date(toMs(about.updatedAt)));

  return ["/", ...getPagePaths()].map((path) => ({
    url: absoluteUrl(path),
    lastModified: modified.get(path) ?? built,
  }));
}
