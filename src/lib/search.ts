/**
 * Site search (TRD §8.3): the documents `scripts/search-index.ts` writes to /search-index.json, and a MiniSearch
 * wrapper over them with prefix and fuzzy matching and a boost for titles. Pure, so it is tested without a browser.
 */
import MiniSearch from "minisearch";

/** In the order the palette lists them. */
export const SEARCH_TYPES = [
  "page",
  "startup",
  "event",
  "opportunity",
  "news",
  "document",
  "instrument",
  "person",
] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export interface SearchDoc {
  id: string;
  type: SearchType;
  title: string;
  /** A site path, possibly with a hash, or an https URL. */
  url: string;
  summary: string;
  keywords: string[];
  /** A short note shown beside the result, such as "PDF · 420 KB". */
  hint?: string;
  /** ISO date, for events and news. */
  date?: string;
  /** For open calls, so the palette can show Open / Rolling / Closed from the time of the search. */
  window?: { opensAt?: string; closesAt?: string; rolling?: boolean };
}

export interface SearchIndexFile {
  v: 1;
  docs: SearchDoc[];
}

export interface Searcher {
  /** Best match first; nothing for a blank query. */
  search(query: string, limit?: number): SearchDoc[];
}

export function createSearcher(docs: readonly SearchDoc[]): Searcher {
  const index = new MiniSearch<SearchDoc>({
    idField: "id",
    fields: ["title", "keywords", "summary"],
    extractField: (doc, field) =>
      field === "keywords"
        ? doc.keywords.join(" ")
        : String((doc as unknown as Record<string, unknown>)[field] ?? ""),
    searchOptions: {
      boost: { title: 3, keywords: 2 },
      prefix: true,
      fuzzy: 0.2,
      combineWith: "AND",
    },
  });
  index.addAll(docs);
  const byId = new Map(docs.map((doc) => [doc.id, doc]));

  return {
    search(query, limit = 30) {
      const text = query.trim();
      if (text.length === 0) return [];
      return index
        .search(text)
        .slice(0, limit)
        .flatMap((hit) => byId.get(String(hit.id)) ?? []);
    },
  };
}

/** Results grouped by type in palette order, keeping each group's own ranking and leaving out empty groups. */
export function groupResults(
  docs: readonly SearchDoc[],
  perGroup = 6,
): { type: SearchType; docs: SearchDoc[] }[] {
  return SEARCH_TYPES.flatMap((type) => {
    const inGroup = docs.filter((doc) => doc.type === type).slice(0, perGroup);
    return inGroup.length > 0 ? [{ type, docs: inGroup }] : [];
  });
}

export const isExternalUrl = (url: string) => /^https?:\/\//i.test(url);
