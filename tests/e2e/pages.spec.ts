import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers";
import { checkPage, sampledRoutes, settle } from "./site-pages";

/** Every page the preview build serves, from its own sitemap (see site-pages.ts). */
const ROUTES = sampledRoutes("out");

test("the sitemap lists the pages that matter", () => {
  for (const route of [
    "/",
    "/about/",
    "/apply/",
    "/contact/",
    "/startups/",
    "/events/",
    "/incubation/",
  ]) {
    expect(ROUTES, route).toContain(route);
  }
  expect(ROUTES.length).toBeGreaterThan(25);
});

test.describe("every page", () => {
  for (const route of ROUTES) {
    test(`${route}: structure, no console errors, accessible (light)`, async ({ page }) => {
      await checkPage(page, route, "light");
    });
  }

  test.describe("dark theme", () => {
    test.skip(({ isMobile }) => isMobile, "one viewport is enough for the theme check");
    for (const route of ROUTES) {
      test(`${route}: accessible (dark)`, async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem("theme", "dark"));
        await settle(page, route);
        await expect(page.locator("html")).toHaveClass(/dark/);
        await expectNoAxeViolations(page, `${route}, dark`);
      });
    }
  });
});

test.describe("404", () => {
  test("an unknown address gets the 404 page with a way back", async ({ page }) => {
    const response = await page.goto("/no-such-page/");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to the home page" })).toBeVisible();
    await expectNoAxeViolations(page, "404");
  });
});

test.describe("generated files", () => {
  test("serves a sitemap, a robots file that keeps previews out of search, and the search index", async ({
    request,
  }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("<loc>https://iice.iiserb.ac.in/about/</loc>");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /"); // a preview build must not be indexed
    expect(robots).toContain("Sitemap: https://iice.iiserb.ac.in/sitemap.xml");
    const index = await request.get("/search-index.json");
    expect(index.status()).toBe(200);
  });

  test("offers a calendar file for an event, and it is a real calendar", async ({
    page,
    request,
  }) => {
    await page.goto("/events/industry-academia-conclave-2026/");
    const link = page.getByRole("link", { name: "Add to calendar (.ics)" });
    // The conclave is in the past, so the calendar links are not offered; the file itself is still served.
    await expect(link).toHaveCount(0);
    await expect(page.getByText("This event has ended.")).toBeVisible();
    const ics = await request.get("/events/industry-academia-conclave-2026.ics");
    expect(ics.status()).toBe(200);
    const text = await ics.text();
    expect(text.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(text).toContain("UID:industry-academia-conclave-2026@iice.iiserb.ac.in");
  });

  test("describes an event to search engines with valid structured data", async ({ page }) => {
    await page.goto("/events/industry-academia-conclave-2026/");
    const blocks = await page.locator("script[type='application/ld+json']").allTextContents();
    const parsed = blocks.map((b) => JSON.parse(b) as { "@type": string });
    const types = parsed.map((p) => p["@type"]);
    expect(types).toContain("Event");
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("Organization");
  });
});

test.describe("legacy addresses", () => {
  test("an old page address lands on its new page", async ({ page }) => {
    await page.goto("/about-us/");
    await page.waitForURL("**/about/");
    await expect(page.getByRole("heading", { level: 1, name: "About IICE" })).toBeVisible();
  });

  test("an old event address lands on the event", async ({ page }) => {
    await page.goto("/activities/aesdp");
    await page.waitForURL("**/events/a-esdp-data-science-2026/");
  });

  test("an old committee address opens that committee's tab", async ({ page }) => {
    await page.goto("/about-us/committees/executive-committee");
    await page.waitForURL("**/about/team/#executive-committee");
    await expect(page.getByRole("tab", { name: "Executive Committee" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
