import { ArrowRight } from "lucide-react";
import { SmartLink } from "@/components/ui/SmartLink";
import { getCollection, getStages } from "@/content/loaders";
import { display, knownNumber } from "@/content/todo";
import { t } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";

/**
 * The three stages as a ladder of cards joined by a progress rail (SPEC §3 #6): name, phase, who it is for, duration,
 * funding band and up to three scheme chips. A value IICE has not confirmed reads "To be announced", never a number.
 * Used on Home and on the Incubation overview.
 */
export function JourneyLadder() {
  const stages = getStages();
  const schemes = new Map(getCollection("fundingSchemes").map((s) => [s.slug, s]));
  return (
    <ol className="journey">
      {stages.map((stage, index) => {
        const band = stage.fundingBand
          ? formatMoney({
              min: knownNumber(stage.fundingBand.min),
              max: knownNumber(stage.fundingBand.max),
            })
          : null;
        const chips = stage.schemeSlugs.flatMap((slug) => {
          const scheme = schemes.get(slug);
          return scheme ? [scheme] : [];
        });
        return (
          <li key={stage.slug} className="journey__stage" data-stage={stage.slug}>
            <span className="journey__marker" aria-hidden="true">
              {index + 1}
            </span>
            <article className="journey__card">
              <p className="eyebrow">{display(stage.phase)}</p>
              <h3 className="journey__name">
                <SmartLink
                  href={`/incubation/${stage.slug}/`}
                  className="card__link"
                  aria-label={t("pages.stage.explore", { stage: display(stage.name) })}
                >
                  {display(stage.name)}
                </SmartLink>
              </h3>
              <p className="journey__tagline">{display(stage.tagline)}</p>
              <dl className="journey__facts">
                <div>
                  <dt>{t("pages.stage.forWhom")}</dt>
                  <dd>{stage.audience.map(display).join("; ")}</dd>
                </div>
                <div>
                  <dt>{t("pages.stage.duration")}</dt>
                  <dd>{stage.duration ? display(stage.duration) : t("status.tba")}</dd>
                </div>
                <div>
                  <dt>{t("pages.stage.fundingBand")}</dt>
                  <dd>{band ?? t("status.tba")}</dd>
                </div>
              </dl>
              {chips.length > 0 ? (
                <ul className="tag-list">
                  {chips.slice(0, 3).map((scheme) => (
                    <li key={scheme.slug}>{display(scheme.name)}</li>
                  ))}
                </ul>
              ) : null}
              <p className="journey__cta" aria-hidden="true">
                {t("pages.stage.exploreShort")} <ArrowRight className="inline size-4" />
              </p>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
