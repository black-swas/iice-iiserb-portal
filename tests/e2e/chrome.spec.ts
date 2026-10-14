import { expect, test } from "@playwright/test";

test.describe("header, footer and theme (every size)", () => {
  test("the skip link is the first tab stop and moves to the main content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("the page has one h1, a lang, and a viewport that never blocks zoom", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(viewport).not.toMatch(/maximum-scale|user-scalable/);
  });

  test("the brand links home and the Apply button is a real link in the bar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "IICE, IISER Bhopal: home" })).toHaveAttribute(
      "href",
      "/",
    );
    const apply = page.getByRole("banner").getByRole("link", { name: "Apply for Incubation" });
    await expect(apply).toBeVisible();
    await expect(apply).toHaveAttribute("href", "/apply/");
  });

  test("the intake pill says so when no intake is announced", async ({ page }) => {
    await page.goto("/");
    // The pill shows in the bar from 1280 px and in the menu drawer below that.
    await expect(page.getByText("Next intake: to be announced").first()).toBeAttached();
  });

  test("no link anywhere points at # or at nothing", async ({ page }) => {
    await page.goto("/");
    const bad = await page.evaluate(() =>
      [...document.querySelectorAll("a")]
        .filter((a) => !a.hasAttribute("href") || ["", "#"].includes(a.getAttribute("href") ?? ""))
        .map((a) => a.outerHTML.slice(0, 80)),
    );
    expect(bad).toEqual([]);
  });

  test("the footer has the four audience groups, the address, contacts and dates from the build", async ({
    page,
  }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    for (const title of ["About", "For startups", "Ecosystem", "Useful links"]) {
      await expect(footer.getByRole("heading", { name: title })).toBeVisible();
    }
    await expect(footer.getByText("2nd Floor, Main Building, IISER Bhopal")).toBeVisible();
    await expect(footer.getByText("Bhopal 462066, Madhya Pradesh")).toBeVisible();
    await expect(
      footer.getByRole("link", { name: "iice@iiserb.ac.in", exact: true }),
    ).toHaveAttribute("href", "mailto:iice@iiserb.ac.in");
    await expect(footer.getByRole("link", { name: "+91 755 269 2384" })).toHaveAttribute(
      "href",
      "tel:+917552692384",
    );
    await expect(footer.getByText(/^Last updated: \d{1,2} [A-Z][a-z]{2} \d{4}$/)).toBeVisible();
    await expect(
      footer.getByText(`© ${new Date().getFullYear()} IICE, IISER Bhopal`),
    ).toBeVisible();
  });

  test("an external link opens in a new tab safely and says so", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("contentinfo").getByRole("link", { name: /^IISER Bhopal/ });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("rel", /noreferrer/);
    await expect(link).toContainText("(opens in new tab)");
  });

  test("the theme button cycles system, light, dark and remembers the choice", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const button = page.getByRole("button", { name: /^Colour theme/ });
    await expect(button).toHaveAccessibleName("Colour theme: system. Switch to light.");
    await button.click();
    await expect(button).toHaveAccessibleName("Colour theme: light. Switch to dark.");
    await expect(html).not.toHaveClass(/dark/);
    await button.click();
    await expect(button).toHaveAccessibleName("Colour theme: dark. Switch to system.");
    await expect(html).toHaveClass(/dark/);
    await page.reload();
    await expect(html).toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: /^Colour theme: dark/ })).toBeVisible();
    await page.getByRole("button", { name: /^Colour theme/ }).click(); // back to system
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBeNull();
  });

  test("a stored dark theme is applied before the first paint, so there is no flash", async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(
      true,
    );
  });

  test("the page follows the system colour scheme until a choice is made", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto("http://localhost:4173/");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await context.close();
  });
});

