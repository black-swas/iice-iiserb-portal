import { expect, test } from "@playwright/test";
import { checkPage, sampledRoutes, settle } from "../site-pages";
import { expectNoAxeViolations } from "../helpers";

/** Every page of the full-content build, with the pages the seed content leaves out all present. */
const ROUTES = sampledRoutes(".cache/e2e/full", [
  "/incubation/funding/fx-scheme/",
  "/incubation/funding/fx-closed/",
  "/events/fx-upcoming-workshop/",
  "/events/fx-past-recorded/",
  "/news/fx-news-one/",
  "/news/fx-news-three/",
  "/startups/fx-labs-one/",
  "/startups/fx-labs-six/",
]);

test("the full build has the pages the seed leaves out", () => {
  for (const route of [
    "/about/impact/",
    "/about/mentors/",
    "/about/in-the-news/",
    "/documents/",
    "/news/",
    "/incubation/funding/",
    "/incubation/facilities/instruments/",
    "/incubation/funding/fx-scheme/",
  ]) {
    expect(ROUTES, route).toContain(route);
  }
});

test.describe("every page, full content", () => {
  for (const route of ROUTES) {
    test(`${route}: structure and accessibility (light)`, async ({ page }) => {
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
