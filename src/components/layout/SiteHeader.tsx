import { ButtonLink } from "@/components/ui/ButtonLink";
import { BrandMark } from "./BrandMark";
import { getChrome } from "./chrome";
import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";
import { ScrollHeader } from "./ScrollHeader";
import { StatusPill } from "./StatusPill";

/**
 * Two-Tier Official Government Masthead + Deep Navy Primary Navigation Bar (matches iice_iiserb_official_portal.html).
 */
export function SiteHeader() {
  const { site, nav, opportunities, buildTime, opportunitiesHref } = getChrome();
  const pill = (
    <StatusPill
      opportunities={opportunities}
      preferredSlug={site.intakeStatusOpportunity}
      buildTime={buildTime}
      href={opportunitiesHref}
    />
  );
  const hasMenu = nav.primary.length > 0;

  return (
    <ScrollHeader>
      {/* Tier 1: White Institutional Masthead with Dual Seals & Co-Branding Chips */}
      <div className="gov-masthead">
        <div className="gov-masthead__inner wrapper-wide">
          <BrandMark logo={site.logo} />
          <div className="gov-masthead__right">
            <div className="sponsor-chips" aria-label="Supporting Ministries and Host Institute">
              <a href="https://dst.gov.in" target="_blank" rel="noopener noreferrer" className="sponsor-chip">
                <strong>DST · NIDHI-TBI</strong>
                <span>Govt. of India</span>
              </a>
              <a href="https://www.iiserb.ac.in" target="_blank" rel="noopener noreferrer" className="sponsor-chip">
                <strong>IISER Bhopal</strong>
                <span>Host Institute (MoE)</span>
              </a>
              <a href="https://birac.nic.in" target="_blank" rel="noopener noreferrer" className="sponsor-chip">
                <strong>BIRAC EDGE</strong>
                <span>Bio-Incubation</span>
              </a>
            </div>
            <div className="site-header__pill">{pill}</div>
          </div>
        </div>
      </div>

      {/* Tier 2: Deep Navy Primary Navigation Bar with 3px Saffron Bottom Border */}
      <div className="gov-navbar">
        <div className="site-header__bar wrapper-wide">
          {hasMenu ? <DesktopNav items={nav.primary} /> : null}
          <div className="site-header__actions">
            {nav.cta ? (
              <ButtonLink
                href={nav.cta.href}
                variant="accent"
                {...(nav.cta.unbuilt ? { "data-todo": "unbuilt-link" } : {})}
              >
                {nav.cta.label} →
              </ButtonLink>
            ) : null}
            {hasMenu ? <MobileNav items={nav.primary}>{pill}</MobileNav> : null}
          </div>
        </div>
      </div>
    </ScrollHeader>
  );
}
