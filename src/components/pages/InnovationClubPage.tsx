import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection } from "@/components/ui/PageSection";
import { getInnovationClub } from "@/content/loaders";
import type { InnovationClub } from "@/content/schema";
import { display } from "@/content/todo";
import { t } from "@/lib/i18n";
import { crumbs } from "./crumbs";
import type { PageDef } from "./types";
import { ScrollRegion } from "@/components/ui/ScrollRegion";

type Member = InnovationClub["pastMembers"][number];

function MemberTable({ caption, members }: { caption: string; members: readonly Member[] }) {
  return (
    <ScrollRegion className="table-scroll" label={caption}>
      <table className="data-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t("pages.club.columnName")}</th>
            <th scope="col">{t("pages.club.columnProgramme")}</th>
            <th scope="col">{t("pages.club.columnBatch")}</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={`${member.name}-${member.batch}`}>
              <th scope="row">{member.name}</th>
              <td>{member.programme}</td>
              <td>{member.batch}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollRegion>
  );
}

/** `/about/innovation-club/`: the tagline, the three Cs, the objectives and the members. */
export const innovationClubPage: PageDef = {
  meta: () => ({ title: t("pages.club.title"), description: t("pages.club.description") }),
  render: () => {
    const club = getInnovationClub();
    return (
      <>
        <PageHeader
          trail={[crumbs.about(), { label: t("pages.club.title") }]}
          eyebrow={t("pages.crumbs.about")}
          title={t("pages.club.title")}
          lead={display(club.tagline)}
        />
        <div className="wrapper py-section">
          <p className="lead-text">{display(club.intro)}</p>
        </div>
        <PageSection id="pillars" title={t("pages.club.pillars")} tone="surface">
          <ul className="card-grid card-grid--3">
            {club.pillars.map((pillar, index) => (
              <li key={display(pillar.name)} className="card">
                <p className="eyebrow">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="card__title">{display(pillar.name)}</h3>
                <p>{display(pillar.text)}</p>
              </li>
            ))}
          </ul>
        </PageSection>
        <PageSection id="objectives" title={t("pages.club.objectives")}>
          <ul className="check-list">
            {club.objectives.map((objective) => (
              <li key={display(objective)}>{display(objective)}</li>
            ))}
          </ul>
        </PageSection>
        {club.currentMembers.length > 0 ? (
          <PageSection id="current-members" title={t("pages.club.current")}>
            <MemberTable caption={t("pages.club.current")} members={club.currentMembers} />
          </PageSection>
        ) : null}
        {club.pastMembers.length > 0 ? (
          <PageSection
            id="past-members"
            title={t("pages.club.past")}
            tone={club.currentMembers.length > 0 ? "surface" : "plain"}
          >
            <MemberTable caption={t("pages.club.past")} members={club.pastMembers} />
          </PageSection>
        ) : null}
      </>
    );
  },
};
