import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers";

const header = (page: Page) => page.locator("header.site-header");
const scrollTo = (page: Page, fraction: number) =>
  page.evaluate((f) => {
    const room = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.round(room * f));
  }, fraction);

test.describe("header", () => {
  test("wears the hero's colour at the top of the home page, then turns solid with a shadow once scrolled", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(header(page)).toHaveAttribute("data-tone", "hero");
    await expect(header(page)).toHaveAttribute("data-scrolled", "false");
    const topBackground = await header(page).evaluate((el) => getComputedStyle(el).backgroundColor);

    await page.evaluate(() => window.scrollTo(0, 200));
    await expect(header(page)).toHaveAttribute("data-scrolled", "true");
    await expect(header(page)).not.toHaveAttribute("data-tone", "hero");
    await expect
      .poll(() => header(page).evaluate((el) => getComputedStyle(el).backgroundColor))
      .not.toBe(topBackground);
    await expect
      .poll(() => header(page).evaluate((el) => getComputedStyle(el).boxShadow))
      .not.toBe("none");

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(header(page)).toHaveAttribute("data-tone", "hero");
  });

  test("starts a few pixels down already scrolled, with no flash of the wrong state after a reload", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(header(page)).toHaveAttribute("data-scrolled", "true");
    await expect(header(page)).not.toHaveAttribute("data-tone", "hero");
  });

  test("stays the plain surface on other pages, gaining only the shadow when scrolled", async ({
    page,
  }) => {
    await page.goto("/about/");
    await page.waitForLoadState("networkidle");
    await expect(header(page)).not.toHaveAttribute("data-tone", "hero");
    await expect(header(page)).toHaveAttribute("data-scrolled", "false");
    await page.evaluate(() => window.scrollTo(0, 120));
    await expect(header(page)).toHaveAttribute("data-scrolled", "true");
  });

  test("keeps its text readable over the hero: light on dark, in both themes", async ({ page }) => {
    for (const theme of ["light", "dark"]) {
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const colour = await page
        .locator(".brand__name")
        .evaluate((el) => getComputedStyle(el).color);
      const [r, g, b] = (colour.match(/\d+/g) ?? []).map(Number) as [number, number, number];
      expect(r + g + b, `${theme}: the brand name on the hero header is light`).toBeGreaterThan(
        600,
      );
    }
  });
});

test.describe("floating pitch pill", () => {
  const pill = (page: Page) => page.getByRole("complementary", { name: "Pitch your idea" });

  test("appears on an internal page once the visitor is half way down, and links to the pitch form", async ({
    page,
  }) => {
    await page.goto("/about/");
    await page.waitForLoadState("networkidle");
    await expect(pill(page)).toHaveCount(0);
    await scrollTo(page, 0.6);
    await expect(pill(page)).toBeVisible();
    await expect(pill(page).getByRole("link", { name: "Pitch to Us" })).toHaveAttribute(
      "href",
      "/#pitch",
    );
    await scrollTo(page, 0);
    await expect(pill(page)).toHaveCount(0);
  });

  for (const path of ["/", "/apply/", "/contact/"]) {
    test(`never appears on ${path}, which already carries a pitch or an application`, async ({
      page,
    }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await scrollTo(page, 0.8);
      await page.waitForTimeout(300);
      await expect(pill(page)).toHaveCount(0);
    });
  }

  test("can be dismissed with a button that has a name, and stays dismissed", async ({ page }) => {
    await page.goto("/about/");
    await page.waitForLoadState("networkidle");
    await scrollTo(page, 0.6);
    await pill(page).getByRole("button", { name: "Dismiss the pitch prompt" }).click();
    await expect(pill(page)).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("iice:pitch-pill:dismissed"))).toBe("1");

    await page.goto("/about/team/");
    await page.waitForLoadState("networkidle");
    await scrollTo(page, 0.9);
    await page.waitForTimeout(300);
    await expect(pill(page)).toHaveCount(0);
  });

  test("does not cover a focused control: the page leaves room for it at the bottom", async ({
    page,
  }) => {
    await page.goto("/about/");
    const padding = await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollPaddingBottom,
    );
    expect(parseFloat(padding)).toBeGreaterThanOrEqual(64);
  });
});