test.describe("desktop mega-menu", () => {
  test.skip(({ isMobile }) => isMobile, "the drawer is tested on mobile");

  const about = (page: import("@playwright/test").Page) =>
    page.getByRole("button", { name: "About" });

  test("is made of disclosure buttons, not role=menu, and every panel is closed to start", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('[role="menu"], [role="menuitem"]')).toHaveCount(0);
    await expect(about(page)).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#nav-panel-0")).toBeHidden();
  });

  test("opens on click and shows its groups and links, with nothing hover-only", async ({
    page,
  }) => {
    await page.goto("/");
    await about(page).click();
    await expect(about(page)).toHaveAttribute("aria-expanded", "true");
    const panel = page.locator("#nav-panel-0");
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Who we are")).toBeVisible();
    await expect(panel.getByRole("link", { name: "Team and committees" })).toHaveAttribute(
      "href",
      "/about/team/",
    );
    await page.mouse.move(5, 500); // pointer far away: still open, so nothing depended on hover
    await expect(panel).toBeVisible();
  });

  test("opens with Enter and with Space", async ({ page }) => {
    await page.goto("/");
    await about(page).focus();
    await page.keyboard.press("Enter");
    await expect(about(page)).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Enter");
    await expect(about(page)).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Space");
    await expect(about(page)).toHaveAttribute("aria-expanded", "true");
  });

  test("Escape closes it and returns focus to the button that opened it", async ({ page }) => {
    await page.goto("/");
    await about(page).click();
    await page.locator("#nav-panel-0").getByRole("link", { name: "Impact" }).focus();
    await page.keyboard.press("Escape");
    await expect(about(page)).toHaveAttribute("aria-expanded", "false");
    await expect(about(page)).toBeFocused();
  });

  test("closes on a click elsewhere, and when focus leaves the menu (no focus trap)", async ({
    page,
  }) => {
    await page.goto("/");
    await about(page).click();
    await page.mouse.click(640, 700); // below the open panel, on the page
    await expect(about(page)).toHaveAttribute("aria-expanded", "false");

    await about(page).click();
    await page.getByRole("button", { name: "Search the site" }).focus();
    await expect(about(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("opening one panel closes the other", async ({ page }) => {
    await page.goto("/");
    await about(page).click();
    await page.getByRole("button", { name: "Incubation" }).click();
    await expect(about(page)).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("button", { name: "Incubation" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  test("keeps the whole nav on one line at 1280 px, nothing wrapped or clipped", async ({
    page,
  }) => {
    await page.goto("/");
    const heights = await page
      .locator(".nav-trigger")
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
    expect(Math.max(...heights)).toBeLessThanOrEqual(48);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});

test.describe("mobile drawer", () => {
  test.skip(({ isMobile }) => !isMobile, "the mega-menu is tested on desktop");

  const burger = (page: import("@playwright/test").Page) =>
    page.getByRole("button", { name: "Open menu" });

  test("shows a hamburger and the Apply button, and no desktop menu, at 360 px", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(burger(page)).toBeVisible();
    await expect(page.locator(".desktop-nav")).toBeHidden();
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Apply for Incubation" }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });

  test("opens as a modal dialog with focus inside and the page behind it locked", async ({
    page,
  }) => {
    await page.goto("/");
    await burger(page).click();
    const drawer = page.locator("dialog#mobile-nav");
    await expect(drawer).toHaveAttribute("open", "");
    await expect(drawer).toHaveAttribute("aria-modal", "true");
    await expect(burger(page)).toHaveAttribute("aria-expanded", "true");
    expect(
      await page.evaluate(() =>
        document.querySelector("dialog#mobile-nav")?.contains(document.activeElement),
      ),
    ).toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
      "hidden",
    );
  });

  test("Escape closes it and focus returns to the hamburger", async ({ page }) => {
    await page.goto("/");
    await burger(page).click();
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog#mobile-nav")).not.toHaveAttribute("open", "");
    await expect(burger(page)).toBeFocused();
    await expect(burger(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("the close button, and a tap on the backdrop, both close it", async ({ page }) => {
    await page.goto("/");
    await burger(page).click();
    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(page.locator("dialog#mobile-nav")).not.toHaveAttribute("open", "");

    await burger(page).click();
    await page.mouse.click(10, 400); // left of the drawer, on the backdrop
    await expect(page.locator("dialog#mobile-nav")).not.toHaveAttribute("open", "");
  });

  test("never lets Tab reach the page behind the open drawer (a native modal makes it inert)", async ({
    page,
  }) => {
    await page.goto("/");
    await burger(page).click();
    // After its last control a native modal hands focus to the browser itself (here: body), then to its first control
    // again. The page behind, with its links and its hamburger, must never take focus.
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("Tab");
      const where = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active || active === document.body) return "browser";
        return document.querySelector("dialog#mobile-nav")?.contains(active)
          ? "drawer"
          : "page element";
      });
      expect(["drawer", "browser"]).toContain(where);
    }
  });

  test("an accordion shows the same groups, one section at a time", async ({ page }) => {
    await page.goto("/");
    await burger(page).click();
    const drawer = page.locator("dialog#mobile-nav");
    const about = drawer.getByRole("button", { name: "About" });
    const incubation = drawer.getByRole("button", { name: "Incubation" });
    await expect(about).toHaveAttribute("aria-expanded", "false");
    await about.click();
    await expect(about).toHaveAttribute("aria-expanded", "true");
    await expect(drawer.getByRole("link", { name: "Team and committees" })).toBeVisible();
    await incubation.click();
    await expect(about).toHaveAttribute("aria-expanded", "false");
    await expect(drawer.getByRole("link", { name: "Catalyse" })).toBeVisible();
  });

  test("shows the intake pill inside the drawer", async ({ page }) => {
    await page.goto("/");
    await burger(page).click();
    await expect(
      page.locator("dialog#mobile-nav").getByText("Next intake: to be announced"),
    ).toBeVisible();
  });
});
