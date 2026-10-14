import { Form } from "@/components/forms/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection } from "@/components/ui/PageSection";
import { Prose } from "@/components/ui/Prose";
import { getPage } from "@/content/loaders";
import { display } from "@/content/todo";
import { t } from "@/lib/i18n";
import type { PageDef } from "./types";

const load = () => {
  const page = getPage("birac-edge");
  if (!page) throw new Error('content: page "birac-edge" is missing');
  return page;
};

/**
 * `/birac-edge/` (SPEC §4.11). Until IICE confirms the programme, the page says only what is known and offers an
 * "Express interest" form (the contact form, set to the BIRAC Edge topic). It never says "coming soon".
 */
export const biracEdgePage: PageDef = {
  meta: () => ({ title: display(load().title), description: display(load().description) }),
  render: () => {
    const page = load();
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
          id="express-interest"
          title={t("pages.birac.interestTitle")}
          lead={t("pages.birac.interestLead")}
          tone="surface"
        >
          <div className="form-wrap">
            <Form type="contact" topic="birac-edge" path="/birac-edge/" />
          </div>
        </PageSection>
      </>
    );
  },
};
