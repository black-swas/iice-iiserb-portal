# SPEC: IICE Website, Product and UX Specification
**Version:** 0.2 (draft) · **Date:** 2026-10-13. 0.2 folds in the live reference-site audit (SRD Appendix A): tracks, scheme pages, open calls, instruments, impact, partners, event editions, and the revised spinbar geometry.
**Read with:** [docs/SRD.md](docs/SRD.md) (requirements and acceptance criteria) · [docs/TRD.md](docs/TRD.md) (implementation) · [docs/BACKEND_SCHEMA.md](docs/BACKEND_SCHEMA.md) (content model)

This document defines **what each page and component looks like and does**. Requirement IDs (FR-…, NFR-…) refer to the SRD.

> **Honesty rule.** Any copy marked `TODO_CONFIRM` below is a placeholder. It must be confirmed by IICE before launch. Never replace it with invented facts, figures, names or dates.

---

## 1. Product summary
The new IICE site is a fast, static, content-driven website for the Technology Business Incubator at IISER Bhopal. Its job, in order:
1. **Convert**: get eligible founders to apply or pitch.
2. **Convince**: show funders and partners credible evidence quickly.
3. **Explain**: make stages, funding and facilities obvious.
4. **Self-serve**: let IICE staff keep it current without a developer.

Identity: **"science meets startup"**. It is editorial and type-led, with confident whitespace, a deep teal-blue base and one warm amber accent. It should not look like a template or a government PDF portal.

---

## 2. Information architecture

### 2.1 Primary navigation (7 items plus the Apply button, FR-GLOBAL-3)
```
[IICE | IISER Bhopal logos]  About▾  Incubation▾  Startups  Events & News▾  BIRAC Edge  Careers  Contact   [Apply for Incubation]
```

| Nav item | Dropdown groups (mega-menu) |
|---|---|
| **About** | *Who we are:* Overview & Story · Director's Message · Impact (IICE in numbers) · In the News — *People:* Team & Committees · Mentors · Innovation Club — *Governance & partners:* Support & Funding · Partners · Documents (Policies & Resolutions) · Ecosystem |
| **Incubation** | *Journey:* Catalyse (pre-incubation) · Culture (incubation) · Commercialise (acceleration) · Ways to work with us (tracks) — *Get started:* Apply · Open Calls · Funding Schemes · Eligibility & FAQ (anchor) — *Resources:* Facilities · Instruments · Services from IISER Bhopal · Student Innovators Program |
| **Startups** | Direct link to the directory (no dropdown) |
| **Events & News** | Upcoming Events · Past Events · News · Workshop Series |
| **BIRAC Edge** | Direct link |
| **Careers** | Direct link (the page has two tabs) |
| **Contact** | Direct link |

Rules:
- No nav item links to `#`. A group whose target pages don't exist yet is hidden, not stubbed (SRD FR-GLOBAL-9).
- Mobile (< 1024 px): a hamburger opens a full-height drawer with an accordion of the same groups. The Apply button stays visible in the header bar.
- The current section is indicated with `aria-current="page"` plus a visual underline.

### 2.2 Footer groups (by audience, from the AIC-CCMB idea)
| About | For Startups | Ecosystem | Useful Links |
|---|---|---|---|
| Overview · Impact · Team & Committees · Director's Message · Support & Funding · Documents · In the News | Apply · Open Calls · Incubation Journey · Funding Schemes · Facilities · Instruments · Book a Facility · Startup Directory · Startup Portal *(placeholder; external link marked TODO_CONFIRM)* | Mentors · Become a Mentor · Partners · Partner with Us · Innovation Club · Events · News · RSS | IISER Bhopal · DST NIDHI · BIRAC · Careers · Contact · Sitemap · Accessibility · Privacy · Terms · Hyperlink Policy · Screen Reader Access |

Below the groups: address, office hours, "Get directions", phones, emails, social icons (only those with real URLs, each with an accessible name such as "IICE on LinkedIn"), click-to-load map (iframe with a `title`), "Last updated: {build date}", © {build year} IICE, IISER Bhopal.

### 2.3 URL map
```
/                               Home
/about/                         Overview, story, vision, mission, key functions, milestones
/about/directors-message/       Director's / Coordinator's message
/about/team/                    Team & Committees (tabs; #team #managing-committee #executive-committee
                                #technical-evaluation-committee #management-advisory-committee)
/about/impact/                  IICE in numbers (every figure sourced and dated)
/about/partners/                Partners by type + Partner with us / CSR form
/about/in-the-news/             Press coverage
/about/mentors/                 Mentors (filters + Become a mentor form)
/about/innovation-club/         Innovation Club
/about/support-funding/         Support & Funding
/about/ecosystem/               Ecosystem
/incubation/                    Incubation overview and journey
/incubation/catalyse/           Stage page (pre-incubation)
/incubation/culture/            Stage page (incubation)
/incubation/commercialise/      Stage page (acceleration)
/incubation/#tracks             Ways to work with us (engagement tracks; section on the overview)
/incubation/funding/            Funding schemes (list)
/incubation/funding/[slug]/     Funding scheme detail
/incubation/facilities/         Facilities (+ #booking request form)
/incubation/facilities/instruments/  Instrument catalogue with rate cards
/incubation/services/           Services from IISER Bhopal (IP & tech transfer, testing, co-development)
/incubation/student-innovators/ Student Innovators Program
/opportunities/                 Open calls (?view=open|past)
/apply/                         Apply (?track=&stage=; eligibility check, process, FAQ, multi-step form)
/startups/                      Directory (?sector=&stage=&year=&status=&q=)
/startups/[slug]/               Startup detail
/events/                        Events (?view=upcoming|past&type=&series=&year=)
/events/[slug]/                 Event detail (+ /events/[slug].ics)
/events/series/[slug]/          Workshop series
/news/                          News list
/news/[slug]/                   News detail
/news/rss.xml                   RSS 2.0 feed
/documents/                     Documents library (?category=&q=)
/birac-edge/                    BIRAC Edge
/careers/                       Careers (#work-with-iice, #work-with-startups)
/contact/                       Contact
/accessibility/ /privacy/ /terms/ /hyperlink-policy/ /screen-reader-access/ /sitemap/   GIGW pages
/404                            Not found
```
Legacy redirects are listed in SRD §7.2.

