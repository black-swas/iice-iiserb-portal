import { describe, expect, it } from "vitest";
import {
  breadcrumbJsonLd,
  eventJsonLd,
  jsonLdScript,
  newsArticleJsonLd,
  organizationJsonLd,
} from "@/lib/jsonld";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo";
import { Event, NewsPost, SiteSettings } from "@/content/schema";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./helpers";

describe("pageMetadata", () => {
  it("gives a canonical path, social tags and the same description everywhere", () => {
    const meta = pageMetadata({
      title: "Startups",
      description: "The startups.",
      path: "/startups/",
    });
    expect(meta.title).toBe("Startups");
    expect(meta.alternates).toMatchObject({
      canonical: "/startups/",
      languages: { en: "/startups/" },
    });
    expect(meta.openGraph).toMatchObject({
      type: "website",
      title: "Startups · IICE, IISER Bhopal",
      url: "/startups/",
    });
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Startups",
      description: "The startups.",
    });
  });

  it("shares the default card, with a description of it, on Open Graph and X", () => {
    const meta = pageMetadata({ title: "A", description: "d", path: "/a/" });
    expect(meta.openGraph).toMatchObject({
      images: [
        {
          url: "/og/default.png",
          width: 1200,
          height: 630,
          alt: expect.stringContaining("IISER Bhopal"),
        },
      ],
    });
    expect(meta.twitter).toMatchObject({ images: [{ url: "/og/default.png" }] });
  });

  it("marks news as an article with its date", () => {
    const meta = pageMetadata({
      title: "A post",
      description: "d",
      path: "/news/a/",
      type: "article",
      publishedTime: "2026-10-01",
    });
    expect(meta.openGraph).toMatchObject({ type: "article", publishedTime: "2026-10-01" });
  });

  it("does not add the brand twice to an absolute title", () => {
    const meta = pageMetadata({
      title: { absolute: "IICE, IISER Bhopal" },
      description: "d",
      path: "/",
    });
    expect(meta.openGraph).toMatchObject({ title: "IICE, IISER Bhopal" });
  });

  it("builds absolute URLs from the site address", () => {
    expect(absoluteUrl("/about/")).toBe(`${SITE_URL}/about/`);
    expect(absoluteUrl("about/")).toBe(`${SITE_URL}/about/`);
  });
});

describe("structured data", () => {
  const site = SiteSettings.parse(
    JSON.parse(readFileSync(path.join(ROOT, "content", "settings", "site.json"), "utf8")),
  );

  it("describes the organisation, with only the social profiles that exist", () => {
    const org = organizationJsonLd(site) as Record<string, unknown>;
    expect(org["@type"]).toBe("Organization");
    expect(org.name).toBe("Innovation and Incubation Centre for Entrepreneurship");
    expect(org.sameAs ?? []).toEqual([]);
  });

  it("lists breadcrumbs with positions and absolute URLs", () => {
    const ld = breadcrumbJsonLd([
      { label: "Home", href: "/" },
      { label: "Startups", href: "/startups/" },
      { label: "Acme" },
    ]) as { itemListElement: { position: number; name: string; item?: string }[] };
    expect(ld.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(ld.itemListElement[1]?.item).toBe(`${SITE_URL}/startups/`);
    expect(ld.itemListElement[2]?.item).toBeUndefined();
  });

  it("describes an all-day event with dates and no clock times", () => {
    const event = Event.parse({
      slug: "conclave",
      title: "Conclave",
      type: "conclave",
      startsAt: "2026-08-08T00:00:00+05:30",
      allDay: true,
      mode: "in-person",
      venue: { name: "IISER Bhopal" },
      summary: "A conclave.",
    });
    const ld = eventJsonLd(event) as Record<string, unknown>;
    expect(ld["@type"]).toBe("Event");
    expect(ld.startDate).toBe("2026-08-08");
    expect(ld.eventAttendanceMode).toBe("https://schema.org/OfflineEventAttendanceMode");
  });

  it("describes a news article", () => {
    const post = NewsPost.parse({
      slug: "p",
      title: "A post",
      date: "2026-10-01",
      summary: "Summary.",
    });
    const ld = newsArticleJsonLd(post) as Record<string, unknown>;
    expect(ld["@type"]).toBe("NewsArticle");
    expect(ld.datePublished).toBe("2026-10-01");
  });

  it("escapes < so a title cannot close the script tag", () => {
    const script = jsonLdScript({ name: "</script><b>x" });
    expect(script).not.toContain("</script>");
    expect(JSON.parse(script)).toEqual({ name: "</script><b>x" });
  });
});
