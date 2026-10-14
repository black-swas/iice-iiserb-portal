import { expect, test } from "@playwright/test";
import { field, liveForm, mockEndpoint } from "../forms-helpers";

test.describe("home page, with everything to show", () => {
  test("numbers every section from 01 and shows confirmed figures, counted from the data where it can", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const eyebrows = await page
      .locator("main header p")
      .evaluateAll((els) =>
        els.map((el) => el.textContent?.trim() ?? "").filter((t) => /^\d{2} \/ /.test(t)),
      );
    expect(eyebrows[0]).toBe("01 / Impact");
    expect(eyebrows.length).toBeGreaterThanOrEqual(7);
    eyebrows.forEach((text, i) =>
      expect(text.startsWith(String(i + 1).padStart(2, "0"))).toBe(true),
    );

    const stat = (id: string) => page.locator(`[data-stat="${id}"]`);
    await expect(stat("incubation-space")).toHaveText("10,000 sq ft");
    await expect(stat("jobs-created")).toHaveText("120+");
    await expect(stat("funds-raised")).toHaveText("₹2.5 crore");
    await expect(stat("startups-incubated")).toHaveText("4"); // current plus graduated, from the listings
    await expect(page.getByRole("link", { name: "See all numbers" })).toHaveAttribute(
      "href",
      "/about/impact/",
    );
  });

  test("leads 'What's happening' with the open call, the next event with a calendar link, and the latest news", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const call = page.locator(".open-call");
    await expect(call).toContainText("Fixture cohort intake");
    await expect(call).toContainText("Open · closes 31 Dec 2099");
    await expect(
      call.getByRole("link", { name: "Apply for Fixture cohort intake" }),
    ).toHaveAttribute("href", "/apply/");

    await expect(page.getByRole("heading", { level: 3, name: "Upcoming events" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Fixture Founders Workshop · Episode 3" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Add Fixture Founders Workshop to your calendar" }),
    ).toHaveAttribute("href", "/events/fx-upcoming-workshop.ics");
    await expect(page.getByRole("heading", { level: 3, name: "Latest news" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Fixture startup wins an award" })).toBeVisible();
  });

  test("shows the logo strip, the testimonials and the partners", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const strip = page.locator(".logo-strip");
    await expect(strip.getByRole("link")).toHaveCount(7); // six startups and "View all startups"
    await expect(strip.getByRole("link", { name: "Fixture Labs One" })).toHaveAttribute(
      "href",
      "/startups/fx-labs-one/",
    );
    await expect(strip.getByRole("button", { name: "Show more startups" })).toBeVisible();

    const testimonials = page.locator(".testimonial");
    await expect(testimonials).toHaveCount(2);
    await expect(testimonials.first()).toContainText("Asha Verma");
    await expect(page.getByRole("button", { name: "Show the next testimonial" })).toBeVisible();

    await expect(page.getByRole("heading", { level: 3, name: "Ecosystem partners" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Fixture Partner Foundation/ })).toBeVisible();
  });

  test("links the pitch-deck template once its file exists, and sends a pitch", async ({
    page,
  }) => {
    const sent = await mockEndpoint(page);
    await page.goto("/#pitch");
    await expect(
      page.getByRole("link", { name: "Download the pitch-deck template" }),
    ).toHaveAttribute("href", "/documents/pitch-deck-template.pdf");
    await liveForm(page, "pitch");
    expect(sent).toHaveLength(0);
  });
});