---

## 3. Homepage
Section order follows `requirements.txt` §5, with the tie-breaker that merges "Choose your path" and "Quick Tour" into one section. That gives **14 sections**. Each section has a numbered eyebrow (`01 / …`) from the Zaid Sayyed idea, except the utility bar, header, hero and footer.

| # | Section | Content source | Spec |
|---|---|---|---|
| 1 | **Utility bar** | `content/announcements/*`, `settings/site.json` | Height 36 px. Left: announcement ticker (one item at a time, cross-fade every 6 s, **pause button**, pauses on hover/focus; a static list under reduced motion). Right: social icons, a "Startup Portal" link (placeholder), and a search button labelled "Search ⌘K" / "Ctrl K". Hidden kinds: none. Expired items never render. |
| 2 | **Header** | `settings/site.json`, `content/opportunities/*` | IICE and IISER Bhopal logos plus a "Supported by DST · NSTEDB" lockup (≥ 1024 px; collapses to logos only on mobile). Transparent over the hero, then solid surface with a shadow after 24 px of scroll. "Apply for Incubation" button always visible, with an **intake status pill** beside it (≥ 1280 px; inside the mobile drawer otherwise): "● Applications open · closes 30 Nov" / "Rolling applications" / "Next intake: to be announced". The pill links to `/opportunities/`. |
| 3 | **Hero** | `content/pages/home.json` | Headline with emphasised words (see §8.1). One-line sub-copy. CTAs: **Apply for Incubation** (primary) and **Explore Startups** (secondary). Under the CTAs, a **stage strip** with three columns: *Catalyse · Culture · Commercialise*, one line each. The background is a lightweight static poster (AVIF ≤ 200 KB) or a CSS/SVG molecular-grid motif. No video above the fold. |
| 4 | **01 / Impact** | `content/stats.json` | 4–6 counters (e.g. startups incubated, sq ft of incubation space, events held, mentoring hours, patents filed, jobs created). Count-up once on entering the viewport (1.2 s ease-out; renders final values under reduced motion). **Only confirmed stats render in production**; the section hides if fewer than 3 are confirmed. Each stat can carry a footnote such as "as of {date}". Final values are in the server-rendered HTML; the animation only re-plays them. A "See all numbers →" link goes to `/about/impact/`. |
| 5 | **02 / Why IICE** | `content/ecosystem-tiles.json` | 7 tiles: Labs & co-working · Mentoring · Funding access · IP, legal & regulatory · Networking · Training & workshops · BIRAC Edge. Lucide icon, title, short line. On hover (fine pointer) **or** tap/Enter (button, `aria-expanded`), the tile expands to 2–3 lines. Grid: 1 col (360 px), 2 (640 px), 4 (1024 px+). |
| 6 | **03 / Your incubation journey** | `content/stages/*`, `content/funding-schemes/*` | A horizontal ladder of 3 stage cards linked by a progress rail (vertical on mobile). Each card shows the stage name, phase label, "For:" audience, duration, funding band, up to 3 scheme chips and "Explore stage →". Unconfirmed values show "To be announced" (never a number). |
| 7 | **04 / Choose your path** | `content/paths.json` | **Merged quick-entry and quick-tour.** Four cards: **Founders** (apply, journey, facilities) · **Students** (Student Innovators, Innovation Club, events) · **Mentors** (mentor with us, startups) · **Investors & Partners** (startup directory, impact, documents, contact). Each card has an audience illustration/icon, one sentence, and 2–3 deep links. |
| 8 | **05 / Startup Spotlight** | `content/spotlight.json` | **Spinbar** (§5.1). Header: eyebrow "05", title "Startup Spotlight", subline "Ventures and recognitions from the IICE community.", right-aligned mono label `STARTUP SPOTLIGHT (06)`. |
| 9 | **Startup logo carousel** | `content/startups/*` (with logo) | A single row of greyscale logos (colour on hover/focus) with previous/next buttons and a **pause** toggle. Auto-advances slowly (CSS marquee) unless reduced motion is set. Each logo links to its startup page. Followed by a "View all startups →" link. |
| 10 | **06 / What's happening** | `content/opportunities/*`, `content/events/*`, `content/news/*` | If an open call exists, a full-width **Open call** card leads (title, sponsor, "Closes 30 Nov 2026", Apply). Below it, two columns (stacked on mobile): **Upcoming events** (≤ 3; date chip `12 NOV`, title, mode/venue, "Add to calendar") and **Latest news** (≤ 3; date chip, title, 1-line summary). If there are no upcoming events, "Recent events" is shown instead. |
| 11 | **07 / In their words** | `content/testimonials/*` | Slider with 1 card visible on mobile and 2 on desktop. Quote, name, role, startup and optional photo. Manual navigation only (no autoplay). Only items with `consent: true`. **The section hides when there are none.** |
| 12 | **08 / Backed by** | `content/partners/*` | Logo wall grouped as **Funders & Patrons** (DST/NSTEDB, IISER Bhopal, plus TODO_CONFIRM others) and **Ecosystem Partners**. Static grid, not a carousel. Ends with "All partners · Partner with us →" linking to `/about/partners/`. |
| 13 | **Pitch to Us** band | Form | Full-width accent band. Left: "Have an idea worth building? **Pitch to us.**" plus a low-pressure line about what happens next (reply time only if IICE confirms one). Right: a short form (name, email, startup/idea name, one-liner ≤ 200 chars, stage select) with "Send pitch", plus a "Download pitch-deck template" link. The full application lives at `/apply/`. |
| 14 | **Footer** | §2.2 | |

A **"Pitch to Us"** floating pill (DERBI idea) appears on internal pages after 50% scroll. It is hidden on `/apply/` and `/contact/`, is dismissible, and the dismissal is remembered.

---

## 4. Page templates

### 4.1 Program / stage page (`/incubation/[stage]/`)
Hero (stage name, phase, one-liner) → "Who it's for" chips → "Duration" and "Funding band" facts → **"What you get"** offerings checklist → **Program flow** (a numbered horizontal timeline, e.g. onboarding → workshops → monthly check-ins → demo day) → **Outcomes** (what a team has at the end, including entry to the next stage) → Schemes (cards) → **Selection steps** (numbered; online application → internal screening → TEC pitch → onboarding) → Milestones to graduate → FAQ (accordion) → CTA band (Apply with the stage pre-selected / Talk to us). Previous and next stage links at the bottom.

