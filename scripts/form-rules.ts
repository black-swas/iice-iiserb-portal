/**
 * npm run form-rules            writes src/content/form-rules.json and refreshes the rules in apps-script/Code.gs
 * npm run form-rules -- --check   exits 1 if either is out of date
 */
import fs from "node:fs";
import path from "node:path";
import { buildRulesFile, embedRules, rulesJson } from "./lib/form-rules";

const root = path.resolve(import.meta.dirname, "..");
const jsonTarget = path.join(root, "src", "content", "form-rules.json");
const gsTarget = path.join(root, "apps-script", "Code.gs");

const file = buildRulesFile();
const json = rulesJson(file);
const gs = embedRules(fs.readFileSync(gsTarget, "utf8"), file);

if (process.argv.includes("--check")) {
  const stale = [
    [jsonTarget, json],
    [gsTarget, gs],
  ].filter(([target, expected]) => {
    const current = fs.existsSync(target as string)
      ? fs.readFileSync(target as string, "utf8")
      : "";
    return current !== expected;
  });
  if (stale.length > 0) {
    for (const [target] of stale)
      console.error(`✖ ${path.relative(root, target as string)} is out of date.`);
    console.error("Run `npm run form-rules` and commit the result.");
    process.exit(1);
  }
  console.log("✔ Form rules are up to date.");
} else {
  fs.writeFileSync(jsonTarget, json, "utf8");
  fs.writeFileSync(gsTarget, gs, "utf8");
  console.log(
    `Wrote ${path.relative(root, jsonTarget)} and the rules block of apps-script/Code.gs.`,
  );
}
