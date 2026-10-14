/**
 * Per-page metadata (TRD §11.1): a title the root template brands, a unique description, the canonical URL and
 * OpenGraph and Twitter tags. Preview builds (NEXT_PUBLIC_SHOW_TODOS=1) are marked noindex so a staging copy with
 * placeholders can never be indexed.
 */
import type { Metadata } from "next";
import { getKnownRoutes } from "@/content/routes";
import { showTodoMarkers } from "@/content/todo";
import { t } from "./i18n";
import { isBuilt } from "./nav";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://iice.iiserb.ac.in").replace(
  /\/+$/,
  "",
);

/** An absolute URL on this site for a path like "/events/x/". */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export interface PageMeta {
  /** The page's own title; the layout adds " · IICE, IISER Bhopal". Use `{ absolute }` to skip the template. */
  title: string | { absolute: string };
  /** Unique per page: the HTML audit fails on duplicates. */
  description: string;
  /** The page's path, with a trailing slash. */
  path: string;
  type?: "website" | "article";
  /** ISO date, for articles. */
  publishedTime?: string | undefined;
}

/**
 * The news feed link for the page head, when the build wrote a feed. A page's own `alternates` replaces the layout's,
 * so every page adds it itself.
 */
export function feedAlternates(): NonNullable<Metadata["alternates"]> {
  return isBuilt("/news/rss.xml", getKnownRoutes())
    ? { types: { "application/rss+xml": [{ url: "/news/rss.xml", title: t("site.name") }] } }
    : {};
}

/** The default sharing card, drawn at build time by scripts/og.ts (see lib/og.ts). */
const SHARE_IMAGE = { url: "/og/default.png", width: 1200, height: 630 } as const;

const branded = (title: string) => t("site.titleTemplate").replace("%s", title);

export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  publishedTime,
}: PageMeta): Metadata {
  const plain = typeof title === "string" ? title : title.absolute;
  const full = typeof title === "string" ? branded(title) : title.absolute;
  return {
    title,
    description,
    alternates: { canonical: path, languages: { en: path }, ...feedAlternates() },
    openGraph: {
      type,
      title: full,
      description,
      url: path,
      siteName: t("site.name"),
      locale: "en_IN",
      images: [{ ...SHARE_IMAGE, alt: t("site.ogAlt") }],
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: plain,
      description,
      images: [{ url: SHARE_IMAGE.url, alt: t("site.ogAlt") }],
    },
    ...(showTodoMarkers() && process.env.NODE_ENV === "production"
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}
