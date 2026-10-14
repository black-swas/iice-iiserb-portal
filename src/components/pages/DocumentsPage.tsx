import fs from "node:fs";
import path from "node:path";
import { DocumentsExplorer, type DocumentItem } from "@/components/explorer/DocumentsExplorer";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCollection } from "@/content/loaders";
import { downloadableDocuments } from "@/content/queries";
import { getPublicFileCheck } from "@/content/routes";
import { display } from "@/content/todo";
import { t } from "@/lib/i18n";
import type { PageDef } from "./types";

/**
 * `/documents/`: policies, by-laws, templates and reports. A document whose PDF is not in the build is left out, so a row
 * never links to a missing file (CLAUDE.md rule 4). Sizes are read from the files themselves, so they cannot go stale.
 */
export const documentsPage: PageDef = {
  meta: () => ({
    title: t("pages.documents.title"),
    description: t("pages.documents.description"),
  }),
  render: () => {
    const exists = getPublicFileCheck();
    const docs = downloadableDocuments(getCollection("documents"), exists);
    const superseded = new Set(docs.flatMap((d) => (d.supersededBy ? [d.slug] : [])));
    const items = docs.map((d): DocumentItem => ({
      slug: d.slug,
      title: display(d.title),
      category: d.category,
      date: d.date,
      version: d.version ?? null,
      sizeKB:
        d.fileSizeKB ??
        Math.max(
          1,
          Math.round(fs.statSync(path.join(process.cwd(), "public", d.file)).size / 1024),
        ),
      pages: d.pages ?? null,
      summary: d.summary ? display(d.summary) : null,
      href: `/${d.file}`,
      superseded: superseded.has(d.slug),
    }));
    return (
      <>
        <PageHeader
          trail={[{ label: t("pages.documents.title") }]}
          eyebrow={t("pages.crumbs.about")}
          title={t("pages.documents.title")}
          lead={t("pages.documents.description")}
        />
        <div className="wrapper py-section">
          <DocumentsExplorer items={items} />
        </div>
      </>
    );
  },
};