### 4.1a Ways to work with us: tracks (section on `/incubation/#tracks`)
A 2×2 card grid (1 column on mobile). Candidate tracks are **Physical incubation**, **Virtual incubation**, **Pre-incubation** (students/researchers) and **Co-development with IISER Bhopal faculty**. Only tracks IICE confirms are shown (SRD Q8). Each card shows who it's for, duration, what's included, terms (fees/equity: "To be confirmed" until supplied) and an Apply button to `/apply/?track={slug}`.

### 4.1b Funding scheme detail (`/incubation/funding/[slug]/`)
1. Hero: scheme name, provider, one-liner, **status banner** (Open · closes {date} / Rolling / Opens {date} / Closed).
2. **At a glance** table (a 2-column `<table>` with `<th scope="row">`): Maximum support · Duration · Purpose · Funding agency · Expected output · Who can apply. Missing rows show "To be confirmed".
3. What you get → Eligibility → **What the grant covers** and **What it does not cover** (two side-by-side lists) → **Important points** (callout: e.g. no parallel grants, one-time support per founder, IP ownership).
4. Selection process (numbered steps + typical screening time) → Documents checklist.
5. **Cohorts & beneficiaries** (accordion per cohort: startup name, one-line innovation, link to the startup page).
6. FAQ → Contact → "Last reviewed {date}". The CTA is Apply, with the scheme passed as `?scheme=` and shown as context on the form.

### 4.1c Open calls (`/opportunities/`)
Tabs: Open | Past. Each card shows a kind badge (Cohort intake / Scheme call / Challenge / Accelerator / Corporate programme / Fellowship), title, sponsor, a deadline chip with a relative hint ("closes in 9 days", client-side), an eligibility line, and Apply/Details. Sort by soonest deadline; rolling calls come last. Status is evaluated client-side so a stale build never shows an expired call as open.

### 4.2 Startup directory (`/startups/`)
- Status tabs at the top: **Current · Graduated · Pre-startups · All**.
- Toolbar: search input (name, one-liner, founders, tags), filter chip groups with **counts** for **Sector** (5 thrust areas + Other), **Stage** (Catalyse / Culture / Commercialise), **Track**, **Funding scheme** and **Cohort year**, a "Clear filters" button, and a result count (`aria-live="polite"`). Filters combine OR within a group and AND across groups. Chip values are generated from the data, so a chip never matches zero results unless combined with other filters.
- Grid of cards: logo (or monogram fallback), name, one-liner, sector chip, status badge, and scheme chips if funded. **One link per card** (stretched title link; the logo is not a separate tab stop).
- State is kept in the URL query. Without JS, the page shows the full list grouped by status.
- Empty state: "No startups match these filters" plus a clear-filters button.

### 4.3 Startup detail (`/startups/[slug]/`)
Breadcrumbs → header (logo, name, one-liner, status badge, website and social links) → facts list (sector, stage, track, cohort year, location, IISERB affiliation, founded, funded by {schemes}) → description → optional **Story** in three numbered blocks: *01 Problem · 02 Approach · 03 Outcome* (outcomes TODO_CONFIRM until verified) → founders → recognitions (awards, grants, patents) → open roles at this startup → related news/events → "Next startup" / "Back to directory".

### 4.4 Events (`/events/`) and event detail
- **List:** Upcoming | Past tabs (implemented as links with `?view=`), filters for type, series and year. Cards show a date chip, title, type badge, mode (in-person/online/hybrid), venue, and a "Register" badge if registration is open.
- **Detail:** title (with edition, e.g. "The Start-up Studio · Episode 2"), date/time range (IST, plus a "your local time" hint client-side), venue with a map link, mode, registration button (only while open), **Add to calendar** (`.ics` download and a Google Calendar link), then sections shown only when data exists:
  - **Timeline** of rounds (call opens → last date → shortlist → finale → results);
  - **Agenda** (day tabs; time · session · room · speakers);
  - **People** grouped by role (Chief guest · Speakers · Panellists · Moderator · Jury);
  - body, gallery (lightbox, lazy), partners and sponsor, past-edition facts (e.g. applications received, as confirmed numbers only);
  - **Results / winners** after the event.

  Then the series link and a share link. Past events show "This event has ended" and an optional recording link (YouTube-nocookie, click-to-load).
- **List footer:** an "Invite IICE to speak or co-host an event" CTA (Contact, topic preset).

### 4.5 Team & Committees (`/about/team/`)
One page with **ARIA tabs**: Team · Managing Committee · Executive Committee · Technical Evaluation Committee · Management Advisory Committee.
- Each tab panel is server-rendered; without JS, all panels are shown stacked with headings.
- The URL hash selects a tab (legacy redirects depend on this).
- Team cards: photo (or initials), name, role, email (obfuscation-free `mailto:`), phone (`tel:`).
- Committee tables: Name · Designation · Role in committee. Each committee shows "Composition as of {date}".
- An empty committee shows: "Composition being updated. Contact iice@iiserb.ac.in." (no placeholder names).

### 4.6 Documents library (`/documents/`)
Search (title, summary), a category filter (Policy · Resolution/By-Laws · Forms & Templates · Reports · Guidelines), and a sortable table with columns **Title · Category · Date · Version · Size · Download (PDF)**. Superseded documents are collapsed under "Previous versions". Each row's link includes `download` and the file type/size in its accessible name ("Download Incubation Policy v3, PDF, 420 KB").

