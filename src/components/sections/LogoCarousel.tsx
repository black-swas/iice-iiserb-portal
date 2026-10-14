import { PictureView } from "@/components/ui/PictureView";
import { SmartLink } from "@/components/ui/SmartLink";
import { getCollection } from "@/content/loaders";
import { display } from "@/content/todo";
import { t } from "@/lib/i18n";
import { resolvePicture } from "@/lib/images";
import { ScrollRow } from "./ScrollRow";

/** Fewer logos than this would not fill a row, so the strip stays hidden until there are enough (SPEC §3 #9). */
const MIN_LOGOS = 4;

export function prepareLogos() {
  const logos = getCollection("startups")
    .filter((s) => s.featured && s.logo)
    .map((s) => ({
      slug: s.slug,
      name: display(s.name),
      picture: resolvePicture({ ...(s.logo as NonNullable<typeof s.logo>), decorative: true }),
    }));
  return logos.length >= MIN_LOGOS ? logos : null;
}

/**
 * Home §9: a single row of startup logos, grey until hovered or focused, each linking to the startup. It scrolls under the
 * visitor's control (see ScrollRow); each link is named by the startup, not by the logo. Unnumbered, like the strip in SPEC.
 */
export function LogoCarousel({ logos }: { logos: NonNullable<ReturnType<typeof prepareLogos>> }) {
  return (
    <section aria-label={t("home.logosLabel")} className="home-section logo-strip">
      <div className="wrapper-wide">
        <ScrollRow
          label={t("home.logosLabel")}
          previous={t("home.logosPrevious")}
          next={t("home.logosNext")}
        >
          {logos.map((logo) => (
            <li key={logo.slug} className="logo-strip__item">
              <SmartLink href={`/startups/${logo.slug}/`} aria-label={logo.name}>
                <PictureView data={logo.picture} sizes="9rem" className="logo-strip__logo" />
              </SmartLink>
            </li>
          ))}
        </ScrollRow>
        <p className="home-section__more">
          <SmartLink href="/startups/">{t("home.allStartups")}</SmartLink>
        </p>
      </div>
    </section>
  );
}
