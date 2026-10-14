/**
 * Data-derived faceted filtering (CLAUDE.md rule 13, TRD §8.4, FR-START-4). Facet values and counts come from the
 * items themselves, never from hand-typed labels, so a chip can never be "Batch 1" while the data says "Batch 01".
 * Selections combine OR within a facet and AND across facets, and counts reflect every other active facet.
 * Pure and framework-free; the URL helpers take `location` and `history` as arguments so they can be tested.
 */

/** One filterable dimension. `values` may return a single value, several, or nothing. */
export interface FacetDef<T> {
  id: string;
  label: string;
  values: (item: T) => readonly string[] | string | null | undefined;
  /** Display text for a value. Use `enumLabel` for closed enums so a missing label fails the build. */
  labelFor?: (value: string) => string;
  /** Values shown first, in this order (e.g. an enum's order). Anything else follows alphabetically by label. */
  order?: readonly string[];
}

/** The chosen values per facet id. A facet with no entry, or an empty one, does not restrict. */
export type Selection = Readonly<Record<string, readonly string[]>>;

export interface FacetOption {
  value: string;
  label: string;
  /** Items that have this value and match every *other* facet's selection. */
  count: number;
  selected: boolean;
}

export interface Facet {
  id: string;
  label: string;
  options: FacetOption[];
}

/** The values an item has for a facet: trimmed, non-empty, de-duplicated, in first-seen order. */
export function valuesOf<T>(def: FacetDef<T>, item: T): string[] {
  const raw = def.values(item);
  const list = raw == null ? [] : typeof raw === "string" ? [raw] : raw;
  const seen = new Set<string>();
  for (const v of list) {
    const value = typeof v === "string" ? v.trim() : "";
    if (value) seen.add(value);
  }
  return [...seen];
}

const selectedOf = (selection: Selection, id: string): readonly string[] => selection[id] ?? [];

/** AND across facets, OR within one. `except` leaves one facet out, which is how its own counts are computed. */
export function matches<T>(
  item: T,
  defs: readonly FacetDef<T>[],
  selection: Selection,
  except?: string,
): boolean {
  return defs.every((def) => {
    if (def.id === except) return true;
    const wanted = selectedOf(selection, def.id);
    if (wanted.length === 0) return true;
    const have = valuesOf(def, item);
    return wanted.some((w) => have.includes(w));
  });
}

export function applyFilters<T>(
  items: readonly T[],
  defs: readonly FacetDef<T>[],
  selection: Selection,
): T[] {
  return items.filter((item) => matches(item, defs, selection));
}

function compareOptions(def: {
  order?: readonly string[] | undefined;
}): (a: FacetOption, b: FacetOption) => number {
  const rank = new Map((def.order ?? []).map((v, i) => [v, i]));
  return (a, b) => {
    const ra = rank.get(a.value);
    const rb = rank.get(b.value);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return a.label.localeCompare(b.label, "en", { sensitivity: "base", numeric: true });
  };
}

/**
 * Every value that occurs in `items` becomes an option, whatever is selected, so a chip only reads zero when the
 * other facets rule it out. A value that is selected but no longer occurs is not offered (see `sanitizeSelection`).
 */
export function buildFacets<T>(
  items: readonly T[],
  defs: readonly FacetDef<T>[],
  selection: Selection = {},
): Facet[] {
  return defs.map((def) => {
    const pool = items.filter((item) => matches(item, defs, selection, def.id));
    const counts = new Map<string, number>();
    for (const item of items)
      for (const value of valuesOf(def, item)) if (!counts.has(value)) counts.set(value, 0);
    for (const item of pool)
      for (const value of valuesOf(def, item)) counts.set(value, (counts.get(value) ?? 0) + 1);
    const chosen = new Set(selectedOf(selection, def.id));
    const options = [...counts].map(([value, count]): FacetOption => ({
      value,
      label: def.labelFor ? def.labelFor(value) : value,
      count,
      selected: chosen.has(value),
    }));
    return { id: def.id, label: def.label, options: options.sort(compareOptions(def)) };
  });
}