### 4.7 Apply (`/apply/`)
1. Intro: what IICE offers incubatees, in 2 lines.
2. **Eligibility** (legacy rules, tightened; see §8.4) plus **thrust areas**.
3. **Eligibility check**: 3 radio questions (Who are you? Do you have an IISERB faculty mentor or collaborator? Is your venture technology-based in a thrust area?) leading to an outcome card. The check is informative only; it never blocks.
4. **Getting Started**, numbered steps (IIT Mandi idea; IICE-specific copy, TODO_CONFIRM on timelines): ① Check eligibility ② Prepare your business plan and IP details ③ Submit the application ④ Screening by IICE ⑤ Pitch to the Technical Evaluation Committee ⑥ Decision and onboarding agreement ⑦ Move in and start your stage.
5. **What to prepare**: business plan; IP/technology details (with a copy of the filed or granted patent if the IP was developed at IISER Bhopal); a link to the Business Proposal Format (Documents).
6. **Multi-step form**: Applicant → Venture → Technology & IP → Needs → Review & submit. A step indicator shows "Step 2 of 5", there is an error summary, and drafts are auto-saved. Track, stage and scheme are pre-filled from the query (`?track=&stage=&scheme=`) and shown as an editable context line ("Applying for: Virtual incubation · Catalyse"). Downloadable **pitch-deck template** and **Business Proposal Format** sit beside the form. Every field has a visible label; required fields say "(required)" in text.
6a. **Confirmation**: reference ID (e.g. APP-2026-000123), "What happens next" (the numbered steps with the current one highlighted), expected screening time (TODO_CONFIRM; omit if unconfirmed), contact for queries, and a link to Open calls and Events.
7. **FAQ** accordion.
8. Contact strip for incubation support (phone, email).

### 4.8 Facilities (`/incubation/facilities/`)
- **Facts strip** (confirmed values only): total area · seats · private offices · meeting rooms · access hours.
- **Facility groups** (Workspace · Labs & Instruments · Support Services · Campus Amenities). Each group card shows a description, quantified facts, a 3-photo gallery (lightbox) and "Explore". For shared institute facilities (e.g. the Central Instrumentation Facility), the card links to IISER Bhopal's own page instead of duplicating it.
- The 12 legacy items are carried over with corrected spelling: Office Space · Innovation Lab · Mentorship · Common Office Equipment · High-Speed Internet · IPR & Marketing Support · Central Instrumentation Facility (access) · Business Establishment & Collateral Support · Cafeteria · Central Library · Meeting & Conference Rooms · Visitor Hostel.
- **Co-working facts block**: seats, meeting room, video-conferencing, dedicated office on request, accommodation subject to availability (all TODO_CONFIRM).
- **Booking request** (`#booking`): facility or instrument, preferred dates, user category, sample type/notes. The confirmation explains that the office confirms availability and charges.
- Usage policy link (Documents).

### 4.8a Instrument catalogue (`/incubation/facilities/instruments/`)
- Filter chips by category (Molecular biology · Cell culture · Analytical · Imaging · Electronics & prototyping · Computing) with counts, plus search.
- Instrument cards: photo (or icon), name, make/model, 3 key specs, typical uses, an access badge (Self-use after training / Operator-assisted / Via CIF), and "Request booking".
- An expandable **rate card** table per instrument: User category (Incubatee · IISER Bhopal · External academic · Industry) × Rate × Unit (hour/sample/day), with a GST note and minimum billing unit. Rates are TODO_CONFIRM and hidden in production until confirmed. There is one rate source per instrument; never two conflicting tables.

### 4.9 Careers (`/careers/`)
Two sections with anchors: **Work with IICE** and **Work with incubated startups**. Job cards show title, employer, type, location, a "Closes {date}" chip and an Apply link/email. Expired jobs auto-hide. The empty state reads: "No open positions right now. Send your CV to iice@iiserb.ac.in" (TODO_CONFIRM preferred address).

### 4.10 Contact (`/contact/`)
Two columns: **contact form** (left on desktop, first on mobile) and the **address card** (right), followed by the click-to-load map. Topic select: Incubation · Partnership / Funding · Mentoring · Facilities & bookings · Media · Careers · Other. Choosing a topic shows the matching direct channel.
- **Channels by intent** (cards): Incubation support (+91 755 269 2384 · iice@iiserb.ac.in) · Partnerships & investors · Facilities & bookings · Media · General (office_iice@iiserb.ac.in). All except the legacy-confirmed numbers and emails are TODO_CONFIRM.
- **Office hours** (TODO_CONFIRM) and a **"Get directions"** link.
- A response-time line appears only if IICE commits to one.

### 4.11 BIRAC Edge (`/birac-edge/`)
Program hero → What it is → Who can apply → Support offered → How to apply / timeline → FAQ → contact. All content TODO_CONFIRM. A Conclave 2.0 page (Aug 2026) records that the BIRAC EDGE scheme was announced; use that only as context, not as program detail. Never show "Coming Soon" in production. Until content exists, show an "Express interest" block (Contact form preset with topic "BIRAC Edge").

### 4.12 News detail (`/news/[slug]/`)
Title, date, reading time, cover (16:9, optional), body (Markdown), tags, related links (event, startup), share link, and previous/next articles.

