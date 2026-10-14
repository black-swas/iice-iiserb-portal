// cspell:ignore facil facilites zzzqqq (deliberate search inputs: a prefix, a typo and a nonsense word)
import { expect, test, type Page } from "@playwright/test";

const dialog = (page: Page) => page.locator("dialog.palette");
// Scoped to the dialog: a form on the page may have a <select>, which is also a combobox.
const input = (page: Page) => dialog(page).getByRole("combobox");
const options = (page: Page) => page.getByRole("option");

test.describe("command palette", () => {
  test("is lazy: nothing about search is fetched until it is asked for", async ({ page }) => {
    const requested: string[] = [];
    page.on("request", (request) => requested.push(request.url()));
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // hydrated: the shortcuts attach once React starts
    await page.waitForLoadState("networkidle");
    expect(requested.filter((u) => u.includes("search-index"))).toEqual([]);
    expect(await page.locator("dialog.palette").count()).toBe(0);

    await page.keyboard.press("Control+k");
    await expect(dialog(page)).toHaveAttribute("open", "");
    await expect.poll(() => requested.some((u) => u.includes("search-index.json"))).toBe(true);
  });

  test("opens with Ctrl+K and Cmd+K, with the input focused and ready to type", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // hydrated: the shortcuts attach once React starts
    await page.keyboard.press("Control+k");
    await expect(dialog(page)).toHaveAttribute("open", "");
    await expect(input(page)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).not.toHaveAttribute("open", "");
    await page.keyboard.press("Meta+k");
    await expect(dialog(page)).toHaveAttribute("open", "");
  });

  test("opens from the visible Search button, which names the shortcut", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // hydrated: the shortcuts attach once React starts
    const button = page.getByRole("button", { name: "Search the site" });
    await expect(button).toHaveAttribute("aria-keyshortcuts", "Control+K Meta+K");
    await button.click();
    await expect(dialog(page)).toHaveAttribute("open", "");
    await expect(input(page)).toBeFocused();
  });

  test("opens with / unless you are typing in a field", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // hydrated: the shortcuts attach once React starts
    await page.keyboard.press("/");
    await expect(dialog(page)).toHaveAttribute("open", "");
    await page.keyboard.type("a/b"); // a slash typed into the search box is just a slash
    await expect(input(page)).toHaveValue("a/b");
  });

  test("is a real modal combobox: roles, aria-modal and an inert page behind it", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // hydrated: the shortcuts attach once React starts
    await page.keyboard.press("Control+k");
    await expect(dialog(page)).toHaveAttribute("aria-modal", "true");
    await expect(input(page)).toBeVisible();
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(options(page).first()).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
      "hidden",
    );
    for (let i = 0; i < 16; i++) {
      await page.keyboard.press("Tab");
      const where = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active || active === document.body) return "browser";
        return document.querySelector("dialog.palette")?.contains(active)
          ? "palette"
          : "page element";
      });
      expect(["palette", "browser"]).toContain(where);
    }
  });

  test("shows pages and actions before you type, in that order", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // hydrated: the shortcuts attach once React starts
    await page.keyboard.press("Control+k");
    // The index loads after the dialog opens, so the Pages group appears a moment later.
    await expect(page.locator("[cmdk-group-heading]")).toHaveText(["Pages", "Actions"]);
  });

  test("finds things by prefix, grouped, with the best match first", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // hydrated: the shortcuts attach once React starts
    await page.keyboard.press("Control+k");
    await input(page).fill("facil");
    await expect(options(page).first()).toContainText("Facilities");
    await expect(page.locator("[cmdk-group-heading]").first()).toHaveText("Pages");
  });

  test("forgives a typo", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // hydrated: the shortcuts attach once React starts
    await page.keyboard.press("Control+k");
    await input(page).fill("facilites");
    await expect(options(page).first()).toContainText("Facilities");
  });

  test("finds startups in their own group", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // hydrated: the shortcuts attach once React starts
    await page.keyboard.press("Control+k");
    await input(page).fill("plabeltech");
    await expect(page.getByRole("group", { name: "Startups" })).toBeVisible();
    await expect(options(page).first()).toContainText("Plabeltech");
  });

  test("says what to try when nothing matches", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // hydrated: the shortcuts attach once React starts
    await page.keyboard.press("Control+k");
    await input(page).fill("zzzqqq");
    await expect(
      page.getByText("Nothing matches “zzzqqq”. Try “apply” or “facilities”."),
    ).toBeVisible();
  });

  test("arrow keys move through the results and wrap round", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // hydrated: the shortcuts attach once React starts
    await page.keyboard.press("Control+k");
    await input(page).fill("apply");
    const selected = () => page.locator('[role="option"][data-selected="true"]');
    await expect(selected()).toHaveCount(1);
    const first = await selected().textContent();
    await page.keyboard.press("ArrowDown");
    expect(await selected().textContent()).not.toBe(first);
    await page.keyboard.press("ArrowUp");
    expect(await selected().textContent()).toBe(first);
    await page.keyboard.press("ArrowUp"); // wraps to the last
    expect(await selected().textContent()).not.toBe(first);
  });

  test("Enter on an action runs it: the theme switches", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // hydrated: the shortcuts attach once React starts
    await page.keyboard.press("Control+k");
    await input(page).fill("switch colour theme");
    // Enter runs the highlighted result, so wait until the action is the one highlighted.
    await expect(page.locator('[role="option"][data-selected="true"]')).toHaveText(
      "Switch colour theme",
    );
    await page.keyboard.press("Enter");
    await expect.poll(() => page.evaluate(() => localStorage.getItem("theme"))).toBe("light");
  });

  test("Enter on 'Copy the IICE email address' copies it and says so", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // hydrated: the shortcuts attach once React starts
    await page.keyboard.press("Control+k");
    await input(page).fill("copy");
    await page.keyboard.press("Enter");
    await expect(dialog(page).getByRole("status")).toHaveText("Email address copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("iice@iiserb.ac.in");
  });

  test("Escape closes it and focus goes back to where it was", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // hydrated: the shortcuts attach once React starts
    const trigger = page.getByRole("button", { name: "Search the site" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(dialog(page)).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await expect(dialog(page)).not.toHaveAttribute("open", "");
    await expect(trigger).toBeFocused();
  });

  test("closes from its close button and from a click on the backdrop", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // hydrated: the shortcuts attach once React starts
    await page.keyboard.press("Control+k");
    await page.getByRole("button", { name: "Close search" }).click();
    await expect(dialog(page)).not.toHaveAttribute("open", "");
    await page.keyboard.press("Control+k");
    await page.mouse.click(5, 5);
    await expect(dialog(page)).not.toHaveAttribute("open", "");
  });

  test("remembers a search you followed through, and offers it next time", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // hydrated: the shortcuts attach once React starts
    await page.keyboard.press("Control+k");
    await input(page).fill("impact");
    await options(page).first().click();
    await page.waitForURL(/\/about\/impact\//);
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // hydrated: the shortcuts attach once React starts
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("group", { name: "Recent searches" })).toBeVisible();
    // exact: the recent search is "impact"; the page is "Impact".
    await expect(page.getByRole("option", { name: "impact", exact: true })).toBeVisible();
    await page.getByRole("option", { name: "Clear recent searches" }).click();
    await expect(page.getByRole("group", { name: "Recent searches" })).toHaveCount(0);
  });

  test("offers a retry when the index cannot be loaded, and recovers", async ({ page }) => {
    await page.route("**/search-index.json", (route) => route.abort());
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // hydrated: the shortcuts attach once React starts
    await page.keyboard.press("Control+k");
    // (Next also has a route-announcer alert, so look inside the dialog.)
    await expect(dialog(page).getByRole("alert")).toContainText(
      "Search is not available right now.",
    );
    await page.unroute("**/search-index.json");
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(options(page).first()).toBeVisible();
    await expect(dialog(page).getByRole("alert")).toHaveCount(0);
  });
});
