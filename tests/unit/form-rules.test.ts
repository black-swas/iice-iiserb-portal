import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { FORM_DATA, FORM_TYPES, type FormType } from "@/content/forms";
import rulesFile from "@/content/form-rules.json";
import {
  toPayload,
  validate,
  type FlatValues,
  type FormRules,
  type Violation,
} from "@/lib/form-validate";
import { buildRulesFile, embedRules, rulesJson } from "../../scripts/lib/form-rules";
import { MISTAKES, VALID } from "./form-fixtures";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const rules = (type: FormType) => (rulesFile.forms as unknown as Record<FormType, FormRules>)[type];

// ── The Apps Script endpoint, loaded the way Apps Script loads it: as a script, with no Google services ──
const source = fs.readFileSync(path.join(ROOT, "apps-script", "Code.gs"), "utf8");
const endpoint = vm.createContext({ console }) as Record<string, (...args: unknown[]) => unknown>;
vm.runInContext(source, endpoint);
/** Moves a value across the vm boundary so deep equality compares plain data, not two realms' prototypes. */
const plain = <T>(value: unknown) => JSON.parse(JSON.stringify(value ?? null)) as T;
const gsValidate = (type: FormType, payload: unknown) =>
  plain<Violation[]>(endpoint.validatePayload_!(type, plain(payload)));
const gsPayload = (type: FormType, flat: FlatValues) =>
  plain<Record<string, unknown>>(endpoint.toPayload_!(type, plain(flat)));

const zodPaths = (type: FormType, payload: unknown) => {
  const result = FORM_DATA[type].safeParse(payload);
  return result.success ? [] : [...new Set(result.error.issues.map((i) => i.path.join(".")))];
};

describe("generated form rules", () => {
  it("are current: src/content/form-rules.json matches the Zod schemas", () => {
    const onDisk = fs.readFileSync(path.join(ROOT, "src", "content", "form-rules.json"), "utf8");
    expect(onDisk).toBe(rulesJson(buildRulesFile()));
  });

  it("are current in apps-script/Code.gs", () => {
    expect(source).toBe(embedRules(source, buildRulesFile()));
  });

  it("cover every form type", () => {
    expect(Object.keys(rulesFile.forms).sort()).toEqual([...FORM_TYPES].sort());
  });
});

describe.each(FORM_TYPES)("%s form", (type) => {
  it("accepts a valid payload in Zod, the browser validator and the endpoint", () => {
    expect(FORM_DATA[type].safeParse(VALID[type]).success).toBe(true);
    expect(validate(rules(type), VALID[type])).toEqual([]);
    expect(gsValidate(type, VALID[type])).toEqual([]);
  });
});

describe("mistakes", () => {
  it.each(MISTAKES)("$form: $name", ({ form, mutate, paths, crossField }) => {
    const payload = mutate(VALID[form]);
    const mine = validate(rules(form), payload);

    expect(mine.map((v) => v.path).sort()).toEqual([...paths].sort());
    expect(FORM_DATA[form].safeParse(payload).success).toBe(false);
    if (!crossField) expect(zodPaths(form, payload).sort()).toEqual([...paths].sort());
    // The endpoint port gives exactly the same violations as the browser.
    expect(gsValidate(form, payload)).toEqual(plain(mine));
  });
});

