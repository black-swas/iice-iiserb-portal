import { describe, expect, it } from "vitest";
import { checkIntegrity } from "@/content/integrity";
import type { Loaded } from "@/content/loaders";
import { Stats } from "@/content/schema";
import {
  add,
  baseline,
  committee,
  ctx,
  emptyContent,
  errorsOf,
  messages,
  messagesOf,
  person,
  stage,
  startup,
  warningsOf,
} from "./helpers";

const FLAG = { _status: "TODO_CONFIRM" };
const run = (content = baseline(), over = {}) => checkIntegrity(content, ctx(over));
const event = (slug: string, extra: Record<string, unknown> = {}) => ({
  slug,
  title: slug,
  type: "talk",
  startsAt: "2026-10-20T10:00:00+05:30",
  mode: "online",
  summary: "s",
  ...extra,
});

describe("a clean baseline", () => {
  it("has no errors or warnings", () => {
    expect(messagesOf(run())).toEqual([]);
  });
});

describe("references", () => {
  it("reports a slug that does not exist, naming the file and field", () => {
    const content = baseline();
    add(content, "events", event("e", { seriesSlug: "missing-series", partnerSlugs: ["nobody"] }));
    const found = messagesOf(errorsOf(run(content)));
    expect(found).toContain(
      'events/e.md › seriesSlug: references eventSeries "missing-series", which does not exist',
    );
    expect(found).toContain(
      'events/e.md › partnerSlugs[0]: references partners "nobody", which does not exist',
    );
  });

  it("accepts a reference that resolves", () => {
    const content = baseline();
    add(content, "eventSeries", { slug: "series", name: "S", tagline: "t", description: "d" });
    add(content, "events", event("e", { seriesSlug: "series" }));
    expect(errorsOf(run(content))).toEqual([]);
  });

  it("rejects a published entry that points at a draft, but lets a draft point at a draft", () => {
    const content = baseline();
    add(content, "eventSeries", {
      slug: "series",
      name: "S",
      tagline: "t",
      description: "d",
      draft: true,
    });
    add(content, "events", event("published", { seriesSlug: "series" }));
    add(content, "events", event("pending-event", { seriesSlug: "series", draft: true }));
    const found = messagesOf(errorsOf(run(content)));
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("events/published.md");
    expect(found[0]).toContain("which is a draft");
  });

  it("checks committee members, mentors, spotlight and the header opportunity", () => {
    const content = baseline();
    const managing = content.collections.committees.find((c) => c.data.slug === "managing");
    managing!.data.members.push({ personSlug: "ghost", committeeRole: "Member", order: 1 });
    add(content, "mentors", {
      slug: "m",
      personSlug: "ghost-mentor",
      title: "t",
      organisation: "o",
      types: ["legal"],
      expertise: ["x"],
    });
    content.singletons.spotlight = {
      file: "spotlight.json",
      data: {
        items: ["a", "b", "c"].map((id) => ({
          id,
          badge: "Award",
          title: id,
          description: "d",
          href: "/startups/",
          startupSlug: "ghost-startup",
        })),
      },
    };
    const found = messagesOf(errorsOf(run(content)));
    expect(found.some((m) => m.includes('people "ghost"'))).toBe(true);
    expect(found.some((m) => m.includes('people "ghost-mentor"'))).toBe(true);
    expect(found.filter((m) => m.includes('startups "ghost-startup"'))).toHaveLength(3);
  });

  it("finds a person listed twice in one committee, and one person with two mentor entries", () => {
    const content = baseline();
    add(content, "people", person("pat"));
    const managing = content.collections.committees.find((c) => c.data.slug === "managing")!;
    managing.data.members.push(
      { personSlug: "pat", committeeRole: "Member", order: 1 },
      { personSlug: "pat", committeeRole: "Member", order: 2 },
    );
    const mentor = (slug: string) => ({
      slug,
      personSlug: "pat",
      title: "t",
      organisation: "o",
      types: ["legal"],
      expertise: ["x"],
    });
    add(content, "mentors", mentor("m1"));
    add(content, "mentors", mentor("m2"));
    const found = messagesOf(errorsOf(run(content)));
    expect(found.some((m) => m.includes("listed twice"))).toBe(true);
    expect(found.some((m) => m.includes("already the mentor entry"))).toBe(true);
  });
});

