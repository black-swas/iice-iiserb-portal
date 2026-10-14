import { expect, test } from "@playwright/test";
import { activeCard, openSpinbar, slotStyle } from "./helpers";

test.describe("spinbar: static grid (server render, no JS, reduced motion)", () => {
  test("is complete HTML before any script: six real links, descriptions visible", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    await page.goto("/");
    const cards = page.locator("a.spin-card");
    await expect(cards).toHaveCount(6);
    for (let i = 0; i < 6; i++) {
      await expect(cards.nth(i)).toHaveAttribute("href", /^\/startups\/[a-z-]+\/$/);
      await expect(cards.nth(i).locator(".spin-card__desc")).toBeVisible();
    }
    await expect(page.locator(".spin-stage")).toHaveCount(0);
    await context.close();
  });

  test("prefers-reduced-motion keeps the grid: no pin, no tilt, no stage", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", baseURL });
    const page = await context.newPage();
    await page.goto("/");
    await page.locator("#spotlight-heading").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200); // long enough for a stage to have loaded, were it going to
    await expect(page.locator(".spin-stage")).toHaveCount(0);
    await expect(page.locator(".spin-grid")).toBeVisible();
    const transforms = await page
      .locator("a.spin-card")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
    expect(transforms.every((t) => t === "none")).toBe(true);
    await context.close();
  });

  test("grid layout: one column at 360 px, two at 640 px, three at 1024 px", async ({
    browser,
    baseURL,
  }) => {
    const columns = async (width: number) => {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        javaScriptEnabled: false,
        baseURL,
      });
      const page = await context.newPage();
      await page.goto("/");
      const count = await page
        .locator(".spin-grid")
        .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
      await context.close();
      return count;
    };
    expect([await columns(360), await columns(640), await columns(1024)]).toEqual([1, 2, 3]);
  });

  test("cards are links named by their title, described by their text, with one tab stop each", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    await page.goto("/");
    const first = page.locator("a.spin-card").first();
    await expect(first).toHaveAccessibleName("Plabeltech");
    await expect(first).toHaveAccessibleDescription(
      "Incubated Precision site-selective protein and antibody labelling (LDM), homogeneous ADC bioconjugation, and Gly-Tag resins.",
    );
    expect(await first.locator("a, button").count()).toBe(0);
    await context.close();
  });
});

