/**
 * npm run content:stale (TRD §13.2, §16): lists funding schemes, instruments and rate cards, services, committees and figures
 * that have not been re-confirmed for 180 days or more, oldest first. It always exits 0 so a weekly job can report it without
 * failing a build; `--fail` exits 1 if anything is stale. `--days=N` changes the limit.
 */
import { readContent } from "../src/content/loaders";
import { CONTENT_DIR } from "../src/content/root";
import { DEFAULT_STALE_DAYS, staleEntries } from "../src/content/stale";
import { formatDate } from "../src/lib/dates";

const days = Number(
  process.argv.find((a) => a.startsWith("--days="))?.slice("--days=".length) ?? DEFAULT_STALE_DAYS,
);
const { content } = readContent({ root: CONTENT_DIR, includeDrafts: false });
const stale = staleEntries(content, new Date(), days);

if (stale.length === 0) {
  console.log(`✔ Nothing has gone ${days} days without being re-confirmed.`);
} else {
  console.log(
    `${stale.length} item${stale.length === 1 ? " has" : "s have"} not been re-confirmed for more than ${days} days:\n`,
  );
  for (const s of stale)
    console.log(
      `  ${String(s.ageDays).padStart(4)} days  ${s.kind.padEnd(30)} content/${s.file} › ${s.path} (${formatDate(s.reviewed)})`,
    );
  console.log("\nCheck each with IICE, then update its review date.");
  if (process.argv.includes("--fail")) process.exit(1);
}
