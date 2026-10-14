import { Form } from "@/components/forms/Form";
import type { BookingTarget } from "@/components/forms/definitions";
import { FactList, type Fact } from "@/components/ui/FactList";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection } from "@/components/ui/PageSection";
import { Picture } from "@/components/ui/Picture";
import { SmartLink } from "@/components/ui/SmartLink";
import { getCollection, loadContent } from "@/content/loaders";
import { downloadableDocuments, publicStatsOf } from "@/content/queries";
import { FacilityCategory, type Facility } from "@/content/schema";
import { display } from "@/content/todo";
import { enumLabel, t } from "@/lib/i18n";
import { formatNumber, formatStat } from "@/lib/money";
import { getPublicFileCheck } from "@/content/routes";
import { crumbs } from "./crumbs";
import type { PageDef } from "./types";

/** Only the facts IICE has confirmed: a null or missing value is simply not shown. */
function factsOf(facility: Facility): Fact[] {
  const f = facility.facts;
  const out: Fact[] = [];
  if (typeof f.areaSqFt === "number")
    out.push({
      label: t("pages.facilities.area"),
      value: formatStat({ value: f.areaSqFt, unit: "sqft" }),
    });
  if (typeof f.seats === "number")
    out.push({ label: t("pages.facilities.seats"), value: formatNumber(f.seats) });
  if (typeof f.privateOffices === "number")
    out.push({ label: t("pages.facilities.offices"), value: formatNumber(f.privateOffices) });
  if (typeof f.meetingRooms === "number")
    out.push({ label: t("pages.facilities.meetingRooms"), value: formatNumber(f.meetingRooms) });
  if (f.accessHours)
    out.push({ label: t("pages.facilities.access"), value: display(f.accessHours) });
  return out;
}

function FacilityCard({ facility }: { facility: Facility }) {
  const facts = factsOf(facility);
  return (
    <article className="card">
      {facility.images.length > 0 ? (
        <ul className="card__gallery">
          {facility.images.slice(0, 3).map((image) => (
            <li key={image.src}>
              <Picture
                image={image}
                sizes="(min-width: 64rem) 12rem, 30vw"
                className="card__image"
              />
            </li>
          ))}
        </ul>
      ) : null}
      <h3 className="card__title">{display(facility.name)}</h3>
      <p>{display(facility.description)}</p>
      {facts.length > 0 ? <FactList facts={facts} /> : null}
      {facility.externalUrl ? (
        <p>
          <SmartLink
            href={facility.externalUrl}
            aria-label={t("pages.facilities.exploreOn", { name: display(facility.name) })}
          >
            {t("pages.facilities.explore")}
          </SmartLink>
        </p>
      ) : null}
    </article>
  );
}

/**
 * `/incubation/facilities/` (SPEC §4.8): confirmed facts, the facilities by group, and, only when something can be booked,
 * the booking request form at `#booking`.
 */
export const facilitiesPage: PageDef = {
  meta: () => ({
    title: t("pages.facilities.title"),
    description: t("pages.facilities.description"),
  }),
  render: () => {
    const content = loadContent();
    const facilities = getCollection("facilities");
    const instruments = getCollection("instruments").filter((i) => i.status !== "retired");
    const space = publicStatsOf(content, new Date()).find((s) => s.id === "incubation-space");
    const bookable: BookingTarget[] = facilities
      .filter((f) => f.bookable)
      .map((f) => ({ slug: f.slug, name: display(f.name) }));
    const bookableInstruments: BookingTarget[] = instruments.map((i) => ({
      slug: i.slug,
      name: display(i.name),
    }));
    const policy = downloadableDocuments(
      getCollection("documents").filter((d) => d.category === "usage-policy"),
      getPublicFileCheck(),
    )[0];

    return (
      <>
        <PageHeader
          trail={[crumbs.incubation(), { label: t("pages.facilities.title") }]}
          eyebrow={t("pages.crumbs.incubation")}
          title={t("pages.facilities.title")}
          lead={t("pages.facilities.description")}
        >
          {space ? (
            <FactList
              className="fact-list--inline"
              facts={[
                {
                  label: t("pages.facilities.space"),
                  value: (
                    <span data-stat={space.id}>
                      {formatStat({ value: space.value, unit: space.unit, plus: space.plus })}
                    </span>
                  ),
                },
              ]}
            />
          ) : null}
        </PageHeader>

        {FacilityCategory.options.map((category, index) => {
          const group = facilities.filter((f) => f.category === category);
          if (group.length === 0) return null;
          return (
            <PageSection
              key={category}
              id={category}
              title={enumLabel("facilityCategory", category)}
              tone={index % 2 === 1 ? "surface" : "plain"}
            >
              <ul className="card-grid card-grid--3">
                {group.map((facility) => (
                  <li key={facility.slug}>
                    <FacilityCard facility={facility} />
                  </li>
                ))}
              </ul>
            </PageSection>
          );
        })}

        {bookable.length > 0 || bookableInstruments.length > 0 ? (
          <PageSection
            id="booking"
            title={t("pages.facilities.bookingTitle")}
            lead={t("pages.facilities.bookingLead")}
            tone="surface"
          >
            <div className="form-wrap">
              <Form
                type="booking"
                path="/incubation/facilities/"
                facilities={bookable}
                instruments={bookableInstruments}
              />
            </div>
            {policy ? (
              <p>
                <a href={`/${policy.file}`} download>
                  {t("pages.facilities.policy", { title: display(policy.title) })}
                </a>
              </p>
            ) : null}
          </PageSection>
        ) : null}
      </>
    );
  },
};
