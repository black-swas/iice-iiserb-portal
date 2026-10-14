import { byOrder, PartnerTile } from "@/components/pages/PartnersPage";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SmartLink } from "@/components/ui/SmartLink";
import { getCollection, getHomePage } from "@/content/loaders";
import { getKnownRoutes } from "@/content/routes";
import type { Partner } from "@/content/schema";
import { t } from "@/lib/i18n";
import { isBuilt } from "@/lib/nav";

const FUNDERS = new Set<Partner["category"]>(["funder-government", "host"]);

/** The partners chosen for the Home page, grouped as funders and patrons or ecosystem partners (SPEC §3 #12). */
export function prepareBackedBy() {
  const partners = getCollection("partners").filter((p) => p.showOnHome);
  const funders = partners.filter((p) => FUNDERS.has(p.category)).sort(byOrder);
  const ecosystem = partners.filter((p) => !FUNDERS.has(p.category)).sort(byOrder);
  return funders.length + ecosystem.length > 0 ? { funders, ecosystem } : null;
}

/** Home §12, "Backed by": a static grid, not a carousel, ending with a link to every partner. */
export function BackedBySection({
  groups,
  number,
}: {
  groups: NonNullable<ReturnType<typeof prepareBackedBy>>;
  number: number;
}) {
  const copy = getHomePage().sectionTitles.backedBy;
  const routes = getKnownRoutes();
  return (
    <section aria-labelledby="backed-title" className="home-section py-section">
      <SectionHeader
        id="backed-title"
        eyebrow={copy.eyebrow}
        number={number}
        title={copy.title}
        subline={copy.subline}
      />
      <div className="wrapper-wide">
        {groups.funders.length > 0 ? (
          <>
            <h3 className="backed__title">{t("home.funders")}</h3>
            <ul className="partner-grid">
              {groups.funders.map((p) => (
                <PartnerTile key={p.slug} partner={p} />
              ))}
            </ul>
          </>
        ) : null}
        {groups.ecosystem.length > 0 ? (
          <>
            <h3 className="backed__title">{t("home.ecosystem")}</h3>
            <ul className="partner-grid">
              {groups.ecosystem.map((p) => (
                <PartnerTile key={p.slug} partner={p} />
              ))}
            </ul>
          </>
        ) : null}
        {isBuilt("/about/partners/", routes) ? (
          <p className="home-section__more">
            <SmartLink href="/about/partners/">{t("home.allPartners")}</SmartLink>
          </p>
        ) : null}
      </div>
    </section>
  );
}
