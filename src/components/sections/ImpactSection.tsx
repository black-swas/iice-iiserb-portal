import { CountUp } from "@/components/ui/CountUp";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SmartLink } from "@/components/ui/SmartLink";
import { getHomePage, loadContent } from "@/content/loaders";
import { MIN_PUBLIC_STATS, publicStatsOf } from "@/content/queries";
import { getKnownRoutes } from "@/content/routes";
import { formatDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { isBuilt } from "@/lib/nav";

/** The figures for the Home strip, or null when fewer than three are confirmed (SPEC §3 #4): then the section hides. */
export function prepareImpact() {
  const stats = publicStatsOf(loadContent(), new Date()).filter((s) => s.showOnHome);
  return stats.length >= MIN_PUBLIC_STATS ? stats : null;
}

export function ImpactSection({
  stats,
  number,
}: {
  stats: NonNullable<ReturnType<typeof prepareImpact>>;
  number: number;
}) {
  const copy = getHomePage().sectionTitles.impact;
  const more = isBuilt("/about/impact/", getKnownRoutes());
  return (
    <section aria-labelledby="impact-title" className="home-section py-section">
      <SectionHeader
        id="impact-title"
        eyebrow={copy.eyebrow}
        number={number}
        title={copy.title}
        subline={copy.subline}
      />
      <div className="wrapper-wide">
        <ul className="impact">
          {stats.slice(0, 6).map((stat) => (
            <li key={stat.id} className="impact__item">
              <CountUp id={stat.id} value={stat.value} unit={stat.unit} plus={stat.plus} />
              <p className="impact__label">{stat.label}</p>
              {stat.asOf ? (
                <p className="impact__note">
                  {t("pages.impact.asOf", { date: formatDate(stat.asOf) })}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        {more ? (
          <p className="home-section__more">
            <SmartLink href="/about/impact/">{t("home.allNumbers")}</SmartLink>
          </p>
        ) : null}
      </div>
    </section>
  );
}
