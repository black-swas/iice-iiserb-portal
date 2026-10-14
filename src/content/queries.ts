/**
 * Content questions several places need to agree on: what counts as a public stat, which documents can be downloaded,
 * which events are upcoming. Pure functions over a ContentSet, so page gates, pages, the sitemap and the scripts all give
 * the same answer (CLAUDE.md rule 11).
 */
import { eventStatus, isJobOpen } from "@/lib/status";
import { toMs, type DateInput } from "@/lib/dates";
import { computeDerived, publicStats, resolveStats, type Derived } from "./derived";
import type { ContentSet } from "./loaders";
import type { Document, Job, NewsPost } from "./schema";

/** The Home impact strip and the Impact page both need at least this many confirmed figures (SPEC §3). */
export const MIN_PUBLIC_STATS = 3;

export function derivedCounts(content: ContentSet, now: DateInput): Derived {
  const c = content.collections;
  return computeDerived(
    {
      startups: c.startups.map((e) => e.data),
      events: c.events.map((e) => e.data),
      fundingSchemes: c.fundingSchemes.map((e) => e.data),
      mentors: c.mentors.map((e) => e.data),
      partners: c.partners.map((e) => e.data),
      instruments: c.instruments.map((e) => e.data),
    },
    now,
  );
}

export function publicStatsOf(content: ContentSet, now: DateInput) {
  const stats = content.singletons.stats?.data.items ?? [];
  return publicStats(resolveStats(stats, derivedCounts(content, now)));
}

/** A document is offered for download only when its PDF is in the build; otherwise it would be a dead link (rule 4). */
export function downloadableDocuments(
  documents: readonly Document[],
  publicFileExists: (file: string) => boolean,
): Document[] {
  return documents.filter((d) => publicFileExists(d.file));
}

/** Newest first. */
export function sortEventsDescending<T extends { startsAt: string }>(events: readonly T[]): T[] {
  return [...events].sort((a, b) => toMs(b.startsAt) - toMs(a.startsAt));
}

export function splitEvents<
  T extends { startsAt: string; endsAt?: string | undefined; allDay?: boolean | undefined },
>(events: readonly T[], now: DateInput): { upcoming: T[]; past: T[] } {
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const event of events) {
    (eventStatus(event, now) === "past" ? past : upcoming).push(event);
  }
  // Upcoming and running events soonest first; past events most recent first.
  upcoming.sort((a, b) => toMs(a.startsAt) - toMs(b.startsAt));
  past.sort((a, b) => toMs(b.startsAt) - toMs(a.startsAt));
  return { upcoming, past };
}

export function sortNewsDescending(posts: readonly NewsPost[]): NewsPost[] {
  return [...posts].sort((a, b) => toMs(b.date) - toMs(a.date));
}

export function openJobs(jobs: readonly Job[], now: DateInput): Job[] {
  return jobs.filter((j) => isJobOpen(j, now)).sort((a, b) => toMs(a.closesAt) - toMs(b.closesAt));
}