describe("required members", () => {
  it("demands all three stages and all four committees", () => {
    const found = messagesOf(errorsOf(run(emptyContent())));
    expect(found.filter((m) => m.includes("missing stage"))).toHaveLength(3);
    expect(found.filter((m) => m.includes("missing committee"))).toHaveLength(4);
  });

  it("rejects two stages with the same order", () => {
    const content = emptyContent();
    add(content, "stages", stage("catalyse", 1));
    add(content, "stages", stage("culture", 1));
    expect(
      messagesOf(errorsOf(run(content))).some((m) =>
        m.includes("order 1 is also used by catalyse"),
      ),
    ).toBe(true);
  });
});

describe("testimonials", () => {
  const t = (name: string) => ({
    slug: "t",
    quote: "IICE gave us the lab space and the mentors we needed to reach our first prototype.",
    name,
    role: "Founder",
    startupSlug: "acme",
    consent: { given: true, date: "2026-09-01", method: "email" },
  });

  it("must be attributed to a listed founder of that startup", () => {
    const content = baseline();
    add(content, "startups", startup("acme", { founders: [{ name: "Asha Verma" }] }));
    add(content, "testimonials", t("Someone Else"));
    expect(messagesOf(errorsOf(run(content))).some((m) => m.includes("not a listed founder"))).toBe(
      true,
    );
  });

  it("matches a founder ignoring honorifics, case and spacing", () => {
    const content = baseline();
    add(content, "startups", startup("acme", { founders: [{ name: "Asha  Verma" }] }));
    add(content, "testimonials", t("Dr. asha verma"));
    expect(errorsOf(run(content))).toEqual([]);
  });

  it("only warns when the startup lists no founders to check against", () => {
    const content = baseline();
    add(content, "startups", startup("acme"));
    add(content, "testimonials", t("Anyone"));
    const issues = run(content);
    expect(errorsOf(issues)).toEqual([]);
    expect(warningsOf(issues)).toHaveLength(1);
  });
});

describe("duplicate card copy", () => {
  it("flags the later entry, treating the TODO_CONFIRM prefix and case as noise", () => {
    const content = baseline();
    add(content, "startups", startup("a", { oneLiner: "TODO_CONFIRM: A startup at IICE." }));
    add(content, "startups", startup("b", { oneLiner: "a startup  at iice." }));
    add(content, "startups", startup("c", { oneLiner: "Something different." }));
    const found = errorsOf(run(content));
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ file: "startups/b.md", path: "oneLiner" });
  });

  it("checks stages and ecosystem tiles too", () => {
    const content = emptyContent();
    add(content, "stages", stage("catalyse", 1, { oneLiner: "Same" }));
    add(content, "stages", stage("culture", 2, { oneLiner: "Same" }));
    add(content, "stages", stage("commercialise", 3));
    content.singletons.ecosystemTiles = {
      file: "ecosystem-tiles.json",
      data: {
        items: ["a", "b"].map((id) => ({
          id,
          icon: "users",
          title: "T",
          short: "Same short",
          long: "l",
        })),
      },
    };
    const found = messagesOf(errorsOf(run(content)));
    expect(found.some((m) => m.startsWith("stages/culture.mdx › oneLiner"))).toBe(true);
    expect(found.some((m) => m.startsWith("ecosystem-tiles.json › items[1].short"))).toBe(true);
  });
});

describe("stats against derived counts", () => {
  const withStats = (items: unknown[], startups = 3) => {
    const content = baseline();
    for (let i = 0; i < startups; i++)
      add(content, "startups", startup(`s${i}`, { oneLiner: `About ${i}` }));
    content.singletons.stats = { file: "stats.json", data: Stats.parse({ items }) };
    return content;
  };
  const claim = (id: string, value: number) => ({
    kind: "manual",
    id,
    label: "Claim",
    value,
    source: "annual report",
    order: 1,
  });

  it("rejects a claim lower than the number of startups actually listed", () => {
    const found = messagesOf(errorsOf(run(withStats([claim("startups-incubated", 2)]))));
    expect(found).toEqual([
      "stats.json › items[0].value: claims 2 but the listings show 3 (startupsTotal); a claim cannot be lower than the count",
    ]);
  });

  it("accepts a claim equal to or above the count, and ignores ids it does not guard", () => {
    expect(errorsOf(run(withStats([claim("startups-incubated", 3)])))).toEqual([]);
    expect(errorsOf(run(withStats([claim("startups-incubated", 600)])))).toEqual([]);
    expect(errorsOf(run(withStats([claim("patents-filed", 0)])))).toEqual([]);
  });

  it("does not compare an unknown (null) claim", () => {
    const stat = { kind: "manual", id: "startups-incubated", label: "x", value: null, order: 1 };
    expect(errorsOf(run(withStats([stat])))).toEqual([]);
  });

  it("rejects duplicate stat ids", () => {
    const stat = { kind: "manual", id: "dup", label: "x", value: null, order: 1 };
    expect(
      messagesOf(errorsOf(run(withStats([stat, stat])))).some((m) =>
        m.includes('duplicate stat id "dup"'),
      ),
    ).toBe(true);
  });
});

