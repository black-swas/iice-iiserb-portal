/**
 * A copy of /content with the collections the seed leaves empty filled in: funding schemes, tracks, an open call,
 * an upcoming event, news, press, mentors, testimonials, instruments, a bookable facility, jobs, PDFs and enough
 * confirmed startups and figures for every home-page section. The end-to-end tests build the site from it (IICE_CONTENT_DIR),
 * so every page and component is exercised, not just the ones the seed content reaches.
 *
 * Everything here is invented for testing and must never reach a real build: the people, companies and amounts are made up,
 * the addresses are on the reserved `.invalid` domain, and nothing in the repository's own content refers to this file.
 * The dates are far in the future (2099) where an open window or an upcoming event is needed, so the fixtures do not expire.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import sharp from "sharp";

const SEED = path.resolve(import.meta.dirname, "..", "..", "content");
const HOST = "iice-test.invalid";
const SOURCE = "end-to-end test fixture, not real data";

/** The smallest valid PDF: one blank page. Enough for a download link, a size and a content type. */
const PDF = Buffer.from(
  "%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

const svgLogo = (text: string, fill: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 64" role="img"><title>${text}</title>` +
  `<rect width="160" height="64" rx="10" fill="${fill}"/><text x="80" y="38" font-family="sans-serif" font-size="18" ` +
  `font-weight="700" fill="#ffffff" text-anchor="middle">${text}</text></svg>\n`;

async function photo(
  file: string,
  colour: { r: number; g: number; b: number },
  width = 960,
  height = 640,
) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp({ create: { width, height, channels: 3, background: colour } })
    .png()
    .toFile(file);
}

const image = (name: string, alt: string) => ({ src: `media/fixtures/${name}`, alt });
const logo = (name: string, alt: string) => ({ src: `media/fixtures/${name}`, alt });

interface Startup {
  slug: string;
  name: string;
  status: "current" | "graduated" | "pre-startup" | "inactive";
  sector: string;
  stage: "catalyse" | "culture" | "commercialise";
  track: "physical" | "virtual" | null;
  year: number;
  founder: string;
  colour: string;
}

const STARTUPS: Startup[] = [
  {
    slug: "fx-labs-one",
    name: "Fixture Labs One",
    status: "current",
    sector: "healthcare-bioengineering",
    stage: "culture",
    track: "physical",
    year: 2024,
    founder: "Asha Verma",
    colour: "#0b4f63",
  },
  {
    slug: "fx-labs-two",
    name: "Fixture Labs Two",
    status: "current",
    sector: "iot-ai",
    stage: "catalyse",
    track: "virtual",
    year: 2025,
    founder: "Ravi Menon",
    colour: "#8a4b00",
  },
  {
    slug: "fx-labs-three",
    name: "Fixture Labs Three",
    status: "graduated",
    sector: "environment-agriculture",
    stage: "commercialise",
    track: "physical",
    year: 2022,
    founder: "Meera Iyer",
    colour: "#17653a",
  },
  {
    slug: "fx-labs-four",
    name: "Fixture Labs Four",
    status: "graduated",
    sector: "computational-sciences-it",
    stage: "commercialise",
    track: null,
    year: 2023,
    founder: "Kabir Rao",
    colour: "#082f3b",
  },
  {
    slug: "fx-labs-five",
    name: "Fixture Labs Five",
    status: "pre-startup",
    sector: "social-rural-development",
    stage: "catalyse",
    track: "virtual",
    year: 2026,
    founder: "Nisha Patel",
    colour: "#6b3fa0",
  },
  {
    slug: "fx-labs-six",
    name: "Fixture Labs Six",
    status: "inactive",
    sector: "other",
    stage: "culture",
    track: null,
    year: 2021,
    founder: "Omar Sheikh",
    colour: "#b3261e",
  },
];

/** Writes the fixture content into `target` (created, or emptied first). Also writes the media files it refers to. */
export async function writeFullContent(target: string): Promise<{ pdfs: string[] }> {
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(SEED, target, { recursive: true });

  const put = (rel: string, body: string) => {
    const file = path.join(target, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body, "utf8");
  };
  // JSON drops `undefined`, which YAML cannot write, so front matter goes through it first.
  const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  const json = (rel: string, data: unknown) =>
    put(rel, `${JSON.stringify({ _source: SOURCE, ...(data as object) }, null, 2)}\n`);
  const md = (rel: string, data: Record<string, unknown>, body: string) =>
    put(rel, matter.stringify(`\n${body}\n`, plain({ _source: SOURCE, ...data })));
  const edit = (
    rel: string,
    change: (data: Record<string, unknown>) => Record<string, unknown>,
  ) => {
    const file = path.join(target, rel);
    if (rel.endsWith(".json")) {
      const data = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      fs.writeFileSync(file, `${JSON.stringify(change(data), null, 2)}\n`, "utf8");
    } else {
      const parsed = matter(fs.readFileSync(file, "utf8"));
      fs.writeFileSync(file, matter.stringify(parsed.content, plain(change(parsed.data))), "utf8");
    }
  };

  // ── Media ───────────────────────────────────────────────────
  const media = path.join(target, "media", "fixtures");
  await photo(path.join(media, "lab.png"), { r: 40, g: 110, b: 130 });
  await photo(path.join(media, "event.png"), { r: 140, g: 90, b: 30 });
  await photo(path.join(media, "news.png"), { r: 60, g: 120, b: 90 }, 1280, 720);
  await photo(path.join(media, "mentor.png"), { r: 90, g: 60, b: 140 }, 400, 400);
  await photo(path.join(media, "instrument.png"), { r: 70, g: 80, b: 100 });
  for (const s of STARTUPS)
    fs.writeFileSync(
      path.join(media, `${s.slug}.svg`),
      svgLogo(s.name.replace("Fixture ", ""), s.colour),
    );
  fs.writeFileSync(path.join(media, "partner.svg"), svgLogo("Fixture Partner", "#0b4f63"));

  // ── Figures: three confirmed (so the impact strip and page appear) and two counted from the listings ──
  // A singleton: its schema is a strict object, so no `_source` key.
  put(
    "stats.json",
    `${JSON.stringify(
      {
        items: [
          {
            kind: "manual",
            id: "incubation-space",
            label: "Incubation space",
            value: 10000,
            unit: "sqft",
            asOf: "2026-10-12",
            source: "Fixture source",
            order: 1,
          },
          {
            kind: "manual",
            id: "jobs-created",
            label: "Jobs created",
            value: 120,
            plus: true,
            asOf: "2026-09-30",
            source: "Fixture source",
            order: 2,
          },
          {
            kind: "manual",
            id: "funds-raised",
            label: "Funds raised by startups",
            value: 25_000_000,
            unit: "inr",
            asOf: "2026-09-30",
            source: "Fixture source",
            order: 3,
          },
          {
            kind: "derived",
            id: "startups-incubated",
            label: "Startups incubated",
            derive: "startups-total",
            order: 4,
          },
          {
            kind: "derived",
            id: "events-held",
            label: "Events held",
            derive: "events-held",
            order: 5,
          },
        ],
      },
      null,
      2,
    )}
`,
  );

  // ── Startups: every status, six logos (the strip needs four), schemes, founders ──
  for (const s of STARTUPS) {
    md(
      `startups/${s.slug}.md`,
      {
        slug: s.slug,
        name: s.name,
        oneLiner: `${s.name} builds fixture technology for the ${s.sector} thrust area.`,
        logo: logo(`${s.slug}.svg`, `${s.name} logo`),
        sectors: [s.sector],
        stage: s.stage,
        status: s.status,
        track: s.track,
        schemeSlugs: s.status === "current" || s.status === "graduated" ? ["fx-scheme"] : [],
        cohortYear: s.year,
        foundedYear: s.year - 1,
        affiliation: "iiserb-alumni",
        location: { city: "Bhopal", state: "Madhya Pradesh" },
        tags: ["fixture", s.sector],
        founders: [{ name: s.founder, role: "Founder" }],
        website: `https://${s.slug}.${HOST}`,
        featured: true,
        recognitions:
          s.slug === "fx-labs-one"
            ? [{ type: "award", title: "Fixture Innovation Award", year: 2025 }]
            : [],
        story:
          s.slug === "fx-labs-one"
            ? {
                problem: "A fixture problem that needs a long enough description.",
                approach: "A fixture approach to that problem.",
                outcome: "A fixture outcome, confirmed for testing.",
              }
            : undefined,
      },
      `${s.name} is a fixture startup used to test the directory, the startup page and the logo strip.`,
    );
  }

  // ── Funding schemes: one open, one closed ──
  json("funding-schemes/fx-scheme.json", {
    slug: "fx-scheme",
    name: "Fixture Seed Support",
    provider: "Fixture Agency",
    oneLiner: "Seed support for fixture startups, used to test the scheme pages.",
    atAGlance: {
      maxSupport: { min: null, max: 2_500_000, currency: "INR" },
      duration: "Up to 18 months",
      purpose: "Build and test a first prototype.",
      fundingAgency: "Fixture Agency",
      expectedOutput: "A working prototype and a plan for the first customers.",
      whoCanApply: "Teams working from the IISER Bhopal campus.",
    },
    benefits: ["A grant for prototype costs", "Access to IICE mentors"],
    eligibility: [
      "The team has a proof of concept",
      "At least one founder works full time on the venture",
    ],
    coveredUses: ["Materials and consumables", "Prototype fabrication"],
    nonPermittedUses: ["Land and buildings", "Repaying loans"],
    importantPoints: [
      "Only one fixture grant per founder",
      "Intellectual property stays with the team",
    ],
    selectionSteps: [
      { label: "Online application", detail: "Fill in the application form." },
      { label: "Screening", detail: "IICE reads every application." },
      { label: "Pitch", detail: "Shortlisted teams pitch to the committee." },
    ],
    screeningDuration: "about three weeks",
    documentsRequired: ["Business plan", "Details of the technology"],
    window: { opensAt: "2026-01-01T00:00:00+05:30", closesAt: "2099-12-31T23:59:00+05:30" },
    stageSlugs: ["catalyse", "culture"],
    sectorFocus: ["healthcare-bioengineering"],
    cohorts: [
      {
        label: "Cohort 1",
        year: 2025,
        beneficiaries: [
          {
            name: "Fixture Labs One",
            oneLiner: "A fixture diagnostic test for rural clinics.",
            startupSlug: "fx-labs-one",
          },
          { name: "Unlisted Fixture Team", oneLiner: "A fixture team with no startup page." },
        ],
      },
    ],
    howToApply: "Apply through the IICE application form and name this scheme.",
    officialUrl: `https://fixture-agency.${HOST}/scheme`,
    contact: { email: `scheme@${HOST}`, phone: "+91 755 269 2384" },
    faqGroup: "apply",
    lastReviewed: "2026-09-01",
  });
  json("funding-schemes/fx-closed.json", {
    slug: "fx-closed",
    name: "Fixture Bridge Grant",
    provider: "Fixture Agency",
    oneLiner: "A bridge grant that has closed, used to test the closed status.",
    atAGlance: {
      maxSupport: null,
      duration: null,
      purpose: null,
      fundingAgency: null,
      expectedOutput: null,
      whoCanApply: null,
    },
    eligibility: ["Teams that finished a fixture programme"],
    window: { opensAt: "2025-01-01T00:00:00+05:30", closesAt: "2025-06-30T23:59:00+05:30" },
    stageSlugs: ["commercialise"],
  });

  // ── Stages with schemes, flow, outcomes, selection and an FAQ ──
  edit("stages/catalyse.mdx", (d) => ({
    ...d,
    duration: "Six months",
    fundingBand: { min: 100_000, max: 500_000, currency: "INR" },
    schemeSlugs: ["fx-scheme"],
    programFlow: [
      { label: "Onboarding", detail: "Meet the team and set goals." },
      { label: "Workshops", detail: "Short courses on validating an idea." },
      { label: "Demo day", detail: "Show what you built." },
    ],
    outcomes: ["A tested idea", "A plan to move to Culture"],
    selectionSteps: [{ label: "Apply online", detail: "Use the form." }, { label: "Interview" }],
    exitCriteria: ["Proof of concept shown", "A first customer conversation"],
    faqGroup: "apply",
  }));

  // ── Tracks and the open call ──
  json("tracks/physical.json", {
    slug: "physical",
    name: "Physical incubation",
    forWhom: "Teams that work from the IISER Bhopal campus every day.",
    duration: "Up to two years",
    includes: ["A desk in the co-working space", "Lab access on request"],
    terms: "Fixture terms: no fee, no equity.",
    order: 1,
  });
  json("tracks/virtual.json", {
    slug: "virtual",
    name: "Virtual incubation",
    forWhom: "Teams elsewhere who want IICE's mentoring and network.",
    duration: null,
    includes: ["Mentoring by video", "Access to events and workshops"],
    terms: null,
    order: 2,
  });
  json("opportunities/fx-intake.json", {
    slug: "fx-intake",
    title: "Fixture cohort intake",
    kind: "cohort-intake",
    sponsor: "IICE, IISER Bhopal",
    summary:
      "Applications for the fixture cohort are open to teams working in the five thrust areas.",
    eligibilityLine: "Open to all eligible applicants.",
    window: { opensAt: "2026-01-01T00:00:00+05:30", closesAt: "2099-12-31T23:59:00+05:30" },
    applyHref: "/apply/",
    schemeSlug: "fx-scheme",
    headline: true,
  });

  json("opportunities/fx-rolling.json", {
    slug: "fx-rolling",
    title: "Fixture rolling accelerator",
    kind: "accelerator",
    sponsor: "Fixture Agency",
    summary: "A call that accepts applications all year, so it never closes.",
    window: { rolling: true },
    applyHref: "/apply/",
  });
  json("opportunities/fx-past-call.json", {
    slug: "fx-past-call",
    title: "Fixture challenge 2025",
    kind: "challenge",
    sponsor: "IICE, IISER Bhopal",
    summary: "A challenge that closed in 2025, used to test the Past tab.",
    window: { opensAt: "2025-01-01T00:00:00+05:30", closesAt: "2025-03-01T23:59:00+05:30" },
    applyHref: "/apply/",
    eventSlug: "fx-past-recorded",
  });
  json("opportunities/fx-soon.json", {
    slug: "fx-soon",
    title: "Fixture fellowship, opening soon",
    kind: "fellowship",
    sponsor: "Fixture Agency",
    summary: "A call that opens in 2099, so it is always not yet open.",
    window: { opensAt: "2099-06-01T00:00:00+05:30", closesAt: "2099-07-31T23:59:00+05:30" },
    applyHref: "/apply/",
  });

  // ── Events: one upcoming (with registration, agenda, people, results), one past with a recording ──
  md(
    "events/fx-upcoming-workshop.md",
    {
      slug: "fx-upcoming-workshop",
      title: "Fixture Founders Workshop",
      type: "workshop",
      seriesSlug: "the-start-up-studio",
      edition: "Episode 3",
      startsAt: "2099-03-10T10:00:00+05:30",
      endsAt: "2099-03-11T17:00:00+05:30",
      mode: "hybrid",
      venue: {
        name: "IISER Bhopal",
        address: "Bhauri, Bhopal",
        mapUrl: `https://maps.${HOST}/iiserb`,
      },
      summary:
        "A two-day fixture workshop on taking research to market, used to test the event page.",
      people: [
        {
          role: "chief-guest",
          name: "Dr. Fixture Guest",
          designation: "Director",
          organisation: "Fixture Institute",
        },
        {
          role: "speaker",
          name: "Kabir Rao",
          designation: "Founder",
          organisation: "Fixture Labs Four",
          url: `https://fx-labs-four.${HOST}`,
        },
        { role: "moderator", name: "Nisha Patel" },
      ],
      timeline: [
        { date: "2099-01-15", label: "Applications open" },
        { date: "2099-02-15", label: "Applications close" },
        { date: "2099-03-01", label: "Shortlist announced" },
      ],
      agenda: [
        {
          day: 1,
          start: "10:00",
          end: "11:00",
          title: "Opening session",
          room: "Auditorium",
          speakerNames: ["Dr. Fixture Guest"],
        },
        {
          day: 1,
          start: "11:30",
          title: "Panel on commercialisation",
          speakerNames: ["Kabir Rao", "Nisha Patel"],
        },
        { day: 2, start: "10:00", end: "12:00", title: "Pitch practice", room: "Room 2" },
      ],
      results: [],
      facts: [{ label: "Applications received last time", value: 120 }],
      organisers: ["IICE, IISER Bhopal"],
      partnerSlugs: ["dst"],
      sponsor: "Fixture Agency",
      registration: {
        url: `https://forms.${HOST}/register`,
        closesAt: "2099-03-01T23:59:00+05:30",
      },
      cover: image("event.png", "People gathered at a fixture workshop"),
      gallery: [image("lab.png", "A bench in the fixture lab")],
    },
    "A fixture workshop. It is in 2099 so that it is always upcoming.",
  );
  md(
    "events/fx-past-recorded.md",
    {
      slug: "fx-past-recorded",
      title: "Fixture Demo Day",
      type: "competition",
      startsAt: "2025-05-05T10:00:00+05:30",
      endsAt: "2025-05-05T16:00:00+05:30",
      mode: "in-person",
      venue: { name: "IISER Bhopal" },
      summary:
        "A past fixture demo day with winners and a recording, used to test the past-event page.",
      results: [{ award: "Best prototype", name: "Fixture Labs One", startupSlug: "fx-labs-one" }],
      recordingUrl: "https://www.youtube.com/watch?v=abcDEF12345",
    },
    "A fixture demo day that has already happened.",
  );

  // ── News and press ──
  const posts = [
    {
      slug: "fx-news-one",
      title: "Fixture startup wins an award",
      date: "2026-10-01",
      tags: ["awards"],
      cover: true,
    },
    {
      slug: "fx-news-two",
      title: "Fixture workshop announced",
      date: "2026-09-20",
      tags: ["events"],
      cover: false,
    },
    {
      slug: "fx-news-three",
      title: "Fixture coverage of IICE",
      date: "2026-08-15",
      tags: [],
      cover: false,
    },
  ];
  posts.forEach((p, i) =>
    md(
      `news/${p.slug}.md`,
      {
        slug: p.slug,
        title: p.title,
        date: p.date,
        summary: `${p.title}: a short fixture summary for the news list.`,
        ...(p.cover ? { cover: image("news.png", "A fixture award ceremony") } : {}),
        tags: p.tags,
        author: "IICE Team",
        ...(i === 0
          ? { relatedEventSlug: "fx-upcoming-workshop", relatedStartupSlugs: ["fx-labs-one"] }
          : {}),
        ...(i === 2 ? { externalUrl: `https://news.${HOST}/story` } : {}),
      },
      `${p.title}. ${"This is fixture body text, long enough to take a reading time. ".repeat(12)}`,
    ),
  );
  json("press/fx-press-one.json", {
    slug: "fx-press-one",
    title: "Fixture newspaper covers IICE",
    outlet: "The Fixture Times",
    date: "2026-09-10",
    type: "article",
    url: `https://times.${HOST}/iice`,
  });
  json("press/fx-press-two.json", {
    slug: "fx-press-two",
    title: "Fixture channel interviews a founder",
    outlet: "Fixture TV",
    date: "2026-07-01",
    type: "video",
    url: `https://tv.${HOST}/iice`,
    startupSlug: "fx-labs-one",
  });

  // ── People: mentors ──
  for (const [n, name, types] of [
    ["one", "Fixture Mentor One", ["business", "finance"]],
    ["two", "Fixture Mentor Two", ["technical", "ip"]],
  ] as const) {
    json(`people/fx-mentor-${n}.json`, {
      slug: `fx-mentor-${n}`,
      name,
      honorific: "Dr.",
      photo: n === "one" ? image("mentor.png", `Portrait of ${name}`) : undefined,
      links: { linkedin: `https://www.linkedin.com/in/fx-mentor-${n}` },
    });
    json(`mentors/fx-mentor-${n}.json`, {
      slug: `fx-mentor-${n}`,
      personSlug: `fx-mentor-${n}`,
      title: "Partner",
      organisation: "Fixture Advisory",
      types,
      sectors: ["healthcare-bioengineering"],
      location: n === "one" ? "Bhopal" : "Mumbai",
      expertise: ["Fundraising", "Pricing"],
      availability: n === "one" ? "open" : "limited",
    });
  }

  // ── Testimonials: attributed to listed founders, with consent ──
  json("testimonials/fx-testimonial-one.json", {
    slug: "fx-testimonial-one",
    quote:
      "The fixture mentors and the lab access moved our prototype forward by months, and the team was always there to help.",
    name: "Asha Verma",
    role: "Founder",
    startupSlug: "fx-labs-one",
    consent: { given: true, date: "2026-09-01", method: "email" },
  });
  json("testimonials/fx-testimonial-two.json", {
    slug: "fx-testimonial-two",
    quote:
      "Being part of the fixture community gave us introductions to customers that we could not have reached on our own.",
    name: "Meera Iyer",
    role: "Co-founder",
    startupSlug: "fx-labs-three",
    consent: { given: true, date: "2026-09-02", method: "form" },
  });

  // ── Facilities, instruments, documents ──
  edit("facilities/office-space.json", (d) => ({
    ...d,
    facts: {
      areaSqFt: 4000,
      seats: 40,
      privateOffices: 4,
      meetingRooms: 2,
      accessHours: "All day for incubatees",
    },
    bookable: true,
    images: [image("lab.png", "The fixture co-working space")],
  }));
  const instruments = [
    ["fx-nmr", "Fixture NMR Spectrometer", "analytical", "operator-assisted", "available"],
    [
      "fx-microscope",
      "Fixture Confocal Microscope",
      "imaging",
      "self-use-after-training",
      "available",
    ],
    ["fx-sequencer", "Fixture Sequencer", "molecular-biology", "via-cif", "under-maintenance"],
  ] as const;
  instruments.forEach(([slug, name, category, access, status], i) =>
    json(`instruments/${slug}.json`, {
      slug,
      name,
      category,
      make: "Fixture Makers",
      model: `FX-${100 + i}`,
      specs: ["Fixture spec one", "Fixture spec two"],
      useCases: ["Fixture sample analysis"],
      image: i === 0 ? image("instrument.png", "A fixture instrument on a lab bench") : undefined,
      access,
      facilitySlug: "central-instrumentation-facility",
      status,
      rateCard: [
        {
          userCategory: "incubatee",
          rate: 500,
          unit: "hour",
          gstIncluded: false,
          minimumBilling: "1 hour",
        },
        { userCategory: "industry", rate: null, unit: "hour", gstIncluded: true },
      ],
      bookingNotes: "Book at least a week ahead.",
      lastReviewed: "2026-09-01",
    }),
  );
  json("documents/fx-usage-policy.json", {
    slug: "fx-usage-policy",
    title: "Fixture Facility Usage Policy",
    category: "usage-policy",
    date: "2026-08-01",
    version: "2",
    file: "documents/fx-usage-policy.pdf",
    summary: "How the fixture facilities are used.",
  });
  json("documents/fx-policy-old.json", {
    slug: "fx-policy-old",
    title: "Fixture Incubation Policy (old)",
    category: "policy",
    date: "2023-03-01",
    version: "1",
    file: "documents/fx-policy-old.pdf",
    supersededBy: "incubation-policy",
  });

  // ── Partners and jobs ──
  json("partners/fx-partner-one.json", {
    slug: "fx-partner-one",
    name: "Fixture Partner Foundation",
    logo: logo("partner.svg", "Fixture Partner Foundation logo"),
    url: `https://fx-partner.${HOST}`,
    category: "corporate-csr",
    showOnHome: true,
    order: 10,
  });
  md(
    "jobs/fx-job-iice.md",
    {
      slug: "fx-job-iice",
      title: "Fixture Programme Associate",
      track: "work-with-iice",
      type: "full-time",
      location: "IISER Bhopal",
      skills: ["Writing", "Organising"],
      postedAt: "2026-09-01",
      closesAt: "2099-12-31",
      apply: { email: `jobs@${HOST}` },
    },
    "Help run the fixture programme.",
  );
  md(
    "jobs/fx-job-startup.md",
    {
      slug: "fx-job-startup",
      title: "Fixture Research Engineer",
      track: "work-with-startups",
      employerStartupSlug: "fx-labs-one",
      type: "full-time",
      postedAt: "2026-09-05",
      closesAt: "2099-12-31",
      apply: { url: `https://fx-labs-one.${HOST}/jobs` },
    },
    "Build fixture prototypes.",
  );
  md(
    "jobs/fx-job-expired.md",
    {
      slug: "fx-job-expired",
      title: "Fixture Expired Role",
      track: "work-with-iice",
      type: "internship",
      postedAt: "2026-08-01",
      closesAt: "2026-09-15",
      apply: { email: `jobs@${HOST}` },
    },
    "This role closed, so it must not be listed.",
  );

  // ── Committee date ──
  edit("committees/managing.json", (d) => ({ ...d, asOf: "2026-09-01" }));

  // ── Public files the content points at ──
  const pdfs = [
    "by-laws",
    "incubation-policy",
    "pitch-deck-template",
    "business-proposal-format",
    "fx-usage-policy",
    "fx-policy-old",
  ].map((name) => `${name}.pdf`);
  return { pdfs };
}

/** The PDF bytes the fixture documents need in public/documents/. */
export const FIXTURE_PDF = PDF;
