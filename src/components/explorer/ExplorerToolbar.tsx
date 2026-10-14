"use client";

import { Search, X } from "lucide-react";
import { useId } from "react";
import type { Facet, Selection } from "@/lib/facets";
import { fill } from "@/lib/forms";

export interface ToolbarCopy {
  searchLabel: string;
  searchHint?: string;
  /** "{count} of {total} shown". */
  resultCount: string;
  clear: string;
  noResultsTitle: string;
  noResultsBody: string;
  filters: string;
}

interface ToolbarProps {
  copy: ToolbarCopy;
  query: string;
  onQuery: (query: string) => void;
  facets: readonly Facet[];
  onToggle: (facetId: string, value: string) => void;
  count: number;
  total: number;
  filtered: boolean;
  onClear: () => void;
  /** Facets drawn elsewhere (as a tab bar), left out of the chip groups. */
  skip?: readonly string[];
  /** Turn the search box off for short lists. */
  search?: boolean;
}

/**
 * The search box, filter chips with counts, a result count that is announced politely, and a clear button. Chips are
 * buttons with `aria-pressed`. Without script the whole toolbar is hidden by CSS and the full list shows (SPEC §4.2).
 */
export function ExplorerToolbar({
  copy,
  query,
  onQuery,
  facets,
  onToggle,
  count,
  total,
  filtered,
  onClear,
  skip = [],
  search = true,
}: ToolbarProps) {
  const searchId = useId();
  const groups = facets.filter((f) => !skip.includes(f.id) && f.options.length > 1);
  return (
    <div className="explorer__toolbar">
      {search ? (
        <div className="explorer__search">
          <label htmlFor={searchId} className="field__label">
            {copy.searchLabel}
          </label>
          <div className="explorer__search-box">
            <Search aria-hidden="true" />
            <input
              id={searchId}
              type="search"
              className="input"
              value={query}
              autoComplete="off"
              onChange={(event) => onQuery(event.target.value)}
              {...(copy.searchHint ? { "aria-describedby": `${searchId}-hint` } : {})}
            />
          </div>
          {copy.searchHint ? (
            <p id={`${searchId}-hint`} className="field__hint">
              {copy.searchHint}
            </p>
          ) : null}
        </div>
      ) : null}

      {groups.length > 0 ? (
        <div className="explorer__groups" role="group" aria-label={copy.filters}>
          {groups.map((facet) => (
            <fieldset key={facet.id} className="facet">
              <legend className="facet__legend">{facet.label}</legend>
              <div className="chips">
                {facet.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    data-action="toggle-filter"
                    className="chip"
                    aria-pressed={option.selected}
                    disabled={option.count === 0 && !option.selected}
                    onClick={() => onToggle(facet.id, option.value)}
                  >
                    {option.label}
                    <span className="chip__count"> ({option.count})</span>
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      ) : null}

      <div className="explorer__status">
        <p role="status" aria-live="polite" className="explorer__count">
          {fill(copy.resultCount, { count, total })}
        </p>
        {filtered ? (
          <button
            type="button"
            data-action="clear-filters"
            className="link-button"
            onClick={onClear}
          >
            <X aria-hidden="true" />
            {copy.clear}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** A single-choice bar ("Current · Graduated · All"). A group of toggle buttons, not ARIA tabs: no panel swaps. */
export function ChoiceBar({
  label,
  facet,
  selection,
  allLabel,
  total,
  onChoose,
}: {
  label: string;
  facet: Facet | undefined;
  selection: Selection;
  allLabel: string;
  total: number;
  onChoose: (value: string | null) => void;
}) {
  if (!facet || facet.options.length < 1) return null;
  const chosen = selection[facet.id]?.[0] ?? null;
  return (
    <div role="group" aria-label={label} className="choice-bar">
      <button
        type="button"
        data-action="choose-view"
        className="choice-bar__button"
        aria-pressed={chosen === null}
        onClick={() => onChoose(null)}
      >
        {allLabel}
        <span className="chip__count"> ({total})</span>
      </button>
      {facet.options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-action="choose-view"
          className="choice-bar__button"
          aria-pressed={chosen === option.value}
          onClick={() => onChoose(option.value)}
        >
          {option.label}
          <span className="chip__count"> ({option.count})</span>
        </button>
      ))}
    </div>
  );
}
