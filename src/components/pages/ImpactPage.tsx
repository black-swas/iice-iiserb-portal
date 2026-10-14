import { PageHeader } from "@/components/ui/PageHeader";
import { loadContent } from "@/content/loaders";
import { publicStatsOf } from "@/content/queries";
import { formatDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { formatStat } from "@/lib/money";
import { crumbs } from "./crumbs";
import type { PageDef } from "./types";

/**
 * `/about/impact/`: every figure with its source and date (SPEC §4.13). Only confirmed figures appear; derived counts
 * (startups listed, events held…) are computed from the content, so this page cannot contradict the listings.
 * The page exists only when at least three figures are confirmed (page-routes.ts).
 */
export const impactPage: PageDef = {
  meta: () => ({ title: t("pages.impact.title"), description: t("pages.impact.description") }),
  render: () => {
    const now = new Date();
    const stats = publicStatsOf(loadContent(), now);
    return (
      <>
        <PageHeader
          trail={[crumbs.about(), { label: t("pages.impact.title") }]}
          eyebrow={t("pages.crumbs.about")}
          title={t("pages.impact.title")}
          lead={t("pages.impact.description")}
        />
        <div className="wrapper py-section">
          <ul className="stat-grid">
            {stats.map((stat) => (
              <li key={stat.id} className="stat-card">
                <p className="stat-card__value" data-stat={stat.id}>
                  {formatStat({ value: stat.value, unit: stat.unit, plus: stat.plus })}
                </p>
                <p className="stat-card__label">{stat.label}</p>
                <p className="stat-card__note">
                  {stat.kind === "derived"
                    ? t("pages.impact.derivedNote")
                    : [
                        stat.asOf ? t("pages.impact.asOf", { date: formatDate(stat.asOf) }) : null,
                        stat.source ? t("pages.impact.source", { source: stat.source }) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </>
    );
  },
};
