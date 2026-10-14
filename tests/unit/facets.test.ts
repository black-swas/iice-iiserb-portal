import { describe, expect, it } from "vitest";
import {
  applyFilters,
  buildFacets,
  isEmptySelection,
  matches,
  parseSelection,
  sanitizeSelection,
  serializeSelection,
  setFacet,
  toggleValue,
  valuesOf,
  writeSelectionToUrl,
  type FacetDef,
  type Selection,
} from "@/lib/facets";
import { enumLabel } from "@/lib/i18n";

interface Item {
  id: string;
  sectors?: string[] | null;
  status?: string | null;
  batch?: string | null;
}

const items: Item[] = [
  {
    id: "a",
    sectors: ["iot-ai", "healthcare-bioengineering"],
    status: "current",
    batch: "Batch 2",
  },
  { id: "b", sectors: ["healthcare-bioengineering"], status: "current", batch: "Batch 10" },
  { id: "c", sectors: ["iot-ai"], status: "graduated", batch: "Batch 2" },
  { id: "d", sectors: ["other"], status: "graduated", batch: null },
  { id: "e", sectors: [], status: "current", batch: "Batch 1" },
  { id: "f", sectors: null, status: null },
];

const defs: FacetDef<Item>[] = [
  {
    id: "sector",
    label: "Sector",
    values: (i) => i.sectors,
    labelFor: (v) => enumLabel("sector", v),
  },
  {
    id: "status",
    label: "Status",
    values: (i) => i.status,
    labelFor: (v) => enumLabel("startupStatus", v),
    order: ["current", "graduated"],
  },
  { id: "batch", label: "Batch", values: (i) => i.batch },
];

const ids = (list: Item[]) => list.map((i) => i.id);
const facet = (id: string, selection = {}) =>
  buildFacets(items, defs, selection).find((f) => f.id === id)!;
const counts = (id: string, selection = {}) =>
  Object.fromEntries(facet(id, selection).options.map((o) => [o.value, o.count]));

describe("valuesOf", () => {
  it("normalises one value, many, none, blanks and duplicates", () => {
    const def: FacetDef<Item> = { id: "x", label: "X", values: (i) => i.sectors };
    expect(valuesOf(def, { id: "1", sectors: [" iot-ai ", "iot-ai", "", "other"] })).toEqual([
      "iot-ai",
      "other",
    ]);
    expect(valuesOf(def, { id: "1", sectors: [] })).toEqual([]);
    expect(valuesOf(def, { id: "1", sectors: null })).toEqual([]);
    expect(valuesOf(def, { id: "1" })).toEqual([]);
    expect(
      valuesOf({ id: "s", label: "S", values: (i: Item) => i.status }, { id: "1", status: "  " }),
    ).toEqual([]);
    expect(
      valuesOf(
        { id: "s", label: "S", values: (i: Item) => i.status },
        { id: "1", status: "current" },
      ),
    ).toEqual(["current"]);
  });
});

describe("applyFilters: OR within a facet, AND across facets", () => {
  it("returns everything for an empty selection, or empty value lists", () => {
    expect(ids(applyFilters(items, defs, {}))).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(ids(applyFilters(items, defs, { sector: [] }))).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("ORs the values of one facet", () => {
    expect(ids(applyFilters(items, defs, { sector: ["iot-ai", "other"] }))).toEqual([
      "a",
      "c",
      "d",
    ]);
  });

  it("ANDs facets together", () => {
    expect(ids(applyFilters(items, defs, { sector: ["iot-ai"], status: ["graduated"] }))).toEqual([
      "c",
    ]);
    expect(
      ids(
        applyFilters(items, defs, {
          sector: ["iot-ai", "healthcare-bioengineering"],
          status: ["current"],
        }),
      ),
    ).toEqual(["a", "b"]);
  });

  it("matches a multi-valued item on any of its values", () => {
    expect(ids(applyFilters(items, defs, { sector: ["healthcare-bioengineering"] }))).toEqual([
      "a",
      "b",
    ]);
  });

  it("never matches an item with no value for a facet that has a selection", () => {
    const result = ids(applyFilters(items, defs, { batch: ["Batch 2", "Batch 10", "Batch 1"] }));
    expect(result).toEqual(["a", "b", "c", "e"]);
    expect(result).not.toContain("d");
    expect(result).not.toContain("f");
  });

  it("returns nothing, rather than everything, for a value nobody has", () => {
    expect(applyFilters(items, defs, { status: ["archived"] })).toEqual([]);
  });

  it("ignores a facet id it does not know", () => {
    expect(ids(applyFilters(items, defs, { colour: ["red"] }))).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ]);
  });

  it("leaves one facet out of the test when asked (how its own counts are computed)", () => {
    expect(matches(items[2]!, defs, { sector: ["other"], status: ["graduated"] }, "sector")).toBe(
      true,
    );
    expect(matches(items[2]!, defs, { sector: ["other"], status: ["graduated"] })).toBe(false);
  });
});

