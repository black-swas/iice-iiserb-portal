import { describe, expect, it, vi } from "vitest";
import { buildEnvelope, fill, mailtoHref, normaliseResponse, submitForm } from "@/lib/forms";
import {
  constraintsFor,
  errorsByField,
  fieldForPath,
  isVisible,
  messageFor,
  requiredByRules,
  requiredNow,
  schemaFor,
  visibleValues,
} from "@/components/forms/constraints";
import { buildForm } from "@/components/forms/definitions";
import type { FormCopy, ResolvedField, ResolvedForm } from "@/components/forms/types";
import rulesFile from "@/content/form-rules.json";
import { FORM_TYPES, type FormType } from "@/content/forms";
import { SiteSettings } from "@/content/schema";
import type { FormRules } from "@/lib/form-validate";
import { toPayload, validate } from "@/lib/form-validate";
import en from "../../messages/en.json";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./helpers";

const rules = (type: FormType) => (rulesFile.forms as unknown as Record<FormType, FormRules>)[type];
const site = SiteSettings.parse(
  JSON.parse(readFileSync(path.join(ROOT, "content", "settings", "site.json"), "utf8")),
);
const dynamicOptions = {
  site,
  tracks: [{ slug: "virtual", name: "Virtual incubation" }],
  schemes: [{ slug: "nidhi", name: "NIDHI" }],
  facilities: [{ slug: "lab", name: "Lab" }],
  instruments: [{ slug: "nmr", name: "NMR" }],
};

describe("transport", () => {
  it("builds an envelope with the honeypot empty and consent given", () => {
    const envelope = buildEnvelope(
      "contact",
      { name: "A" },
      {
        pageUrl: "https://iice.iiserb.ac.in/contact/",
        startedAt: "2026-10-14T10:00:00.000Z",
        now: new Date("2026-10-14T10:00:30.000Z"),
      },
    );
    expect(envelope).toMatchObject({
      formType: "contact",
      schemaVersion: 1,
      submittedAt: "2026-10-14T10:00:30.000Z",
      website: "",
      consent: true,
      locale: "en",
    });
  });

  it("reads the endpoint's own replies", () => {
    expect(normaliseResponse({ ok: true, id: "APP-2026-000123" })).toEqual({
      ok: true,
      id: "APP-2026-000123",
    });
    expect(normaliseResponse({ ok: true })).toEqual({ ok: true, id: "" });
    expect(
      normaliseResponse({ ok: false, errors: { "applicant.email": "Bad" }, message: "No" }),
    ).toEqual({
      ok: false,
      errors: { "applicant.email": "Bad" },
      message: "No",
    });
  });

  it("reads the shapes other form services reply with, and never mistakes junk for success", () => {
    expect(normaliseResponse({ ok: false, errors: [{ field: "email", message: "Bad" }] })).toEqual({
      ok: false,
      errors: { email: "Bad" },
    });
    expect(normaliseResponse({ error: "Rate limited" })).toEqual({
      ok: false,
      errors: {},
      message: "Rate limited",
    });
    for (const junk of [null, "ok", 42, [], {}, { ok: "yes" }])
      expect(normaliseResponse(junk).ok).toBe(false);
  });

  it("posts JSON as text/plain, which needs no preflight", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ json: async () => ({ ok: true, id: "CON-2026-000001" }) });
    const envelope = buildEnvelope(
      "contact",
      {},
      { pageUrl: "https://x/", startedAt: "2026-10-14T10:00:00Z" },
    );
    const result = await submitForm("https://script.example/exec", envelope, {
      fetchImpl: fetchImpl as never,
    });
    expect(result).toEqual({ ok: true, id: "CON-2026-000001" });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://script.example/exec");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "text/plain;charset=utf-8",
    );
    expect(JSON.parse(init.body as string)).toMatchObject({ formType: "contact" });
  });

  it("reports a network failure, a reply that is not JSON and a timeout as 'could not reach'", async () => {
    const envelope = buildEnvelope(
      "contact",
      {},
      { pageUrl: "https://x/", startedAt: "2026-10-14T10:00:00Z" },
    );
    const down = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    expect(await submitForm("https://x/", envelope, { fetchImpl: down as never })).toMatchObject({
      ok: false,
      network: true,
    });
    const html = vi
      .fn()
      .mockResolvedValue({ json: async () => Promise.reject(new SyntaxError("not json")) });
    expect(await submitForm("https://x/", envelope, { fetchImpl: html as never })).toMatchObject({
      network: true,
    });
    const slow = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) =>
          init.signal?.addEventListener("abort", () => reject(new Error("aborted"))),
        ),
    );
    expect(
      await submitForm("https://x/", envelope, { fetchImpl: slow as never, timeoutMs: 10 }),
    ).toMatchObject({ network: true });
  });

  it("builds a mailto fallback within a sensible length", () => {
    const href = mailtoHref("iice@iiserb.ac.in", "Message", "Name: Asha\nMessage: Hello");
    expect(href).toBe(
      "mailto:iice@iiserb.ac.in?subject=Message&body=Name%3A%20Asha%0AMessage%3A%20Hello",
    );
    expect(decodeURIComponent(mailtoHref("a@b.co", "S", "x".repeat(5000))).length).toBeLessThan(
      1700,
    );
  });

  it("fills placeholders and leaves unknown ones alone", () => {
    expect(fill("Step {current} of {total}", { current: 2, total: 5 })).toBe("Step 2 of 5");
    expect(fill("Hello {name}")).toBe("Hello {name}");
  });
});

