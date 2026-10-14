import { expect, test } from "@playwright/test";
import { field, liveForm, mockEndpoint } from "../forms-helpers";

test.describe("mentors and partners", () => {
  test("list mentors with filters, one LinkedIn link each and an availability badge", async ({
    page,
  }) => {
    await page.goto("/about/mentors/");
    await page.waitForLoadState("networkidle");
    const cards = page.locator("li.mentor-card");
    await expect(cards).toHaveCount(2);
    await expect(cards.first().getByRole("link")).toHaveCount(1);
    await expect(
      page.getByRole("link", { name: "Dr. Fixture Mentor One on LinkedIn" }),
    ).toBeVisible();
    await expect(page.getByText("Limited availability")).toBeVisible();

    await page.getByRole("button", { name: /^Business \(1\)/ }).click();
    await expect(page.getByRole("status")).toContainText("1 of 2 shown");
    await expect(
      page.getByRole("heading", { level: 3, name: "Dr. Fixture Mentor One" }),
    ).toBeVisible();
    expect(page.url()).toContain("type=business");
  });

  test("take a mentor offer", async ({ page }) => {
    const sent = await mockEndpoint(page, { reply: { ok: true, id: "MEN-2026-000003" } });
    await page.goto("/about/mentors/#become-a-mentor");
    const form = await liveForm(page, "mentor");
    await field(page, "mentor", "name").fill("Ravi Menon");
    await field(page, "mentor", "email").fill("ravi@iice-test.invalid");
    await field(page, "mentor", "title").fill("Partner");
    await field(page, "mentor", "organisation").fill("Fixture Advisory");
    await field(page, "mentor", "types").getByLabel("Business").check();
    await field(page, "mentor", "sectors").getByLabel("Healthcare & Bioengineering").check();
    await field(page, "mentor", "expertise").fill(
      "Early-stage fundraising and pricing for medical devices.",
    );
    await field(page, "mentor", "engagement").getByLabel("Office hours").check();
    await field(page, "mentor", "hoursPerMonth").fill("4");
    await page.locator("#mentor-consent").check();
    await form.getByRole("button", { name: "Offer to mentor" }).click();
    await expect(page.locator(".form-success")).toContainText("MEN-2026-000003");
    expect(sent[0]?.body.data).toMatchObject({
      types: ["business"],
      engagement: ["office-hours"],
      hoursPerMonth: 4,
    });
  });

  test("group partners by type and take a partnership enquiry", async ({ page }) => {
    const sent = await mockEndpoint(page, { reply: { ok: true, id: "PAR-2026-000001" } });
    await page.goto("/about/partners/");
    const form = await liveForm(page, "partner");
    await expect(page.getByRole("heading", { level: 2, name: "Corporate & CSR" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Fixture Partner Foundation/ })).toBeVisible();
    await field(page, "partner", "name").fill("Meera Iyer");
    await field(page, "partner", "designation").fill("Head, CSR");
    await field(page, "partner", "organisation").fill("Fixture Industries");
    await field(page, "partner", "email").fill("meera@iice-test.invalid");
    await field(page, "partner", "partnershipType").getByLabel("Sponsor a challenge").check();
    await field(page, "partner", "message").fill(
      "We would like to sponsor a challenge for rural health technology.",
    );
    await page.locator("#partner-consent").check();
    await form.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.locator(".form-success")).toContainText("PAR-2026-000001");
    expect(sent[0]?.body.data).toMatchObject({ partnershipType: ["sponsor-challenge"] });
  });
});

