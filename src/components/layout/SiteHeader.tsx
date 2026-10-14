import { SearchTrigger } from "@/components/search/SearchTrigger";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SmartLink } from "@/components/ui/SmartLink";
import { BrandMark } from "./BrandMark";
import { getChrome } from "./chrome";
import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";
import { ScrollHeader } from "./ScrollHeader";
import { StatusPill } from "./StatusPill";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Institutional Masthead & Navigation Bar (GIGW 3.0 & iiserb.ac.in aligned):
 * Tier 1: Bilingual Brand Lockup, Host Institute & Sponsoring Ministry Links, and Intake Status Pill.
 * Tier 2: Primary Navigation Mega-Menu, Search Trigger (Ctrl+K), Theme Switcher, and Apply CTA.
 */
export function SiteHeader() {
  const { site, nav, opportunities, buildTime, opportunitiesHref, applyHref, email } = getChrome();
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
      <div className="gov-masthead">
        <div className="gov-masthead__inner wrapper-wide">
          <BrandMark logo={site.logo} />
          <div className="gov-masthead__right">
            <div className="sponsor-chips" aria-label="Host Institute and Sponsoring Agencies">
              <SmartLink href="https://www.iiserb.ac.in" className="sponsor-chip" hideExternalIcon>
                <strong>IISER Bhopal</strong>
                <span>Host Institute (MoE)</span>
              </SmartLink>
              <SmartLink href="https://dst.gov.in" className="sponsor-chip" hideExternalIcon>
                <strong>DST · NIDHI-TBI</strong>
                <span>Govt. of India</span>
              </SmartLink>
            </div>
            <div className="site-header__pill">{pill}</div>
          </div>
        </div>
      </div>

      <div className="gov-navbar">
        <div className="site-header__bar wrapper-wide">
          {hasMenu ? <DesktopNav items={nav.primary} /> : null}
          <div className="site-header__actions">
            <SearchTrigger applyHref={applyHref} email={email} />
            <ThemeToggle />
            {nav.cta ? (
              <ButtonLink
                href={nav.cta.href}
                variant="accent"
                {...(nav.cta.unbuilt ? { "data-todo": "unbuilt-link" } : {})}
              >
                {nav.cta.label}
              </ButtonLink>
            ) : null}
            {hasMenu ? <MobileNav items={nav.primary}>{pill}</MobileNav> : null}
          </div>
        </div>
      </div>
    </ScrollHeader>
  );
}