describe("what a field needs, from the rules", () => {
  const app = rules("application").schema;

  it("finds a field's schema, including list items", () => {
    expect(schemaFor(app, "applicant.email")?.format).toBe("email");
    expect(schemaFor(rules("booking").schema, "preferredDates.0")?.format).toBe("date");
    expect(schemaFor(app, "nope.nothing")).toBeUndefined();
  });

  it("marks required fields, and treats a field in an optional object as optional", () => {
    expect(requiredByRules(app, "applicant.name")).toBe(true);
    expect(requiredByRules(app, "applicant.institution")).toBe(false);
    expect(requiredByRules(app, "applicant.iiserbMentor.name")).toBe(false);
    expect(requiredByRules(app, "venture.incorporated")).toBe(true);
    expect(requiredByRules(rules("booking").schema, "preferredDates.0")).toBe(true);
    expect(requiredByRules(rules("booking").schema, "preferredDates.1")).toBe(false);
    expect(requiredByRules(rules("mentor").schema, "types")).toBe(true);
  });

  it("reads the limits an input should carry", () => {
    expect(constraintsFor(app, "venture.problem")).toEqual({ maxLength: 1500 });
    expect(constraintsFor(app, "venture.teamSize")).toEqual({ min: 1, max: 500 });
    expect(constraintsFor(app, "nope")).toEqual({});
  });

  it("makes the mentor required once the applicant is from outside", () => {
    const mentorField = {
      name: "applicant.iiserbMentor.name",
      kind: "text",
      label: "Mentor",
    } as ResolvedField;
    expect(
      requiredNow(rules("application"), mentorField, { "applicant.affiliation": "iiserb-student" }),
    ).toBe(false);
    expect(
      requiredNow(rules("application"), mentorField, { "applicant.affiliation": "external" }),
    ).toBe(true);
  });
});

describe("what is on screen", () => {
  const field = {
    name: "venture.legalEntity",
    kind: "select",
    label: "Entity",
    showWhen: { name: "venture.incorporated", in: ["true"] },
  } as ResolvedField;
  const form = {
    type: "application",
    defaults: {},
    steps: [
      {
        id: "s",
        title: "S",
        fields: [field, { name: "venture.name", kind: "text", label: "Name" }],
      },
    ],
  } as ResolvedForm;

  it("shows a conditional field only while its condition holds", () => {
    expect(isVisible(field, {})).toBe(false);
    expect(isVisible(field, { "venture.incorporated": "false" })).toBe(false);
    expect(isVisible(field, { "venture.incorporated": "true" })).toBe(true);
  });

  it("drops what an answer in a now-hidden field would have sent", () => {
    expect(visibleValues(form, { "venture.legalEntity": "llp", "venture.name": "X" })).toEqual({
      "venture.name": "X",
    });
  });
});