test.describe("news and press", () => {
  test("list posts newest first", async ({ page }) => {
    await page.goto("/news/");
    const titles = await page.locator("li article h2").allInnerTexts();
    expect(titles).toEqual([
      "Fixture startup wins an award",
      "Fixture workshop announced",
      "Fixture coverage of IICE",
    ]);
  });

  test("show a post with its reading time, related links, share link and neighbours", async ({
    page,
  }) => {
    await page.goto("/news/fx-news-two/");
    await expect(page.getByText(/\d+ min read/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Newer: Fixture startup wins an award" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Older: Fixture coverage of IICE" })).toBeVisible();
    const share = page.getByRole("link", { name: "Share by email" });
    expect(await share.getAttribute("href")).toMatch(
      /^mailto:\?subject=Fixture%20workshop%20announced&body=https%3A%2F%2F/,
    );
    const types = (await page.locator("script[type='application/ld+json']").allTextContents()).map(
      (t) => (JSON.parse(t) as { "@type": string })["@type"],
    );
    expect(types).toContain("NewsArticle");
  });

  test("link a post to its event and startup, and a press post to the original", async ({
    page,
  }) => {
    await page.goto("/news/fx-news-one/");
    const related = page.getByRole("complementary", { name: "Related" });
    await expect(related.getByRole("link", { name: "Fixture Founders Workshop" })).toHaveAttribute(
      "href",
      "/events/fx-upcoming-workshop/",
    );
    await expect(related.getByRole("link", { name: "Fixture Labs One" })).toHaveAttribute(
      "href",
      "/startups/fx-labs-one/",
    );
    await page.goto("/news/fx-news-three/");
    await expect(page.getByRole("link", { name: "Read the original" })).toHaveAttribute(
      "target",
      "_blank",
    );
  });

  test("publish a feed that is linked from the page head and the footer", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    await expect(page.locator("link[rel='alternate'][type='application/rss+xml']")).toHaveAttribute(
      "href",
      "https://iice.iiserb.ac.in/news/rss.xml", // the layout's metadataBase makes it absolute
    );
    await expect(page.getByRole("link", { name: "News feed (RSS)" })).toBeVisible();
    const feed = await (await request.get("/news/rss.xml")).text();
    expect(feed.match(/<item>/g)).toHaveLength(3);
    expect(feed).toContain("<link>https://iice.iiserb.ac.in/news/fx-news-one/</link>");
  });

  test("list press coverage with its type", async ({ page }) => {
    await page.goto("/about/in-the-news/");
    const items = page.locator(".press-list__item");
    await expect(items).toHaveCount(2);
    await expect(items.first()).toContainText("Article");
    await expect(items.last()).toContainText("Video");
    await expect(page.getByRole("link", { name: "Fixture newspaper covers IICE" })).toHaveAttribute(
      "target",
      "_blank",
    );
  });
});

test.describe("careers", () => {
  test("list open jobs under the right tab, and leave out one that has closed", async ({
    page,
  }) => {
    await page.goto("/careers/");
    await page.waitForLoadState("networkidle");
    const iice = page.getByRole("tabpanel", { name: "Work with IICE" });
    await expect(
      iice.getByRole("heading", { level: 3, name: "Fixture Programme Associate" }),
    ).toBeVisible();
    await expect(iice.getByText("Closes 31 Dec 2099")).toBeVisible();
    await expect(
      iice.getByRole("link", { name: "Apply for Fixture Programme Associate by email" }),
    ).toHaveAttribute(
      "href",
      "mailto:jobs@iice-test.invalid?subject=Fixture%20Programme%20Associate",
    );
    await expect(page.getByText("Fixture Expired Role")).toHaveCount(0);

    await page.getByRole("tab", { name: "Work with incubated startups" }).click();
    const startups = page.getByRole("tabpanel", { name: "Work with incubated startups" });
    await expect(
      startups.getByRole("heading", { level: 3, name: "Fixture Research Engineer" }),
    ).toBeVisible();
    await expect(startups.getByText("Fixture Labs One · IISER Bhopal")).toBeVisible();
    await expect(
      startups.getByRole("link", { name: "Apply for Fixture Research Engineer" }),
    ).toHaveAttribute("href", "https://fx-labs-one.iice-test.invalid/jobs");
  });
});