describe("flat values to payload", () => {
  const cases: {
    name: string;
    type: FormType;
    flat: FlatValues;
    expected: Record<string, unknown>;
  }[] = [
    {
      name: "numbers, booleans, nested objects and checkbox lists",
      type: "application",
      flat: {
        "applicant.name": "  Asha Verma ",
        "applicant.phone": "+91 755 269 2384",
        "venture.teamSize": "3",
        "venture.incorporated": "false",
        "needs.labSpace": "true",
        "needs.mentoringAreas": ["technical", "business"],
        "technology.patentNumbers": "IN2024001, IN2024002\nIN2024003",
        "declarations.infoAccurate": true,
        "venture.website": "",
        "applicant.institution": "   ",
      },
      expected: {
        applicant: { name: "Asha Verma", phone: "+91 755 269 2384" },
        venture: { teamSize: 3, incorporated: false },
        needs: { labSpace: true, mentoringAreas: ["technical", "business"] },
        technology: { patentNumbers: ["IN2024001", "IN2024002", "IN2024003"] },
        declarations: { infoAccurate: true },
      },
    },
    {
      name: "dates by index, with a gap closed up",
      type: "booking",
      flat: {
        "preferredDates.0": "2026-12-01",
        "preferredDates.1": "",
        "preferredDates.2": "2026-12-03",
      },
      expected: { preferredDates: ["2026-12-01", "2026-12-03"] },
    },
    {
      name: "a number that is not a number stays text so it can be reported",
      type: "application",
      flat: { "venture.teamSize": "three" },
      expected: { venture: { teamSize: "three" } },
    },
    {
      name: "unknown fields are ignored",
      type: "contact",
      flat: { name: "Asha", favouriteColour: "teal" },
      expected: { name: "Asha" },
    },
  ];

  it.each(cases)("$name", ({ type, flat, expected }) => {
    expect(toPayload(rules(type).schema, flat)).toEqual(expected);
    expect(gsPayload(type, flat)).toEqual(expected);
  });

  it("the endpoint builds the same envelope from a plain HTML form post", () => {
    const parameter = {
      formType: "contact",
      pageUrl: "https://iice.iiserb.ac.in/contact/",
      website: "",
      consent: "on",
      name: "Asha Verma",
      email: "asha@example.org",
      topic: "incubation",
      message: "I would like to talk about incubating a diagnostics startup.",
    };
    const envelope = plain<Record<string, unknown>>(
      endpoint.envelopeFromParameters_!(parameter, {}),
    );
    expect(envelope).toMatchObject({
      formType: "contact",
      consent: true,
      website: "",
      schemaVersion: 1,
    });
    expect(envelope.data).toEqual(VALID.contact);
  });
});

describe("endpoint spam and envelope checks", () => {
  const call = (name: string, ...args: unknown[]) => plain<unknown>(endpoint[name]!(...args));

  it("treats a filled honeypot as spam", () => {
    expect(call("spamReason_", { website: "http://spam.test" })).toBe("honeypot");
  });

  it("treats a submission under three seconds as spam", () => {
    expect(
      call("spamReason_", {
        website: "",
        startedAt: "2026-10-14T10:00:00+05:30",
        submittedAt: "2026-10-14T10:00:02+05:30",
      }),
    ).toBe("too-fast");
    expect(
      call("spamReason_", {
        website: "",
        startedAt: "2026-10-14T10:00:00+05:30",
        submittedAt: "2026-10-14T10:00:30+05:30",
      }),
    ).toBe("");
  });

  it("does not guess when a plain form post has no timing", () => {
    expect(call("spamReason_", { website: "" })).toBe("");
  });

  it("requires consent, a known form and the current schema version", () => {
    expect(
      call("envelopeErrors_", { formType: "contact", schemaVersion: 1, consent: true }),
    ).toEqual({});
    expect(call("envelopeErrors_", { formType: "nope", schemaVersion: 2, consent: false })).toEqual(
      {
        formType: "Unknown form.",
        schemaVersion: "Unsupported form version.",
        consent: "You need to agree to the privacy notice to continue.",
      },
    );
  });

  it("names the same sheet columns for every form as the payload it stores", () => {
    for (const type of FORM_TYPES) {
      const columns = call("columnsFor_", type) as string[];
      const record = Object.keys(call("flattenPayload_", VALID[type]) as Record<string, unknown>);
      for (const key of record) expect(columns, `${type}: ${key}`).toContain(key);
    }
  });
});
