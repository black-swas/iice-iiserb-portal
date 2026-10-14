import { ButtonLink } from "@/components/ui/ButtonLink";
import { SmartLink } from "@/components/ui/SmartLink";
import { getHomePage, getStages } from "@/content/loaders";
import { getKnownRoutes } from "@/content/routes";
import { display } from "@/content/todo";
import { t } from "@/lib/i18n";
import { isBuilt } from "@/lib/nav";
import { parseEmphasis } from "@/lib/text";

/**
 * Institutional Two-Column Hero (inspired by iiserb.ac.in & premier Indian academic E-Cells):
 * Left: Official DST NIDHI-TBI & IISER Bhopal Kicker, Headline, Lead Copy, Actions, and 3-Stage Framework.
 * Right: Official Notices, Active Funding Calls & Campus Infrastructure Dossier.
 */
export function Hero() {
  const { hero } = getHomePage();
  const routes = getKnownRoutes();
  const stages = getStages();
  const ctas = [
    { cta: hero.primaryCta, variant: "accent" as const },
    { cta: hero.secondaryCta, variant: "secondary" as const },
  ].filter(({ cta }) => isBuilt(cta.href, routes));

  return (
    <section aria-labelledby="hero-title" className="hero">
      <div className="hero__inner wrapper-wide">
        <div className="hero__main">
          <p className="hero__kicker">
            DST NIDHI-TBI Technology Business Incubator · IISER Bhopal (Ministry of Education, Govt. of India)
          </p>
          <h1 id="hero-title" className="hero__title">
            {parseEmphasis(display(hero.headline)).map((segment, index) =>
              segment.emphasis ? (
                <em key={index} className="hero__em">
                  {segment.text}
                </em>
              ) : (
                <span key={index}>{segment.text}</span>
              ),
            )}
          </h1>
          <p className="hero__subcopy">{display(hero.subcopy)}</p>
          {ctas.length > 0 ? (
            <p className="hero__actions">
              {ctas.map(({ cta, variant }) => (
                <ButtonLink key={cta.href} href={cta.href} variant={variant}>
                  {display(cta.label)}
                </ButtonLink>
              ))}
              {isBuilt("/incubation/funding/", routes) ? (
                <ButtonLink href="/incubation/funding/" variant="secondary">
                  Funding Schemes (NIDHI / BIRAC)
                </ButtonLink>
              ) : null}
              {isBuilt("/documents/", routes) ? (
                <ButtonLink href="/documents/" variant="secondary">
                  Incubation Policy &amp; By-Laws
                </ButtonLink>
              ) : null}
            </p>
          ) : null}
          <ol className="hero__stages" aria-label={t("home.stagesLabel")}>
            {stages.map((stage, index) => (
              <li key={stage.slug}>
                <span className="hero__stage-number" aria-hidden="true">
                  Stage {String(index + 1).padStart(2, "0")} · {display(stage.phase)}
                </span>
                <strong>
                  <SmartLink href={`/incubation/${stage.slug}/`} className="hero__stage-link">
                    {display(stage.name)}
                  </SmartLink>
                </strong>
                <span>{display(stage.tagline)}</span>
              </li>
            ))}
          </ol>
        </div>

        <aside className="hero-board" aria-label="Official Notices and Active Calls">
          <div>
            <div className="hero-board__head">
              <h2 className="hero-board__title">Official Notices &amp; Schemes</h2>
              <span className="hero-board__badge">FY 2026–27</span>
            </div>
            <ul className="hero-board__list">
              <li className="hero-board__item">
                <div className="hero-board__meta">
                  <span className="hero-board__tag">Open Call</span>
                  <span className="hero-board__date">Rolling Intake</span>
                </div>
                <SmartLink href="/apply/" className="hero-board__link">
                  Admission to IICE Resident, Virtual &amp; Student Pre-Incubation Tracks
                </SmartLink>
              </li>
              <li className="hero-board__item">
                <div className="hero-board__meta">
                  <span className="hero-board__tag">Grant Support</span>
                  <span className="hero-board__date">DST &amp; BIRAC</span>
                </div>
                <SmartLink href="/incubation/funding/" className="hero-board__link">
                  DST NIDHI-TBI Seed Support, NIDHI-EIR, BIRAC BIG/EDGE &amp; MSME RAMP Schemes
                </SmartLink>
              </li>
              <li className="hero-board__item">
                <div className="hero-board__meta">
                  <span className="hero-board__tag">CIF Access</span>
                  <span className="hero-board__date">6 Core Suites</span>
                </div>
                <SmartLink href="/incubation/facilities/instruments/" className="hero-board__link">
                  Central Instrumentation Facility: NMR (500/700 MHz), UHPLC-HRMS, SC-XRD, FESEM &amp; Confocal
                </SmartLink>
              </li>
              <li className="hero-board__item">
                <div className="hero-board__meta">
                  <span className="hero-board__tag">E-Cell &amp; Club</span>
                  <span className="hero-board__date">Campus Ecosystem</span>
                </div>
                <SmartLink href="/about/innovation-club/" className="hero-board__link">
                  Innovation Club at IICE: Student Ideathons, Startup Studio &amp; Lab-to-Market Cohorts
                </SmartLink>
              </li>
            </ul>
          </div>
          <div className="hero-board__foot">
            <span>2nd Floor, Main Building, IISER Bhopal</span>
            <span>Tel: +91 755 269 2384 · iice@iiserb.ac.in</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