test.describe("startups, with every status", () => {
  test("offer status tabs with counts and filter by them", async ({ page }) => {
    await page.goto("/startups/");
    await page.waitForLoadState("networkidle");
    const tabs = page.getByRole("group", { name: "Status" });
    await expect(tabs.getByRole("button", { name: /^Current \(2\)/ })).toBeVisible();
    await expect(tabs.getByRole("button", { name: /^Graduated \(2\)/ })).toBeVisible();
    await expect(tabs.getByRole("button", { name: /^Pre-startup \(1\)/ })).toBeVisible();
    await expect(tabs.getByRole("button", { name: /^All \(20\)/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await tabs.getByRole("button", { name: /^Graduated/ }).click();
    await expect(page.getByRole("status")).toContainText("2 of 20 shown");
    expect(page.url()).toContain("status=graduated");
    await expect(page.locator("li.startup-card h2")).toHaveText([
      "Fixture Labs Four",
      "Fixture Labs Three",
    ]);
  });

  test("combine a status with a sector, with counts that follow the other filter", async ({
    page,
  }) => {
    await page.goto("/startups/?status=current");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("status")).toContainText("2 of 20 shown");
    const sector = page.getByRole("button", { name: /^Healthcare & Bioengineering/ });
    await expect(sector).toContainText("(1)"); // of the two current startups, one is in this sector
    await sector.click();
    await expect(page.getByRole("status")).toContainText("1 of 20 shown");
    await expect(page.getByRole("link", { name: "Fixture Labs One" })).toBeVisible();
  });

  test("show a startup in full", async ({ page }) => {
    await page.goto("/startups/fx-labs-one/");
    await expect(page.getByRole("heading", { level: 1, name: "Fixture Labs One" })).toBeVisible();
    const facts = page.locator("#facts");
    await expect(facts).toContainText("Healthcare & Bioengineering");
    await expect(facts).toContainText("Culture");
    await expect(facts).toContainText("Physical incubation");
    await expect(facts).toContainText("2024");
    await expect(facts).toContainText("Bhopal, Madhya Pradesh");
    await expect(facts).toContainText("Fixture Seed Support");
    await expect(page.locator("#story li")).toHaveCount(3);
    await expect(page.locator("#founders")).toContainText("Asha Verma");
    await expect(page.locator("#recognitions")).toContainText("Fixture Innovation Award");
    await expect(page.locator("#roles")).toContainText("Fixture Research Engineer");
    await expect(page.locator("#related")).toContainText("Fixture startup wins an award");
    await expect(page.getByRole("link", { name: /^Next startup:/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to all startups" })).toHaveAttribute(
      "href",
      "/startups/",
    );
  });

  test("show a startup with less, without empty sections", async ({ page }) => {
    await page.goto("/startups/fx-labs-six/");
    await expect(page.locator("#story")).toHaveCount(0);
    await expect(page.locator("#recognitions")).toHaveCount(0);
    await expect(page.locator("#roles")).toHaveCount(0);
    await expect(page.getByText("Inactive")).toBeVisible();
  });
});

test.describe("events", () => {
  test("default to upcoming when there is one, with a registration badge", async ({ page }) => {
    await page.goto("/events/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /^Upcoming \(1\)/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: /^Past \(10\)/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    const card = page.locator("article.event-card");
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("Registration open");
    await expect(card).toContainText("10–11 Mar 2099");
  });

  test("offer registration and both calendars for an upcoming event", async ({ page }) => {
    await page.goto("/events/fx-upcoming-workshop/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("link", { name: "Register" })).toHaveAttribute(
      "href",
      "https://forms.iice-test.invalid/register",
    );
    const ics = page.getByRole("link", { name: "Add to calendar (.ics)" });
    await expect(ics).toHaveAttribute("href", "/events/fx-upcoming-workshop.ics");
    await expect(ics).toHaveAttribute("download", "");
    const google = new URL(
      (await page.getByRole("link", { name: "Add to Google Calendar" }).getAttribute("href")) ?? "",
    );
    expect(google.hostname).toBe("calendar.google.com");
    expect(google.searchParams.get("text")).toBe("Fixture Founders Workshop · Episode 3");
    await expect(page.getByText("This event has ended.")).toHaveCount(0);
  });

  test("serve a calendar file with the event's own times", async ({ request }) => {
    const response = await request.get("/events/fx-upcoming-workshop.ics");
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain("DTSTART;TZID=Asia/Kolkata:20990310T100000");
    expect(text).toContain("DTEND;TZID=Asia/Kolkata:20990311T170000");
    expect(text).toContain("SUMMARY:Fixture Founders Workshop · Episode 3");
  });

  test("show the agenda one day at a time, the people by role and the timeline", async ({
    page,
  }) => {
    await page.goto("/events/fx-upcoming-workshop/");
    await page.waitForLoadState("networkidle");
    const agenda = page.locator("#agenda");
    await expect(agenda.getByRole("tab")).toHaveText(["Day 1", "Day 2"]);
    await expect(agenda.getByRole("cell", { name: "Opening session" })).toBeVisible();
    await agenda.getByRole("tab", { name: "Day 2" }).click();
    await expect(agenda.getByRole("cell", { name: "Pitch practice" })).toBeVisible();
    await expect(agenda.getByRole("cell", { name: "Opening session" })).toBeHidden();

    const people = page.locator("#people");
    await expect(people.getByRole("heading", { level: 3 })).toHaveText([
      "Chief guest",
      "Speaker",
      "Moderator",
    ]);
    await expect(page.locator("#timeline li")).toHaveCount(3);
    await expect(page.locator("#numbers")).toContainText("120");
  });

  test("tell a visitor outside India the time where they are", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, timezoneId: "America/New_York" });
    const page = await context.newPage();
    await page.goto("/events/fx-upcoming-workshop/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/In your time zone: (9|10) Mar 2099/)).toBeVisible();
    await context.close();
    const india = await browser.newContext({ baseURL, timezoneId: "Asia/Kolkata" });
    const here = await india.newPage();
    await here.goto("/events/fx-upcoming-workshop/");
    await here.waitForLoadState("networkidle");
    await expect(here.getByText(/In your time zone/)).toHaveCount(0);
    await india.close();
  });

  test("show a past event as ended, with its results and a recording that loads only on request", async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto("/events/fx-past-recorded/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("This event has ended.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Register" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Add to calendar (.ics)" })).toHaveCount(0);
    await expect(page.locator("#results")).toContainText("Best prototype");
    await expect(
      page.locator("#results").getByRole("link", { name: "Fixture Labs One" }),
    ).toHaveAttribute("href", "/startups/fx-labs-one/");

    expect(requests.some((url) => url.includes("youtube"))).toBe(false);
    await page.getByRole("button", { name: "Load the recording" }).click();
    const frame = page.locator("iframe");
    await expect(frame).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/abcDEF12345?rel=0",
    );
    await expect(frame).toHaveAttribute("title", "Recording of Fixture Demo Day");
  });

  test("list the editions of a series", async ({ page }) => {
    await page.goto("/events/series/the-start-up-studio/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { level: 2, name: "Editions" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Fixture Founders Workshop · Episode 3" }),
    ).toBeVisible();
  });
});

