"use client";

import { useCallback, useMemo } from "react";
import {
  applyFilters,
  buildFacets,
  isEmptySelection,
  parseSelection,
  sanitizeSelection,
  serializeSelection,
  setFacet,
  toggleValue,
  type Facet,
  type FacetDef,
  type Selection,
} from "@/lib/facets";
import { matchesQuery } from "@/lib/text";
import { replaceUrlSearch, useUrlSearch } from "@/lib/url-state";

interface ExplorerOptions<T> {
  items: readonly T[];
  defs: readonly FacetDef<T>[];
  /** The text the search box looks in for an item. */
  searchText: (item: T) => string;
}

export interface Explorer<T> {
  /** The items after the search and the filters. */
  results: T[];
  facets: Facet[];
  selection: Selection;
  query: string;
  setQuery: (query: string) => void;
  toggle: (facetId: string, value: string) => void;
  /** Choose exactly one value of a facet, or none (a tab bar: "Current", "Graduated", "All"). */
  choose: (facetId: string, value: string | null) => void;
  clear: () => void;
  filtered: boolean;
}

const QUERY_PARAM = "q";

/**
 * Filter state for a list page: facets and a search box, kept in the URL query so a filtered view can be shared and
 * survives a reload (SPEC §4.2). The URL is the only state: the first render sees no query, exactly what the server sent,
 * so hydration matches. Counts come from the data (CLAUDE.md rule 13).
 */
export function useExplorer<T>({ items, defs, searchText }: ExplorerOptions<T>): Explorer<T> {
  const search = useUrlSearch();
  const unfiltered = useMemo(() => buildFacets(items, defs), [items, defs]);

  // Anything in the URL the data does not contain (a shared link to a startup that has since left) is dropped.
  const selection = useMemo(
    () => sanitizeSelection(parseSelection(search, defs), unfiltered),
    [search, defs, unfiltered],
  );
  const query = useMemo(() => new URLSearchParams(search).get(QUERY_PARAM) ?? "", [search]);

  const searched = useMemo(
    () =>
      query.trim() ? items.filter((item) => matchesQuery(searchText(item), query)) : [...items],
    [items, query, searchText],
  );
  // Counts reflect the search as well as the other facets, so a chip never promises more than it will show.
  const facets = useMemo(() => buildFacets(searched, defs, selection), [searched, defs, selection]);
  const results = useMemo(
    () => applyFilters(searched, defs, selection),
    [searched, defs, selection],
  );

  const write = useCallback(
    (nextSelection: Selection, nextQuery: string) => {
      const params = new URLSearchParams(window.location.search);
      for (const def of defs) params.delete(def.id);
      // Kept as typed, spaces included: the box shows what the URL holds, so trimming here would eat a space mid-word.
      if (nextQuery !== "") params.set(QUERY_PARAM, nextQuery);
      else params.delete(QUERY_PARAM);
      const rest = params.toString();
      replaceUrlSearch([rest, serializeSelection(nextSelection, defs)].filter(Boolean).join("&"));
    },
    [defs],
  );

  const toggle = useCallback(
    (facetId: string, value: string) => write(toggleValue(selection, facetId, value), query),
    [selection, query, write],
  );
  const choose = useCallback(
    (facetId: string, value: string | null) =>
      write(setFacet(selection, facetId, value === null ? [] : [value]), query),
    [selection, query, write],
  );
  const setQuery = useCallback((next: string) => write(selection, next), [selection, write]);
  const clear = useCallback(() => write({}, ""), [write]);

  return {
    results,
    facets,
    selection,
    query,
    setQuery,
    toggle,
    choose,
    clear,
    filtered: !isEmptySelection(selection) || query.trim() !== "",
  };
}
