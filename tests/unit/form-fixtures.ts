/** Valid payloads for every form type, and the mistakes people make, shared by the validator and endpoint tests. */
import type { FormType } from "@/content/forms";

type Payload = Record<string, unknown>;

export const VALID: Record<FormType, Payload> = {
  contact: {
    name: "Asha Verma",
    email: "asha@example.org",
    topic: "incubation",
    message: "I would like to talk about incubating a diagnostics startup.",
  },
  pitch: {
    name: "Asha Verma",
    email: "asha@example.org",
    ventureName: "Clearcell Diagnostics",
    oneLiner: "A paper-based test that reads infection markers from a drop of blood.",
    stage: "prototype",
    assistanceSought: ["lab-access", "mentoring"],
  },
  application: {
    applicant: {
      name: "Asha Verma",
      email: "asha@example.org",
      phone: "+91 755 269 2384",
      affiliation: "iiserb-alumni",
    },
    venture: {
      name: "Clearcell Diagnostics",
      incorporated: false,
      sector: "healthcare-bioengineering",
      stage: "prototype",
      problem:
        "Infection markers are measured in a lab, which takes days and needs a trained technician.",
      solution:
        "A paper-based strip that shows the result in minutes and is read by a phone camera.",
      market: "District hospitals and primary health centres across the country.",
      teamSize: 3,
    },
    technology: { ipStatus: "in-preparation", developedAtIiserb: false },
    needs: { preferredStage: "catalyse", officeSeats: 2, labSpace: true },
    documents: { businessPlanUrl: "https://example.org/plan.pdf" },
    declarations: { infoAccurate: true, agreeToPolicy: true },
  },
  mentor: {
    name: "Ravi Menon",
    email: "ravi@example.org",
    title: "Partner",
    organisation: "Menon Advisory",
    types: ["business", "finance"],
    sectors: ["healthcare-bioengineering"],
    expertise: "Early-stage fundraising and pricing for medical devices.",
    engagement: ["one-to-one", "office-hours"],
    hoursPerMonth: 4,
  },
  partner: {
    name: "Meera Iyer",
    designation: "Head, CSR",
    organisation: "Example Industries",
    email: "meera@example.org",
    partnershipType: ["csr", "sponsor-challenge"],
    message: "We would like to sponsor a challenge for rural health technology.",
  },
  booking: {
    name: "Asha Verma",
    email: "asha@example.org",
    phone: "+91 98765 43210",
    organisation: "Clearcell Diagnostics",
    userCategory: "incubatee",
    instrumentSlug: "confocal-microscope",
    preferredDates: ["2026-12-01", "2026-12-02"],
    durationEstimate: "4 hours",
  },
  newsletter: { email: "asha@example.org" },
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export interface Mistake {
  name: string;
  form: FormType;
  /** Returns the mistaken payload. */
  mutate: (payload: Payload) => Payload;
  /** The field paths the validator must name. */
  paths: string[];
  /** Zod reports a cross-field rule on the object, not the field, so the path check is skipped for those. */
  crossField?: boolean;
}

// The tests poke at nested fields by name; typing every payload shape would only hide what each mistake does.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function edit(form: FormType, change: (p: any) => void): (payload: Payload) => Payload {
  return () => {
    const next = clone(VALID[form]);
    change(next);
    return next;
  };
}

