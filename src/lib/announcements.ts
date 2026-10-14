import type { DateInput } from "./dates";
import { toMs } from "./dates";
import { isAnnouncementLive } from "./status";

interface Timed {
  startsAt: string;
  expiresAt: string;
  priority: number;
}

/**
 * The announcements to show at `now`: live ones only, most important first (priority 9 over 0), then the most recently
 * started. Used at build time and again on the client, so an expired notice never shows from a stale build.
 */
export function liveAnnouncements<T extends Timed>(items: readonly T[], now: DateInput): T[] {
  return items
    .filter((item) => isAnnouncementLive(item, now))
    .sort((a, b) => b.priority - a.priority || toMs(b.startsAt) - toMs(a.startsAt));
}
