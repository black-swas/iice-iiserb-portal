import { Form } from "@/components/forms/Form";
import { MentorsExplorer, type MentorItem } from "@/components/explorer/MentorsExplorer";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection } from "@/components/ui/PageSection";
import { getCollection } from "@/content/loaders";
import { display } from "@/content/todo";
import { t } from "@/lib/i18n";
import { resolvePicture } from "@/lib/images";
import { personName } from "@/components/ui/PersonCard";
import { crumbs } from "./crumbs";
import type { PageDef } from "./types";

/**
 * `/about/mentors/`: the mentors who agreed to be listed, with filters, and the "Become a mentor" form. The page exists
 * even with no mentors listed yet, because the form is the useful part; the list says plainly that it is empty.
 */
export const mentorsPage: PageDef = {
  meta: () => ({ title: t("pages.mentors.title"), description: t("pages.mentors.description") }),
  render: () => {
    const people = new Map(getCollection("people").map((p) => [p.slug, p]));
    const items = getCollection("mentors").flatMap((mentor): MentorItem[] => {
      const person = people.get(mentor.personSlug);
      if (!person) return [];
      return [
        {
          slug: mentor.slug,
          name: personName(person),
          title: display(mentor.title),
          organisation: display(mentor.organisation),
          types: mentor.types,
          sectors: mentor.sectors,
          location: mentor.location ?? null,
          expertise: mentor.expertise.map(display),
          availability: mentor.availability,
          picture: person.photo ? resolvePicture(person.photo) : null,
          linkedin: person.links?.linkedin ?? null,
        },
      ];
    });
    return (
      <>
        <PageHeader
          trail={[crumbs.about(), { label: t("pages.mentors.title") }]}
          eyebrow={t("pages.crumbs.about")}
          title={t("pages.mentors.title")}
          lead={t("pages.mentors.description")}
        />
        <div className="wrapper py-section">
          {items.length > 0 ? (
            <MentorsExplorer items={items} />
          ) : (
            <EmptyState title={t("pages.mentors.emptyTitle")}>
              <p>{t("pages.mentors.emptyBody")}</p>
            </EmptyState>
          )}
        </div>
        <PageSection
          id="become-a-mentor"
          title={t("pages.mentors.becomeTitle")}
          lead={t("pages.mentors.becomeLead")}
          tone="surface"
        >
          <div className="form-wrap">
            <Form type="mentor" path="/about/mentors/" />
          </div>
        </PageSection>
      </>
    );
  },
};
