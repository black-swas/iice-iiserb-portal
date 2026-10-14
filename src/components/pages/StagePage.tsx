import { Accordion } from "@/components/ui/Accordion";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { CtaBand } from "@/components/ui/CtaBand";
import { FactList } from "@/components/ui/FactList";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection } from "@/components/ui/PageSection";
import { Prose } from "@/components/ui/Prose";
import { SchemeCard } from "@/components/ui/SchemeCard";
import { SmartLink } from "@/components/ui/SmartLink";
import { getCollection, getEntry, getStage, getStages } from "@/content/loaders";
import type { Stage } from "@/content/schema";
import { display, knownNumber } from "@/content/todo";
import { t } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { crumbs } from "./crumbs";
import type { PageDef } from "./types";

const load = (slug: string): Stage & { body: string } => {
  const stage = getStage(slug);
  if (!stage) throw new Error(`content: stage "${slug}" is missing`);
  return stage;
};

function Steps({
  steps,
  horizontal = false,
}: {
  steps: Stage["programFlow"];
  horizontal?: boolean;
}) {
  return (
    <ol className={horizontal ? "steps steps--horizontal" : "steps"}>
      {steps.map((step, index) => (
        <li key={`${index}-${display(step.label)}`} className="steps__item">
          <span className="steps__number" aria-hidden="true">
            {index + 1}
          </span>
          <div>
            <h3 className="steps__label">{display(step.label)}</h3>
            {step.detail ? <p>{display(step.detail)}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** `/incubation/{stage}/` (SPEC §4.1): every section appears only when the stage has content for it. */
export function stagePage(slug: string): PageDef {
  return {
    meta: () => {
      const stage = load(slug);
      return {
        title: t("pages.stage.pageTitle", {
          stage: display(stage.name),
          phase: display(stage.phase),
        }),
        description: display(stage.oneLiner),
      };
    },
    render: () => {
      const stage = load(slug);
      const stages = getStages();
      const index = stages.findIndex((s) => s.slug === slug);
      const previous = stages[index - 1];
      const following = stages[index + 1];
      const now = new Date().toISOString();
      const schemes = getCollection("fundingSchemes").filter((s) =>
        stage.schemeSlugs.includes(s.slug),
      );
      const faq = stage.faqGroup ? getEntry("faqs", stage.faqGroup) : undefined;
      const band = stage.fundingBand
        ? formatMoney({
            min: knownNumber(stage.fundingBand.min),
            max: knownNumber(stage.fundingBand.max),
          })
        : null;

      return (
        <>
          <PageHeader
            trail={[crumbs.incubation(), { label: display(stage.name) }]}
            eyebrow={display(stage.phase)}
            title={display(stage.name)}
            lead={display(stage.oneLiner)}
          >
            <p className="button-row">
              <ButtonLink href={`/apply/?stage=${stage.slug}`} variant="accent">
                {t("pages.stage.apply", { stage: display(stage.name) })}
              </ButtonLink>
            </p>
          </PageHeader>

          <PageSection id="overview" title={t("pages.stage.overview")}>
            <Prose source={stage.body} format="mdx" />
            <FactList
              className="fact-list--wide"
              facts={[
                { label: t("pages.stage.forWhom"), value: stage.audience.map(display).join("; ") },
                {
                  label: t("pages.stage.duration"),
                  value: stage.duration ? display(stage.duration) : t("status.tba"),
                },
                { label: t("pages.stage.fundingBand"), value: band ?? t("status.tba") },
              ]}
            />
          </PageSection>

          <PageSection id="what-you-get" title={t("pages.stage.offerings")} tone="surface">
            <ul className="check-list">
              {stage.offerings.map((offering) => (
                <li key={display(offering)}>{display(offering)}</li>
              ))}
            </ul>
          </PageSection>

          {stage.programFlow.length > 0 ? (
            <PageSection id="program-flow" title={t("pages.stage.flow")}>
              <Steps steps={stage.programFlow} horizontal />
            </PageSection>
          ) : null}

          {stage.outcomes.length > 0 ? (
            <PageSection id="outcomes" title={t("pages.stage.outcomes")} tone="surface">
              <ul className="check-list">
                {stage.outcomes.map((outcome) => (
                  <li key={display(outcome)}>{display(outcome)}</li>
                ))}
              </ul>
            </PageSection>
          ) : null}

          {schemes.length > 0 ? (
            <PageSection id="schemes" title={t("pages.stage.schemes")}>
              <ul className="card-grid card-grid--3">
                {schemes.map((scheme) => (
                  <li key={scheme.slug}>
                    <SchemeCard scheme={scheme} serverNow={now} />
                  </li>
                ))}
              </ul>
            </PageSection>
          ) : null}

          {stage.selectionSteps.length > 0 ? (
            <PageSection id="selection" title={t("pages.stage.selection")} tone="surface">
              <Steps steps={stage.selectionSteps} />
            </PageSection>
          ) : null}

          {stage.exitCriteria && stage.exitCriteria.length > 0 ? (
            <PageSection id="graduate" title={t("pages.stage.exit")}>
              <ul className="check-list">
                {stage.exitCriteria.map((criterion) => (
                  <li key={display(criterion)}>{display(criterion)}</li>
                ))}
              </ul>
            </PageSection>
          ) : null}

          {faq ? (
            <PageSection id="faq" title={t("pages.stage.faq")} tone="surface">
              <Accordion
                items={faq.items.map((item, i) => ({
                  id: `faq-${i + 1}`,
                  title: display(item.q),
                  content: <Prose source={item.a} />,
                }))}
              />
            </PageSection>
          ) : null}

          <CtaBand
            id="stage-cta"
            title={t("pages.stage.ctaTitle", { stage: display(stage.name) })}
            actions={
              <>
                <ButtonLink href={`/apply/?stage=${stage.slug}`} variant="accent">
                  {t("pages.stage.apply", { stage: display(stage.name) })}
                </ButtonLink>
                <ButtonLink href="/contact/?topic=incubation" variant="inverse">
                  {t("pages.stage.talk")}
                </ButtonLink>
              </>
            }
          >
            <p>{t("pages.stage.ctaBody")}</p>
          </CtaBand>

          <nav aria-label={t("pages.stage.otherStages")} className="stage-nav wrapper">
            {previous ? (
              <SmartLink href={`/incubation/${previous.slug}/`} rel="prev">
                {t("pages.stage.previous", { stage: display(previous.name) })}
              </SmartLink>
            ) : (
              <span />
            )}
            {following ? (
              <SmartLink href={`/incubation/${following.slug}/`} rel="next">
                {t("pages.stage.next", { stage: display(following.name) })}
              </SmartLink>
            ) : null}
          </nav>
        </>
      );
    },
  };
}