describe("buildFacets: options come from the data", () => {
  it("offers exactly the values that occur, with counts, and no empty option", () => {
    expect(counts("sector")).toEqual({ "healthcare-bioengineering": 2, "iot-ai": 2, other: 1 });
    expect(counts("status")).toEqual({ current: 3, graduated: 2 });
    expect(counts("batch")).toEqual({ "Batch 1": 1, "Batch 2": 2, "Batch 10": 1 });
  });

  it("counts an item once per value it has", () => {
    // item "a" has two sectors, so it adds to both, and the totals are 2+2+1, not 5 distinct items
    const total = Object.values(counts("sector")).reduce((a, b) => a + b, 0);
    expect(total).toBe(5);
  });

  it("takes labels from labelFor, never from the raw value", () => {
    const sector = facet("sector");
    expect(sector.options.find((o) => o.value === "iot-ai")!.label).toBe(
      "Internet of Things & Artificial Intelligence",
    );
    expect(sector.options.every((o) => o.label !== o.value)).toBe(true);
  });

  it("fails loudly on a value with no label, so a raw slug can never reach a chip", () => {
    const bad: FacetDef<Item> = {
      id: "s",
      label: "S",
      values: (i) => i.status,
      labelFor: (v) => enumLabel("startupStatus", `${v}-typo`),
    };
    expect(() => buildFacets(items, [bad])).toThrow(
      /no label for enums\.startupStatus\.current-typo/,
    );
  });

  it("sorts by the given order first, then alphabetically by label, comparing numbers as numbers", () => {
    expect(facet("status").options.map((o) => o.value)).toEqual(["current", "graduated"]);
    expect(facet("batch").options.map((o) => o.value)).toEqual(["Batch 1", "Batch 2", "Batch 10"]);
    const sector = facet("sector").options.map((o) => o.label);
    expect(sector).toEqual(
      [...sector].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })),
    );
  });

  it("puts values outside the given order after the ordered ones", () => {
    const partial = buildFacets(items, [{ ...defs[1]!, order: ["graduated"] }])[0]!;
    expect(partial.options.map((o) => o.value)).toEqual(["graduated", "current"]);
  });

  it("marks the selected options", () => {
    const sector = facet("sector", { sector: ["other"] });
    expect(sector.options.filter((o) => o.selected).map((o) => o.value)).toEqual(["other"]);
  });
});

describe("counts follow the other facets, not the facet's own selection", () => {
  it("narrow when another facet is selected", () => {
    expect(counts("sector", { status: ["graduated"] })).toEqual({
      "healthcare-bioengineering": 0,
      "iot-ai": 1,
      other: 1,
    });
    expect(counts("status", { sector: ["iot-ai"] })).toEqual({ current: 1, graduated: 1 });
  });

  it("keep every option of a facet visible, at zero if need be, so chips do not jump around", () => {
    expect(facet("sector", { status: ["graduated"] }).options).toHaveLength(3);
  });

  it("ignore the facet's own selection, so choosing a second value shows what it would add", () => {
    expect(counts("sector", { sector: ["iot-ai"] })).toEqual({
      "healthcare-bioengineering": 2,
      "iot-ai": 2,
      other: 1,
    });
  });
});

describe("the chip invariant (the 'Batch 1 vs Batch 01' bug class)", () => {
  const selections: Selection[] = [
    {},
    { status: ["current"] },
    { sector: ["iot-ai"], batch: ["Batch 2"] },
    { sector: ["other", "iot-ai"] },
  ];

  it("every option's count equals the number of results when that value alone is chosen in its facet", () => {
    for (const selection of selections) {
      for (const f of buildFacets(items, defs, selection)) {
        for (const option of f.options) {
          const results = applyFilters(items, defs, { ...selection, [f.id]: [option.value] });
          expect(option.count, `${f.id}=${option.value} under ${JSON.stringify(selection)}`).toBe(
            results.length,
          );
        }
      }
    }
  });

  it("with nothing selected, no chip leads to an empty list", () => {
    for (const f of buildFacets(items, defs)) {
      for (const option of f.options) expect(option.count).toBeGreaterThan(0);
    }
  });

  it("a label that differs from the data cannot appear, because options are the data", () => {
    const messy: Item[] = [
      { id: "1", batch: "Batch 01" },
      { id: "2", batch: "Batch 1" },
    ];
    const batch = buildFacets(messy, [defs[2]!])[0]!;
    expect(batch.options.map((o) => o.value).sort()).toEqual(["Batch 01", "Batch 1"]);
    for (const option of batch.options) {
      expect(applyFilters(messy, [defs[2]!], { batch: [option.value] })).toHaveLength(option.count);
    }
  });
});

