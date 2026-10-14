import { describe, expect, it } from "vitest";
import {
  Announcement,
  Event,
  ExternalUrl,
  FundingScheme,
  Href,
  Image,
  Instrument,
  IsoDate,
  IsoDateTime,
  Job,
  Logo,
  Money,
  Navigation,
  Opportunity,
  PhoneIN,
  SiteSettings,
  Slug,
  Spotlight,
  EcosystemTiles,
  Stage,
  Startup,
  Stat,
  Testimonial,
  Window,
} from "@/content/schema";

const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) =>
  schema.safeParse(value).success;
const messagesOf = (
  schema: {
    safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } };
  },
  value: unknown,
) => schema.safeParse(value).error?.issues.map((i) => i.message) ?? [];

describe("primitives", () => {
  it("Slug is kebab-case only", () => {
    expect(ok(Slug, "a-esdp-data-science-2026")).toBe(true);
    for (const bad of [
      "Upper",
      "under_score",
      "-lead",
      "trail-",
      "double--dash",
      "has space",
      "",
    ]) {
      expect(ok(Slug, bad)).toBe(false);
    }
  });

  it("IsoDate rejects dates that do not exist", () => {
    expect(ok(IsoDate, "2026-02-28")).toBe(true);
    expect(ok(IsoDate, "2023-02-30")).toBe(false);
    expect(ok(IsoDate, "2026-8-8")).toBe(false);
  });

  it("IsoDateTime must carry the IST offset", () => {
    expect(ok(IsoDateTime, "2026-08-08T10:00:00+05:30")).toBe(true);
    expect(ok(IsoDateTime, "2026-08-08T10:00:00")).toBe(false);
    expect(ok(IsoDateTime, "2026-08-08T04:30:00Z")).toBe(false);
    expect(ok(IsoDateTime, "2026-08-08T10:00:00+00:00")).toBe(false);
  });

  it("links: site paths, https, mailto and tel are valid; # and the rest are not", () => {
    for (const good of [
      "/apply/",
      "/about/team/#managing-committee",
      "/events/?view=past",
      "https://www.iiserb.ac.in",
      "mailto:iice@iiserb.ac.in",
      "tel:+917552692384",
    ]) {
      expect(ok(Href, good), good).toBe(true);
    }
    for (const bad of [
      "#",
      "",
      "//evil.example/x",
      "http://insecure.in",
      "javascript:alert(1)",
      "mailto:http://x",
      "mailto:a b@c.in",
      "apply/",
    ]) {
      expect(ok(Href, bad), bad).toBe(false);
    }
    expect(ok(ExternalUrl, "http://a.in")).toBe(false);
  });

  it("Indian phone numbers use +91", () => {
    expect(ok(PhoneIN, "+91 755 269 2384")).toBe(true);
    expect(ok(PhoneIN, "0755 269 2384")).toBe(false);
    expect(ok(PhoneIN, "+1 555 123 4567")).toBe(false);
  });
});

describe("Image and Logo", () => {
  const image = (extra: Record<string, unknown>) => ({
    src: "media/team/anjali.jpg",
    alt: "Anjali Maran at the IICE front desk",
    ...extra,
  });

  it("accepts a described image and a decorative one with no alt text", () => {
    expect(ok(Image, image({}))).toBe(true);
    expect(ok(Image, image({ alt: "", decorative: true }))).toBe(true);
  });

  it("rejects generic, filename, numeric and missing alt text", () => {
    for (const alt of [
      "logo",
      "Image",
      "banner",
      "IMG_0042.png",
      "photo.jpg",
      "1234",
      "123 (2)",
      "7f9c2b1e-4d3a-4f1b-9a1c-0e5d6b7c8d9e",
      "",
    ]) {
      expect(ok(Image, image({ alt })), alt).toBe(false);
    }
    expect(ok(Image, image({ alt: "ab" }))).toBe(false);
  });

  it("rejects sources outside media/, with spaces, or in GIF format", () => {
    expect(ok(Image, image({ src: "photos/a.jpg" }))).toBe(false);
    expect(ok(Image, image({ src: "media/my photo.jpg" }))).toBe(false);
    expect(ok(Image, image({ src: "media/loop.gif" }))).toBe(false);
    expect(ok(Image, image({ src: "media/loop.GIF" }))).toBe(false);
  });

  it('requires a logo alt of the form "{Organisation} logo"', () => {
    expect(ok(Logo, { src: "media/logos/dst.svg", alt: "DST logo" })).toBe(true);
    expect(ok(Logo, { src: "media/logos/dst.svg", alt: "logo" })).toBe(false);
    expect(
      ok(Logo, { src: "media/logos/dst.svg", alt: "Department of Science and Technology" }),
    ).toBe(false);
    expect(ok(Logo, { src: "media/logos/dst.jpg", alt: "DST logo" })).toBe(false);
  });
});