### 4.13 Other pages
- **About overview:** origin story (TODO_CONFIRM founding year), vision, mission, key functions, **Milestones** (spinbar variant, or a vertical "Time Machine" timeline under reduced motion and on mobile), and the funding acknowledgement.
- **Director's message:** photo, name, role, message, and a dated sign-off (TODO_CONFIRM).
- **Mentors:** filter chips with counts by **type** (Business · Finance · Technical · Legal · IP · Regulatory · Clinical/Domain · Marketing), sector and location. Cards show photo, name, title, organisation (separate fields, not a combined line), expertise tags and a LinkedIn link. Ends with a **Become a mentor** form (name, email, phone, LinkedIn, occupation, organisation, sector, expertise, how you'd like to engage, hours per month, consent).
- **Impact (`/about/impact/`):** a "IICE in numbers" grid. Each figure shows its source and an "as of" date. Derived counts (startups listed, events held, scheme beneficiaries) are computed from content. Unconfirmed figures are omitted, never estimated. Optional, only if IICE confirms them: published targets ("By 2028 we aim to…").
- **Partners (`/about/partners/`):** groups (Funders & Government · Host institute · Corporate & CSR · Hospitals & Clinical · Investors · Academic · Ecosystem · Media), each logo with a visible name and an optional link. **Partner with us** section: ways to partner (sponsor a challenge, CSR, co-invest, mentor, offer pilots) and a form (name, designation, organisation, email, phone, partnership type, sector focus, funds available (optional), message, consent).
- **In the News (`/about/in-the-news/`):** list of press items: outlet, date, title, type badge (Article/Video/Podcast), linked out with an external-link indicator. The latest 3 also appear on About.
- **Services (`/incubation/services/`):** cards for IP & technology transfer, Testing & validation (via IISER Bhopal facilities), Co-development with faculty, and Regulatory guidance. Each has who can use it, typical turnaround, how to engage and contact (TODO_CONFIRM).
- **Student Innovators Program:** for pre-startups and student teams, linked to the Innovation Club (TODO_CONFIRM program details).
- **Innovation Club:** tagline "An idea to reality", the three Cs (Culture · Conduct · Connect), objectives, past members.
- **GIGW pages:** Accessibility statement, Privacy policy, Terms of use, Hyperlink policy, Screen Reader Access, HTML sitemap.

---

## 5. Component catalogue

### 5.1 Spinbar: tilted card gallery (FR-SPIN-*)
**What the audit showed.** The reference (zaidsayyed.in, audited 2026-10-13) is a *ring*, not a free-form zig-zag. Cards sit on a circle, each rotated tangent to it, and only the upper half of the ring is visible because the lower part fades out through a mask. Rotating the ring is what makes neighbours appear tilted left and right. The reference picks the active card by hover and uses non-link `div`s. We keep our brief's **scroll-linked** behaviour and real links, and adopt the ring geometry because it produces the required ±30° zig-zag naturally and needs only one rotation value per frame.

**Visual (desktop ≥ 1024 px with a fine pointer, motion allowed)**
- The section is pinned while scrolling. The stage is a full-viewport sticky container.
- **Geometry:** cards are placed on an arc (radius ≈ 520 px at 1280 px width, scaled with viewport) at **30° angular spacing**, each rotated tangent to the arc. With the focus slot at the top of the arc (0°), the previous and next cards sit at **−30° (left slot; the title rises to the right)** and **+30° (right slot; the title descends to the right)**. Cards at ±60° appear low in the bottom-left and bottom-right corners, which is the "peek in from the bottom corners" effect. A bottom mask gradient (transparent → opaque at ~40%) fades out the rest of the ring. Scroll progress rotates the ring by 30° per card.
- Cards are portrait 3:4. The **focus slot** card is ~360×480 px, scale 1, upright (0°).
- **Active card:** full colour, sharp, a shadow, and visible description text (≤ 140 chars). A thin accent line along the bottom edge fills left-to-right as the progress indicator for that card's scroll segment. A round arrow button (top-right) links out.
- **Inactive cards:** scale ~0.78, opacity 0.55, `blur(3px)` (only the 2 nearest neighbours are blurred; cards further away are hidden or opacity-only), with photo cards in greyscale.
- **Anatomy:** a tilted pill badge at the top-left (`Incubated` · `Graduated` · `Grant Won` · `Patent` · `Award` · `Milestone`), a small mono index at the top-right next to the arrow button (`01/06`), a bold title at the bottom-left following the card tilt, and either a photo or the text-card treatment: a dark gradient (primary-900 to ink) with a soft radial accent glow and a faint circular watermark of the badge word.
- **Header:** numbered eyebrow, large title, muted subline, and a mono uppercase count label on the right. The count is **derived from the data** (`items.length`), never typed.
- **Entry:** when the section first reaches 80% of the viewport, cards scale from 0.85 → 1 and fade in with a 50 ms stagger, using a slight overshoot ease (once only; skipped under reduced motion).

**Behaviour**
- Scroll distance is ~70 vh per card. Active index = `round(progress)`. The ring follows scroll with light smoothing (a "scrub" of about 0.3 s) and settles with a critically damped spring. Only `transform`, `opacity` and `filter` are animated.
- **Hover/focus preview:** hovering or focusing a non-active card temporarily raises it (lifts 8 px, removes its blur, shows its title in full) without moving the ring. Scroll position stays the source of truth for "active". The active card's description is **always visible**, never hover-only.
- **Ends of the section:** at the first and last card the pin releases naturally and the page continues. Scrolling back re-enters the section at the last card.
- **Keyboard:** cards are `<a>` elements in DOM order. On focus, the page scrolls to that card's segment (instant under reduced motion). Prev/Next buttons sit below the stage, with "Showing 2 of 6" in `aria-live="polite"`. Tabbing past the last card leaves the section normally.
- **Cursor (fine pointers only):** a 10 px dot follows the pointer; over the active card it grows to 72 px with an arrow icon and the text "Open". It is `aria-hidden` and has `pointer-events: none`. It is hidden while the command palette or any dialog is open.
- **Reduced motion:** a static responsive grid (1/2/3 columns), no tilt, no pin, no blur, colour photos.
- **Touch devices and < 1024 px: "deck" variant.**
  - A sticky 100svh stage where cards stack like a deck.
  - For each card, offset `p = progress·N − i` maps to translateY 8% → 0 → −58%, scale 0.92 → 1 → 1.02 and rotate 1.5° → 0° → −4° (max tilt 4°, within the brief's ≤ 8° limit). Opacity fades after `p > 0.55`.
  - Upcoming cards are dimmed with **brightness/opacity, not blur**.
  - Progress is a row of thin segments, one per card, with the active segment at full opacity.
  - Track height is about `N × 45svh + 30svh` on phones.
  - From 768 px to 1023 px, a "The record" list of titles sits beside the deck, with the active title highlighted, and each title links to its card.
- **Fallback:** if JS fails, the server-rendered static grid remains.
- **Limits:** 3–8 cards (validated). Images lazy-load except the first two.
- **Reuse:** `variant="milestones"` uses the year as the badge and is fed by `content/milestones.json`.

### 5.2 Other components
| Component | Notes |
|---|---|
| `AnnouncementTicker` | Date-filtered; pause control; `role="region"` with `aria-label="Announcements"` |
| `SiteHeader` / `MegaMenu` / `MobileNav` | Disclosure-pattern menus (not `role="menu"`); Esc closes; focus returns to the trigger |
| `CommandPalette` | Modal dialog anchored ~14vh from the top, max-width 36rem, scrim, background scroll locked. Combobox + listbox with `aria-activedescendant`; arrow keys wrap; Enter opens; Esc closes and returns focus to the trigger. Focus stays inside the dialog while it is open; that is correct for a modal, and is not the "focus trap" that NFR-A11Y forbids. Groups: **Pages** (including in-page anchors such as "Eligibility" and "Book a facility"), **Startups**, **Events**, **Open calls**, **News**, **Documents**, **People**, **Actions** (Apply, Pitch to us, Toggle theme, Copy email). Each item may carry a hint ("Rolling", "PDF · 420 KB"). Empty state: "Nothing matches '…'. Try 'apply' or 'facilities'." Recent searches. `/` and Cmd/Ctrl+K shortcuts (ignored while typing in an input). External items open in a new tab with an indicator |
| `StatusPill` | Intake status from `content/opportunities`; client-evaluated |
| `Breadcrumbs` | Visible trail matching the JSON-LD |
| `AtAGlanceTable` | Scheme summary table with "To be confirmed" for missing rows |
| `StatusBanner` | Open / Rolling / Opens / Closed with dates |
| `FacetChips` | Data-derived filter chips with counts; OR within a group, AND across groups |
| `Timeline` | Numbered steps (selection process, program flow, event rounds); text, never an image |
| `Agenda` | Day tabs + time-ordered sessions |
| `RateCardTable` | Instrument rates by user category |
| `ReadingProgress` | Thin top bar on long pages; `aria-hidden`; transform-only |
| `CtaBand` | Mid-page call to action between proof sections and forms |
| `SectionHeader` | Eyebrow number, title, optional subline, optional right label |
| `StatsStrip` / `StatCounter` | IntersectionObserver count-up; final value present in the HTML (SEO/no-JS) |
| `EcosystemTile` | Expandable; hover for fine pointers, button otherwise |
| `StageLadder` / `StageCard` | Responsive rail |
| `PathCard` | Audience card with links |
| `Spinbar` | §5.1 |
| `LogoCarousel` | Marquee with pause and prev/next |
| `DateChip` | `<time datetime>`; `DD MMM`; year shown when not the current year |
| `EventCard`, `NewsCard`, `StartupCard`, `JobCard`, `PersonCard` | Shared card system (§6.4) |
| `Tabs` | ARIA tabs with hash sync |
| `FilterBar` | URL-synced filters with a live result count |
| `DocumentTable` | Sortable, accessible table |
| `MultiStepForm`, `Field`, `ErrorSummary` | Shared validation schema; GOV.UK-style error summary |
| `MapEmbed` | Click-to-load facade with a static address card |
| `Picture` | AVIF/WebP `srcset`, aspect-ratio box, blur-up/dominant colour |
| `PlaceholderBanner` (dev only) | Lists `TODO_CONFIRM` fields on the page and outlines them with a dashed amber border |
| `Preloader` (optional, **off by default**) | ≤ 800 ms logo reveal, only on the first visit of a session, skippable, never covers the LCP element, off under reduced motion. Both audited references that used preloaders delayed content by ≥ 1.5 s. |
| `CustomCursor` | Fine pointers only |
| `ThemeToggle` | System / Light / Dark |

---

## 6. Design system

### 6.1 Colour tokens (interim, until IISER Bhopal logo colours are supplied)
Contrast ratios below were computed against WCAG 2.x.

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#FFFFFF` | `#0B141A` | Page background |
| `surface` | `#F4F7F8` | `#13212A` | Cards, alternating sections |
| `ink` | `#0F1B24` (17.5:1 on bg) | `#E6EEF2` (15.8:1) | Body text |
| `muted` | `#4A5A66` (7.1:1) | `#9FB0BA` (8.3:1) | Secondary text |
| `primary-700` | `#0B4F63` (9.1:1) | — | Headings accent, links, primary button fill (white text 9.1:1) |
| `primary-600` | `#0E6478` (6.8:1) | — | Hover and **focus ring in light mode** |
| `primary-300` | — | `#6CC5D1` (9.3:1) | Links and focus ring in dark mode |
| `primary-900` | `#082F3B` | `#082F3B` | Hero and spinbar text-card gradients |
| `accent-400` | `#F2A541` | `#F5B65E` | Warm accent fills, Pitch band, badges. **Always with `ink` text (8.5:1); never white text (2.05:1, fails)** |
| `accent-700` | `#8A4B00` (6.8:1) | — | Accent-coloured text on light backgrounds |
| `success` / `danger` | TBD with ≥ 4.5:1 | TBD | Form states (pair with icons, never colour alone) |

Rules: the light-mode focus ring is a 2 px `primary-600` outline with 2 px offset (amber fails 3:1 on white). In dark mode the ring is `accent-400`.

### 6.2 Typography
- **Display:** one geometric/grotesque display face (proposal: *Space Grotesk*, OFL) for headings and numbers.
- **Text:** one humanist sans (proposal: *Inter*, OFL) for body and UI.
- **Devanagari fallback:** *Noto Sans Devanagari* (OFL), loaded only for `lang="hi"` content.
- **Mono labels** (eyebrows, spinbar count): the system mono stack (`ui-monospace, SFMono-Regular, Menlo, Consolas`), so no third webfont is needed.
- All fonts are self-hosted, Latin-subset WOFF2, at most 2 weights per family, `font-display: swap`, with metric-matched fallbacks to avoid CLS.
- Fluid scale (`clamp`): `display-xl` 40→72 px · `h1` 32→56 · `h2` 26→40 · `h3` 20→28 · `body` 16→18 · `small` 14 · `eyebrow` 12 mono uppercase, +0.12em tracking. Line length is capped at 68ch.

### 6.3 Layout and spacing
- 4 px base spacing scale; section padding 64 px mobile and 112 px desktop.
- 12-column grid with a max content width of 1200 px (1320 px for wide sections), 20 px mobile gutters.
- Breakpoints: 360 (min), 640, 768, 1024, 1280, 1536, 1920 (max design width).

### 6.4 Cards, shape, elevation
- Radius: 12 px for cards, 999 px for pills and badges, 20 px for spinbar cards.
- Elevation: 3 levels (subtle border; soft shadow; lifted on hover). Dark mode uses lighter surfaces instead of shadows.
- Every card has one primary link (the whole card is clickable via a stretched link, while secondary links remain separately focusable).

### 6.5 Motion
- Durations: 150 ms (UI), 300 ms (reveal), 1200 ms (count-up). Default easing `cubic-bezier(.2,.8,.2,1)`.
- Allowed motion: section reveals (fade plus 12 px rise, once), count-up, spinbar, ticker, carousel. Nothing else.
- `prefers-reduced-motion: reduce` disables all of it: content renders in its final state.

### 6.6 Iconography and imagery
- **Lucide** icons only, 1.75 px stroke, 20/24 px.
- Image aspect ratios: hero 16:9, cards 4:3, spinbar 3:4, team 1:1, logos contained in a 3:2 box.
- Until photos arrive, show aspect-ratio placeholders with a subtle molecular-grid pattern and the label "Photo: {description} (TODO_CONFIRM)" in dev only.
- Alt text describes content and purpose ("Founders of {startup} demonstrating their prototype at IICE lab"); logos use "{Org name} logo". Decorative images use `alt=""`.

---

## 7. Content and copy guidelines
- **Voice:** confident, plain, specific. Short sentences, active voice, no buzzword stacking.
- **Spelling:** Indian English (organise, programme for events, *program* for incubation programs; keep this distinction consistent, and keep scheme names as their owners spell them).
- **Names:** "IICE" after first use of "Innovation and Incubation Centre for Entrepreneurship (IICE)"; "IISER Bhopal" (not IISERB in public copy); "DST" and "NSTEDB" spelt out once per page.
- **Numbers:** always with source and an "as of" date in content metadata.
- **Money:** Indian numbering with one format everywhere: "₹10 lakh", "₹1.5 crore", "up to ₹25 lakh". Never "Lacs", "Lakhs", "10L", or mixed forms. A single `formatINR()` helper produces all amounts.
- **Dates:** `12 Nov 2026`; times `4:30 pm IST`. Deadlines always include the year.
- **Every card has unique copy.** Validation rejects duplicate one-liners within a collection.
- **Link text says where it goes:** "Read the Incubation Policy", not "Click here", "Read more" or "Know more". If a card needs a short "Read more", it gets an accessible name that includes the title.
- **CTAs are specific and low-pressure:** "Send pitch", "Request a booking", "Check eligibility", never "Submit". Next to forms, say what happens next. State a reply time only if IICE commits to one.
- **Acronyms are expanded on first use per page** (NIDHI, NSTEDB, TEC, CIF, BIRAC).

---

## 8. Draft copy (rewritten from legacy text, typos fixed)

### 8.1 Hero
- **Headline (option A):** "Where *science* becomes a *startup*."
- **Headline (option B):** "From the lab bench to the *market*, at IISER Bhopal."
- **Sub-copy:** "IICE is the DST-supported technology business incubator at IISER Bhopal, helping researchers, students and founders turn deep-tech ideas into companies."
- **Stage strip:** **Catalyse**: "Test your idea and reach proof of concept." · **Culture**: "Build your product with labs, mentors and funding." · **Commercialise**: "Reach customers, investors and scale."

### 8.2 Named stages
The names come from IICE's own vision ("catalyse start-up culture") and mission ("convert in-house technologies into commercial products").

| Stage | Phase | For | Duration | Funding band | Schemes |
|---|---|---|---|---|---|
| **Catalyse** | Pre-incubation | Students, researchers and first-time founders with an idea or early research result | TODO_CONFIRM | TODO_CONFIRM | TODO_CONFIRM |
| **Culture** | Incubation | Teams with a proof of concept building a prototype or product | TODO_CONFIRM | TODO_CONFIRM | TODO_CONFIRM |
| **Commercialise** | Acceleration / graduation | Startups with a product, seeking market entry, investment and scale | TODO_CONFIRM | TODO_CONFIRM | TODO_CONFIRM |

### 8.3 Vision, mission, key functions (tightened legacy text)
- **Vision:** "To be a centre of excellence that catalyses startup culture at IISER Bhopal, builds strong industry–academia links, and nurtures impactful technology ventures, and in doing so to become one of India's leading technology business incubators."
- **Mission:**
  1. Build and promote an entrepreneurial ecosystem on campus and in the surrounding region.
  2. Convert technologies and ideas developed at IISER Bhopal into commercial products.
  3. Support early-stage startups with space, facilities, mentorship and networks.
- **Key functions:**
  1. Provide workspace, shared office equipment and technical assistance to incubatees.
  2. Incubate startups in a supportive environment with expert mentorship.
  3. Run events that build entrepreneurial skills among students and faculty.
  4. Grow an entrepreneurial ecosystem at IISER Bhopal and in its vicinity.
  5. Build industry–academia partnerships for innovation in science and technology.
  6. Engage alumni in entrepreneurial activity.
  7. Facilitate technology transfer and the protection of intellectual property.
- **About intro:** "The Innovation and Incubation Centre for Entrepreneurship (IICE) is a technology business incubator at IISER Bhopal, with 10,000 sq ft of incubation space in the institute's main building. Established with support from the NSTEDB Division of the Department of Science & Technology under the NIDHI-TBI scheme, IICE helps faculty, students and external founders, with a particular strength in bioscience, turn research into ventures through space, labs, mentoring, networks, and help with technical, legal, financial and marketing matters."

### 8.4 Eligibility (legacy, tightened)
1. Current and former faculty of IISER Bhopal.
2. Students and alumni of IISER Bhopal.
3. Universities with an active R&D collaboration with IISER Bhopal.*
4. Startups from outside IISER Bhopal.*

\*Applicants under 3 and 4 need an IISER Bhopal faculty member as mentor or collaborator.

**Thrust areas:** Healthcare & Bioengineering · Environment & Agriculture · Internet of Things & Artificial Intelligence · Social & Rural Development Technologies · Computational Sciences & Information Technology.

### 8.5 Funding acknowledgement
"IICE gratefully acknowledges the Department of Science and Technology (DST), Government of India, whose NSTEDB Division supported its establishment under the NIDHI-TBI scheme, and IISER Bhopal for providing the incubation space and infrastructure."

---

## 9. Reference ideas → where they land
Ideas only; no text, images, logos, code or distinctive layouts are copied.

| Reference idea | Implemented as |
|---|---|
| IIT Mandi: dated announcements block | Utility-bar ticker from `content/announcements` with `startsAt`/`expiresAt` |
| IIT Mandi: stage-based funding ladder | Home §6 "Your incubation journey" + stage pages |
| IIT Mandi: impact stats + "Time Machine" | Home §4 stats; About milestones (spinbar `milestones` variant / timeline) |
| IIT Mandi: numbered "Getting Started" | Apply step 4 |
| IIT Mandi: mega-menu, persistent Apply, transparent-to-solid header | §2.1, Home §2 |
| IIT Mandi: news cards, patron/partner walls, mentors page, split careers | Home §10, §12; `/about/mentors/`; `/careers/` |
| BITS Hyderabad TBI: three-word stage strip | Hero stage strip (Catalyse · Culture · Commercialise) |
| BITS Hyderabad TBI: portfolio stats incl. student pre-startups | Stats may include a pre-startups count; directory status "Pre-startup" |
| BITS Hyderabad TBI: Quick Tour cards | Merged into "Choose your path" (tie-breaker) |
| BITS Hyderabad TBI: logo carousel with prev/next | Home §9 |
| BITS Hyderabad TBI: vision and goals block; footer with map | About; footer |
| AIC-CCMB: five-counter stats | Home §4 (4–6 counters, confirmed only) |
| AIC-CCMB: program/funding cards with amounts | Funding scheme cards (amounts TODO_CONFIRM) |
| AIC-CCMB: ecosystem icon tiles with expand | Home §5 |
| AIC-CCMB: branded workshop series; Student Innovators page | `/events/series/[slug]/` (e.g. "The Start-up Studio"); `/incubation/student-innovators/` |
| AIC-CCMB: utility bar with socials and portal login | Home §1 (portal link placeholder) |
| AIC-CCMB: audience-grouped footer | §2.2 |
| DERBI: brief preloader | Optional `Preloader` (≤ 800 ms, skippable) |
| DERBI: hero emphasis and persistent "Pitch to Us" | Hero; floating pill and Home §13 band |
| DERBI: mentoring hours, experts, jobs metrics | Candidate stats (TODO_CONFIRM) |
| DERBI: named stages with durations and audience | Catalyse / Culture / Commercialise |
| DERBI: offerings checklist, scheme cards with imagery, testimonials, origin story, director's message | Stage pages; funding page; Home §11; About; `/about/directors-message/` |
| DERBI: audience quick-entry; contact form beside address | "Choose your path"; Contact page |
| DERBI: muted looping video (lazy, poster) | Optional on About (never above the fold) |
| Zaid Sayyed: card spinbar | Home §8, §5.1 |
| Zaid Sayyed: numbered eyebrows, type-led layout | `SectionHeader` |
| Zaid Sayyed: command palette | `CommandPalette` |
| Zaid Sayyed: dot cursor | `CustomCursor` (fine pointers) |
| Zaid Sayyed: "Ask AI" widget | Phase 2 (out of scope) |

### 9.1 Additional ideas from the live audit (2026-10-13)
| Source | Idea | Implemented as |
|---|---|---|
| IIT Mandi | "Grant at a glance" table; covered vs non-permitted uses; important points | Scheme detail page §4.1b |
| IIT Mandi | Program flow and next-phase chaining | Stage page §4.1 |
| IIT Mandi, DERBI, AIC-CCMB | Equipment catalogue with tiered rate cards | Instrument catalogue §4.8a |
| IIT Mandi | Co-work facts block | Facilities §4.8 |
| IIT Mandi | Directory faceted by scheme; mentor facets by type, sector, location | Directory §4.2, Mentors §4.13 |
| IIT Mandi | Privacy policy with named grievance officer | `/privacy/` (SRD FR-LEGAL-1) |
| IIT Mandi | Day-wise event agenda, past-edition numbers | Event detail §4.4 |
| BITS Hyderabad, AIC-CCMB | Incubation / pre-incubation / virtual / co-development tracks | Tracks §4.1a |
| BITS Hyderabad | Quantified facility groups; link to host shared facilities | Facilities §4.8 |
| BITS Hyderabad | Scheme landing-page template (objectives, support, phased flow, how to apply) | Scheme detail §4.1b |
| BITS Hyderabad | Numbered student pitch series with editions | Event series + `edition` |
| BITS Hyderabad, AIC-CCMB | Office hours, directions, contact by intent | Contact §4.10 |
| BITS Hyderabad | Employment generated, startup revenue stats | Candidate stats (TODO_CONFIRM) |
| AIC-CCMB | Host-institute services and tech transfer | Services page §4.13 |
| AIC-CCMB | Portfolio tabs: residents / graduates / funded | Directory status tabs + scheme facet §4.2 |
| AIC-CCMB | Status banners on programs | `StatusBanner` |
| AIC-CCMB | Press coverage with outlet | In the News §4.13 |
| DERBI | Co-investor/partner intake form; mentor sign-up form | Partners and Mentors §4.13 |
| DERBI | Pitch-deck template download | Apply §4.7, Pitch band |
| DERBI | Outcomes + selection steps on program pages | Stage page §4.1 |
| DERBI | Scheme cohorts with beneficiaries | Scheme detail §4.1b |
| DERBI | Partners grouped by type, CSR | Partners §4.13 |
| DERBI | Open calls hub | `/opportunities/` §4.1c |
| DERBI | Event round timeline + results | Event detail §4.4 |
| Zaid Sayyed | Ring geometry and touch "deck" for the spinbar | §5.1 |
| Zaid Sayyed | Live-numbers page with sources; hide what can't be verified | Impact page §4.13 |
| Zaid Sayyed | Problem → Approach → Outcome case studies | Startup story §4.3 |
| Zaid Sayyed | Availability pill | Intake `StatusPill` |
| Zaid Sayyed | Breadcrumbs, chip counts, reading progress, RSS, friendly 404 | Components §5.2, `/news/rss.xml` |
| Zaid Sayyed | Palette groups with hints, actions, empty state | `CommandPalette` §5.2 |

---

## 10. Phase 2 (not in v1)
"Ask AI about us" widget · Hindi content · in-form file uploads · startup-portal integration · newsletter sending (the sign-up form is "could" in v1) · mentor booking · live instrument slot calendar · flagship-event microsites · self-paced founder learning series and toolkit · public data/embeds (e.g. an events dataset) · published growth targets (only if IICE confirms them).