test.describe("impact and the site map", () => {
  test("show every figure with its source and date", async ({ page }) => {
    await page.goto("/about/impact/");
    const cards = page.locator(".stat-card");
    await expect(cards).toHaveCount(5);
    await expect(page.locator("[data-stat='funds-raised']")).toHaveText("₹2.5 crore");
    await expect(cards.filter({ hasText: "Jobs created" })).toContainText(
      "As of 30 Sep 2026 · Source: Fixture source",
    );
    await expect(cards.filter({ hasText: "Startups incubated" })).toContainText(
      "Counted from the listings on this website.",
    );
  });

  test("list every startup, event and news post on the HTML sitemap", async ({ page }) => {
    await page.goto("/sitemap/");
    await expect(page.getByRole("heading", { level: 2, name: "All news" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Fixture Labs Six" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Fixture Demo Day" })).toBeVisible();
  });

  test("find the new content in search", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Control+k");
    await page.locator("dialog.palette").getByRole("combobox").fill("fixture cohort");
    await expect(page.getByRole("option", { name: /Fixture cohort intake/ }).first()).toBeVisible();
  });

  test("still answer an old address whose page now exists", async ({ page }) => {
    await page.goto("/about-us/resolutions");
    await page.waitForURL(/\/documents\/\?category=resolution/);
    await expect(page.getByRole("heading", { level: 1, name: "Documents" })).toBeVisible();
  });
});