test.describe("spinbar: desktop ring", () => {
  test.skip(({ isMobile }) => isMobile, "ring is for a fine pointer at 1024 px or wider");

  test("replaces the grid with the pinned ring once the section is near", async ({ page }) => {
    await openSpinbar(page, "ring");
    await expect(page.locator(".spin-grid")).toHaveCount(0);
    await expect(page.locator(".spin-slot")).toHaveCount(6);
    await expect(page.locator(".spin-track")).toHaveCSS("height", `${6 * 0.7 * 800 + 800}px`);
  });

  test("cards stay real links in DOM order, and the active one shows its description", async ({
    page,
  }) => {
    await openSpinbar(page, "ring");
    const cards = page.locator("a.spin-card");
    await expect(cards).toHaveCount(6);
    for (let i = 0; i < 6; i++) await expect(cards.nth(i)).toHaveAttribute("href", /^\/startups\//);
    expect(await activeCard(page)).toBe(0);
    await expect(cards.nth(0).locator(".spin-card__desc")).toHaveCSS("opacity", "1");
    await expect(cards.nth(1).locator(".spin-card__desc")).toHaveCSS("opacity", "0");
  });

  test("places the cards on an arc 30° apart: upright focus card, tilted neighbours, the rest hidden", async ({
    page,
  }) => {
    await openSpinbar(page, "ring");
    await expect.poll(async () => (await slotStyle(page, 1)).transform).toContain("rotate(30deg)");
    expect((await slotStyle(page, 0)).transform).toContain("rotate(0deg)");
    expect((await slotStyle(page, 2)).transform).toContain("rotate(60deg)");
    expect((await slotStyle(page, 1)).filter).toContain("blur(3px)");
    expect((await slotStyle(page, 0)).filter).toBe("none");
    expect((await slotStyle(page, 3)).visibility).toBe("hidden");
    expect((await slotStyle(page, 0)).opacity).toBe("1");
    expect((await slotStyle(page, 1)).opacity).toBe("0.55");
  });

  test("the focus card is centred and its neighbour sits to the right and lower", async ({
    page,
  }) => {
    await openSpinbar(page, "ring");
    await expect.poll(async () => (await slotStyle(page, 1)).transform).toContain("rotate(30deg)");
    const box = async (i: number) => page.locator("a.spin-card").nth(i).boundingBox();
    const stage = (await page.locator(".spin-stage").boundingBox())!;
    const focus = (await box(0))!;
    const next = (await box(1))!;
    expect(Math.abs(focus.x + focus.width / 2 - (stage.x + stage.width / 2))).toBeLessThan(4);
    expect(next.x + next.width / 2).toBeGreaterThan(focus.x + focus.width / 2 + 150);
    expect(next.y + next.height / 2).toBeGreaterThan(focus.y + focus.height / 2);
  });

  test("scrolling moves the ring, one card per 70% of the viewport, and settles on a card", async ({
    page,
  }) => {
    await openSpinbar(page, "ring");
    expect(await activeCard(page)).toBe(0);
    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, 560); // one segment
    await expect.poll(() => activeCard(page), { timeout: 6000 }).toBe(1);
    await page.mouse.wheel(0, 560);
    await expect.poll(() => activeCard(page), { timeout: 6000 }).toBe(2);
    await expect
      .poll(async () => (await slotStyle(page, 2)).transform, { timeout: 6000 })
      .toContain("rotate(0deg)");
    await page.mouse.wheel(0, -1120);
    await expect.poll(() => activeCard(page), { timeout: 6000 }).toBe(0);
  });

  test("Next and Previous move one card, announce it politely, and disable at the ends", async ({
    page,
  }) => {
    await openSpinbar(page, "ring");
    const status = page.getByRole("status").filter({ hasText: "Showing" });
    const prev = page.getByRole("button", { name: "Show the previous card" });
    const next = page.getByRole("button", { name: "Show the next card" });
    await expect(status).toHaveText("Showing 1 of 6");
    await expect(prev).toHaveAttribute("aria-disabled", "true");
    await next.click();
    await expect.poll(() => activeCard(page), { timeout: 6000 }).toBe(1);
    await expect(status).toHaveText("Showing 2 of 6", { timeout: 6000 });
    await expect(prev).toHaveAttribute("aria-disabled", "false");
    await prev.click();
    await expect.poll(() => activeCard(page), { timeout: 6000 }).toBe(0);
    await expect(status).toHaveAttribute("aria-live", "polite");
  });

  test("tabbing to the next card brings it to the front, and focus stays on it", async ({
    page,
  }) => {
    await openSpinbar(page, "ring");
    await page.locator("a.spin-card").nth(0).focus();
    await page.keyboard.press("Tab");
    await expect(page.locator("a.spin-card").nth(1)).toBeFocused();
    await expect.poll(() => activeCard(page), { timeout: 6000 }).toBe(1);
    await page.keyboard.press("Tab");
    await expect(page.locator("a.spin-card").nth(2)).toBeFocused();
    await expect.poll(() => activeCard(page), { timeout: 6000 }).toBe(2);
    await page.keyboard.press("Shift+Tab");
    await expect(page.locator("a.spin-card").nth(1)).toBeFocused();
  });

  test("tab order equals visual order, and tabbing past the last card leaves the section", async ({
    page,
  }) => {
    await openSpinbar(page, "ring");
    await page.locator("a.spin-card").nth(0).focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press("Tab");
    await expect(page.locator("a.spin-card").nth(5)).toBeFocused();
    await page.keyboard.press("Tab"); // prev and next buttons
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() =>
      Boolean(document.activeElement?.closest(".spin-stage")),
    );
    expect(inside).toBe(false); // focus has moved on: no trap
  });

  test("a middle-click opens the card's link in a new tab", async ({ page, context }) => {
    await openSpinbar(page, "ring");
    const [popup] = await Promise.all([
      context.waitForEvent("page"),
      page.locator("a.spin-card").nth(0).click({ button: "middle" }),
    ]);
    expect(popup.url()).toMatch(/\/startups\/plabeltech\/$/);
  });

  test("keeps the blur budget: nothing more than two places from the front is blurred or even visible", async ({
    page,
  }) => {
    await openSpinbar(page, "ring");
    const next = page.getByRole("button", { name: "Show the next card" });
    for (let step = 0; step < 5; step++) {
      await expect.poll(() => activeCard(page), { timeout: 6000 }).toBe(step);
      await page.waitForTimeout(700);
      const active = await activeCard(page);
      for (let i = 0; i < 6; i++) {
        const style = await slotStyle(page, i);
        if (Math.abs(i - active) > 2) {
          expect(style.filter, `card ${i} while ${active} is active`).toBe("none");
          expect(style.visibility, `card ${i} while ${active} is active`).toBe("hidden");
        }
      }
      await next.click();
    }
  });

  test("animates only transform, opacity, filter and visibility on the slots", async ({ page }) => {
    await openSpinbar(page, "ring");
    const written = await page.evaluate(() => {
      const slot = document.querySelector<HTMLElement>(".spin-slot")!;
      const properties: string[] = [];
      for (let i = 0; i < slot.style.length; i++) properties.push(slot.style.item(i));
      return properties;
    });
    const allowed = new Set([
      "transform",
      "opacity",
      "filter",
      "visibility",
      "will-change",
      "z-index",
      "--i",
      "--gray",
      "--fill",
    ]);
    expect(written.filter((p) => !allowed.has(p))).toEqual([]);
  });

  test("shows a dot cursor over the stage that grows over the active card; the native cursor is hidden only there", async ({
    page,
  }) => {
    await openSpinbar(page, "ring");
    const stage = page.locator(".spin-stage");
    await expect(stage).toHaveAttribute("data-cursor", "on");
    await expect(page.locator(".spin-cursor")).toHaveAttribute("aria-hidden", "true");
    const box = (await page.locator("a.spin-card").nth(0).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator(".spin-cursor")).toHaveAttribute("data-state", "open");
    await expect(page.locator(".spin-cursor")).toHaveCSS("pointer-events", "none");
    expect(await page.evaluate(() => getComputedStyle(document.body).cursor)).not.toBe("none");
    expect(await stage.evaluate((el) => getComputedStyle(el).cursor)).toBe("none");
    await page.mouse.move(box.x - 150, box.y + 10);
    await expect(page.locator(".spin-cursor")).toHaveAttribute("data-state", "dot");
  });

  test("hides the cursor while a dialog is open", async ({ page }) => {
    await openSpinbar(page, "ring");
    const box = (await page.locator("a.spin-card").nth(0).boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + 20);
    await expect(page.locator(".spin-cursor")).toHaveCSS("opacity", "1");
    await page.keyboard.press("Control+k");
    await expect(page.locator("dialog.palette")).toHaveAttribute("open", "");
    await page.mouse.move(box.x + 30, box.y + 30);
    await expect(page.locator(".spin-cursor")).toHaveCSS("opacity", "0");
  });

  test("the header does not cover the pinned stage or the focused card", async ({ page }) => {
    await openSpinbar(page, "ring");
    const header = (await page.locator(".site-header").boundingBox())!;
    const stage = (await page.locator(".spin-stage").boundingBox())!;
    expect(stage.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
  });
});