describe("forbidden copy, hosts and mail", () => {
  const withBody = (body: string) => {
    const content = baseline();
    add(content, "startups", startup("x"), { body });
    return messagesOf(errorsOf(run(content)));
  };

  it.each([
    ["Lorem ipsum", "lorem ipsum"],
    ["Course Name goes here", "Course Name"],
    ["Article Name Here", "Article Name Here"],
    ["Goodwill, Sam", "Goodwill, Sam"],
    ["Our new programme is Coming Soon!", "Coming soon"],
    ["This is the Sample Page", "Sample Page"],
    ["Write to team@example.com", "example.com"],
  ])("rejects %j", (body, what) => {
    expect(withBody(body).some((m) => m.includes(what))).toBe(true);
  });

  it.each([
    "![x](https://lh3.googleusercontent.com/abc)",
    "[policy](https://drive.google.com/file/d/1/view)",
    "[site](https://example.org/)",
    "[local](http://localhost:3000/x)",
    "[preview](https://iice-test.vercel.app/)",
    "[preview](https://iice.netlify.app/)",
  ])("rejects the link in %s", (body) => {
    expect(withBody(body).some((m) => m.includes("not allowed"))).toBe(true);
  });

  it("allows ordinary words and links", () => {
    // cspell:disable -- "ipsilateral" is a real word that merely resembles the forbidden one
    const text =
      "Visit [IISER Bhopal](https://www.iiserb.ac.in) to learn more about the ipsilateral cortex.";
    // cspell:enable
    expect(withBody(text)).toEqual([]);
  });

  it("rejects a mailto link whose text is a different address", () => {
    expect(
      withBody("[a@b.in](mailto:c@d.in)").some((m) => m.includes("differs from its mailto target")),
    ).toBe(true);
    expect(withBody("[Email us](mailto:c@d.in)")).toEqual([]);
    expect(withBody("[c@d.in](mailto:c@d.in)")).toEqual([]);
  });
});

describe("media and documents", () => {
  const image = { src: "media/team/a.jpg", alt: "A described photo of the team" };

  it("reports a missing image file, naming the field", () => {
    const content = baseline();
    add(content, "people", person("pat", { photo: image }));
    const found = messagesOf(errorsOf(run(content, { contentFileExists: () => false })));
    expect(found).toEqual([
      "people/pat.json › photo.src: file content/media/team/a.jpg does not exist",
    ]);
  });

  it("downgrades to a warning on a flagged entry whose file is still to come", () => {
    const content = baseline();
    add(content, "people", person("pat", { photo: image, ...FLAG }));
    const issues = run(content, { contentFileExists: () => false });
    expect(errorsOf(issues)).toEqual([]);
    expect(warningsOf(issues)[0]?.message).toContain("flagged TODO_CONFIRM");
  });

  it("checks that a document's PDF exists, with the same flagged-entry rule", () => {
    const doc = (extra: Record<string, unknown>) => ({
      slug: "d",
      title: "D",
      category: "policy",
      file: "documents/d.pdf",
      ...extra,
    });
    const missing = { publicFileExists: () => false };
    const a = baseline();
    add(a, "documents", doc({}));
    expect(errorsOf(run(a, missing))).toHaveLength(1);
    const b = baseline();
    add(b, "documents", doc(FLAG));
    expect(errorsOf(run(b, missing))).toEqual([]);
    expect(warningsOf(run(b, missing))).toHaveLength(1);
  });

  it("rejects a document that supersedes itself", () => {
    const content = baseline();
    add(content, "documents", {
      slug: "d",
      title: "D",
      category: "policy",
      file: "documents/d.pdf",
      supersededBy: "d",
    });
    expect(
      messagesOf(errorsOf(run(content))).some((m) => m.includes("cannot supersede itself")),
    ).toBe(true);
  });
});

