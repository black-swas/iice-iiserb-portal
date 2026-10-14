import type { MetadataRoute } from "next";
import { showTodoMarkers } from "@/content/todo";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

/** `/robots.txt`: everything is open to crawlers, except on a preview build, which must never be indexed (TRD §11.1). */
export default function robots(): MetadataRoute.Robots {
  const preview = showTodoMarkers() && process.env.NODE_ENV === "production";
  return {
    rules: preview
      ? { userAgent: "*", disallow: "/" }
      : { userAgent: "*", allow: "/", disallow: "/admin/" },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
