/**
 * The page templates the performance budgets and Lighthouse audit (TRD §12): the fixed pages below, plus one startup, one
 * event and one news post for the pages built from a collection. Only routes that exist in the build are returned, so the
 * list needs no editing when a page is hidden or a collection is empty.
 */
export const FIXED_TEMPLATES = [
  "/",
  "/about/",
  "/about/team/",
  "/incubation/culture/",
  "/apply/",
  "/startups/",
  "/events/",
  "/news/",
  "/documents/",
  "/incubation/facilities/",
  "/careers/",
  "/contact/",
  "/birac-edge/",
] as const;

export const DETAIL_PATTERN = /^\/(startups|events|news)\/[^/]+\/$/;

export function auditedTemplates(builtRoutes: readonly string[]): string[] {
  const built = new Set(builtRoutes);
  const fixed = FIXED_TEMPLATES.filter((route) => built.has(route));
  const seen = new Set<string>();
  const details = [...builtRoutes].sort().filter((route) => {
    const kind = DETAIL_PATTERN.exec(route)?.[1];
    if (!kind || seen.has(kind)) return false;
    seen.add(kind);
    return true;
  });
  return [...fixed, ...details];
}
