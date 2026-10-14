import { Accordion } from "@/components/ui/Accordion";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection } from "@/components/ui/PageSection";
import { Prose } from "@/components/ui/Prose";
import { SchemeCard } from "@/components/ui/SchemeCard";
import { ScrollRegion } from "@/components/ui/ScrollRegion";
import { SmartLink } from "@/components/ui/SmartLink";
import { WindowStatus } from "@/components/ui/WindowStatus";
import { getCollection, getEntry } from "@/content/loaders";
import { getKnownRoutes } from "@/content/routes";
import type { FundingScheme } from "@/content/schema";
import { display, knownNumber } from "@/content/todo";
import { formatDate } from "@/lib/dates";
import { telHref } from "@/lib/contact";
import { t } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { isBuilt } from "@/lib/nav";
import { crumbs } from "./crumbs";
import type { PageDef } from "./types";

/** `/incubation/funding/`: every scheme as a card with its live status. */
export const fundingListPage: PageDef = {
  meta: () => ({ title: t("pages.funding.title"), description: t("pages.funding.description") }),
  render: () => {
    const now = new Date().toISOString();
    const schemes = getCollection("fundingSchemes");
    return (
      <>
        <PageHeader
          trail={[crumbs.incubation(), { label: t("pages.funding.title") }]}
          eyebrow={t("pages.crumbs.incubation")}
          title={t("pages.funding.title")}
          lead={t("pages.funding.description")}
        />
        <div className="wrapper py-section">
          <ul className="card-grid card-grid--3">
            {schemes.map((scheme) => (
              <li key={scheme.slug}>
                <SchemeCard scheme={scheme} serverNow={now} />
              </li>
            ))}
          </ul>
        </div>
      </>
    );
  },
};

const tbc = () => t("pages.funding.tbc");

function atAGlance(scheme: FundingScheme) {
  const g = scheme.atAGlance;
  const support = g.maxSupport
    ? formatMoney({ min: knownNumber(g.maxSupport.min), max: knownNumber(g.maxSupport.max) })
    : null;
  const text = (value: string | null) => (value ? display(value) : tbc());
  return [
    { label: t("pages.funding.maxSupport"), value: support ?? tbc() },
    { label: t("pages.funding.duration"), value: text(g.duration) },
    { label: t("pages.funding.purpose"), value: text(g.purpose) },
    { label: t("pages.funding.agency"), value: text(g.fundingAgency) },
    { label: t("pages.funding.output"), value: text(g.expectedOutput) },
    { label: t("pages.funding.whoCanApply"), value: text(g.whoCanApply) },
  ];
}

function List({ items }: { items: readonly string[] }) {
  return (
    <ul className="check-list">
      {items.map((item) => (
        <li key={display(item)}>{display(item)}</li>
      ))}
    </ul>
  );
}

