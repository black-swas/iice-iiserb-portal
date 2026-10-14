import { expect, test } from "@playwright/test";

test.describe("team tabs", () => {
  test("open the tab the address names, and the old committees address", async ({ page }) => {
    await page.goto("/about/team/#technical-evaluation-committee");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("tab", { name: "Technical Evaluation Committee" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      page.getByRole("tabpanel", { name: "Technical Evaluation Committee" }),
    ).toBeVisible();

    await page.goto("/about/team/#committees");
    await expect(page.getByRole("tab", { name: "Managing Committee" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("move with the arrow keys, Home and End, and keep the address in step", async ({ page }) => {
    await page.goto("/about/team/");
    await page.waitForLoadState("networkidle");
    const tabs = page.getByRole("tab");
    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    expect(page.url()).toContain("#managing-committee");
    await page.keyboard.press("End");
    await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowRight");
    await expect(tabs.first()).toBeFocused(); // wraps round
    await page.keyboard.press("Home");
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    // Only the selected tab is in the tab order.
    await expect(tabs.first()).toHaveAttribute("tabindex", "0");
    await expect(tabs.nth(1)).toHaveAttribute("tabindex", "-1");
  });

  test("show a committee's members in a table with real headers, or say the roster is being updated", async ({
    page,
  }) => {
    await page.goto("/about/team/#managing-committee");
    await page.waitForLoadState("networkidle");
    const panel = page.getByRole("tabpanel", { name: "Managing Committee" });
    await expect(panel.getByRole("columnheader", { name: "Role in the committee" })).toBeVisible();
    await expect(panel.getByRole("row")).not.toHaveCount(0);
    await page.goto("/about/team/#management-advisory-committee");
    await expect(
      page.getByText("Composition being updated. Contact iice@iiserb.ac.in."),
    ).toBeVisible();
  });

  test("stack every panel under its heading when script is off", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    await page.goto("/about/team/");
    for (const heading of [
      "Team",
      "Managing Committee",
      "Executive Committee",
      "Technical Evaluation Committee",
      "Management Advisory Committee",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }
    await expect(page.getByRole("tablist")).toBeHidden();
    await context.close();
  });
});

test.describe("startup directory", () => {
  test("lists every startup in the page itself", async ({ page }) => {
    await page.goto("/startups/");
    await expect(page.getByRole("status")).toContainText("14 of 14 shown");
    await expect(page.locator("li.startup-card h2")).toHaveCount(14);
  });

  test("filters by search, keeps the search in the address, and clears", async ({ page }) => {
    await page.goto("/startups/");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Search startups").fill("plabel");
    await expect(page.getByRole("status")).toContainText("1 of 14 shown");
    await expect(page.getByRole("link", { name: "Plabeltech" })).toBeVisible();
    expect(page.url()).toContain("q=plabel");

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByLabel("Search startups")).toHaveValue("plabel");
    await expect(page.getByRole("status")).toContainText("1 of 14 shown");

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByRole("status")).toContainText("14 of 14 shown");
    expect(page.url()).not.toContain("q=");
  });

  test("lets a search include spaces while typing", async ({ page }) => {
    await page.goto("/startups/");
    await page.waitForLoadState("networkidle");
    const box = page.getByLabel("Search startups");
    await box.pressSequentially("intisen tech", { delay: 20 });
    await expect(box).toHaveValue("intisen tech");
    await expect(page.getByRole("status")).toContainText("1 of 14 shown");
  });

  test("says so when nothing matches, and offers a way out", async ({ page }) => {
    await page.goto("/startups/?q=zzzz");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("No startups match these filters")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).first().click();
    await expect(page.getByRole("status")).toContainText("14 of 14 shown");
  });

  test("makes each card one link", async ({ page }) => {
    await page.goto("/startups/");
    const cards = page.locator("li.startup-card");
    await expect(cards).toHaveCount(14);
    await expect(cards.first().getByRole("link")).toHaveCount(1);
  });
});

test.describe("events", () => {
  test("show the past events when none is upcoming, and let the visitor switch", async ({
    page,
  }) => {
    await page.goto("/events/");
    await page.waitForLoadState("networkidle");
    const upcoming = page.getByRole("button", { name: /^Upcoming/ });
    const past = page.getByRole("button", { name: /^Past/ });
    await expect(past).toHaveAttribute("aria-pressed", "true");
    await expect(upcoming).toHaveAttribute("aria-pressed", "false");
    await upcoming.click();
    expect(page.url()).toContain("view=upcoming");
    await expect(page.getByText("No upcoming events")).toBeVisible();
    await past.click();
    await expect(
      page.getByRole("heading", { level: 2, name: /Industry–Academia Conclave 2.0/ }),
    ).toBeVisible();
  });

  test("honour ?view=past, which the old past-events address redirects to", async ({ page }) => {
    await page.goto("/events/?view=past");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /^Past/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("filter by type with counts that follow the data", async ({ page }) => {
    await page.goto("/events/?view=past");
    await page.waitForLoadState("networkidle");
    const chip = page.getByRole("button", { name: /^Programme \(3\)/ });
    await chip.click();
    await expect(page.getByRole("status")).toContainText("3 of 9 shown");
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(page.url()).toContain("type=programme");
  });

  test("an event page shows when, where, who and that it has ended", async ({ page }) => {
    await page.goto("/events/industry-academia-conclave-2026/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Industry–Academia Conclave 2.0" }),
    ).toBeVisible();
    await expect(page.getByText("8 Aug 2026")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "People" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Chief guest" })).toBeVisible();
    await expect(page.getByText("This event has ended.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Register" })).toHaveCount(0);
  });
});

test.describe("what the pages leave out", () => {
  test("offer no registration, calendar or recording that does not exist", async ({ page }) => {
    await page.goto("/events/startup-studio-lab-to-market/");
    await expect(page.getByRole("link", { name: "Register" })).toHaveCount(0);
  });

  test("show the careers page with an honest empty state", async ({ page }) => {
    await page.goto("/careers/");
    await page.waitForLoadState("networkidle");
    const first = page.getByRole("tabpanel", { name: "Work with IICE" });
    await expect(first.getByText("No open positions right now")).toBeVisible();
    await expect(first.getByRole("link", { name: "iice@iiserb.ac.in" })).toBeVisible();
    await page.getByRole("tab", { name: "Work with incubated startups" }).click();
    expect(page.url()).toContain("#work-with-startups");
    await expect(
      page
        .getByRole("tabpanel", { name: "Work with incubated startups" })
        .getByText("No open positions right now"),
    ).toBeVisible();
  });

  test("keep the mentors page useful with no mentors listed", async ({ page }) => {
    await page.goto("/about/mentors/");
    await expect(page.getByText("No mentors are listed yet")).toBeVisible();
    await expect(page.locator("#become-a-mentor")).toBeVisible();
  });
});

test.describe("home page", () => {
  test("numbers its sections from the ones that appear", async ({ page }) => {
    await page.goto("/");
    const eyebrows = await page
      .locator("main header p")
      .evaluateAll((els) =>
        els.map((el) => el.textContent?.trim() ?? "").filter((text) => /^\d{2} \/ /.test(text)),
      );
    expect(eyebrows.length).toBeGreaterThan(3);
    eyebrows.forEach((text, index) =>
      expect(text.startsWith(String(index + 1).padStart(2, "0"))).toBe(true),
    );
  });

  test("has one h1, the hero headline, with its emphasised words", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("Where science becomes a startup.");
    await expect(page.locator("h1 em")).toHaveText(["science", "startup"]);
  });

  test("expands a Why IICE tile with the button, not only on hover", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const tile = page.getByRole("button", { name: /Mentoring/ });
    await expect(tile).toHaveAttribute("aria-expanded", "false");
    await tile.click();
    await expect(tile).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#tile-mentoring")).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(tile).toHaveAttribute("aria-expanded", "false");
  });

  test("hides sections that have nothing honest to show", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#testimonials-title")).toHaveCount(0);
    await expect(page.locator(".logo-strip")).toHaveCount(0);
    await expect(page.locator("[data-stat]")).toHaveCount(0); // fewer than three confirmed figures
  });
});
