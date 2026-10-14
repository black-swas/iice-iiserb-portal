/**
 * npm run links (TRD §13.1 step 7): crawls the built site in out/ from the home page and fails on any internal link that does
 * not resolve, including `#anchors` that point at an id that is not on the target page, and checks that every address in
 * sitemap.xml is a page that was built. `mailto:` and `tel:` are not links to check.
 *
 *   --external        check the links to other websites instead (the weekly job, TRD §13.2). Other sites go down, throttle
 *                     and refuse robots, so this never fails: it reports. A 403, 429 or 999 is a site refusing a checker,
 *                     not a broken link, and is left out.
 *   --report=<file>   with --external, write the broken links to this Markdown file (nothing is written if there are none)
 */
import fs from "node:fs";
import path from "node:path";
import { LinkChecker, LinkState } from "linkinator";
import { SITE_URL } from "../src/lib/seo";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "out");
if (!fs.existsSync(OUT)) {
  console.error("✖ out/ does not exist. Run `npm run build` first.");
  process.exit(1);
}

const external = process.argv.includes("--external");
const reportFile = process.argv.find((a) => a.startsWith("--report="))?.slice("--report=".length);

const isLocal = (link: string) => {
  try {
    const { hostname } = new URL(link);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return true;
  }
};
const rel = (url: string | undefined) =>
  (url ?? "").replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, "") || "/";

// The pages name themselves by absolute address (canonical, og:image, feed, sitemap), and CI builds with
// NEXT_PUBLIC_SITE_URL=http://localhost:4175, where nothing is listening. Those addresses are rewritten to the checker's own
// server, so they are checked against what was built rather than skipped or sent to the network.
const SERVER_PORT = 4178;
const ownOrigin = new URL(SITE_URL).origin;
const ownAddresses = {
  pattern: new RegExp(`^${ownOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=/|$)`),
  replacement: `http://localhost:${SERVER_PORT}`,
};

const checker = new LinkChecker();
const result = await checker.check({
  path: OUT,
  recurse: true,
  // Anchors matter on our own pages; another site's are none of our business.
  checkFragments: !external,
  concurrency: external ? 8 : 25,
  ...(external
    ? {
        timeout: 20_000,
        retry: true,
        retryErrors: true,
        statusCodes: { "403": "skip", "429": "skip", "999": "skip" } as const,
        // Our own pages were checked by the other mode.
        linksToSkip: async (link: string) => isLocal(link),
      }
    : {
        port: SERVER_PORT,
        urlRewriteExpressions: [ownAddresses],
        // Skip anything on another host: this is a check of our own pages.
        linksToSkip: async (link: string) => !isLocal(link),
      }),
});

const broken = result.links.filter(
  (l) => l.state === LinkState.BROKEN && (external ? !isLocal(l.url) : true),
);

if (external) {
  const checked = result.links.filter(
    (l) => !isLocal(l.url) && l.state !== LinkState.SKIPPED,
  ).length;
  if (broken.length === 0) {
    console.log(`✔ ${checked} links to other websites answered.`);
  } else {
    const lines = broken.map(
      (l) => `- ${l.url} (${l.status ?? "no response"}), linked from ${rel(l.parent)}`,
    );
    console.log(
      `${broken.length} of ${checked} links to other websites did not answer:\n${lines.join("\n")}`,
    );
    if (reportFile) {
      fs.writeFileSync(
        reportFile,
        `## Links to other websites that did not answer\n\n${lines.join("\n")}\n\nThey may be down for a moment; check each before changing anything.\n`,
      );
    }
  }
  process.exit(0);
}

const checked = result.links.filter((l) => l.state === LinkState.OK).length;
for (const link of broken) {
  console.error(`✖ ${rel(link.parent)} → ${rel(link.url)} (${link.status ?? "no response"})`);
}

// Every address the sitemap promises must be a built page.
const sitemap = path.join(OUT, "sitemap.xml");
const missing: string[] = [];
if (fs.existsSync(sitemap)) {
  for (const [, url] of fs.readFileSync(sitemap, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const route = new URL(url as string).pathname;
    const file = path.join(OUT, ...route.split("/").filter(Boolean), "index.html");
    if (!fs.existsSync(file)) missing.push(route);
  }
}
for (const route of missing) console.error(`✖ sitemap.xml lists ${route}, which was not built`);

if (broken.length > 0 || missing.length > 0) {
  console.error(
    `\n${broken.length} broken link${broken.length === 1 ? "" : "s"}, ${missing.length} sitemap address${missing.length === 1 ? "" : "es"} not built.`,
  );
  process.exit(1);
}
console.log(
  `✔ ${checked} internal links and anchors resolve, and every sitemap address is a built page.`,
);
