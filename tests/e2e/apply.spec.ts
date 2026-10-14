import { expect, test, type Page } from "@playwright/test";
import { ENDPOINT, field, liveForm, mockEndpoint } from "./forms-helpers";

const f = (page: Page, name: string) => field(page, "application", name);
const next = (page: Page) => page.getByRole("button", { name: "Next step" });

async function stepOne(page: Page) {
  await f(page, "applicant.name").fill("Asha Verma");
  await f(page, "applicant.email").fill("asha@example.org");
  await f(page, "applicant.phone").fill("+91 98765 43210");
  await f(page, "applicant.affiliation").selectOption("iiserb-alumni");
}

async function stepTwo(page: Page) {
  await f(page, "venture.name").fill("Clearcell Diagnostics");
  await f(page, "venture.incorporated").getByLabel("No", { exact: true }).check();
  await f(page, "venture.sector").selectOption("healthcare-bioengineering");
  await f(page, "venture.stage").selectOption("prototype");
  await f(page, "venture.problem").fill(
    "Infection markers are measured in a lab, which takes days and needs a trained technician.",
  );
  await f(page, "venture.solution").fill(
    "A paper-based strip that shows the result in minutes and is read by a phone camera.",
  );
  await f(page, "venture.market").fill(
    "District hospitals and primary health centres across the country.",
  );
  await f(page, "venture.teamSize").fill("3");
}

async function stepThree(page: Page) {
  await f(page, "technology.ipStatus").selectOption("in-preparation");
  await f(page, "technology.developedAtIiserb").getByLabel("No", { exact: true }).check();
  await f(page, "documents.businessPlanUrl").fill("https://docs.iice-test.invalid/plan.pdf");
}

async function stepFour(page: Page) {
  await f(page, "needs.preferredStage").selectOption("catalyse");
  await f(page, "needs.officeSeats").fill("2");
  await f(page, "needs.labSpace").getByLabel("Yes", { exact: true }).check();
  await f(page, "needs.mentoringAreas").getByLabel("Technical").check();
}

