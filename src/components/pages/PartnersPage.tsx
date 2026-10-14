import { Form } from "@/components/forms/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection } from "@/components/ui/PageSection";
import { Picture } from "@/components/ui/Picture";
import { SmartLink } from "@/components/ui/SmartLink";
import { PARTNERSHIP_TYPES } from "@/content/forms";
import { getCollection } from "@/content/loaders";
import { PartnerCategory, type Partner } from "@/content/schema";
import { display } from "@/content/todo";
import { dynamicT, enumLabel, t } from "@/lib/i18n";
import { crumbs } from "./crumbs";
import type { PageDef } from "./types";

/** One partner: the logo when there is one, always the name, and a link when the partner has a site. */
export function PartnerTile({ partner }: { partner: Partner }) {
  const name = display(partner.name);
  const body = (
    <>
      {partner.logo ? (
        // The name is printed beside the logo, so the logo is decoration for assistive technology.
        <Picture
          image={{ ...partner.logo, decorative: true }}
          sizes="10rem"
          className="partner-tile__logo"
        />
      ) : null}
      <span className="partner-tile__name">{name}</span>
    </>
  );
  return (
    <li className="partner-tile">
      {partner.url ? (
        <SmartLink href={partner.url} className="partner-tile__link" hideExternalIcon>
          {body}
        </SmartLink>
      ) : (
        <div className="partner-tile__link">{body}</div>
      )}
    </li>
  );
}

export const byOrder = (a: Partner, b: Partner) =>
  a.order - b.order || a.name.localeCompare(b.name);

/** `/about/partners/`: partners by type, and the "Partner with us" section with its form. */
export const partnersPage: PageDef = {
  meta: () => ({ title: t("pages.partners.title"), description: t("pages.partners.description") }),
  render: () => {
    const partners = getCollection("partners");
    const groups = PartnerCategory.options
      .map((category) => ({
        category,
        items: partners.filter((p) => p.category === category).sort(byOrder),
      }))
      .filter((group) => group.items.length > 0);
    return (
      <>
        <PageHeader
          trail={[crumbs.about(), { label: t("pages.partners.title") }]}
          eyebrow={t("pages.crumbs.about")}
          title={t("pages.partners.title")}
          lead={t("pages.partners.description")}
        />
        {groups.map((group) => (
          <PageSection
            key={group.category}
            id={`partners-${group.category}`}
            title={enumLabel("partnerCategory", group.category)}
          >
            <ul className="partner-grid">
              {group.items.map((partner) => (
                <PartnerTile key={partner.slug} partner={partner} />
              ))}
            </ul>
          </PageSection>
        ))}
        <PageSection
          id="partner-with-us"
          title={t("pages.partners.partnerTitle")}
          lead={t("pages.partners.partnerLead")}
          tone="surface"
        >
          <ul className="check-list">
            {PARTNERSHIP_TYPES.filter((type) => type !== "other").map((type) => (
              <li key={type}>{dynamicT(`forms.options.partnershipType.${type}`)}</li>
            ))}
          </ul>
          <div className="form-wrap">
            <Form type="partner" path="/about/partners/" />
          </div>
        </PageSection>
      </>
    );
  },
};
