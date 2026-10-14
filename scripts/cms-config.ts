/**
 * npm run cms:config          writes public/admin/config.yml from the Zod schemas
 * npm run cms:config -- --check   exits 1 if the committed file is out of date
 */
import fs from "node:fs";
import path from "node:path";
import { buildCmsConfigYaml } from "./lib/cms-config";

const target = path.resolve(import.meta.dirname, "..", "public", "admin", "config.yml");
const yaml = buildCmsConfigYaml();

if (process.argv.includes("--check")) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  if (current !== yaml) {
    console.error(
      "✖ public/admin/config.yml is out of date. Run `npm run cms:config` and commit the result.",
    );
    process.exit(1);
  }
  console.log("✔ public/admin/config.yml is up to date.");
} else {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, yaml, "utf8");
  console.log(`Wrote ${path.relative(process.cwd(), target)} (${yaml.split("\n").length} lines).`);
}
