import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PersonCard, personName } from "@/components/ui/PersonCard";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { getCollection, getSiteSettings } from "@/content/loaders";
import type { Committee, Person } from "@/content/schema";
import { display } from "@/content/todo";
import { formatDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { crumbs } from "./crumbs";
import type { PageDef } from "./types";
import { ScrollRegion } from "@/components/ui/ScrollRegion";

/** The anchors legacy links used, and the order the committees appear in (SPEC §4.5, SRD §7.2). */
const COMMITTEE_TABS: { slug: Committee["slug"]; id: string }[] = [
  { slug: "managing", id: "managing-committee" },
  { slug: "executive", id: "executive-committee" },
  { slug: "technical-evaluation", id: "technical-evaluation-committee" },
  { slug: "management-advisory", id: "management-advisory-committee" },
];

function CommitteePanel({
  committee,
  people,
  email,
}: {
  committee: Committee;
  people: Map<string, Person>;
  email: string;
}) {
  const rows = [...committee.members]
    .sort((a, b) => a.order - b.order)
    .flatMap((member) => {
      const person = people.get(member.personSlug);
      return person ? [{ member, person }] : [];
    });
  return (
    <>
      {committee.description ? <p>{display(committee.description)}</p> : null}
      {rows.length === 0 ? (
        <EmptyState title={t("pages.team.empty", { email })} />
      ) : (
        <>
          {committee.asOf ? (
            <p className="muted">{t("pages.team.asOf", { date: formatDate(committee.asOf) })}</p>
          ) : null}
          <ScrollRegion className="table-scroll" label={display(committee.name)}>
            <table className="data-table">
              <caption className="sr-only">{display(committee.name)}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("pages.team.columnName")}</th>
                  <th scope="col">{t("pages.team.columnDesignation")}</th>
                  <th scope="col">{t("pages.team.columnRole")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ member, person }) => (
                  <tr key={person.slug}>
                    <th scope="row">{personName(person)}</th>
                    <td>{person.designation ? display(person.designation) : null}</td>
                    <td>{display(member.committeeRole)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
        </>
      )}
    </>
  );
}

/** `/about/team/`: the team and four committees as ARIA tabs; without script every panel is shown in turn. */
export const teamPage: PageDef = {
  meta: () => ({ title: t("pages.team.title"), description: t("pages.team.description") }),
  render: () => {
    const email = getSiteSettings().incubationSupport.email;
    const people = getCollection("people");
    const bySlug = new Map(people.map((p) => [p.slug, p]));
    const team = people
      .filter((p) => p.team)
      .sort((a, b) => (a.team?.order ?? 0) - (b.team?.order ?? 0));
    const committees = getCollection("committees");

    const tabs: TabItem[] = [];
    if (team.length > 0) {
      tabs.push({
        id: "team",
        label: t("pages.team.teamTab"),
        panel: (
          <div className="person-grid">
            {team.map((person) => (
              <PersonCard key={person.slug} person={person} />
            ))}
          </div>
        ),
      });
    }
    for (const { slug, id } of COMMITTEE_TABS) {
      const committee = committees.find((c) => c.slug === slug);
      if (!committee) continue;
      tabs.push({
        id,
        label: display(committee.name),
        ...(slug === "managing" ? { aliases: ["committees"] } : {}),
        panel: <CommitteePanel committee={committee} people={bySlug} email={email} />,
      });
    }

    return (
      <>
        <PageHeader
          trail={[crumbs.about(), { label: t("pages.team.title") }]}
          eyebrow={t("pages.crumbs.about")}
          title={t("pages.team.title")}
          lead={t("pages.team.description")}
        />
        <div className="wrapper py-section">
          <Tabs label={t("pages.team.tabsLabel")} tabs={tabs} />
        </div>
      </>
    );
  },
};
