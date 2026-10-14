"use client";

import { Download } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/dates";
import type { FacetDef } from "@/lib/facets";
import { enumLabel, t } from "@/lib/i18n";
import { formatFileSize } from "@/lib/text";
import { ExplorerToolbar, type ToolbarCopy } from "./ExplorerToolbar";
import { useExplorer } from "./useExplorer";
import { ScrollRegion } from "@/components/ui/ScrollRegion";

export interface DocumentItem {
  slug: string;
  title: string;
  category: string;
  date: string | null;
  version: string | null;
  sizeKB: number | null;
  pages: number | null;
  summary: string | null;
  /** Public path of the PDF, e.g. "/documents/incubation-policy.pdf". */
  href: string;
  superseded: boolean;
}

type Sort = "newest" | "oldest" | "title";

const searchText = (d: DocumentItem) => [d.title, d.summary].filter(Boolean).join(" ");

function Row({ doc }: { doc: DocumentItem }) {
  const label = [doc.title, doc.version ? `v${doc.version.replace(/^v/, "")}` : null]
    .filter(Boolean)
    .join(" ");
  const size = doc.sizeKB ? formatFileSize(doc.sizeKB) : null;
  return (
    <tr>
      <th scope="row">
        {doc.title}
        {doc.summary ? <span className="table-note">{doc.summary}</span> : null}
      </th>
      <td>{enumLabel("documentCategory", doc.category)}</td>
      <td>{doc.date ? <time dateTime={doc.date}>{formatDate(doc.date)}</time> : null}</td>
      <td>{doc.version ? `v${doc.version.replace(/^v/, "")}` : null}</td>
      <td>{size}</td>
      <td>
        <a
          href={doc.href}
          download
          aria-label={
            size
              ? t("pages.documents.downloadSized", { title: label, size })
              : t("pages.documents.download", { title: label })
          }
        >
          <Download aria-hidden="true" className="inline size-4" /> {t("pages.documents.pdf")}
        </a>
      </td>
    </tr>
  );
}

function Table({ docs, caption }: { docs: DocumentItem[]; caption: string }) {
  return (
    <ScrollRegion className="table-scroll" label={caption}>
      <table className="data-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t("pages.documents.columnTitle")}</th>
            <th scope="col">{t("pages.documents.columnCategory")}</th>
            <th scope="col">{t("pages.documents.columnDate")}</th>
            <th scope="col">{t("pages.documents.columnVersion")}</th>
            <th scope="col">{t("pages.documents.columnSize")}</th>
            <th scope="col">{t("pages.documents.columnDownload")}</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((doc) => (
            <Row key={doc.slug} doc={doc} />
          ))}
        </tbody>
      </table>
    </ScrollRegion>
  );
}

/** `/documents/`: search, a category filter, a sort control and a table of downloads; superseded versions collapse (SPEC §4.6). */
export function DocumentsExplorer({ items }: { items: DocumentItem[] }) {
  const sortId = useId();
  const [sort, setSort] = useState<Sort>("newest");
  const current = useMemo(() => items.filter((d) => !d.superseded), [items]);
  const previous = useMemo(() => items.filter((d) => d.superseded), [items]);
  const defs = useMemo<FacetDef<DocumentItem>[]>(
    () => [
      {
        id: "category",
        label: t("pages.documents.facetCategory"),
        values: (d) => d.category,
        labelFor: (v) => enumLabel("documentCategory", v),
      },
    ],
    [],
  );
  const explorer = useExplorer({ items: current, defs, searchText });

  const sorted = useMemo(() => {
    const byDate = (a: DocumentItem, b: DocumentItem) => (b.date ?? "").localeCompare(a.date ?? "");
    return [...explorer.results].sort(
      sort === "title"
        ? (a, b) => a.title.localeCompare(b.title)
        : sort === "oldest"
          ? (a, b) => -byDate(a, b)
          : byDate,
    );
  }, [explorer.results, sort]);

  const copy: ToolbarCopy = {
    searchLabel: t("pages.documents.searchLabel"),
    resultCount: t("explorer.resultCount", { count: "{count}", total: "{total}" }),
    clear: t("explorer.clear"),
    noResultsTitle: t("explorer.noResultsTitle"),
    noResultsBody: t("explorer.noResultsBody"),
    filters: t("explorer.filters"),
  };

  return (
    <div className="explorer">
      <ExplorerToolbar
        copy={copy}
        query={explorer.query}
        onQuery={explorer.setQuery}
        facets={explorer.facets}
        onToggle={explorer.toggle}
        count={sorted.length}
        total={current.length}
        filtered={explorer.filtered}
        onClear={explorer.clear}
      />
      <div className="field explorer__sort">
        <label htmlFor={sortId} className="field__label">
          {t("pages.documents.sortLabel")}
        </label>
        <select
          id={sortId}
          className="input"
          value={sort}
          onChange={(event) => setSort(event.target.value as Sort)}
        >
          <option value="newest">{t("pages.documents.sortNewest")}</option>
          <option value="oldest">{t("pages.documents.sortOldest")}</option>
          <option value="title">{t("pages.documents.sortTitle")}</option>
        </select>
      </div>
      {sorted.length === 0 ? (
        <EmptyState title={copy.noResultsTitle}>
          <p>{copy.noResultsBody}</p>
        </EmptyState>
      ) : (
        <Table docs={sorted} caption={t("pages.documents.title")} />
      )}
      {previous.length > 0 ? (
        <details className="accordion__item">
          <summary className="accordion__summary">
            {t("pages.documents.previous", { count: previous.length })}
          </summary>
          <div className="accordion__panel">
            <Table docs={previous} caption={t("pages.documents.previousCaption")} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
