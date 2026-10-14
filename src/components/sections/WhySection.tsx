import { SectionHeader } from "@/components/ui/SectionHeader";
import { getEcosystemTiles, getHomePage } from "@/content/loaders";
import { getKnownRoutes } from "@/content/routes";
import { display } from "@/content/todo";
import { isBuilt } from "@/lib/nav";
import { WhyTiles, type Tile } from "./WhyTiles";

export function prepareWhy(): Tile[] | null {
  const routes = getKnownRoutes();
  const tiles = getEcosystemTiles().map((tile): Tile => ({
    id: tile.id,
    icon: tile.icon,
    title: display(tile.title),
    short: display(tile.short),
    long: display(tile.long),
    href: tile.href && isBuilt(tile.href, routes) ? tile.href : null,
  }));
  return tiles.length > 0 ? tiles : null;
}

export function WhySection({ tiles, number }: { tiles: Tile[]; number: number }) {
  const copy = getHomePage().sectionTitles.whyIice;
  return (
    <section aria-labelledby="why-title" className="home-section py-section" data-tone="surface">
      <SectionHeader
        id="why-title"
        eyebrow={copy.eyebrow}
        number={number}
        title={copy.title}
        subline={copy.subline}
      />
      <div className="wrapper-wide">
        <WhyTiles tiles={tiles} />
      </div>
    </section>
  );
}
