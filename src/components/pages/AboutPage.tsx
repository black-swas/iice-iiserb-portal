import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection } from "@/components/ui/PageSection";
import { Prose } from "@/components/ui/Prose";
import { Timeline } from "@/components/ui/Timeline";
import { getCollection, getMilestones, getPage } from "@/content/loaders";
import { display } from "@/content/todo";
import { t } from "@/lib/i18n";
import { PressList } from "./InTheNewsPage";
import { sortPress } from "./press";
import type { PageDef } from "./types";

const load = () => {
  const page = getPage("about");
  if (!page) throw new Error('content: page "about" is missing');
  return page;
};

/** `/about/`: the story, vision, mission and key functions (editor-written), then the milestones and the latest coverage. */
export const aboutPage: PageDef = {
  meta: () => ({ title: display(load().title), description: display(load().description) }),
  render: () => {
    const page = load();
    const milestones = [...getMilestones()].sort((a, b) => a.year - b.year);
    const press = sortPress(getCollection("press")).slice(0, 3);
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
        {milestones.length > 0 ? (
          <PageSection
            id="milestones"
            title={t("pages.about.milestones")}
            lead={t("pages.about.milestonesLead")}
            tone="surface"
          >
            <Timeline
              items={milestones.map((m) => ({
                id: m.id,
                when: String(m.year),
                title: display(m.title),
                description: display(m.description),
                href: m.href,
                image: m.image,
              }))}
            />
          </PageSection>
        ) : null}
        {press.length > 0 ? (
          <PageSection id="in-the-news" title={t("pages.about.press")}>
            <PressList items={press} />
          </PageSection>
        ) : null}
      </>
    );
  },
};