describe("sanitizeSelection", () => {
  const facets = buildFacets(items, defs);

  it("drops unknown facets, unknown values and duplicates, and keeps the order", () => {
    const clean = sanitizeSelection(
      { sector: ["iot-ai", "nonsense", "iot-ai", "other"], colour: ["red"], status: ["archived"] },
      facets,
    );
    expect(clean).toEqual({ sector: ["iot-ai", "other"] });
  });

  it("returns an empty selection for nothing valid", () => {
    expect(isEmptySelection(sanitizeSelection({ sector: ["x"] }, facets))).toBe(true);
  });
});

describe("toggleValue / setFacet", () => {
  it("adds and removes a value, and removes the facet when it empties", () => {
    const one = toggleValue({}, "sector", "iot-ai");
    expect(one).toEqual({ sector: ["iot-ai"] });
    expect(toggleValue(one, "sector", "other")).toEqual({ sector: ["iot-ai", "other"] });
    expect(toggleValue(one, "sector", "iot-ai")).toEqual({});
  });

  it("does not mutate its input", () => {
    const start = Object.freeze({ sector: Object.freeze(["iot-ai"]) });
    expect(() => toggleValue(start, "sector", "other")).not.toThrow();
    expect(start.sector).toEqual(["iot-ai"]);
  });

  it("setFacet replaces, de-duplicates, and clears on empty", () => {
    expect(setFacet({ sector: ["a"] }, "sector", ["b", "b", "c"])).toEqual({ sector: ["b", "c"] });
    expect(setFacet({ sector: ["a"], status: ["x"] }, "sector", [])).toEqual({ status: ["x"] });
  });
});

describe("URL query", () => {
  it("parses comma lists and repeated params, ignoring keys that are not facets", () => {
    expect(
      parseSelection("sector=iot-ai,healthcare-bioengineering&status=current&utm=1", defs),
    ).toEqual({
      sector: ["iot-ai", "healthcare-bioengineering"],
      status: ["current"],
    });
    expect(parseSelection("sector=iot-ai&sector=other", defs)).toEqual({
      sector: ["iot-ai", "other"],
    });
    expect(parseSelection(new URLSearchParams("status=graduated"), defs)).toEqual({
      status: ["graduated"],
    });
  });

  it("drops blanks and duplicates", () => {
    expect(parseSelection("sector=,iot-ai,,iot-ai&status=", defs)).toEqual({ sector: ["iot-ai"] });
  });

  it("serialises in facet order with readable commas, and not at all when empty", () => {
    expect(serializeSelection({ status: ["current"], sector: ["iot-ai", "other"] }, defs)).toBe(
      "sector=iot-ai,other&status=current",
    );
    expect(serializeSelection({}, defs)).toBe("");
    expect(serializeSelection({ sector: [] }, defs)).toBe("");
  });

  it("round-trips values that need escaping, including a comma inside a value", () => {
    const selection = { sector: ["iot-ai", "other"], batch: ["Batch 2", "A&B, C"] };
    const text = serializeSelection(selection, defs);
    expect(text).toBe("sector=iot-ai,other&batch=Batch%202,A%26B%2C%20C");
    expect(parseSelection(text, defs)).toEqual(selection);
    expect(parseSelection("?" + text, defs)).toEqual(selection);
  });

  it("reads + as a space, as browsers and other tools write it", () => {
    expect(parseSelection("batch=Batch+2", defs)).toEqual({ batch: ["Batch 2"] });
  });

  it("round-trips values without commas exactly", () => {
    const selection = { sector: ["iot-ai", "other"], status: ["current"], batch: ["Batch 2"] };
    expect(parseSelection(serializeSelection(selection, defs), defs)).toEqual(selection);
  });

  it("writes to the address bar with replaceState, keeping path, other params and hash", () => {
    const calls: string[] = [];
    const env = {
      location: { pathname: "/startups/", search: "?utm=1&sector=old", hash: "#grid" },
      history: { replaceState: (_d: unknown, _u: string, url: string) => void calls.push(url) },
    };
    const url = writeSelectionToUrl({ sector: ["iot-ai", "other"] }, defs, env);
    expect(url).toBe("/startups/?utm=1&sector=iot-ai,other#grid");
    expect(calls).toEqual([url]);
  });

  it("removes the facet params when the selection is cleared, leaving a clean URL", () => {
    const env = {
      location: { pathname: "/startups/", search: "?sector=a&status=b", hash: "" },
      history: { replaceState: () => undefined },
    };
    expect(writeSelectionToUrl({}, defs, env)).toBe("/startups/");
  });
});

describe("enumLabel", () => {
  it("returns the catalogue label and throws on a missing one", () => {
    expect(enumLabel("stage", "catalyse")).toBe("Catalyse");
    expect(() => enumLabel("stage", "nope")).toThrow(/no label/);
  });
});
