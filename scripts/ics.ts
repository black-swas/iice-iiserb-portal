/**
 * npm run ics: writes public/events/{slug}.ics for every event (BACKEND_SCHEMA §7, SPEC §4.4), and removes files for events
 * that no longer exist. Part of `prebuild`. Set SOURCE_DATE_EPOCH for a reproducible DTSTAMP.
 */
import fs from "node:fs";
import path from "node:path";
import { readContent } from "../src/content/loaders";
import { CONTENT_DIR } from "../src/content/root";
import { display } from "../src/content/todo";
import { t } from "../src/lib/i18n";
import { eventIcs } from "../src/lib/ics";
import { absoluteUrl } from "../src/lib/seo";

const ROOT = path.resolve(import.meta.dirname, "..");
const dir = path.join(ROOT, "public", "events");
const { content } = readContent({ root: CONTENT_DIR, includeDrafts: false });
const epoch = process.env.SOURCE_DATE_EPOCH;
const stamp = epoch ? new Date(Number(epoch) * 1000) : new Date();

fs.mkdirSync(dir, { recursive: true });
const wanted = new Set<string>();
for (const { data: event } of content.collections.events) {
  const file = `${event.slug}.ics`;
  wanted.add(file);
  fs.writeFileSync(
    path.join(dir, file),
    eventIcs(
      {
        slug: event.slug,
        title: event.edition
          ? t("pages.events.withEdition", { title: display(event.title), edition: event.edition })
          : display(event.title),
        summary: display(event.summary),
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        allDay: event.allDay,
        venue: event.venue
          ? {
              name: display(event.venue.name),
              address: event.venue.address ? display(event.venue.address) : undefined,
            }
          : undefined,
      },
      { url: absoluteUrl(`/events/${event.slug}/`), stamp },
    ),
    "utf8",
  );
}
let removed = 0;
for (const entry of fs.readdirSync(dir)) {
  if (entry.endsWith(".ics") && !wanted.has(entry)) {
    fs.rmSync(path.join(dir, entry));
    removed += 1;
  }
}
console.log(`Calendar files: ${wanted.size} written to public/events/ (${removed} stale removed).`);
