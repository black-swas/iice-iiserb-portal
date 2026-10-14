import { expect, type Page } from "@playwright/test";

/** The address the preview build posts to (scripts/e2e.ts). It is on the reserved .invalid domain: nothing ever answers it. */
export const ENDPOINT = "https://forms.iice-test.invalid/exec";

export interface Captured {
  contentType: string | undefined;
  body: {
    formType: string;
    schemaVersion: number;
    submittedAt: string;
    startedAt: string;
    pageUrl: string;
    website: string;
    consent: boolean;
    data: Record<string, unknown>;
  };
}

/**
 * Answers the form endpoint inside the browser, and records what was sent. `reply` is the JSON the endpoint sends back;
 * `abort` simulates the network being down.
 */
export async function mockEndpoint(
  page: Page,
  options: { reply?: unknown; abort?: boolean } = {},
): Promise<Captured[]> {
  const captured: Captured[] = [];
  await page.route(ENDPOINT, async (route) => {
    const request = route.request();
    if (options.abort) return route.abort("failed");
    captured.push({
      contentType: request.headers()["content-type"],
      body: JSON.parse(request.postData() ?? "{}") as Captured["body"],
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(options.reply ?? { ok: true, id: "TST-2026-000001" }),
    });
  });
  return captured;
}

/** Waits until the form has hydrated: from then on it validates and posts through script. */
export async function liveForm(page: Page, type: string) {
  const form = page.locator(`form[data-form="${type}"]`);
  await expect(form).toHaveAttribute("novalidate", "");
  return form;
}

/** The id the engine gives a field: `applicant.email` in the `application` form is `application-applicant-email`. */
export const field = (page: Page, form: string, name: string) =>
  page.locator(`#${form}-${name.replace(/\./g, "-")}`);

export const VALID_CONTACT = {
  name: "Asha Verma",
  email: "asha@example.org",
  topic: "incubation",
  message: "I would like to talk about incubating a diagnostics startup.",
};

/** Fills the contact form with valid answers (and ticks consent), without sending it. */
export async function fillContact(page: Page, values = VALID_CONTACT) {
  await field(page, "contact", "name").fill(values.name);
  await field(page, "contact", "email").fill(values.email);
  await field(page, "contact", "topic").selectOption(values.topic);
  await field(page, "contact", "message").fill(values.message);
  await page.locator("#contact-consent").check();
}