describe("Window and Money", () => {
  it("rejects a rolling window with a closing date", () => {
    expect(ok(Window, { rolling: true, closesAt: "2026-12-01T00:00:00+05:30" })).toBe(false);
    expect(ok(Window, { rolling: true })).toBe(true);
  });

  it("rejects a window that closes before it opens", () => {
    expect(
      ok(Window, { opensAt: "2026-12-01T00:00:00+05:30", closesAt: "2026-11-01T00:00:00+05:30" }),
    ).toBe(false);
    expect(
      ok(Window, { opensAt: "2026-11-01T00:00:00+05:30", closesAt: "2026-12-01T00:00:00+05:30" }),
    ).toBe(true);
  });

  it("defaults a missing window to not rolling, with no dates", () => {
    expect(Window.parse({})).toEqual({ rolling: false });
  });

  it("rejects min above max and treats missing ends as unknown (null)", () => {
    expect(ok(Money, { min: 10, max: 5, currency: "INR" })).toBe(false);
    expect(Money.parse({ currency: "INR" })).toEqual({ min: null, max: null, currency: "INR" });
    expect(ok(Money, { min: -1, max: 5, currency: "INR" })).toBe(false);
    expect(ok(Money, { min: 1, max: 5, currency: "USD" })).toBe(false);
  });
});

describe("strict objects", () => {
  it("reject an unknown key, so a typo fails the build", () => {
    const base = { slug: "x", name: "X", oneLiner: "o", sectors: ["other"], status: "current" };
    expect(ok(Startup, base)).toBe(true);
    expect(ok(Startup, { ...base, extraField: "typo" })).toBe(false);
  });
});

describe("Startup", () => {
  const base = { slug: "x", name: "X", oneLiner: "o", sectors: ["other"] };

  it("allows status 'unconfirmed' only on a flagged entry", () => {
    expect(ok(Startup, { ...base, status: "unconfirmed" })).toBe(false);
    expect(ok(Startup, { ...base, status: "unconfirmed", _status: "TODO_CONFIRM" })).toBe(true);
    expect(ok(Startup, { ...base, status: "current" })).toBe(true);
  });

  it("fills unknown fields with null, and caps the one-liner", () => {
    const parsed = Startup.parse({ ...base, status: "current" });
    expect([parsed.stage, parsed.cohortYear, parsed.affiliation]).toEqual([null, null, null]);
    expect(ok(Startup, { ...base, status: "current", oneLiner: "x".repeat(121) })).toBe(false);
  });

  it("needs at least one sector", () => {
    expect(ok(Startup, { ...base, sectors: [], status: "current" })).toBe(false);
  });
});