test.describe("funding schemes", () => {
  test("lists each scheme with its live status", async ({ page }) => {
    await page.goto("/incubation/funding/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("link", { name: "Fixture Seed Support" })).toHaveAttribute(
      "href",
      "/incubation/funding/fx-scheme/",
    );
    await expect(page.locator(".badge", { hasText: "Open · closes 31 Dec 2099" })).toBeVisible();
    await expect(page.locator(".badge", { hasText: "Closed" })).toBeVisible();
    await expect(page.getByText("Up to ₹25 lakh")).toBeVisible();
  });

  test("shows a scheme from at-a-glance to contact, with amounts from the data", async ({
    page,
  }) => {
    await page.goto("/incubation/funding/fx-scheme/");
    await page.waitForLoadState("networkidle");
    const glance = page.getByRole("region", { name: "At a glance" });
    await expect(glance.getByRole("rowheader", { name: "Maximum support" })).toBeVisible();
    await expect(glance.getByRole("cell", { name: "Up to ₹25 lakh" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "What it covers" })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 3, name: "What it does not cover" }),
    ).toBeVisible();
    await expect(page.getByText("Screening usually takes about three weeks.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Apply for this scheme" })).toHaveAttribute(
      "href",
      "/apply/?scheme=fx-scheme",
    );
    await expect(page.getByText("Last reviewed 1 Sep 2026")).toBeVisible();
    await expect(page.getByRole("link", { name: "scheme@iice-test.invalid" })).toHaveAttribute(
      "href",
      "mailto:scheme@iice-test.invalid",
    );
  });

  test("links a beneficiary to its startup page only when it has one", async ({ page }) => {
    await page.goto("/incubation/funding/fx-scheme/");
    await page.getByText("Cohort 1").click();
    await expect(page.getByRole("link", { name: "Fixture Labs One" })).toHaveAttribute(
      "href",
      "/startups/fx-labs-one/",
    );
    await expect(page.getByText("Unlisted Fixture Team")).toBeVisible();
    await expect(page.getByRole("link", { name: "Unlisted Fixture Team" })).toHaveCount(0);
  });

  test("says 'To be confirmed' for what a scheme has not stated, and 'Closed' once it has closed", async ({
    page,
  }) => {
    await page.goto("/incubation/funding/fx-closed/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("To be confirmed")).toHaveCount(6);
    await expect(page.getByText("Closed", { exact: true })).toBeVisible();
  });

  test("passes the scheme and the tracks to the application form", async ({ page }) => {
    await page.goto("/apply/?scheme=fx-scheme&track=virtual");
    await liveForm(page, "application");
    await expect(field(page, "application", "context.schemeSlug")).toHaveValue("fx-scheme");
    await expect(field(page, "application", "context.track")).toHaveValue("virtual");
    await expect(field(page, "application", "context.track").locator("option")).toHaveText([
      "Choose an option",
      "Physical incubation",
      "Virtual incubation",
    ]);
  });
});

