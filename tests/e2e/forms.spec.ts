import { expect, test } from "@playwright/test";
import {
  ENDPOINT,
  VALID_CONTACT,
  field,
  fillContact,
  liveForm,
  mockEndpoint,
} from "./forms-helpers";

test.describe("contact form", () => {
  test("lists every problem on a failed submit and moves focus to the list", async ({ page }) => {
    await mockEndpoint(page);
    await page.goto("/contact/");
    const form = await liveForm(page, "contact");
    await form.getByRole("button", { name: "Send message" }).click();

    const summary = page.locator(".error-summary");
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();
    await expect(summary.getByRole("heading", { name: "There is a problem" })).toBeVisible();
    // Name, email, topic, message and the consent box: five things to fix.
    await expect(summary.getByRole("link")).toHaveCount(5);
    await expect(field(page, "contact", "name")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#contact-name-error")).toContainText("Your name is required");

    // A summary link takes the visitor to the field.
    await summary.getByRole("link", { name: /Your name is required/ }).click();
    await expect(field(page, "contact", "name")).toBeFocused();
  });

  test("checks a field when the visitor leaves it, and clears the message once it is fixed", async ({
    page,
  }) => {
    await page.goto("/contact/");
    await liveForm(page, "contact");
    const email = field(page, "contact", "email");
    await email.fill("asha@");
    await email.blur();
    await expect(page.locator("#contact-email-error")).toContainText("valid email address");
    await email.fill("asha@example.org");
    await expect(page.locator("#contact-email-error")).toHaveCount(0);
    await expect(email).not.toHaveAttribute("aria-invalid", "true");
  });

  test("sends JSON as text/plain and replaces the form with a confirmation that takes focus", async ({
    page,
  }) => {
    const sent = await mockEndpoint(page, { reply: { ok: true, id: "CON-2026-000042" } });
    await page.goto("/contact/");
    const form = await liveForm(page, "contact");
    await fillContact(page);
    await form.getByRole("button", { name: "Send message" }).click();

    const success = page.locator(".form-success");
    await expect(success).toBeFocused();
    await expect(success).toContainText("Thank you, we have your message");
    await expect(success).toContainText("CON-2026-000042");
    await expect(page.locator("form[data-form='contact']")).toHaveCount(0);

    expect(sent).toHaveLength(1);
    const [request] = sent;
    expect(request?.contentType).toBe("text/plain;charset=utf-8");
    expect(request?.body).toMatchObject({
      formType: "contact",
      schemaVersion: 1,
      consent: true,
      website: "",
      data: VALID_CONTACT,
    });
    expect(request?.body.pageUrl).toMatch(/\/contact\/$/);
    expect(
      Date.parse(request?.body.submittedAt ?? "") - Date.parse(request?.body.startedAt ?? ""),
    ).toBeGreaterThanOrEqual(0);
  });

  test("keeps the honeypot out of sight and out of the tab order, and passes it on if a bot fills it", async ({
    page,
  }) => {
    const sent = await mockEndpoint(page);
    await page.goto("/contact/");
    const form = await liveForm(page, "contact");
    const trap = form.locator("input[name='website']");
    await expect(trap).toHaveAttribute("tabindex", "-1");
    await expect(trap).toHaveAttribute("autocomplete", "off");
    await expect(form.locator(".hp")).toHaveAttribute("aria-hidden", "true");
    await expect(trap).not.toBeInViewport();

    await fillContact(page);
    await trap.fill("http://spam.test");
    await form.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator(".form-success")).toBeVisible();
    expect(sent[0]?.body.website).toBe("http://spam.test"); // the endpoint discards it
  });

  test("shows the endpoint's own field messages next to the fields", async ({ page }) => {
    await mockEndpoint(page, { reply: { ok: false, errors: { email: "That address bounced." } } });
    await page.goto("/contact/");
    const form = await liveForm(page, "contact");
    await fillContact(page);
    await form.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator("#contact-email-error")).toContainText("That address bounced.");
    await expect(page.locator(".error-summary")).toBeFocused();
    await expect(field(page, "contact", "message")).toHaveValue(VALID_CONTACT.message);
  });

  test("keeps what was typed when the network is down, and offers a retry and an email fallback", async ({
    page,
  }) => {
    await mockEndpoint(page, { abort: true });
    await page.goto("/contact/");
    const form = await liveForm(page, "contact");
    await fillContact(page);
    await form.getByRole("button", { name: "Send message" }).click();

    const alert = page.locator(".form-alert");
    await expect(alert).toContainText("We could not send your answers");
    await expect(field(page, "contact", "name")).toHaveValue(VALID_CONTACT.name);
    const mailto = alert.getByRole("link", { name: "Email these answers to IICE" });
    const href = (await mailto.getAttribute("href")) ?? "";
    expect(href.startsWith("mailto:iice@iiserb.ac.in?subject=")).toBe(true);
    expect(decodeURIComponent(href)).toContain("Your name: Asha Verma");
    await expect(form.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("shows a channel hint for a topic that has a direct contact", async ({ page }) => {
    await page.goto("/contact/");
    await liveForm(page, "contact");
    await field(page, "contact", "topic").selectOption("incubation");
    await expect(page.locator(".field__hint--value")).toContainText("iice@iiserb.ac.in");
  });

  test("takes the topic from the link that led here", async ({ page }) => {
    await page.goto("/contact/?topic=event-invite");
    await liveForm(page, "contact");
    await expect(field(page, "contact", "topic")).toHaveValue("event-invite");
  });

  test("is a plain HTML form that posts to the endpoint when script is off", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    await page.goto("/contact/");
    const form = page.locator("form[data-form='contact']");
    await expect(form).toHaveAttribute("method", "post");
    await expect(form).toHaveAttribute("action", ENDPOINT);
    await expect(form).not.toHaveAttribute("novalidate", "");
    // The server markup carries every key the endpoint reads, and native validation for what is required.
    for (const name of [
      "formType",
      "schemaVersion",
      "pageUrl",
      "locale",
      "website",
      "consent",
      "name",
      "email",
      "topic",
      "message",
    ]) {
      await expect(form.locator(`[name='${name}']`).first()).toHaveCount(1);
    }
    await expect(form.locator("input[name='formType']")).toHaveValue("contact");
    await expect(form.locator("#contact-name")).toHaveAttribute("required", "");
    await expect(form.locator("#contact-message")).toHaveAttribute("maxlength", "3000");
    await context.close();
  });
});

test.describe("pitch band on the home page", () => {
  test("sends a pitch from the short form", async ({ page }) => {
    const sent = await mockEndpoint(page, { reply: { ok: true, id: "PIT-2026-000007" } });
    await page.goto("/#pitch");
    const form = await liveForm(page, "pitch");
    await field(page, "pitch", "name").fill("Asha Verma");
    await field(page, "pitch", "email").fill("asha@example.org");
    await field(page, "pitch", "ventureName").fill("Clearcell Diagnostics");
    await field(page, "pitch", "oneLiner").fill(
      "A paper-based test that reads infection markers from a drop of blood.",
    );
    await field(page, "pitch", "stage").selectOption("prototype");
    await page.locator("#pitch-consent").check();
    await form.getByRole("button", { name: "Send pitch" }).click();
    await expect(page.locator(".form-success")).toContainText("Thank you for your pitch");
    expect(sent[0]?.body).toMatchObject({
      formType: "pitch",
      data: { ventureName: "Clearcell Diagnostics", stage: "prototype" },
    });
  });
});
