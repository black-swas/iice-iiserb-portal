import { Icon } from "@/components/ui/Icon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SmartLink } from "@/components/ui/SmartLink";
import { getHomePage, getPaths } from "@/content/loaders";
import { getKnownRoutes } from "@/content/routes";
import { display } from "@/content/todo";
import { isBuilt } from "@/lib/nav";

interface PathView {
  audience: string;
  title: string;
  blurb: string;
  icon: string;
  links: { label: string; href: string }[];
}

/** The four audience cards, each with the links that exist. A card with no live link is left out (rule 4). */
export function preparePaths(): PathView[] | null {
  const routes = getKnownRoutes();
  const cards = getPaths().flatMap((card): PathView[] => {
    const links = card.links
      .filter((link) => isBuilt(link.href, routes))
      .map((link) => ({ label: display(link.label), href: link.href }));
    return links.length > 0
      ? [
          {
            audience: card.audience,
            title: display(card.title),
            blurb: display(card.blurb),
            icon: card.icon,
            links,
          },
        ]
      : [];
  });
  return cards.length > 0 ? cards : null;
}

/** Home §7, "Choose your path": founders, students, mentors, and investors and partners (SPEC §3 #7). */
export function PathsSection({ cards, number }: { cards: PathView[]; number: number }) {
  const copy = getHomePage().sectionTitles.paths;
  return (
    <section aria-labelledby="paths-title" className="home-section py-section" data-tone="surface">
      <SectionHeader
        id="paths-title"
        eyebrow={copy.eyebrow}
        number={number}
        title={copy.title}
        subline={copy.subline}
      />
      <div className="wrapper-wide">
        <ul className="paths">
          {cards.map((card) => (
            <li key={card.audience} className="path">
              <Icon name={card.icon} className="path__icon" />
              <h3 className="path__title">{card.title}</h3>
              <p>{card.blurb}</p>
              <ul className="path__links">
                {card.links.map((link) => (
                  <li key={link.href}>
                    <SmartLink href={link.href}>{link.label}</SmartLink>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