test.describe("incubation pages", () => {
  test("show the tracks, each with an Apply link that names it", async ({ page }) => {
    await page.goto("/incubation/");
    const tracks = page.locator("#tracks");
    await expect(tracks.getByRole("heading", { level: 3 })).toHaveText([
      "Physical incubation",
      "Virtual incubation",
    ]);
    await expect(
      tracks.getByRole("link", { name: "Apply for Physical incubation" }),
    ).toHaveAttribute("href", "/apply/?track=physical");
    await expect(tracks.getByText("To be confirmed")).toHaveCount(1); // the virtual track's terms are not stated
  });

  test("show a stage in full: facts, funding band from the data, flow, outcomes, schemes, selection, FAQ", async ({
    page,
  }) => {
    await page.goto("/incubation/catalyse/");
    await expect(page.getByText("Six months")).toBeVisible();
    await expect(page.getByText("₹1–5 lakh")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Workshops" })).toBeVisible(); // programme flow
    await expect(page.getByRole("heading", { level: 2, name: "Outcomes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Fixture Seed Support" })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "How selection works" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Milestones to graduate" }),
    ).toBeVisible();
    const question = page.getByText("Who can apply to IICE?");
    await question.click();
    await expect(
      page.getByText("Current and former faculty of IISER Bhopal").first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Next stage: Culture" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Previous stage/ })).toHaveCount(0);
  });
});

test.describe("facilities and booking", () => {
  test("show confirmed facts and a booking form for what can be booked", async ({ page }) => {
    await page.goto("/incubation/facilities/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("[data-stat='incubation-space']")).toHaveText("10,000 sq ft");
    const card = page.locator("article.card", { hasText: "Office Space" });
    await expect(card).toContainText("4,000 sq ft");
    await expect(card).toContainText("40");
    await expect(page.locator("#booking")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Download the Fixture Facility Usage Policy (PDF)" }),
    ).toHaveAttribute("href", "/documents/fx-usage-policy.pdf");
  });

  test("asks for a facility or an instrument, then sends the request", async ({ page }) => {
    const sent = await mockEndpoint(page, { reply: { ok: true, id: "BKG-2026-000009" } });
    await page.goto("/incubation/facilities/");
    const form = await liveForm(page, "booking");
    await field(page, "booking", "name").fill("Asha Verma");
    await field(page, "booking", "email").fill("asha@iice-test.invalid");
    await field(page, "booking", "phone").fill("+91 98765 43210");
    await field(page, "booking", "organisation").fill("Fixture Labs One");
    await field(page, "booking", "userCategory").selectOption("incubatee");
    await field(page, "booking", "preferredDates.0").fill("2099-04-01");
    await field(page, "booking", "durationEstimate").fill("4 hours");
    await page.locator("#booking-consent").check();
    await form.getByRole("button", { name: "Request booking" }).click();
    await expect(page.locator("#booking-instrumentSlug-error")).toContainText(
      "Choose a facility or an instrument.",
    );

    await field(page, "booking", "instrumentSlug").selectOption("fx-nmr");
    await form.getByRole("button", { name: "Request booking" }).click();
    await expect(page.locator(".form-success")).toContainText("BKG-2026-000009");
    expect(sent[0]?.body.data).toMatchObject({
      instrumentSlug: "fx-nmr",
      userCategory: "incubatee",
      preferredDates: ["2099-04-01"],
      durationEstimate: "4 hours",
    });
  });
});

test.describe("instruments", () => {
  test("filter by category with counts, and keep the filter in the address", async ({ page }) => {
    await page.goto("/incubation/facilities/instruments/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("status")).toContainText("3 of 3 shown");
    await page.getByRole("button", { name: /^Analytical \(1\)/ }).click();
    await expect(page.getByRole("status")).toContainText("1 of 3 shown");
    expect(page.url()).toContain("category=analytical");
    await expect(
      page.getByRole("heading", { level: 3, name: "Fixture NMR Spectrometer" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByRole("status")).toContainText("3 of 3 shown");
  });

  test("show a rate card with the rates that are published and 'On request' for the rest", async ({
    page,
  }) => {
    await page.goto("/incubation/facilities/instruments/");
    await page.waitForLoadState("networkidle");
    const card = page.locator("li.instrument-card", { hasText: "Fixture NMR Spectrometer" });
    await expect(card.getByText("Operator-assisted")).toBeVisible();
    await card.getByText("Rate card").click();
    const table = card.getByRole("table", { name: "Rates for Fixture NMR Spectrometer" });
    await expect(table.getByRole("row", { name: /Incubatee/ })).toContainText(
      "₹500 per hour plus GST · minimum 1 hour",
    );
    await expect(table.getByRole("row", { name: /Industry/ })).toContainText("On request");
    await expect(
      card.getByRole("link", { name: "Request booking for Fixture NMR Spectrometer" }),
    ).toHaveAttribute("href", "/incubation/facilities/#booking");
  });

  test("mark an instrument that is under maintenance", async ({ page }) => {
    await page.goto("/incubation/facilities/instruments/");
    await expect(
      page
        .locator("li.instrument-card", { hasText: "Fixture Sequencer" })
        .getByText("Under maintenance"),
    ).toBeVisible();
  });
});

test.describe("documents", () => {
  test("list downloads with the file type and size in each link's name", async ({ page }) => {
    await page.goto("/documents/");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("link", { name: /Download IICE By-Laws, PDF, \d+ KB/ }),
    ).toHaveAttribute("href", "/documents/by-laws.pdf");
    await expect(
      page.getByRole("link", { name: /Download Fixture Facility Usage Policy v2, PDF/ }),
    ).toBeVisible();
    // The old policy is a previous version, tucked under its own heading.
    await expect(page.getByText("Previous versions (1)")).toBeVisible();
    await expect(page.getByRole("row", { name: /Fixture Incubation Policy \(old\)/ })).toBeHidden();
    await page.getByText("Previous versions (1)").click();
    await expect(
      page.getByRole("row", { name: /Fixture Incubation Policy \(old\)/ }),
    ).toBeVisible();
  });

  test("filter by category, search, and sort", async ({ page }) => {
    await page.goto("/documents/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /^Usage policy/ }).click();
    await expect(page.getByRole("status")).toContainText("1 of ");
    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.getByLabel("Search documents").fill("by-laws");
    await expect(page.getByRole("status")).toContainText("1 of ");
    await page.getByLabel("Search documents").fill("");
    await page.getByLabel("Sort by").selectOption("title");
    const titles = await page.locator("tbody th").first().innerText();
    expect(titles.length).toBeGreaterThan(0);
  });

  test("serve the PDFs", async ({ request }) => {
    const response = await request.get("/documents/by-laws.pdf");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("pdf");
  });
});
