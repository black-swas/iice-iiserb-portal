import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers";

/**
 * The pages a build serves, taken from its own sitemap, so a new page is covered without editing a test. Pages that come
 * from a collection (one per startup, event…) are sampled, the first two of each kind, plus any in `always`.
 */
export function sampledRoutes(buildDirectory: string, always: string[] = []): string[] {
  const xml = readFileSync(path.join(process.cwd(), buildDirectory, "sitemap.xml"), "utf8");
  const all = [...xml.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map(
    (m) => m[1] as string,
  );
  const seen = new Map<string, number>();
  const sampled = all.filter((route) => {
    const prefix = /^\/(startups|events|news|events\/series|incubation\/funding)\/[^/]+\/$/.exec(
      route,
    )?.[1];
    if (!prefix) return true;
    seen.set(prefix, (seen.get(prefix) ?? 0) + 1);
    return (seen.get(prefix) as number) <= 2;
  });
  return [...new Set([...sampled, ...always.filter((route) => all.includes(route))])];
}

export async function settle(page: Page, route: string) {
  const response = await page.goto(route);
  expect(response?.status(), route).toBe(200);
  await page.waitForLoadState("networkidle");
}

/** The structure every page shares, no console errors, and axe (WCAG 2.2 AA) in the current theme. */
export async function checkPage(page: Page, route: string, label: string) {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));
  await settle(page, route);

  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("main#main")).toHaveCount(1);
  await expect(page.locator("link[rel='canonical']")).toHaveAttribute("href", /^https?:\/\//);
  await expect(page.locator("meta[name='description']")).toHaveAttribute("content", /.{30,}/);
  // Breadcrumbs on every page but the home page.
  if (route !== "/")
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
  await expectNoAxeViolations(page, `${route}, ${label}`);
  expect(problems, `console errors on ${route}`).toEqual([]);
}