/** `/incubation/funding/{slug}/` (SPEC §4.1b): the scheme from headline to FAQ, with Apply carrying the scheme. */
export function fundingSchemePage(slug: string): PageDef {
  const load = () => {
    const scheme = getEntry("fundingSchemes", slug);
    if (!scheme) throw new Error(`content: funding scheme "${slug}" is missing`);
    return scheme;
  };
  return {
    meta: () => ({ title: display(load().name), description: display(load().oneLiner) }),
    render: () => {
      const scheme = load();
      const now = new Date().toISOString();
      const routes = getKnownRoutes();
      const faq = scheme.faqGroup ? getEntry("faqs", scheme.faqGroup) : undefined;
      const rows = atAGlance(scheme);
      const apply = scheme.externalPortalUrl ?? `/apply/?scheme=${scheme.slug}`;
      const hasContact = Boolean(
        scheme.contact?.email || scheme.contact?.phone || scheme.officialUrl,
      );
      return (
        <>
          <PageHeader
            trail={[crumbs.incubation(), crumbs.funding(), { label: display(scheme.name) }]}
            eyebrow={display(scheme.provider)}
            title={display(scheme.name)}
            lead={display(scheme.oneLiner)}
          >
            <p className="button-row">
              <WindowStatus window={scheme.window} serverNow={now} />
              <ButtonLink href={apply} variant="accent">
                {t("pages.funding.apply")}
              </ButtonLink>
            </p>
          </PageHeader>

          <PageSection id="at-a-glance" title={t("pages.funding.glance")}>
            <ScrollRegion className="table-scroll" label={t("pages.funding.glance")}>
              <table className="data-table data-table--rows">
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollRegion>
          </PageSection>

          {scheme.benefits.length > 0 ? (
            <PageSection id="benefits" title={t("pages.funding.benefits")} tone="surface">
              <List items={scheme.benefits} />
            </PageSection>
          ) : null}

          <PageSection id="eligibility" title={t("pages.funding.eligibility")}>
            <List items={scheme.eligibility} />
          </PageSection>

          {scheme.coveredUses.length > 0 || scheme.nonPermittedUses.length > 0 ? (
            <PageSection id="coverage" title={t("pages.funding.coverage")} tone="surface">
              <div className="two-column">
                {scheme.coveredUses.length > 0 ? (
                  <div>
                    <h3>{t("pages.funding.covered")}</h3>
                    <List items={scheme.coveredUses} />
                  </div>
                ) : null}
                {scheme.nonPermittedUses.length > 0 ? (
                  <div>
                    <h3>{t("pages.funding.notCovered")}</h3>
                    <List items={scheme.nonPermittedUses} />
                  </div>
                ) : null}
              </div>
            </PageSection>
          ) : null}

          {scheme.importantPoints.length > 0 ? (
            <PageSection id="important" title={t("pages.funding.important")}>
              <div className="callout" role="note">
                <List items={scheme.importantPoints} />
              </div>
            </PageSection>
          ) : null}

          {scheme.selectionSteps.length > 0 || scheme.documentsRequired.length > 0 ? (
            <PageSection id="process" title={t("pages.funding.process")} tone="surface">
              {scheme.selectionSteps.length > 0 ? (
                <ol className="steps">
                  {scheme.selectionSteps.map((step, index) => (
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
              ) : null}
              {scheme.screeningDuration ? (
                <p>
                  {t("pages.funding.screening", { duration: display(scheme.screeningDuration) })}
                </p>
              ) : null}
              {scheme.documentsRequired.length > 0 ? (
                <>
                  <h3>{t("pages.funding.documents")}</h3>
                  <List items={scheme.documentsRequired} />
                </>
              ) : null}
            </PageSection>
          ) : null}

          {scheme.cohorts.length > 0 ? (
            <PageSection id="cohorts" title={t("pages.funding.cohorts")}>
              <Accordion
                items={scheme.cohorts.map((cohort, i) => ({
                  id: `cohort-${i + 1}`,
                  title: cohort.label,
                  content: (
                    <ul className="plain-list">
                      {cohort.beneficiaries.map((b) => (
                        <li key={display(b.name)}>
                          <strong>
                            {b.startupSlug && isBuilt(`/startups/${b.startupSlug}/`, routes) ? (
                              <SmartLink href={`/startups/${b.startupSlug}/`}>
                                {display(b.name)}
                              </SmartLink>
                            ) : (
                              display(b.name)
                            )}
                          </strong>
                          : {display(b.oneLiner)}
                        </li>
                      ))}
                    </ul>
                  ),
                }))}
              />
            </PageSection>
          ) : null}

          {scheme.howToApply ? (
            <PageSection id="how-to-apply" title={t("pages.funding.howToApply")} tone="surface">
              <Prose source={scheme.howToApply} />
            </PageSection>
          ) : null}

          {faq ? (
            <PageSection id="faq" title={t("pages.funding.faq")}>
              <Accordion
                items={faq.items.map((item, i) => ({
                  id: `faq-${i + 1}`,
                  title: display(item.q),
                  content: <Prose source={item.a} />,
                }))}
              />
            </PageSection>
          ) : null}

          {hasContact || scheme.lastReviewed ? (
            <PageSection id="contact" title={t("pages.funding.contact")} tone="surface">
              {hasContact ? (
                <ul className="plain-list">
                  {scheme.contact?.email ? (
                    <li>
                      <a href={`mailto:${scheme.contact.email}`}>{scheme.contact.email}</a>
                    </li>
                  ) : null}
                  {scheme.contact?.phone ? (
                    <li>
                      <a href={telHref(scheme.contact.phone)}>{scheme.contact.phone}</a>
                    </li>
                  ) : null}
                  {scheme.officialUrl ? (
                    <li>
                      <SmartLink href={scheme.officialUrl}>{t("pages.funding.official")}</SmartLink>
                    </li>
                  ) : null}
                </ul>
              ) : null}
              {scheme.lastReviewed ? (
                <p className="muted">
                  {t("pages.funding.reviewed", { date: formatDate(scheme.lastReviewed) })}
                </p>
              ) : null}
            </PageSection>
          ) : null}
        </>
      );
    },
  };
}