describe("instruments", () => {
  it("allows one rate per user category", () => {
    const row = (userCategory: string) => ({
      userCategory,
      rate: 100,
      unit: "hour",
      gstIncluded: true,
    });
    const instrument = (rateCard: unknown[]) => ({
      slug: "i",
      name: "I",
      category: "imaging",
      access: "via-cif",
      lastReviewed: null,
      rateCard,
    });
    const ok = baseline();
    add(ok, "instruments", instrument([row("incubatee"), row("industry")]));
    expect(errorsOf(run(ok))).toEqual([]);
    const dup = baseline();
    add(dup, "instruments", instrument([row("incubatee"), row("incubatee")]));
    expect(messagesOf(errorsOf(run(dup)))[0]).toContain("rateCard[1].userCategory");
  });
});

describe("shared URLs and stale dates (warnings)", () => {
  it("warns when two startups share a website, ignoring www and a trailing slash", () => {
    const content = baseline();
    add(content, "startups", startup("a", { website: "https://acme.in/" }));
    add(content, "startups", startup("b", { oneLiner: "Other", website: "https://www.acme.in" }));
    const issues = run(content);
    expect(errorsOf(issues)).toEqual([]);
    expect(warningsOf(issues).map((w) => w.file)).toEqual(["startups/b.md"]);
  });

  it("warns when a review date is older than 180 days, and not before", () => {
    const service = (lastReviewed: string) => ({
      slug: "s",
      name: "S",
      kind: "other",
      summary: "s",
      whoCanUse: ["anyone"],
      turnaround: null,
      howToEngage: "h",
      lastReviewed,
    });
    const old = baseline();
    add(old, "services", service("2026-03-01")); // 226 days before 13 Oct 2026
    expect(warningsOf(run(old))[0]?.message).toContain("226 days ago");
    const fresh = baseline();
    add(fresh, "services", service("2026-07-01")); // 104 days
    expect(warningsOf(run(fresh))).toEqual([]);
  });

  it("does not warn about a null review date", () => {
    const content = baseline();
    add(content, "services", {
      slug: "s",
      name: "S",
      kind: "other",
      summary: "s",
      whoCanUse: ["a"],
      howToEngage: "h",
      lastReviewed: null,
    });
    expect(warningsOf(run(content))).toEqual([]);
  });
});

describe("internal links and icons", () => {
  const withLink = (href: string) => {
    const content = baseline();
    content.singletons.paths = {
      file: "paths.json",
      data: {
        items: ["founders", "students", "mentors", "investors-partners"].map((audience) => ({
          audience: audience as "founders",
          title: "T",
          blurb: audience,
          icon: "users",
          links: [
            { label: "A", href },
            { label: "B", href: "/apply/" },
          ],
        })),
      },
    };
    return content;
  };

  it("warns about links to routes that do not exist, ignoring query and hash", () => {
    const known = new Set(["/apply/", "/events/"]);
    expect(warningsOf(run(withLink("/events/?view=past#x"), { knownRoutes: known }))).toEqual([]);
    const issues = run(withLink("/nope/"), { knownRoutes: known });
    expect(warningsOf(issues).length).toBeGreaterThan(0);
    expect(warningsOf(issues)[0]?.message).toContain("is not built yet");
    expect(errorsOf(issues)).toEqual([]);
  });

  it("skips the route check when no route table is given", () => {
    expect(warningsOf(run(withLink("/nope/")))).toEqual([]);
  });

  it("rejects an icon that is not in lucide", () => {
    const found = messagesOf(errorsOf(run(withLink("/apply/"), { iconExists: () => false })));
    expect(found.some((m) => m.includes('"users" is not a lucide icon'))).toBe(true);
  });
});

describe("enum labels", () => {
  it("are present for every enum value in messages/en.json", () => {
    expect(errorsOf(run())).toEqual([]);
  });

  it("report each missing label with its path", () => {
    const stripped = JSON.parse(JSON.stringify(messages)) as {
      enums: { sector: Record<string, string> };
    };
    delete stripped.enums.sector["iot-ai"];
    const found = messagesOf(errorsOf(run(baseline(), { messages: stripped })));
    expect(found).toEqual([
      "messages/en.json › enums.sector.iot-ai: missing label for an enum value",
    ]);
  });

  it("report every label when the catalogue has no enums at all", () => {
    expect(errorsOf(run(baseline(), { messages: {} })).length).toBeGreaterThan(50);
  });
});

describe("committee fixture", () => {
  it("builds a valid empty committee", () => {
    const content = emptyContent();
    add(content, "committees", committee("managing"));
    const entry = content.collections.committees[0] as Loaded<{ members: unknown[] }>;
    expect(entry.data.members).toEqual([]);
  });
});