test.describe("content security policy", () => {
  test("is in every page, allows only that page's own inline scripts, and nothing in it is violated", async ({
    page,
  }) => {
    const violations: string[] = [];
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        (window as unknown as { __violations: string[] }).__violations ??= [];
        (window as unknown as { __violations: string[] }).__violations.push(
          `${event.violatedDirective}: ${event.blockedURI}`,
        );
      });
    });
    for (const path of ["/", "/about/", "/startups/", "/contact/", "/events/"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.keyboard.press("Control+k");
      await page.waitForTimeout(300);
      await page.keyboard.press("Escape");
      violations.push(
        ...(
          await page.evaluate(
            () => (window as unknown as { __violations?: string[] }).__violations ?? [],
          )
        ).map((v) => `${path} ${v}`),
      );
    }
    expect(violations).toEqual([]);
  });

  test("states the policy, with a hash for each inline script and no way to run another", async ({
    page,
  }) => {
    await page.goto("/about/");
    const policy =
      (await page.locator('meta[http-equiv="content-security-policy"]').getAttribute("content")) ??
      "";
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).not.toContain("unsafe-eval");
    const scriptSrc = policy.split("; ").find((d) => d.startsWith("script-src ")) ?? "";
    expect(scriptSrc).not.toContain("unsafe-inline");
    const hashes = scriptSrc.match(/'sha256-[^']+'/g) ?? [];
    const inline = await page
      .locator("script:not([src]):not([type='application/ld+json'])")
      .count();
    expect(hashes.length).toBeGreaterThanOrEqual(inline - 1); // a hash may be shared by identical scripts
    expect(hashes.length).toBeGreaterThan(0);
  });

  test("stops a script added to the page from running", async ({ page }) => {
    await page.goto("/about/");
    await page.waitForLoadState("networkidle");
    const ran = await page.evaluate(
      () =>
        new Promise<{ ran: boolean; violated: boolean }>((resolve) => {
          let violated = false;
          document.addEventListener("securitypolicyviolation", () => (violated = true), {
            once: true,
          });
          (window as unknown as { __injected?: boolean }).__injected = false;
          const script = document.createElement("script");
          script.textContent = "window.__injected = true";
          document.head.appendChild(script);
          setTimeout(
            () =>
              resolve({ ran: (window as unknown as { __injected: boolean }).__injected, violated }),
            200,
          );
        }),
    );
    expect(ran).toEqual({ ran: false, violated: true });
  });

  test("blocks the page from talking to a site it was not built for", async ({ page }) => {
    await page.goto("/about/");
    await page.waitForLoadState("networkidle");
    const blocked = await page.evaluate(async () => {
      try {
        await fetch("https://not-allowed.iice-test.invalid/x", { mode: "no-cors" });
        return false;
      } catch {
        return true;
      }
    });
    expect(blocked).toBe(true);
  });
});

test.describe("page loads", () => {
  for (const path of ["/", "/about/", "/startups/", "/apply/"]) {
    test(`${path} makes no failing request and no router prefetch`, async ({ page }) => {
      const failed: string[] = [];
      const prefetch: string[] = [];
      page.on("response", (response) => {
        if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
      });
      page.on("request", (request) => {
        if (/[?&]_rsc=|__next\./.test(request.url())) prefetch.push(request.url());
      });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await scrollTo(page, 1);
      await page.waitForTimeout(500);
      expect(failed).toEqual([]);
      expect(prefetch).toEqual([]);
    });
  }

  test("has a favicon, so browsers do not ask for one that is not there", async ({ page }) => {
    await page.goto("/");
    const icon = page.locator('link[rel="icon"]');
    await expect(icon).toHaveAttribute("href", /icon\.svg/);
    const response = await page.request.get((await icon.getAttribute("href")) ?? "");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("svg");
  });

  test("moves between pages with an ordinary page load, and the back button works", async ({
    page,
  }) => {
    await page.goto("/about/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => ((window as unknown as { __stayed?: boolean }).__stayed = true));
    await page.locator("footer").getByRole("link", { name: "Terms of use" }).click();
    await page.waitForURL("**/terms/");
    // A real navigation resets the page's scripts: nothing set before the click survives it.
    expect(
      await page.evaluate(() => (window as unknown as { __stayed?: boolean }).__stayed),
    ).toBeUndefined();
    await page.goBack();
    await page.waitForURL("**/about/");
    await expect(page.getByRole("heading", { level: 1, name: "About IICE" })).toBeVisible();
  });
});

test.describe("accessibility of the shell", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`a scrolled page with the header shadowed and the pitch pill showing (${theme})`, async ({
      page,
    }) => {
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
      await page.goto("/about/");
      await page.waitForLoadState("networkidle");
      await scrollTo(page, 0.6);
      await expect(page.getByRole("complementary", { name: "Pitch your idea" })).toBeVisible();
      await expect(header(page)).toHaveAttribute("data-scrolled", "true");
      await expectNoAxeViolations(page, `/about/ scrolled, ${theme}`);
    });

    test(`the home page at the top, with the header in the hero's colour (${theme})`, async ({
      page,
    }) => {
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(header(page)).toHaveAttribute("data-tone", "hero");
      await expectNoAxeViolations(page, `/ at the top, ${theme}`);
    });
  }

  test("the keyboard reaches the pitch pill, shows where it is on the hero header, and can dismiss it", async ({
    page,
  }) => {
    await page.goto("/about/");
    await page.waitForLoadState("networkidle");
    await scrollTo(page, 0.6);
    const link = page.getByRole("link", { name: "Pitch to Us" });
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Dismiss the pitch prompt" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("complementary", { name: "Pitch your idea" })).toHaveCount(0);
  });

  test("on the hero header the focus ring is amber, since the light theme's ring would vanish on it", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "the drawer replaces the menu bar on a phone");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const trigger = header(page).locator(".desktop-nav__list > li > .nav-trigger").first();
    await trigger.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const outline = await trigger.evaluate((el) => getComputedStyle(el).outlineColor);
    expect(outline).toBe("rgb(242, 165, 65)");
  });
});