describe("an empty form", () => {
  it("names every missing field when asked to expand objects, and the object once otherwise (as the endpoint does)", () => {
    const empty = {};
    const plain = validate(rules("application"), empty).map((v) => v.path);
    expect(plain).toEqual([
      "applicant",
      "venture",
      "technology",
      "needs",
      "documents",
      "declarations",
    ]);
    const expanded = validate(rules("application"), empty, { expandObjects: true }).map(
      (v) => v.path,
    );
    expect(expanded).toContain("applicant.name");
    expect(expanded).toContain("applicant.phone");
    expect(expanded).toContain("declarations.agreeToPolicy");
    expect(expanded).not.toContain("applicant.iiserbMentor.name"); // an optional object stays optional
    expect(expanded).not.toContain("applicant");
  });

  it("calls an unticked required box 'tick this box', not 'required'", () => {
    const copy = {
      errors: {
        required: "{field} is required.",
        mustAgree: "You need to tick this box to continue.",
      },
    } as unknown as FormCopy;
    const box = {
      name: "declarations.infoAccurate",
      kind: "checkbox",
      label: "I confirm",
    } as ResolvedField;
    expect(messageFor({ path: box.name, code: "required" }, box, copy)).toBe(
      "You need to tick this box to continue.",
    );
  });
});

describe("error wording", () => {
  const copy = {
    errors: {
      required: "{field} is required.",
      tooShort: "{field} needs at least {limit} characters.",
      email: "Enter a valid email address.",
      pattern: "{field} is not in the expected format.",
      phone: "Enter a valid phone number.",
      condition: "{field} is required.",
      conditions: { mentorRequired: "You need a faculty mentor." },
    },
  } as unknown as FormCopy;
  const fields = [
    { name: "name", kind: "text", label: "Your name" },
    { name: "phone", kind: "tel", label: "Phone number" },
    { name: "types", kind: "checkboxes", label: "Kinds" },
  ] as ResolvedField[];

  it("fills the field name and the limit", () => {
    expect(messageFor({ path: "name", code: "required" }, fields[0], copy)).toBe(
      "Your name is required.",
    );
    expect(messageFor({ path: "name", code: "tooShort", limit: 2 }, fields[0], copy)).toBe(
      "Your name needs at least 2 characters.",
    );
  });

  it("gives a phone field its own wording for a pattern failure", () => {
    expect(messageFor({ path: "phone", code: "pattern" }, fields[1], copy)).toBe(
      "Enter a valid phone number.",
    );
  });

  it("uses the page's wording for a cross-field rule, and the endpoint's as a fallback", () => {
    expect(
      messageFor({ path: "x", code: "condition", condition: "mentorRequired" }, undefined, copy),
    ).toBe("You need a faculty mentor.");
    expect(
      messageFor(
        { path: "x", code: "condition", condition: "other", message: "From the endpoint." },
        undefined,
        copy,
      ),
    ).toBe("From the endpoint.");
  });

  it("finds the field for an item path or an object-level path", () => {
    expect(fieldForPath(fields, "types.0")?.name).toBe("types");
    expect(fieldForPath(fields, "name")?.name).toBe("name");
    expect(fieldForPath(fields, "missing")).toBeUndefined();
  });

  it("keeps the first message for a field", () => {
    const errors = errorsByField(
      [
        { path: "name", code: "required" },
        { path: "name", code: "tooShort", limit: 2 },
      ],
      fields,
      copy,
    );
    expect(errors).toEqual({ name: "Your name is required." });
  });
});

