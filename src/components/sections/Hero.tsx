import { ButtonLink } from "@/components/ui/ButtonLink";
import { SmartLink } from "@/components/ui/SmartLink";
import { getHomePage, getStages } from "@/content/loaders";
import { getKnownRoutes } from "@/content/routes";
import { display } from "@/content/todo";
import { t } from "@/lib/i18n";
import { isBuilt } from "@/lib/nav";
import { parseEmphasis } from "@/lib/text";

/**
 * Two-Column Official Government Portal Hero:
 * Left: Mandate Kicker, Title, Lead Copy, CTAs, and 3-Stage Framework Strip.
 * Right: Official Circulars & Active Calls Board.
 */
export function Hero() {
  const { hero } = getHomePage();
  const routes = getKnownRoutes();
  const stages = getStages();
  const ctas = [
    { cta: hero.primaryCta, variant: "accent" as const },
    { cta: hero.secondaryCta, variant: "inverse" as const },
  ].filter(({ cta }) => isBuilt(cta.href, routes));

  return (
    <section aria-labelledby="hero-title" className="hero">
      <div className="hero__inner wrapper-wide">
        <div className="hero__main">
          <p className="hero__kicker">
            NSTEDB · Department of Science &amp; Technology · Govt. of India
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
              {isBuilt("/documents/", routes) ? (
                <ButtonLink href="/documents/" variant="inverse">
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
                <strong>{display(stage.name)}</strong>
                <span>{display(stage.tagline)}</span>
              </li>
            ))}
          </ol>
        </div>

        <aside className="hero-board" aria-label="Official Circulars and Active Calls">
          <div>
            <div className="hero-board__head">
              <h2 className="hero-board__title">Official Circulars &amp; Active Calls</h2>
              <span className="hero-board__badge">Updated Oct 2026</span>
            </div>
            <ul className="hero-board__list">
              <li className="hero-board__item">
                <div className="hero-board__meta">
                  <span className="hero-board__tag">Open Call</span>
                  <span className="hero-board__date">Rolling Intake · FY 2026–27</span>
                </div>
                <SmartLink href="/apply/" className="hero-board__link">
                  Application for Admission to IICE Incubation Programme (Catalyse / Culture / Commercialise) →
                </SmartLink>
              </li>
              <li className="hero-board__item">
                <div className="hero-board__meta">
                  <span className="hero-board__tag">MoA Signed</span>
                  <span className="hero-board__date">Sep 2026</span>
                </div>
                <SmartLink href="/incubation/services/" className="hero-board__link">
                  IISER Bhopal Signs MoA with Biotech Consortium India Ltd. (BCIL), New Delhi for Tech Transfer →
                </SmartLink>
              </li>
              <li className="hero-board__item">
                <div className="hero-board__meta">
                  <span className="hero-board__tag">Scheme Notice</span>
                  <span className="hero-board__date">08 Aug 2026</span>
                </div>
                <SmartLink href="/birac-edge/" className="hero-board__link">
                  BIRAC EDGE Scheme Announced at Industry–Academia Conclave 2.0 (Dr. Debasis Nayak) →
                </SmartLink>
              </li>
              <li className="hero-board__item">
                <div className="hero-board__meta">
                  <span className="hero-board__tag">ATRI &amp; DroneTech</span>
                  <span className="hero-board__date">2025–2026</span>
                </div>
                <SmartLink href="/about/ecosystem/" className="hero-board__link">
                  ₹485 Cr ATRI Campus Expansion &amp; ₹85.51 Cr AI-Driven DroneTech Hub with MPSeDC →
                </SmartLink>
              </li>
            </ul>
          </div>
          <div className="hero-board__foot">
            <span>Helpline: <strong>+91 755 269 2384</strong></span>
            <span>Email: <strong>iice@iiserb.ac.in</strong></span>
          </div>
        </aside>
      </div>
    </section>
  );
}
