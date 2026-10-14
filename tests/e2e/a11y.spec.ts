import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations, openSpinbar } from "./helpers";

const dark = (page: Page) => page.addInitScript(() => localStorage.setItem("theme", "dark"));

test.describe("accessibility (axe, WCAG 2.2 AA), light and dark", () => {
  test("home page, light", async ({ page }) => {
    await page.goto("/");
    await expectNoAxeViolations(page, "home, light");
  });

  test("home page, dark", async ({ page }) => {
    await dark(page);
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expectNoAxeViolations(page, "home, dark");
  });

  test("the static spinbar grid (reduced motion), light and dark", async ({ browser, baseURL }) => {
    for (const theme of ["light", "dark"] as const) {
      const context = await browser.newContext({
        reducedMotion: "reduce",
        colorScheme: theme,
        baseURL,
      });
      const page = await context.newPage();
      await page.goto("/");
      await page.locator(".spin-grid").scrollIntoViewIfNeeded();
      await expectNoAxeViolations(page, `spinbar grid, ${theme}`);
      await context.close();
    }
  });

  test("the command palette, open, light and dark", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("option").first()).toBeVisible();
    await expectNoAxeViolations(page, "palette, light");
    await page.keyboard.press("Escape");
    await dark(page);
    await page.reload();
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("option").first()).toBeVisible();
    await expectNoAxeViolations(page, "palette, dark");
  });

  test.describe("desktop", () => {
    test.skip(({ isMobile }) => isMobile, "desktop only");

    test("the mega-menu open, light and dark", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "About" }).click();
      await expect(page.locator("#nav-panel-0")).toBeVisible();
      await expectNoAxeViolations(page, "mega-menu, light");
      await dark(page);
      await page.reload();
      await page.getByRole("button", { name: "Incubation" }).click();
      await expectNoAxeViolations(page, "mega-menu, dark");
    });

    test("the ring, light and dark", async ({ page }) => {
      await openSpinbar(page, "ring");
      await expect
        .poll(() =>
          page
            .locator(".spin-slot")
            .nth(1)
            .evaluate((el) => (el as HTMLElement).style.transform),
        )
        .toContain("rotate(30deg)");
      await expectNoAxeViolations(page, "ring, light");
      await dark(page);
      await openSpinbar(page, "ring");
      await expect
        .poll(() =>
          page
            .locator(".spin-slot")
            .nth(1)
            .evaluate((el) => (el as HTMLElement).style.transform),
        )
        .toContain("rotate(30deg)");
      await expectNoAxeViolations(page, "ring, dark");
    });
  });

  test.describe("mobile", () => {
    test.skip(({ isMobile }) => !isMobile, "mobile only");

    test("the menu drawer open, light and dark", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.locator("dialog#mobile-nav").getByRole("button", { name: "About" }).click();
      await expectNoAxeViolations(page, "drawer, light");
      await page.keyboard.press("Escape");
      await dark(page);
      await page.reload();
      await page.getByRole("button", { name: "Open menu" }).click();
      await expectNoAxeViolations(page, "drawer, dark");
    });

    test("the deck, light and dark", async ({ page }) => {
      await openSpinbar(page, "deck");
      await expect
        .poll(() =>
          page
            .locator(".spin-slot")
            .nth(0)
            .evaluate((el) => (el as HTMLElement).style.transform),
        )
        .toContain("rotate(0deg)");
      await expectNoAxeViolations(page, "deck, light");
      await dark(page);
      await openSpinbar(page, "deck");
      await expectNoAxeViolations(page, "deck, dark");
    });
  });
});
