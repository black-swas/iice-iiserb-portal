import { JourneyLadder } from "@/components/sections/JourneyLadder";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection } from "@/components/ui/PageSection";
import { Prose } from "@/components/ui/Prose";
import { getCollection, getPage } from "@/content/loaders";
import { getKnownRoutes } from "@/content/routes";
import { display } from "@/content/todo";
import { t } from "@/lib/i18n";
import { isBuilt } from "@/lib/nav";
import type { PageDef } from "./types";

const load = () => {
  const page = getPage("incubation");
  if (!page) throw new Error('content: page "incubation" is missing');
  return page;
};

/** `/incubation/`: the overview, the three-stage journey, the engagement tracks that IICE confirms, and where to go next. */
export const incubationPage: PageDef = {
  meta: () => ({ title: display(load().title), description: display(load().description) }),
  render: () => {
    const page = load();
    const tracks = getCollection("tracks").sort((a, b) => a.order - b.order);
    const routes = getKnownRoutes();
    const next = [
      { href: "/apply/", label: t("pages.incubation.apply"), variant: "accent" as const },
      {
        href: "/incubation/funding/",
        label: t("pages.incubation.funding"),
        variant: "secondary" as const,
      },
      {
        href: "/incubation/facilities/",
        label: t("pages.incubation.facilities"),
        variant: "secondary" as const,
      },
    ].filter((link) => isBuilt(link.href, routes));
    return (
      <>
        <PageHeader
          trail={[{ label: display(page.title) }]}
          eyebrow={page.eyebrow}
          title={display(page.title)}
          lead={display(page.description)}
        />
        <div className="wrapper py-section">
          <Prose source={page.body} format="mdx" />
        </div>
        <PageSection id="journey" title={t("pages.incubation.journey")} tone="surface">
          <JourneyLadder />
        </PageSection>
        {tracks.length > 0 ? (
          <PageSection
            id="tracks"
            title={t("pages.incubation.tracks")}
            lead={t("pages.incubation.tracksLead")}
          >
            <ul className="card-grid card-grid--2">
              {tracks.map((track) => (
                <li key={track.slug} className="card">
                  <h3 className="card__title">{display(track.name)}</h3>
                  <p>{display(track.forWhom)}</p>
                  <dl className="fact-list">
                    <div className="fact-list__row">
                      <dt>{t("pages.stage.duration")}</dt>
                      <dd>{track.duration ? display(track.duration) : t("status.tba")}</dd>
                    </div>
                    <div className="fact-list__row">
                      <dt>{t("pages.incubation.terms")}</dt>
                      <dd>{track.terms ? display(track.terms) : t("pages.incubation.termsTba")}</dd>
                    </div>
                  </dl>
                  <ul className="check-list">
                    {track.includes.map((item) => (
                      <li key={display(item)}>{display(item)}</li>
                    ))}
                  </ul>
                  <ButtonLink
                    href={`/apply/?track=${track.slug}`}
                    variant="accent"
                    aria-label={t("pages.incubation.applyTrack", { track: display(track.name) })}
                  >
                    {t("pages.incubation.apply")}
                  </ButtonLink>
                </li>
              ))}
            </ul>
          </PageSection>
        ) : null}
        {next.length > 0 ? (
          <PageSection id="next" title={t("pages.incubation.next")}>
            <p className="button-row">
              {next.map((link) => (
                <ButtonLink key={link.href} href={link.href} variant={link.variant}>
                  {link.label}
                </ButtonLink>
              ))}
            </p>
          </PageSection>
        ) : null}
      </>
    );
  },
};
