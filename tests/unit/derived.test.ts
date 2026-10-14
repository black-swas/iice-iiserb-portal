import { describe, expect, it } from "vitest";
import {
  CLAIM_FLOORS,
  DERIVE_TO_KEY,
  computeDerived,
  publicStats,
  resolveStats,
  type DerivedInput,
} from "@/content/derived";
import {
  Event,
  FundingScheme,
  Instrument,
  Mentor,
  Partner,
  Stat,
  StatDerive,
  Startup,
} from "@/content/schema";
import { NOW } from "./helpers";

const startup = (slug: string, extra: Record<string, unknown> = {}) =>
  Startup.parse({
    slug,
    name: slug,
    oneLiner: `About ${slug}`,
    sectors: ["other"],
    status: "current",
    ...extra,
  });
const event = (slug: string, startsAt: string, extra: Record<string, unknown> = {}) =>
  Event.parse({
    slug,
    title: slug,
    type: "talk",
    startsAt,
    mode: "online",
    summary: "s",
    ...extra,
  });

const empty: DerivedInput = {
  startups: [],
  events: [],
  fundingSchemes: [],
  mentors: [],
  partners: [],
  instruments: [],
};
const FLAG = { _status: "TODO_CONFIRM" };

describe("computeDerived", () => {
  it("counts only confirmed, published startups, by status", () => {
    const d = computeDerived(
      {
        ...empty,
        startups: [
          startup("a"),
          startup("b"),
          startup("c", { status: "graduated" }),
          startup("d", { status: "pre-startup" }),
          startup("e", { status: "inactive" }),
          startup("flagged", FLAG),
          startup("draft", { draft: true }),
          startup("unconfirmed", { ...FLAG, status: "unconfirmed" }),
        ],
      },
      NOW,
    );
    expect(d.startupsCurrent).toBe(2);
    expect(d.startupsGraduated).toBe(1);
    expect(d.startupsTotal).toBe(3);
    expect(d.preStartups).toBe(1);
  });

  it("counts an event as held only once its IST day has ended", () => {
    const d = computeDerived(
      {
        ...empty,
        events: [
          event("past", "2026-05-07T00:00:00+05:30", { allDay: true }),
          event("today", "2026-10-13T00:00:00+05:30", { allDay: true }),
          event("future", "2026-12-01T10:00:00+05:30"),
          event("flagged-past", "2026-01-01T10:00:00+05:30", FLAG),
          event("draft-past", "2026-01-02T10:00:00+05:30", { draft: true }),
        ],
      },
      NOW,
    );
    expect(d.eventsHeld).toBe(1);
  });

  it("sums scheme beneficiaries over confirmed schemes", () => {
    const scheme = (slug: string, count: number, extra: Record<string, unknown> = {}) =>
      FundingScheme.parse({
        slug,
        name: slug,
        provider: "p",
        oneLiner: slug,
        atAGlance: {},
        eligibility: [],
        window: {},
        stageSlugs: ["catalyse"],
        lastReviewed: null,
        cohorts: [
          {
            label: "c",
            beneficiaries: Array.from({ length: count }, (_, i) => ({
              name: `n${i}`,
              oneLiner: "o",
            })),
          },
        ],
        ...extra,
      });
    const d = computeDerived(
      { ...empty, fundingSchemes: [scheme("a", 3), scheme("b", 2), scheme("f", 9, FLAG)] },
      NOW,
    );
    expect(d.schemeBeneficiaries).toBe(5);
  });

  it("counts mentors, partners and non-retired instruments", () => {
    const d = computeDerived(
      {
        ...empty,
        mentors: [
          Mentor.parse({
            slug: "m",
            personSlug: "p",
            title: "t",
            organisation: "o",
            types: ["legal"],
            expertise: ["x"],
          }),
        ],
        partners: [Partner.parse({ slug: "p", name: "P", category: "host" })],
        instruments: [
          Instrument.parse({
            slug: "i1",
            name: "I1",
            category: "imaging",
            access: "via-cif",
            lastReviewed: null,
          }),
          Instrument.parse({
            slug: "i2",
            name: "I2",
            category: "imaging",
            access: "via-cif",
            status: "retired",
            lastReviewed: null,
          }),
        ],
      },
      NOW,
    );
    expect([d.mentors, d.partners, d.instruments]).toEqual([1, 1, 1]);
  });

  it("is all zeros for empty content", () => {
    expect(Object.values(computeDerived(empty, NOW))).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe("derive tables", () => {
  it("maps every derive option to a Derived key", () => {
    const keys = Object.keys(computeDerived(empty, NOW));
    for (const option of StatDerive.options) expect(keys).toContain(DERIVE_TO_KEY[option]);
  });

  it("only guards ids that map to real counts", () => {
    const keys = Object.keys(computeDerived(empty, NOW));
    for (const key of Object.values(CLAIM_FLOORS)) expect(keys).toContain(key);
  });
});

describe("resolveStats", () => {
  const derived = { ...computeDerived(empty, NOW), startupsTotal: 14, eventsHeld: 0 };
  const stats = (items: unknown[]) => items.map((i) => Stat.parse(i));

  it("takes a derived stat from the counts and a manual stat from its value", () => {
    const [manual, derivedStat] = resolveStats(
      stats([
        { kind: "derived", id: "d", label: "Startups", derive: "startups-total", order: 2 },
        {
          kind: "manual",
          id: "m",
          label: "Space",
          value: 10_000,
          unit: "sqft",
          source: "s",
          order: 1,
        },
      ]),
      derived,
    );
    expect(manual).toMatchObject({ id: "m", value: 10_000, unit: "sqft" });
    expect(derivedStat).toMatchObject({ id: "d", value: 14 });
  });

  it("hides unknowns and zeros: no counter ever reads 0", () => {
    const resolved = resolveStats(
      stats([
        { kind: "manual", id: "null", label: "n", value: null, order: 1 },
        { kind: "manual", id: "zero", label: "z", value: 0, source: "s", order: 2 },
        { kind: "derived", id: "none", label: "d", derive: "events-held", order: 3 },
      ]),
      derived,
    );
    expect(resolved.map((s) => s.value)).toEqual([null, null, null]);
    expect(publicStats(resolved)).toEqual([]);
  });

  it("hides a flagged stat even when it carries a number", () => {
    const [flagged] = resolveStats(
      stats([
        {
          kind: "manual",
          id: "f",
          label: "f",
          value: 50,
          source: "s",
          order: 1,
          _status: "TODO_CONFIRM",
        },
      ]),
      derived,
    );
    expect(flagged?.value).toBeNull();
  });

  it("orders by `order` and lets publicStats keep only the renderable ones", () => {
    const resolved = resolveStats(
      stats([
        { kind: "manual", id: "b", label: "b", value: 5, source: "s", order: 2 },
        { kind: "manual", id: "a", label: "a", value: 7, source: "s", order: 1 },
        { kind: "manual", id: "c", label: "c", value: null, order: 3 },
      ]),
      derived,
    );
    expect(resolved.map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(publicStats(resolved).map((s) => s.id)).toEqual(["a", "b"]);
  });
});