export const MISTAKES: Mistake[] = [
  {
    name: "no name",
    form: "contact",
    mutate: edit("contact", (p) => delete p.name),
    paths: ["name"],
  },
  {
    name: "one-letter name",
    form: "contact",
    mutate: edit("contact", (p) => (p.name = "A")),
    paths: ["name"],
  },
  {
    name: "bad email",
    form: "contact",
    mutate: edit("contact", (p) => (p.email = "asha@")),
    paths: ["email"],
  },
  {
    name: "short message",
    form: "contact",
    mutate: edit("contact", (p) => (p.message = "Hello")),
    paths: ["message"],
  },
  {
    name: "unknown topic",
    form: "contact",
    mutate: edit("contact", (p) => (p.topic = "gossip")),
    paths: ["topic"],
  },
  {
    name: "bad phone",
    form: "contact",
    mutate: edit("contact", (p) => (p.phone = "call me")),
    paths: ["phone"],
  },
  {
    name: "too-long message",
    form: "contact",
    mutate: edit("contact", (p) => (p.message = "x".repeat(3001))),
    paths: ["message"],
  },
  {
    name: "unknown stage",
    form: "pitch",
    mutate: edit("pitch", (p) => (p.stage = "dream")),
    paths: ["stage"],
  },
  {
    name: "short one-liner",
    form: "pitch",
    mutate: edit("pitch", (p) => (p.oneLiner = "Too short")),
    paths: ["oneLiner"],
  },
  {
    name: "http deck link",
    form: "pitch",
    mutate: edit("pitch", (p) => (p.deckUrl = "http://example.org/deck")),
    paths: ["deckUrl"],
  },
  {
    name: "unknown assistance",
    form: "pitch",
    mutate: edit("pitch", (p) => (p.assistanceSought = ["pizza"])),
    paths: ["assistanceSought.0"],
  },
  {
    name: "no applicant phone",
    form: "application",
    mutate: edit("application", (p) => delete p.applicant.phone),
    paths: ["applicant.phone"],
  },
  {
    name: "team size as zero",
    form: "application",
    mutate: edit("application", (p) => (p.venture.teamSize = 0)),
    paths: ["venture.teamSize"],
  },
  {
    name: "fractional seats",
    form: "application",
    mutate: edit("application", (p) => (p.needs.officeSeats = 1.5)),
    paths: ["needs.officeSeats"],
  },
  {
    name: "short problem",
    form: "application",
    mutate: edit("application", (p) => (p.venture.problem = "Too short")),
    paths: ["venture.problem"],
  },
  {
    name: "no business plan",
    form: "application",
    mutate: edit("application", (p) => delete p.documents.businessPlanUrl),
    paths: ["documents.businessPlanUrl"],
  },
  {
    name: "declaration unticked",
    form: "application",
    mutate: edit("application", (p) => (p.declarations.agreeToPolicy = false)),
    paths: ["declarations.agreeToPolicy"],
  },
  {
    name: "no declarations",
    form: "application",
    mutate: edit("application", (p) => delete p.declarations),
    paths: ["declarations"],
  },
  {
    name: "external applicant with no mentor",
    form: "application",
    mutate: edit("application", (p) => (p.applicant.affiliation = "external")),
    paths: ["applicant.iiserbMentor.name", "applicant.iiserbMentor.email"],
    crossField: true,
  },
  {
    name: "incorporated with no entity type",
    form: "application",
    mutate: edit("application", (p) => (p.venture.incorporated = true)),
    paths: ["venture.legalEntity"],
    crossField: true,
  },
  {
    name: "patent filed at IISER Bhopal with no link",
    form: "application",
    mutate: edit("application", (p) => {
      p.technology.developedAtIiserb = true;
      p.technology.ipStatus = "filed";
    }),
    paths: ["technology.ipDocsUrl"],
    crossField: true,
  },
  {
    name: "no mentor types",
    form: "mentor",
    mutate: edit("mentor", (p) => (p.types = [])),
    paths: ["types"],
  },
  {
    name: "hours out of range",
    form: "mentor",
    mutate: edit("mentor", (p) => (p.hoursPerMonth = 80)),
    paths: ["hoursPerMonth"],
  },
  {
    name: "no partnership type",
    form: "partner",
    mutate: edit("partner", (p) => delete p.partnershipType),
    paths: ["partnershipType"],
  },
  {
    name: "four dates",
    form: "booking",
    mutate: edit(
      "booking",
      (p) => (p.preferredDates = ["2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04"]),
    ),
    paths: ["preferredDates"],
  },
  {
    name: "impossible date",
    form: "booking",
    mutate: edit("booking", (p) => (p.preferredDates = ["2026-02-30"])),
    paths: ["preferredDates.0"],
  },
  {
    name: "no dates",
    form: "booking",
    mutate: edit("booking", (p) => delete p.preferredDates),
    paths: ["preferredDates"],
  },
  {
    name: "no facility or instrument",
    form: "booking",
    mutate: edit("booking", (p) => delete p.instrumentSlug),
    paths: ["instrumentSlug"],
    crossField: true,
  },
  {
    name: "bad newsletter email",
    form: "newsletter",
    mutate: edit("newsletter", (p) => (p.email = "nope")),
    paths: ["email"],
  },
];
