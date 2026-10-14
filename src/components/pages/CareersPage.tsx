import { JobsList, type JobItem } from "@/components/explorer/JobsList";
import { PageHeader } from "@/components/ui/PageHeader";
import { Prose } from "@/components/ui/Prose";
import { Tabs } from "@/components/ui/Tabs";
import { getCollection, getSiteSettings } from "@/content/loaders";
import { getPublicFileCheck } from "@/content/routes";
import { display } from "@/content/todo";
import { t } from "@/lib/i18n";
import type { PageDef } from "./types";

/**
 * `/careers/` (SPEC §4.9): two tabs, "Work with IICE" and "Work with incubated startups", each with its open jobs or a
 * plain note on how to send a CV. The page always exists: an empty list is an answer, not a missing page.
 */
export const careersPage: PageDef = {
  meta: () => ({ title: t("pages.careers.title"), description: t("pages.careers.description") }),
  render: () => {
    const site = getSiteSettings();
    const startups = new Map(getCollection("startups").map((s) => [s.slug, display(s.name)]));
    const exists = getPublicFileCheck();
    const items = getCollection("jobs").map((job): JobItem & { track: string } => ({
      slug: job.slug,
      track: job.track,
      title: display(job.title),
      employer: job.employerStartupSlug
        ? (startups.get(job.employerStartupSlug) ?? "")
        : t("site.name"),
      type: job.type,
      location: display(job.location),
      skills: job.skills,
      postedAt: job.postedAt,
      closesAt: job.closesAt,
      applyUrl: job.apply.url ?? null,
      applyEmail: job.apply.email ?? null,
      advertHref: job.advertPdf && exists(job.advertPdf) ? `/${job.advertPdf}` : null,
      description: <Prose source={job.body} />,
    }));
    const serverNow = new Date().toISOString();
    const email = site.incubationSupport.email;
    return (
      <>
        <PageHeader
          trail={[{ label: t("pages.careers.title") }]}
          eyebrow={t("pages.careers.eyebrow")}
          title={t("pages.careers.title")}
          lead={t("pages.careers.description")}
        />
        <div className="wrapper py-section">
          <Tabs
            label={t("pages.careers.tabsLabel")}
            tabs={[
              {
                id: "work-with-iice",
                label: t("pages.careers.withIice"),
                panel: (
                  <JobsList
                    jobs={items.filter((j) => j.track === "work-with-iice")}
                    serverNow={serverNow}
                    email={email}
                  />
                ),
              },
              {
                id: "work-with-startups",
                label: t("pages.careers.withStartups"),
                panel: (
                  <JobsList
                    jobs={items.filter((j) => j.track === "work-with-startups")}
                    serverNow={serverNow}
                    email={email}
                  />
                ),
              },
            ]}
          />
        </div>
      </>
    );
  },
};
