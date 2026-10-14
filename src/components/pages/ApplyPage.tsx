import { Mail, Phone } from "lucide-react";
import { Form } from "@/components/forms/Form";
import type { BookingTarget } from "@/components/forms/definitions";
import { Accordion } from "@/components/ui/Accordion";
import { EligibilityCheck } from "@/components/ui/EligibilityCheck";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection } from "@/components/ui/PageSection";
import { Prose } from "@/components/ui/Prose";
import { getCollection, getEntry, getPage, getSiteSettings } from "@/content/loaders";
import { downloadableDocuments } from "@/content/queries";
import { getPublicFileCheck } from "@/content/routes";
import { display } from "@/content/todo";
import { telHref } from "@/lib/contact";
import { t } from "@/lib/i18n";
import type { PageDef } from "./types";

const load = () => {
  const page = getPage("apply");
  if (!page) throw new Error('content: page "apply" is missing');
  return page;
};

/** The two templates that sit beside the form (SPEC §4.7), offered only when their PDFs are in the build. */
const DOWNLOADS = ["pitch-deck-template", "business-proposal-format"];

/**
 * `/apply/` (SPEC §4.7): who can apply and the steps (editor-written), the eligibility check, the multi-step form with
 * the track, stage and scheme taken from the link that led here, the FAQ and the contact strip for incubation support.
 */
export const applyPage: PageDef = {
  meta: () => ({ title: display(load().title), description: display(load().description) }),
  render: () => {
    const page = load();
    const site = getSiteSettings();
    const faq = getEntry("faqs", "apply");
    const tracks: BookingTarget[] = getCollection("tracks")
      .sort((a, b) => a.order - b.order)
      .map((track) => ({ slug: track.slug, name: display(track.name) }));
    const schemes: BookingTarget[] = getCollection("fundingSchemes").map((scheme) => ({
      slug: scheme.slug,
      name: display(scheme.name),
    }));
    const downloads = downloadableDocuments(
      getCollection("documents").filter((d) => DOWNLOADS.includes(d.slug)),
      getPublicFileCheck(),
    );
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

        <PageSection
          id="eligibility"
          title={t("pages.apply.checkTitle")}
          lead={t("pages.apply.checkLead")}
          tone="surface"
        >
          <EligibilityCheck />
        </PageSection>

        <PageSection
          id="apply-form"
          title={t("pages.apply.formTitle")}
          lead={t("pages.apply.formLead")}
        >
          {downloads.length > 0 ? (
            <ul className="plain-list">
              {downloads.map((doc) => (
                <li key={doc.slug}>
                  <a href={`/${doc.file}`} download>
                    {t("pages.apply.download", { title: display(doc.title) })}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="form-wrap">
            <Form type="application" path="/apply/" tracks={tracks} schemes={schemes} />
          </div>
        </PageSection>

        {faq ? (
          <PageSection id="faq" title={t("pages.apply.faq")} tone="surface">
            <Accordion
              items={faq.items.map((item, index) => ({
                id: `faq-${index + 1}`,
                title: display(item.q),
                content: <Prose source={item.a} />,
              }))}
            />
          </PageSection>
        ) : null}

        <PageSection id="support" title={t("pages.apply.supportTitle")}>
          <ul className="plain-list contact-strip">
            <li>
              <Phone aria-hidden="true" className="inline size-4" />{" "}
              <a href={telHref(site.incubationSupport.phone)}>{site.incubationSupport.phone}</a>
            </li>
            <li>
              <Mail aria-hidden="true" className="inline size-4" />{" "}
              <a href={`mailto:${site.incubationSupport.email}`}>{site.incubationSupport.email}</a>
            </li>
          </ul>
        </PageSection>
      </>
    );
  },
};