describe("dated entries", () => {
  const event = {
    slug: "e",
    title: "E",
    type: "talk",
    startsAt: "2026-10-20T10:00:00+05:30",
    mode: "online",
    summary: "s",
  };

  it("Event: the end may not precede the start", () => {
    expect(ok(Event, event)).toBe(true);
    expect(ok(Event, { ...event, endsAt: "2026-10-20T09:00:00+05:30" })).toBe(false);
    expect(ok(Event, { ...event, endsAt: "2026-10-20T10:00:00+05:30" })).toBe(true);
  });

  it("Event: caps the summary and requires a mode", () => {
    expect(ok(Event, { ...event, summary: "x".repeat(201) })).toBe(false);
    expect(ok(Event, { ...event, mode: undefined })).toBe(false);
  });

  it("Announcement: must expire after it starts", () => {
    const a = {
      slug: "a",
      text: "Hello",
      kind: "notice",
      startsAt: "2026-10-01T00:00:00+05:30",
      expiresAt: "2026-10-02T00:00:00+05:30",
    };
    expect(ok(Announcement, a)).toBe(true);
    expect(ok(Announcement, { ...a, expiresAt: a.startsAt })).toBe(false);
    expect(ok(Announcement, { ...a, expiresAt: undefined })).toBe(false);
  });

  it("Job: needs a way to apply, a sane date order, and an employer that matches its track", () => {
    const job = {
      slug: "j",
      title: "J",
      track: "work-with-iice",
      type: "full-time",
      postedAt: "2026-10-01",
      closesAt: "2026-10-31",
      apply: { email: "iice@iiserb.ac.in" },
    };
    expect(ok(Job, job)).toBe(true);
    expect(ok(Job, { ...job, apply: {} })).toBe(false);
    expect(ok(Job, { ...job, closesAt: "2026-09-30" })).toBe(false);
    expect(ok(Job, { ...job, employerStartupSlug: "x" })).toBe(false);
    expect(ok(Job, { ...job, track: "work-with-startups" })).toBe(false);
    expect(ok(Job, { ...job, track: "work-with-startups", employerStartupSlug: "x" })).toBe(true);
  });
});

describe("Stat", () => {
  it("requires a source for a confirmed number, but not for an unknown one", () => {
    const manual = { kind: "manual", id: "s", label: "S", order: 1 };
    expect(ok(Stat, { ...manual, value: 10 })).toBe(false);
    expect(ok(Stat, { ...manual, value: 10, source: "annual report" })).toBe(true);
    expect(ok(Stat, { ...manual, value: null })).toBe(true);
    expect(ok(Stat, manual)).toBe(true);
  });

  it("accepts a derived stat and rejects an unknown kind or derive", () => {
    expect(
      ok(Stat, { kind: "derived", id: "d", label: "D", derive: "startups-total", order: 1 }),
    ).toBe(true);
    expect(ok(Stat, { kind: "derived", id: "d", label: "D", derive: "revenue", order: 1 })).toBe(
      false,
    );
    expect(ok(Stat, { kind: "guess", id: "d", label: "D", order: 1 })).toBe(false);
  });

  it("caps the label at 40 characters", () => {
    expect(
      ok(Stat, { kind: "manual", id: "s", label: "x".repeat(41), value: null, order: 1 }),
    ).toBe(false);
  });
});

describe("Testimonial", () => {
  const t = {
    slug: "t",
    quote: "IICE gave us the lab space and the mentors we needed to reach our first prototype.",
    name: "N",
    role: "Founder",
    consent: { given: true, date: "2026-09-01", method: "email" },
  };

  it("needs recorded consent", () => {
    expect(ok(Testimonial, t)).toBe(true);
    expect(ok(Testimonial, { ...t, consent: undefined })).toBe(false);
    expect(ok(Testimonial, { ...t, consent: { ...t.consent, given: false } })).toBe(false);
  });

  it("keeps the quote between 40 and 320 characters", () => {
    expect(ok(Testimonial, { ...t, quote: "Too short." })).toBe(false);
    expect(ok(Testimonial, { ...t, quote: "x".repeat(321) })).toBe(false);
  });
});