test.describe("application form", () => {
  test("takes the stage from the link and shows one step at a time", async ({ page }) => {
    await page.goto("/apply/?stage=culture");
    const form = await liveForm(page, "application");
    await expect(f(page, "context.stage")).toHaveValue("culture");
    await expect(form.getByText("Step 1 of 5")).toBeVisible();
    await expect(form.getByRole("heading", { name: "About you" })).toBeVisible();
    await expect(form.getByRole("heading", { name: "Your venture" })).toBeHidden();
    await expect(form.getByRole("button", { name: "Submit application" })).toHaveCount(0);
    await expect(form.getByRole("listitem").filter({ hasText: "About you" })).toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  test("will not leave a step with problems, and says what they are", async ({ page }) => {
    await page.goto("/apply/");
    await liveForm(page, "application");
    await next(page).click();
    const summary = page.locator(".error-summary");
    await expect(summary).toBeFocused();
    await expect(summary.getByRole("link")).toHaveCount(4); // name, email, phone, connection to IISER Bhopal
    await expect(page.getByText("Step 1 of 5")).toBeVisible();
  });

  test("asks outside applicants for a faculty mentor, and only them", async ({ page }) => {
    await page.goto("/apply/");
    await liveForm(page, "application");
    await expect(f(page, "applicant.iiserbMentor.name")).toBeHidden();
    await f(page, "applicant.affiliation").selectOption("external");
    await expect(f(page, "applicant.iiserbMentor.name")).toBeVisible();
    await expect(
      page.locator("label[for='application-applicant-iiserbMentor-name']"),
    ).toContainText("(required)");
    await f(page, "applicant.affiliation").selectOption("iiserb-student");
    await expect(f(page, "applicant.iiserbMentor.name")).toBeHidden();
  });

  test("shows the legal entity only for an incorporated venture", async ({ page }) => {
    await page.goto("/apply/");
    await liveForm(page, "application");
    await stepOne(page);
    await next(page).click();
    await expect(f(page, "venture.legalEntity")).toBeHidden();
    await f(page, "venture.incorporated").getByLabel("Yes", { exact: true }).check();
    await expect(f(page, "venture.legalEntity")).toBeVisible();
  });

  test("keeps a draft on this device, restores it, and clears it on request", async ({ page }) => {
    await page.goto("/apply/");
    await liveForm(page, "application");
    await f(page, "applicant.name").fill("Asha Verma");
    await f(page, "applicant.email").fill("asha@example.org");
    await expect(page.getByText("Draft saved on this device.")).toBeVisible();
    const stored = await page.evaluate(() => window.localStorage.getItem("iice:apply:draft:v1"));
    expect(JSON.parse(stored ?? "{}")).toMatchObject({
      v: 1,
      values: { "applicant.name": "Asha Verma" },
    });
    // Declarations and consent are never saved: a box is ticked afresh each time.
    expect(stored).not.toContain("declarations");

    await page.reload();
    await liveForm(page, "application");
    await expect(f(page, "applicant.name")).toHaveValue("Asha Verma");
    await expect(page.getByText("We restored the draft you saved on this device.")).toBeVisible();

    await page.getByRole("button", { name: "Clear the draft" }).click();
    await expect(f(page, "applicant.name")).toHaveValue("");
    expect(
      await page.evaluate(() => window.localStorage.getItem("iice:apply:draft:v1")),
    ).toBeNull();
  });

  test("goes through five steps, shows a review, and sends the full application", async ({
    page,
  }) => {
    const sent = await mockEndpoint(page, { reply: { ok: true, id: "APP-2026-000123" } });
    await page.goto("/apply/?stage=catalyse");
    const form = await liveForm(page, "application");

    await stepOne(page);
    await next(page).click();
    await expect(form.getByRole("heading", { name: "Your venture" })).toBeFocused();
    await stepTwo(page);
    await next(page).click();
    await stepThree(page);
    await next(page).click();
    await stepFour(page);
    await next(page).click();

    await expect(form.getByText("Step 5 of 5")).toBeVisible();
    const review = form.locator(".review");
    await expect(review).toContainText("Asha Verma");
    await expect(review).toContainText("Clearcell Diagnostics");
    await expect(review).toContainText("Healthcare & Bioengineering"); // option labels, not raw values
    await expect(review).not.toContainText("healthcare-bioengineering");

    // Declarations and consent are required, and the review lets the applicant go back and change an answer.
    await form.getByRole("button", { name: "Submit application" }).click();
    await expect(page.locator(".error-summary").getByRole("link")).toHaveCount(3);
    await f(page, "declarations.infoAccurate").check();
    await f(page, "declarations.agreeToPolicy").check();
    await page.locator("#application-consent").check();
    await form.getByRole("button", { name: "Submit application" }).click();

    await expect(page.locator(".form-success")).toContainText("APP-2026-000123");
    expect(sent).toHaveLength(1);
    expect(sent[0]?.body.formType).toBe("application");
    expect(sent[0]?.body.data).toMatchObject({
      context: { stage: "catalyse" },
      applicant: { name: "Asha Verma", affiliation: "iiserb-alumni" },
      venture: { incorporated: false, teamSize: 3, sector: "healthcare-bioengineering" },
      technology: { ipStatus: "in-preparation", developedAtIiserb: false },
      needs: {
        preferredStage: "catalyse",
        officeSeats: 2,
        labSpace: true,
        mentoringAreas: ["technical"],
      },
      documents: { businessPlanUrl: "https://docs.iice-test.invalid/plan.pdf" },
      declarations: { infoAccurate: true, agreeToPolicy: true },
    });
    // The draft is gone once the application is in.
    expect(
      await page.evaluate(() => window.localStorage.getItem("iice:apply:draft:v1")),
    ).toBeNull();
  });

  test("lets the applicant change an answer from the review", async ({ page }) => {
    await page.goto("/apply/");
    const form = await liveForm(page, "application");
    await stepOne(page);
    await next(page).click();
    await stepTwo(page);
    await next(page).click();
    await stepThree(page);
    await next(page).click();
    await stepFour(page);
    await next(page).click();
    await form.getByRole("button", { name: /Change\s*About you/ }).click();
    await expect(form.getByRole("heading", { name: "About you" })).toBeFocused();
    await expect(f(page, "applicant.name")).toHaveValue("Asha Verma");
  });

  test("works as one long plain form with every step visible when script is off", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    await page.goto("/apply/");
    const form = page.locator("form[data-form='application']");
    await expect(form).toHaveAttribute("action", ENDPOINT);
    for (const title of [
      "About you",
      "Your venture",
      "Technology and IP",
      "What you need",
      "Review and submit",
    ]) {
      await expect(form.locator(".form-step__title", { hasText: title })).toBeVisible();
    }
    // The review is built from what script holds, so it is not shown without script.
    await expect(form.locator(".review")).toBeHidden();
    await expect(form.getByRole("button", { name: "Submit application" })).toBeVisible();
    await expect(form.getByRole("button", { name: "Next step" })).toHaveCount(0);
    // The conditional mentor fields are on the page too, since without script nothing could reveal them.
    await expect(form.locator("#application-applicant-iiserbMentor-name")).toBeVisible();
    await context.close();
  });
});

test.describe("eligibility check", () => {
  test("says what applies, and never blocks", async ({ page }) => {
    await page.goto("/apply/");
    await page.waitForLoadState("networkidle");
    const outcome = page.locator(".eligibility-check .callout");
    await expect(outcome).toContainText("Answer the three questions");
    const check = page.locator(".eligibility-check");
    await check.getByLabel("A founder from outside IISER Bhopal").check();
    await check
      .getByRole("group", { name: /faculty mentor or collaborator/ })
      .getByLabel("No", { exact: true })
      .check();
    await check
      .getByRole("group", { name: /technology-based/ })
      .getByLabel("Yes", { exact: true })
      .check();
    await expect(outcome).toContainText("You can apply, with a faculty mentor");
    await check
      .getByRole("group", { name: /faculty mentor or collaborator/ })
      .getByLabel("Yes", { exact: true })
      .check();
    await expect(outcome).toContainText("You can apply");
    await expect(outcome).not.toContainText("with a faculty mentor");
    await check
      .getByRole("group", { name: /technology-based/ })
      .getByLabel("No", { exact: true })
      .check();
    await expect(outcome).toContainText("Check the fit first");
    // Whatever it says, the form is still there.
    await expect(page.locator("form[data-form='application']")).toBeVisible();
  });
});
