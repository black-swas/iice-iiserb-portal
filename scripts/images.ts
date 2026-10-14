/**
 * npm run images (TRD §6). Turns content/media into AVIF and WebP in public/_img, plus the manifest `<Picture>` reads.
 * Runs first in `prebuild` and `predev`. Exits 1 on GIFs, bad file names, unreadable images and busted hero budgets.
 */
import path from "node:path";
import { readContent } from "../src/content/loaders";
import { CONTENT_DIR } from "../src/content/root";
import { processImages } from "./lib/images";

const ROOT = path.resolve(import.meta.dirname, "..");

// The hero poster is the only image that can be the LCP element, so it carries the hard size cap.
const { content } = readContent({ root: CONTENT_DIR, includeDrafts: false });
const priority = new Set<string>();
const poster = content.singletons.home?.data.hero.poster;
if (poster) priority.add(poster.src);

const report = await processImages({
  mediaDir: path.join(CONTENT_DIR, "media"),
  outDir: path.join(ROOT, "public", "_img"),
  manifestPath: path.join(ROOT, ".cache", "images", "manifest.json"),
  priority,
});

for (const message of report.warnings) console.warn(`⚠ ${message}`);
for (const message of report.errors) console.error(`✖ ${message}`);

const total = Object.keys(report.manifest).length;
console.log(
  `Images: ${total} source${total === 1 ? "" : "s"} (${report.processed.length} processed, ${report.cached.length} cached, ${report.pruned.length} files removed).`,
);
process.exit(report.errors.length === 0 ? 0 : 1);
