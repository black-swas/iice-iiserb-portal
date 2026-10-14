import { expect, test } from "@playwright/test";

test.describe("open calls", () => {
  test("list the calls you can still act on, soonest deadline first and rolling ones after, with a hint", async ({
    page,
  }) => {
    await page.goto("/opportunities/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /^Open calls \(3\)/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: /^Past calls \(1\)/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    const titles = await page.locator("li.card h2").allInnerTexts();
    expect(titles).toEqual([
      "Fixture cohort intake",
      "Fixture rolling accelerator",
      "Fixture fellowship, opening soon",
    ]);
    const intake = page.locator("li.card", { hasText: "Fixture cohort intake" });
    await expect(intake).toContainText("Cohort intake");
    await expect(intake).toContainText("Open · closes 31 Dec 2099");
    await expect(intake).toContainText(/closes in \d+ days/);
    await expect(
      intake.getByRole("link", { name: "Apply for Fixture cohort intake" }),
    ).toHaveAttribute("href", "/apply/");
    await expect(
      intake.getByRole("link", { name: "Details of Fixture cohort intake" }),
    ).toHaveAttribute("href", "/incubation/funding/fx-scheme/");
    await expect(page.locator("li.card", { hasText: "rolling accelerator" })).toContainText(
      "Rolling applications",
    );
    await expect(page.locator("li.card", { hasText: "opening soon" })).toContainText(
      "Opens 1 Jun 2099",
    );
  });

  test("keep a closed call under Past, without an Apply button, and the view in the address", async ({
    page,
  }) => {
    await page.goto("/opportunities/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /^Past calls/ }).click();
    expect(page.url()).toContain("view=past");
    const closed = page.locator("li.card", { hasText: "Fixture challenge 2025" });
    await expect(closed).toContainText("Closed");
    await expect(closed.getByRole("link", { name: /^Apply/ })).toHaveCount(0);
    await expect(
      closed.getByRole("link", { name: "Details of Fixture challenge 2025" }),
    ).toHaveAttribute("href", "/events/fx-past-recorded/");
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /^Past calls/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("are what the header's status pill and the menu link to", async ({ page }) => {
    await page.goto("/");
    const pill = page.locator(".site-header__pill a.status-pill");
    await expect(pill).toHaveAttribute("href", "/opportunities/");
    await expect(page.locator("footer").getByRole("link", { name: "Open calls" })).toHaveAttribute(
      "href",
      "/opportunities/",
    );
  });
});