describe("the forms on the site", () => {
  it.each(FORM_TYPES.filter((t) => t !== "newsletter"))(
    "%s builds with every word translated",
    (type) => {
      const form = buildForm(type, dynamicOptions);
      expect(form.steps.length).toBeGreaterThan(0);
      for (const field of form.steps.flatMap((s) => s.fields)) {
        expect(field.label.length, field.name).toBeGreaterThan(0);
        expect(field.label, field.name).not.toContain("forms.fields");
      }
    },
  );

  it("only offers fields the schema knows, and every option is a value it accepts", () => {
    for (const type of FORM_TYPES.filter((t) => t !== "newsletter")) {
      const schema = rules(type).schema;
      for (const field of buildForm(type, dynamicOptions).steps.flatMap((s) => s.fields)) {
        const node = schemaFor(schema, field.name);
        expect(node, `${type}: ${field.name}`).toBeDefined();
        const allowed = node?.enum ?? node?.items?.enum;
        if (
          field.options &&
          allowed &&
          !["facilitySlug", "instrumentSlug", "context.schemeSlug", "context.track"].includes(
            field.name,
          )
        ) {
          for (const option of field.options) {
            if (["true", "false"].includes(option.value) && node?.type === "boolean") continue;
            expect(allowed, `${type}: ${field.name} = ${option.value}`).toContain(option.value);
          }
        }
        if (field.options && node?.type === "boolean") {
          expect(field.options.map((o) => o.value).sort()).toEqual(["false", "true"]);
        }
      }
    }
  });

  it("covers every property of each schema, apart from the few left out on purpose", () => {
    const LEFT_OUT = new Set([
      "venture.team",
      "context.opportunitySlug",
      "assistanceSought",
      "sector",
      "affiliation",
      "deckUrl",
      "phone",
    ]);
    const leaves = (node: NonNullable<ReturnType<typeof schemaFor>>, prefix = ""): string[] =>
      node.type === "object"
        ? Object.entries(node.properties ?? {}).flatMap(([key, child]) =>
            leaves(child, prefix ? `${prefix}.${key}` : key),
          )
        : [prefix];
    for (const type of ["contact", "application", "booking", "mentor", "partner"] as const) {
      const fields = new Set(
        buildForm(type, dynamicOptions).steps.flatMap((s) => s.fields.map((f) => f.name)),
      );
      for (const leaf of leaves(rules(type).schema as never)) {
        const covered =
          fields.has(leaf) || (leaf === "preferredDates" && fields.has("preferredDates.0"));
        expect(
          covered || LEFT_OUT.has(leaf) || (type === "partner" && leaf === "phone"),
          `${type}: ${leaf}`,
        ).toBe(true);
      }
    }
  });

  it("builds a payload from the form's own values that the rules accept", () => {
    const values = {
      name: "Asha Verma",
      email: "asha@example.org",
      topic: "incubation",
      message: "I would like to talk about incubating a diagnostics startup.",
    };
    expect(validate(rules("contact"), toPayload(rules("contact").schema, values))).toEqual([]);
  });

  it("starts the contact form on the topic the link chose", () => {
    expect(buildForm("contact", { ...dynamicOptions, topic: "birac-edge" }).defaults).toEqual({
      topic: "birac-edge",
    });
  });

  it("has a channel hint for a topic only when IICE has confirmed that channel", () => {
    const topic = buildForm("contact", dynamicOptions).steps[0]?.fields.find(
      (f) => f.name === "topic",
    );
    expect(topic?.valueHints?.incubation).toContain("iice@iiserb.ac.in");
    expect(topic?.valueHints?.media).toBeUndefined(); // no media channel is confirmed yet
  });

  it("leaves a booking target out when none exists", () => {
    const names = (opts: object) =>
      buildForm("booking", { site, ...opts }).steps.flatMap((s) => s.fields.map((f) => f.name));
    expect(names({})).not.toContain("facilitySlug");
    expect(names({})).not.toContain("instrumentSlug");
    expect(names({ instruments: [{ slug: "nmr", name: "NMR" }] })).toContain("instrumentSlug");
  });

  it("keeps the messages for every form's confirmation, subject and button", () => {
    const forms = en.forms as unknown as Record<string, Record<string, string>>;
    for (const type of FORM_TYPES) {
      for (const key of ["submit", "subject", "successTitle", "successBody"]) {
        expect(forms[type]?.[key], `${type}.${key}`).toBeTypeOf("string");
      }
    }
  });
});