/** Drops unknown facets and values the data does not contain, and removes duplicates. Order is kept. */
export function sanitizeSelection(selection: Selection, facets: readonly Facet[]): Selection {
  const out: Record<string, string[]> = {};
  for (const facet of facets) {
    const known = new Set(facet.options.map((o) => o.value));
    const kept = [...new Set(selectedOf(selection, facet.id))].filter((v) => known.has(v));
    if (kept.length > 0) out[facet.id] = kept;
  }
  return out;
}

export const isEmptySelection = (selection: Selection) =>
  Object.values(selection).every((v) => v.length === 0);

/** Adds the value if absent, removes it if present. */
export function toggleValue(selection: Selection, facetId: string, value: string): Selection {
  const current = selectedOf(selection, facetId);
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  return replaceFacet(selection, facetId, next);
}

export function setFacet(
  selection: Selection,
  facetId: string,
  values: readonly string[],
): Selection {
  return replaceFacet(selection, facetId, [...new Set(values)]);
}

/** A copy of the selection with one facet set to `values`, or removed when there are none. */
function replaceFacet(selection: Selection, facetId: string, values: readonly string[]): Selection {
  const others = Object.entries(selection).filter(([id]) => id !== facetId);
  return Object.fromEntries(values.length > 0 ? [...others, [facetId, values]] : others);
}

// ── URL query (?sector=iot-ai,healthcare-bioengineering&status=current) ─────────────

const decode = (text: string) => decodeURIComponent(text.replace(/\+/g, " "));

/** Splits a raw query string into [key, still-encoded value] pairs, so a comma can be told from an encoded one. */
function rawPairs(query: string): [string, string][] {
  return query
    .replace(/^\?/, "")
    .split("&")
    .filter(Boolean)
    .map((pair): [string, string] => {
      const at = pair.indexOf("=");
      return at < 0 ? [decode(pair), ""] : [decode(pair.slice(0, at)), pair.slice(at + 1)];
    });
}

/**
 * Reads a query string into a selection for the facets in `defs`. Unknown keys are ignored. Values are not checked
 * against the data here: pass the result through `sanitizeSelection` once the facets are built.
 * Given a string, a comma inside a value survives (it is written as %2C). Given a URLSearchParams, which has already
 * decoded its values, a comma is always a separator.
 */
export function parseSelection(
  query: string | URLSearchParams,
  defs: readonly { id: string }[],
): Selection {
  const pairs: [string, string[]][] =
    typeof query === "string"
      ? rawPairs(query).map(([key, raw]) => [key, raw.split(",").map(decode)])
      : [...query].map(([key, value]) => [key, value.split(",")]);
  const out: Record<string, string[]> = {};
  for (const def of defs) {
    const values = pairs
      .filter(([key]) => key === def.id)
      .flatMap(([, list]) => list)
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length > 0) out[def.id] = [...new Set(values)];
  }
  return out;
}

/** Facets follow the order of `defs`, so the same selection always gives the same URL. No leading "?". */
export function serializeSelection(selection: Selection, defs: readonly { id: string }[]): string {
  return defs
    .flatMap((def) => {
      const values = selectedOf(selection, def.id);
      return values.length > 0
        ? [`${encodeURIComponent(def.id)}=${values.map(encodeURIComponent).join(",")}`]
        : [];
    })
    .join("&");
}

/** Updates the address bar without adding history entries, keeping the path, any other params and the hash. */
export function writeSelectionToUrl(
  selection: Selection,
  defs: readonly { id: string }[],
  env: {
    location: { pathname: string; search: string; hash: string };
    history: { replaceState: (data: unknown, unused: string, url: string) => void };
  },
): string {
  const params = new URLSearchParams(env.location.search);
  for (const def of defs) params.delete(def.id);
  const ours = serializeSelection(selection, defs);
  const rest = params.toString();
  const query = [rest, ours].filter(Boolean).join("&");
  const url = `${env.location.pathname}${query ? `?${query}` : ""}${env.location.hash}`;
  env.history.replaceState(null, "", url);
  return url;
}