describe("collections with limits", () => {
  const item = (i: number) => ({
    id: `item-${i}`,
    badge: "Incubated",
    title: `T${i}`,
    description: "d",
    href: "/startups/",
  });

  it("Spotlight holds 3 to 8 cards", () => {
    const items = (n: number) => ({ items: Array.from({ length: n }, (_, i) => item(i)) });
    expect([2, 3, 8, 9].map((n) => ok(Spotlight, items(n)))).toEqual([false, true, true, false]);
  });

  it("Ecosystem tiles hold at most 7", () => {
    const tile = (i: number) => ({
      id: `t-${i}`,
      icon: "users",
      title: "T",
      short: "s",
      long: "l",
    });
    expect(ok(EcosystemTiles, { items: Array.from({ length: 7 }, (_, i) => tile(i)) })).toBe(true);
    expect(ok(EcosystemTiles, { items: Array.from({ length: 8 }, (_, i) => tile(i)) })).toBe(false);
  });

  it("Navigation holds at most 7 top-level items, with real targets", () => {
    const entry = (i: number) => ({ label: `L${i}`, href: `/p${i}/` });
    const nav = (primary: unknown[]) => ({
      primary,
      cta: { label: "Apply for Incubation", href: "/apply/" },
    });
    expect(ok(Navigation, nav(Array.from({ length: 7 }, (_, i) => entry(i))))).toBe(true);
    expect(ok(Navigation, nav(Array.from({ length: 8 }, (_, i) => entry(i))))).toBe(false);
    expect(ok(Navigation, nav([{ label: "Dead" }]))).toBe(false);
    expect(ok(Navigation, nav([{ label: "Hash", href: "#" }]))).toBe(false);
    expect(ok(Navigation, { primary: [], cta: { label: "Apply", href: "/apply/" } })).toBe(false);
  });
});

describe("other rules", () => {
  it("Stage: order 1 to 3, a closed slug, at least three offerings", () => {
    const stage = {
      slug: "catalyse",
      order: 1,
      name: "Catalyse",
      phase: "Pre-incubation",
      tagline: "t",
      oneLiner: "o",
      audience: ["a"],
      schemeSlugs: [],
      offerings: ["a", "b", "c"],
    };
    expect(ok(Stage, stage)).toBe(true);
    expect(ok(Stage, { ...stage, order: 4 })).toBe(false);
    expect(ok(Stage, { ...stage, slug: "scale" })).toBe(false);
    expect(ok(Stage, { ...stage, offerings: ["a", "b"] })).toBe(false);
  });

  it("FundingScheme: unknown at-a-glance rows default to null instead of failing", () => {
    const scheme = FundingScheme.parse({
      slug: "s",
      name: "S",
      provider: "P",
      oneLiner: "o",
      atAGlance: {},
      eligibility: [],
      window: {},
      stageSlugs: ["catalyse"],
      lastReviewed: null,
    });
    expect(scheme.atAGlance.maxSupport).toBeNull();
    expect(scheme.window.rolling).toBe(false);
  });

  it("Opportunity: caps the title at 110 characters", () => {
    const o = {
      slug: "o",
      title: "T",
      kind: "challenge",
      sponsor: "S",
      summary: "s",
      window: {},
      applyHref: "/apply/",
    };
    expect(ok(Opportunity, o)).toBe(true);
    expect(ok(Opportunity, { ...o, title: "x".repeat(111) })).toBe(false);
  });

  it("Instrument: requires an access mode", () => {
    const i = { slug: "i", name: "I", category: "imaging", access: "via-cif", lastReviewed: null };
    expect(ok(Instrument, i)).toBe(true);
    expect(ok(Instrument, { ...i, access: "anyone" })).toBe(false);
  });

  it("SiteSettings: a social link must be a profile, not the platform homepage", () => {
    const socials = (linkedin: string) => SiteSettings.shape.socials.safeParse({ linkedin });
    expect(socials("https://www.linkedin.com/company/iice-iiserb").success).toBe(true);
    expect(socials("https://www.linkedin.com/").success).toBe(false);
    expect(socials("https://x.com").success).toBe(false);
    expect(
      messagesOf(SiteSettings.shape.socials, { linkedin: "https://www.linkedin.com" })[0],
    ).toContain("profile");
  });
});
