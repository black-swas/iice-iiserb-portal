import { SpinbarSection } from "@/components/spinbar/SpinbarSection";
import type { SpinbarItem } from "@/components/spinbar/types";
import { getHomePage, getSpotlight } from "@/content/loaders";
import { getKnownRoutes } from "@/content/routes";
import { display, showTodoMarkers } from "@/content/todo";
import { enumLabel } from "@/lib/i18n";
import { resolvePicture } from "@/lib/images";
import { isBuilt } from "@/lib/nav";

/**
 * The spotlight cards whose target page exists (rule 4); null when fewer than three remain, which hides the section.
 * Development and preview builds keep unbuilt ones, flagged, so the section can be reviewed.
 */
export function prepareSpotlight(): SpinbarItem[] | null {
  const routes = getKnownRoutes();
  const showUnbuilt = showTodoMarkers();

  const items = getSpotlight().flatMap((item): SpinbarItem[] => {
    const built = isBuilt(item.href, routes);
    if (!built && !showUnbuilt) return [];
    return [
      {
        id: item.id,
        badge: enumLabel("spotlightBadge", item.badge),
        title: display(item.title),
        description: display(item.description),
        href: item.href,
        ...(item.image ? { picture: resolvePicture(item.image) } : {}),
        ...(built ? {} : { unbuilt: true }),
      },
    ];
  });
  return items.length < 3 ? null : items;
}

/** Home §8, "Startup Spotlight" (SPEC §3 #8). */
export function SpotlightSection({ items, number }: { items: SpinbarItem[]; number?: number }) {
  const copy = getHomePage().sectionTitles.spotlight;
  return (
    <SpinbarSection
      id="spotlight"
      eyebrow={copy.eyebrow}
      {...(number === undefined ? {} : { number })}
      title={copy.title}
      subline={copy.subline}
      items={items}
    />
  );
}
