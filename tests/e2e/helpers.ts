import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Fails with each violation's rule, impact and the elements it hit, so a failure says what to fix. */
export async function expectNoAxeViolations(page: Page, label: string, exclude: string[] = []) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  for (const selector of exclude) builder = builder.exclude(selector);
  const { violations } = await builder.analyze();
  const summary = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes
        .map((n) => n.target.join(" "))
        .slice(0, 4)
        .join("\n    ")}`,
  );
  expect(summary, `axe violations: ${label}`).toEqual([]);
}

/** Brings the spotlight into view and waits for the ring or deck to replace the static grid. */
export async function openSpinbar(page: Page, variant: "ring" | "deck") {
  await page.goto("/");
  await page.locator("#spotlight-heading").scrollIntoViewIfNeeded();
  await page.locator(`.spin-stage[data-variant="${variant}"]`).waitFor();
  await page.evaluate(() => document.querySelector(".spin-track")?.scrollIntoView());
}

/** The index of the card marked active, or -1. */
export const activeCard = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("a.spin-card")].findIndex(
      (a) => a.getAttribute("data-active") === "true",
    ),
  );

/** The inline style a slot carries, which is all the script ever writes. */
export const slotStyle = (page: Page, index: number) =>
  page.evaluate((i) => {
    const slot = document.querySelectorAll<HTMLElement>(".spin-slot")[i];
    return {
      transform: slot?.style.transform ?? "",
      filter: slot?.style.filter ?? "",
      visibility: slot?.style.visibility ?? "",
      opacity: slot?.style.opacity ?? "",
    };
  }, index);
