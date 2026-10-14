import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { SmartLink } from "@/components/ui/SmartLink";
import { getCollection } from "@/content/loaders";
import { getKnownRoutes } from "@/content/routes";
import { display } from "@/content/todo";
import { enumLabel, t } from "@/lib/i18n";
import { isBuilt } from "@/lib/nav";
import { crumbs } from "./crumbs";
import type { PageDef } from "./types";

/** `/incubation/services/` (SPEC §4.13): what IISER Bhopal offers incubatees beyond space, and how to engage. */
export const servicesPage: PageDef = {
  meta: () => ({ title: t("pages.services.title"), description: t("pages.services.description") }),
  render: () => {
    const services = getCollection("services");
    const routes = getKnownRoutes();
    const instruments = new Map(getCollection("instruments").map((i) => [i.slug, i]));
    return (
      <>
        <PageHeader
          trail={[crumbs.incubation(), { label: t("pages.services.title") }]}
          eyebrow={t("pages.crumbs.incubation")}
          title={t("pages.services.title")}
          lead={t("pages.services.description")}
        />
        <div className="wrapper py-section">
          <ul className="card-grid card-grid--2">
            {services.map((service) => {
              const related = service.relatedInstrumentSlugs.flatMap((slug) => {
                const instrument = instruments.get(slug);
                return instrument ? [instrument] : [];
              });
              return (
                <li key={service.slug} className="card">
                  <p>
                    <Badge>{enumLabel("serviceKind", service.kind)}</Badge>
                  </p>
                  <h2 className="card__title">{display(service.name)}</h2>
                  <p>{display(service.summary)}</p>
                  <h3 className="card__subtitle">{t("pages.services.whoCanUse")}</h3>
                  <ul className="check-list">
                    {service.whoCanUse.map((who) => (
                      <li key={display(who)}>{display(who)}</li>
                    ))}
                  </ul>
                  {service.turnaround ? (
                    <p>
                      <strong>{t("pages.services.turnaround")}</strong>{" "}
                      {display(service.turnaround)}
                    </p>
                  ) : null}
                  <h3 className="card__subtitle">{t("pages.services.howToEngage")}</h3>
                  <p>{display(service.howToEngage)}</p>
                  {service.contactEmail ? (
                    <p>
                      <a href={`mailto:${service.contactEmail}`}>{service.contactEmail}</a>
                    </p>
                  ) : null}
                  {related.length > 0 && isBuilt("/incubation/facilities/instruments/", routes) ? (
                    <p>
                      {t("pages.services.related")}{" "}
                      <SmartLink href="/incubation/facilities/instruments/">
                        {t("pages.services.relatedLink")}
                      </SmartLink>
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </>
    );
  },
};
