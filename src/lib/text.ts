/** Small text helpers for client-side filtering. Browser-safe. */

/** Lower-case, accent-free, single-spaced: "Café" and "cafe" compare equal. */
export function normalise(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** True when every word of the query appears somewhere in the haystack. An empty query matches everything. */
export function matchesQuery(haystack: string, query: string): boolean {
  const words = normalise(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const text = normalise(haystack);
  return words.every((word) => text.includes(word));
}

/** "420 KB", "1.2 MB": a file size as people read it. */
export function formatFileSize(kb: number): string {
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  const mb = kb / 1024;
  return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
}

export interface Segment {
  text: string;
  emphasis: boolean;
}

/**
 * Splits copy that marks emphasis with asterisks ("Where *science* becomes a *startup*.") into plain and emphasised
 * segments (SPEC §8.1). An unmatched asterisk stays as it is, so a stray one can never swallow the rest of a sentence.
 */
export function parseEmphasis(copy: string): Segment[] {
  const segments: Segment[] = [];
  // No space just inside the asterisks, so "5 * 3" is a sum and not emphasis.
  const pattern = /\*(?=\S)([^*\n]*?\S)\*/g;
  let last = 0;
  for (const match of copy.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) segments.push({ text: copy.slice(last, start), emphasis: false });
    segments.push({ text: match[1] as string, emphasis: true });
    last = start + match[0].length;
  }
  if (last < copy.length) segments.push({ text: copy.slice(last), emphasis: false });
  return segments;
}

/** The copy as plain text, asterisks removed: for the page title, search and `aria-label`s. */
export const stripEmphasis = (copy: string): string =>
  parseEmphasis(copy)
    .map((s) => s.text)
    .join("");
