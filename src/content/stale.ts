/**
 * Facts that go out of date (TRD §17, `npm run content:stale`): funding schemes, instruments and services carry a
 * `lastReviewed` date, committees an `asOf` date, and confirmed figures an `asOf` date. Four reference sites showed stale
 * schemes, rate cards and rosters, so anything not re-confirmed for this long is listed, in the build and in a weekly check.
 * Pure: the integrity checks and the script both read it.
 */
import { DAY_MS, startOfDayIST, toMs, type DateInput } from "@/lib/dates";
import type { ContentSet } from "./loaders";

export const DEFAULT_STALE_DAYS = 180;

export interface StaleEntry {
  /** Path relative to content/. */
  file: string;
  /** The field that holds the date. */
  path: string;
  /** What kind of fact it is, for the report. */
  kind: "funding scheme" | "instrument and its rate card" | "service" | "committee" | "figure";
  /** The date it was last reviewed or counted, YYYY-MM-DD. */
  reviewed: string;
  ageDays: number;
}

export function staleEntries(
  content: ContentSet,
  now: DateInput,
  limitDays = DEFAULT_STALE_DAYS,
): StaleEntry[] {
  const found: StaleEntry[] = [];
  const check = (
    file: string,
    path: string,
    kind: StaleEntry["kind"],
    date: string | null | undefined,
  ) => {
    if (!date) return;
    const ageDays = Math.floor((toMs(now) - startOfDayIST(date)) / DAY_MS);
    if (ageDays > limitDays) found.push({ file, path, kind, reviewed: date, ageDays });
  };
  const c = content.collections;
  for (const { data, file } of c.fundingSchemes)
    check(file, "lastReviewed", "funding scheme", data.lastReviewed);
  for (const { data, file } of c.instruments)
    check(file, "lastReviewed", "instrument and its rate card", data.lastReviewed);
  for (const { data, file } of c.services)
    check(file, "lastReviewed", "service", data.lastReviewed);
  for (const { data, file } of c.committees) check(file, "asOf", "committee", data.asOf);
  const stats = content.singletons.stats;
  stats?.data.items.forEach((s, i) => {
    if (s.kind === "manual") check(stats.file, `items[${i}].asOf`, "figure", s.asOf);
  });
  return found.sort((a, b) => b.ageDays - a.ageDays);
}
