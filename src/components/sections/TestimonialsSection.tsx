import { Monogram } from "@/components/ui/Monogram";
import { Picture } from "@/components/ui/Picture";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SmartLink } from "@/components/ui/SmartLink";
import { getCollection, getHomePage } from "@/content/loaders";
import { getKnownRoutes } from "@/content/routes";
import { display } from "@/content/todo";
import { t } from "@/lib/i18n";
import { isBuilt } from "@/lib/nav";
import { ScrollRow } from "./ScrollRow";

/** Only testimonials with consent pass the schema, so every one here can be shown. None at all hides the section. */
export function prepareTestimonials() {
  const routes = getKnownRoutes();
  const startups = new Map(getCollection("startups").map((s) => [s.slug, s]));
  const items = getCollection("testimonials").map((item) => {
    const startup = item.startupSlug ? startups.get(item.startupSlug) : undefined;
    return {
      item,
      startupName: startup ? display(startup.name) : null,
      startupHref:
        startup && isBuilt(`/startups/${startup.slug}/`, routes)
          ? `/startups/${startup.slug}/`
          : null,
    };
  });
  return items.length > 0 ? items : null;
}

/** Home §11, "In their words": one card on a phone, two on a desktop, moved by the visitor and never on a timer. */
export function TestimonialsSection({
  items,
  number,
}: {
  items: NonNullable<ReturnType<typeof prepareTestimonials>>;
  number: number;
}) {
  const copy = getHomePage().sectionTitles.testimonials;
  return (
    <section
      aria-labelledby="testimonials-title"
      className="home-section py-section"
      data-tone="surface"
    >
      <SectionHeader
        id="testimonials-title"
        eyebrow={copy.eyebrow}
        number={number}
        title={copy.title}
        subline={copy.subline}
      />
      <div className="wrapper-wide">
        <ScrollRow
          label={copy.title}
          previous={t("home.testimonialsPrevious")}
          next={t("home.testimonialsNext")}
          className="testimonials"
        >
          {items.map(({ item, startupName, startupHref }) => (
            <li key={item.slug} className="testimonial">
              <figure>
                <blockquote>
                  <p>{display(item.quote)}</p>
                </blockquote>
                <figcaption>
                  {item.photo ? (
                    <Picture
                      image={{ ...item.photo, decorative: true }}
                      sizes="3rem"
                      className="testimonial__photo"
                    />
                  ) : (
                    <Monogram name={item.name} className="testimonial__photo" />
                  )}
                  <span>
                    <strong>{item.name}</strong>
                    <span className="muted">
                      {" "}
                      {display(item.role)}
                      {startupName ? (
                        <>
                          {", "}
                          {startupHref ? (
                            <SmartLink href={startupHref}>{startupName}</SmartLink>
                          ) : (
                            startupName
                          )}
                        </>
                      ) : null}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ScrollRow>
      </div>
    </section>
  );
}
