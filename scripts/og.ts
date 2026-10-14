/**
 * npm run og: draws public/og/default.png, the image shown when a page of the site is shared (TRD §11.1). Part of `prebuild`.
 * The words come from messages/en.json, so changing the site's name changes the card.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ogSvg } from "../src/lib/og";
import { t } from "../src/lib/i18n";

const target = path.resolve(import.meta.dirname, "..", "public", "og", "default.png");
const svg = ogSvg({ name: t("site.name"), fullName: t("site.fullName"), host: t("site.host") });

fs.mkdirSync(path.dirname(target), { recursive: true });
await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile(target);
console.log(
  `Social card: ${path.relative(process.cwd(), target)} (${Math.round(fs.statSync(target).size / 1024)} KB).`,
);