test.describe("spinbar: touch deck", () => {
  test.skip(({ isMobile }) => !isMobile, "deck is for touch, under 1024 px");

  test("uses the deck at 360 px: segmented progress, no cursor, no record list", async ({
    page,
  }) => {
    await openSpinbar(page, "deck");
    await expect(page.locator(".spin-stage")).toHaveAttribute("data-variant", "deck");
    await expect(page.locator(".spin-segments span")).toHaveCount(6);
    await expect(page.locator(".spin-cursor")).toHaveCount(0);
    await expect(page.locator(".spin-record")).toBeHidden();
    await expect(page.locator(".spin-track")).toHaveCSS("height", `${(6 * 0.45 + 0.3) * 740}px`);
  });

  test("never blurs, and never tilts more than 4°, at any step", async ({ page }) => {
    await openSpinbar(page, "deck");
    const next = page.getByRole("button", { name: "Show the next card" });
    for (let step = 0; step < 6; step++) {
      await expect.poll(() => activeCard(page), { timeout: 6000 }).toBe(step);
      for (let i = 0; i < 6; i++) {
        const style = await slotStyle(page, i);
        expect(style.filter, `card ${i}`).not.toContain("blur");
        const rotation = /rotate\((-?[\d.]+)deg\)/.exec(style.transform);
        expect(Math.abs(Number(rotation?.[1] ?? 0)), `card ${i}`).toBeLessThanOrEqual(4);
      }
      if (step < 5) await next.click();
    }
  });

  test("the active card is upright and bright, the next waits beneath, dimmed", async ({
    page,
  }) => {
    await openSpinbar(page, "deck");
    await expect.poll(async () => (await slotStyle(page, 0)).transform).toContain("rotate(0deg)");
    expect((await slotStyle(page, 1)).transform).toContain("translateY(8%)");
    expect((await slotStyle(page, 1)).filter).toContain("brightness(0.6)");
    await expect(page.locator("a.spin-card").nth(0).locator(".spin-card__desc")).toHaveCSS(
      "opacity",
      "1",
    );
  });

  test("scrolling advances the deck by touch, one card per 45% of the screen", async ({ page }) => {
    await openSpinbar(page, "deck");
    expect(await activeCard(page)).toBe(0);
    await page.evaluate((y) => window.scrollBy(0, y), 0.45 * 740);
    await expect.poll(() => activeCard(page), { timeout: 6000 }).toBe(1);
    await page.evaluate((y) => window.scrollBy(0, y), 0.45 * 740);
    await expect.poll(() => activeCard(page), { timeout: 6000 }).toBe(2);
    await expect(page.locator(".spin-segments span").nth(2)).toHaveAttribute("data-active", "true");
  });

  test("Next, Previous and the live status work by tap, too", async ({ page }) => {
    await openSpinbar(page, "deck");
    await page.getByRole("button", { name: "Show the next card" }).tap();
    await expect.poll(() => activeCard(page), { timeout: 6000 }).toBe(1);
    await expect(page.getByRole("status").filter({ hasText: "Showing" })).toHaveText(
      "Showing 2 of 6",
      { timeout: 6000 },
    );
  });

  test("a tablet width shows 'The record': a title list beside the deck that jumps to a card", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 820, height: 1100 },
      isMobile: true,
      hasTouch: true,
      baseURL,
    });
    const page = await context.newPage();
    await openSpinbar(page, "deck");
    const record = page.getByRole("list", { name: "The record" });
    await expect(record).toBeVisible();
    await expect(record.getByRole("button")).toHaveCount(6);
    await expect(record.getByRole("button").first()).toHaveAttribute("aria-current", "true");
    await record.getByRole("button", { name: /Powernet Technology/ }).click();
    await expect.poll(() => activeCard(page), { timeout: 6000 }).toBe(3);
    await expect(record.getByRole("button", { name: /Powernet Technology/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await context.close();
  });
});
