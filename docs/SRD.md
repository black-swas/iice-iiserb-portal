# SRD: Software Requirements Document
**Project:** IICE website rebuild (Innovation and Incubation Centre for Entrepreneurship, IISER Bhopal)
**Version:** 0.2 (draft) · **Date:** 2026-10-13 · **Source of truth for intent:** [`requirements.txt`](../requirements.txt)
**Related:** [SPEC.md](../SPEC.md) (product/UX spec) · [TRD.md](TRD.md) (technical design) · [BACKEND_SCHEMA.md](BACKEND_SCHEMA.md) (data model)
**Changes in 0.2:** adds requirements learned from a live audit of the five reference sites on 2026-10-13: engagement tracks, scheme detail pages, open calls, instrument catalogue, impact page, partner/mentor/booking forms, event editions, and an automated anti-pattern gate. See [Appendix A](#appendix-a-reference-site-audit-2026-10-13).

This document says **what** the system must do and how we will know it does it. It does not prescribe implementation; that is the TRD's job.

---

## 1. Purpose and scope

### 1.1 Purpose
Replace the current Google Sites website (`iice.iiserb.ac.in`) with a fast, credible, self-hostable website that converts visitors into incubation applicants and that IICE staff can update without a developer.

### 1.2 In scope
- Public website: all pages listed in §5 of this document, plus new pages introduced by the reference-site features.
- A git-based content layer (`/content`) and an editor UI (CMS) for non-developers.
- Web forms posting to one configurable endpoint: Contact, Pitch to Us, Apply for Incubation (must); Become a Mentor, Partner / Co-invest, Facility & Instrument Booking Request (should); Newsletter (could).
- A reference form-endpoint implementation (Google Apps Script → Google Sheet + email).
- Site-wide search (command palette), SEO artefacts, legacy-URL redirects.
- Quality tooling: lint, typecheck, content validation, link check, spell check, accessibility and Lighthouse checks, a `TODO_CONFIRM` report.

### 1.3 Out of scope (v1)
- "Ask AI about us" chat widget (phase 2, and only if a serverless endpoint is available; see `requirements.txt` §3).
- Startup-portal login (a placeholder link only).
- Hindi translation content (the structure must be i18n-ready; the content is not required).
- File uploads in forms (v1 collects shareable links; see FR-APPLY-6).
- Payments, user accounts, or any server-side database run by us.
- Online slot booking or calendar availability for instruments (v1 is a request form; the IICE office confirms).
- Event microsites with their own navigation, a self-paced learning platform, and public data feeds or embeds. These are phase 2 ideas seen on reference sites.

### 1.4 Definitions
| Term | Meaning |
|---|---|
| IICE | Innovation and Incubation Centre for Entrepreneurship, IISER Bhopal: a Technology Business Incubator (TBI) |
| TBI | Technology Business Incubator |
| NIDHI-TBI | DST/NSTEDB scheme under which IICE was established |
| TODO_CONFIRM | Mandatory marker on any content value that is a placeholder or unverified (see §6.6) |
| Spinbar | The tilted, scroll-linked card gallery component (`requirements.txt` §4) |
| Legacy site | The current Google Site, mirrored locally in [`iice.iiserb.ac.in/`](../iice.iiserb.ac.in/) |
| Editor | A non-developer IICE staff member who updates content via the CMS |

---

## 2. Stakeholders and audiences

### 2.1 Stakeholders
| Stakeholder | Interest |
|---|---|
| IICE Coordinator / CEO office | Credibility, applications, reporting to funders |
| IICE office staff (Editors) | Updating events, news, startups and announcements without a developer |
| IISER Bhopal (host institute) | Brand compliance, hosting on institute servers, GIGW alignment |
| DST / NSTEDB, BIRAC and other funders | Visible acknowledgement, evidence of impact |
| Developers / maintainers | Simple, typed, statically exported codebase |

### 2.2 Audiences (priority order, from `requirements.txt` §1)
| # | Audience | Primary task | Success signal |
|---|---|---|---|
| P1 | Prospective incubatees: founders, IISERB students and faculty, external entrepreneurs | Understand eligibility and the journey, then apply or pitch | Apply/Pitch form submitted |
| P2 | Funders, government bodies, industry partners, investors | Assess credibility and impact | Visits to stats/startups/documents; Contact form (partnership) |
| P3 | Mentors and ecosystem partners | Understand how to engage | Contact form (topic = mentoring) |
| P4 | Current startups | Find facilities, events, documents | Visits to Facilities/Events/Documents |
| P5 | Job seekers and the public | Find openings, events, contact details | Careers visits, event registrations |

### 2.3 Personas (short)
- **Ananya, PhD student at IISERB**, has a lab-stage idea. She needs to know whether she is eligible, what the stages are, and what she must prepare. She uses a mid-range Android phone on campus Wi‑Fi.
- **Rahul, external founder in Indore**, has a prototype. He needs to know whether externals can apply (yes, with an IISERB faculty mentor) and what facilities exist.
- **Dr. Mehta, program officer at a funding agency**, needs numbers, the startup portfolio and governance documents within two minutes.
- **Anjali, IICE office**, needs to post an event, an announcement with an expiry date, and a new startup, without asking a developer.

---

## 3. Goals and measurable objectives

| ID | Goal (`requirements.txt` §1) | Measure |
|---|---|---|
| G1 | Turn visitors into applicants | Apply CTA visible on every page; Pitch and Apply forms work; form-start → submit funnel tracked (if analytics enabled) |
| G2 | Build credibility fast | Stats, startups, partners and funders visible above the fold or within 2 scrolls on Home |
| G3 | Make programs, funding and facilities easy to understand | Each stage and scheme has its own card or page with unique copy; the Apply page shows the process in numbered steps |
| G4 | Staff update content without a developer | Editor can add an event, news item, startup, document and announcement via CMS, and it goes live after an automated build |
| G5 | Fast on mid-range phones and slow networks | Lighthouse mobile Performance ≥ 90; LCP < 2.5 s; CLS < 0.1 |

---

## 4. Problems with the legacy site (to be fixed)
Confirmed by analysis of the local mirror (2026-10-12):

| # | Problem | Evidence in mirror | Requirement that fixes it |
|---|---|---|---|
| L1 | Homepage is a wall of text; no stats, startups, events or CTA | `home.html` | FR-HOME-* |
| L2 | Social icons point to generic or stripped URLs | Footer links resolve to bare `google.com/url` | FR-GLOBAL-7 |
| L3 | Typos ("Mision", "Committes", "Acadamia", "Tresurer", "Intrument", "Bussiness Colleteral", "Deputing CEO") | Various pages | NFR-CONTENT-2 |
| L4 | Apply and Contact depend on external Google Forms | `forms.gle/…`, `docs.google.com/forms/…` | FR-FORMS-* |
| L5 | Navigation buried; committees spread over 4 pages | `about-us/committees/*` | FR-ABOUT-3 |
| L6 | Template placeholder text live on 3 section pages | `about-us.html` ("Lorem University"), `incubation.html` ("Goodwill, Sam"), `activities.html` ("Office Hours") | NFR-CONTENT-3 |
| L7 | Empty pages | Management Advisory Committee, Upcoming Events, Careers, BIRAC Edge ("Coming Soon"), `docs/application-form` | FR-GLOBAL-9 |
| L8 | Event pages unreachable from nav | `activities/aesdp`, `ramp`, `ramp-day-2-11-may`, `industry-acadamia-conclave-2-0` | FR-EVENTS-* |
| L9 | Broken links | `index.html` parent links, `../.html`, missing Business Proposal PDF | NFR-QUAL-3 |
| L10 | Stale or inconsistent people data | Team page lists a CEO; 2026 events name a Deputy CEO and a Project Incubation Manager who are not on the Team page; Dean R&D differs between pages | §8 open questions |
| L11 | Key documents only viewable through Google Drive iframes | Incubation Policy, By-Laws | FR-DOCS-* |

---

## 5. Functional requirements

Priority uses **MoSCoW** (M = must, S = should, C = could). Every FR has acceptance criteria (AC).

### 5.1 Global (all pages)
| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-GLOBAL-1 | M | Utility bar with an announcements ticker, social links and a search trigger | Shows only announcements whose `startsAt ≤ now < expiresAt` at build time **and** re-checked client-side; can be paused; hidden when no announcements are active |
| FR-GLOBAL-2 | M | Header with IICE and IISER Bhopal logos and DST/NSTEDB co-branding; transparent over the hero, solid after scroll | Transparent on Home hero only; solid elsewhere; text contrast ≥ 4.5:1 in both states |
| FR-GLOBAL-3 | M | Primary nav: max 7 items plus a persistent "Apply for Incubation" button | Nav item count ≤ 7; Apply button visible at all breakpoints (in the mobile drawer header on small screens) |
| FR-GLOBAL-4 | M | Grouped dropdowns (mega-menu) operable by keyboard, mouse and touch | Opens on click/Enter/Space; Esc closes and returns focus; no hover-only access |
| FR-GLOBAL-5 | M | Command palette (Cmd/Ctrl+K, plus a visible search button) searching pages, startups, events, news, documents and people | Results appear within 100 ms after the index loads; fully keyboard-operable; announced to screen readers |
| FR-GLOBAL-6 | M | Footer with audience-grouped links (About / For Startups / Ecosystem / Useful Links), address, phones, emails, socials, click-to-load map | Map iframe is **not** requested until the user activates it |
| FR-GLOBAL-7 | M | Social links come from `content/settings/site.json`; missing URLs hide the icon | No icon links to a generic platform homepage |
| FR-GLOBAL-8 | M | Light theme by default, dark mode supported (system preference + manual toggle, remembered) | No flash of the wrong theme on load |
| FR-GLOBAL-9 | M | Every page and nav entry resolves to real content; no `#` links | Link checker reports 0 broken internal links and 0 `href="#"` |
| FR-GLOBAL-10 | M | Legacy URLs redirect to their new equivalents | Every path in §7.2 returns the new page (HTTP 301 where the server allows; static redirect stub otherwise) |
| FR-GLOBAL-11 | C | Optional branded preloader, **off by default** (feature flag) | If enabled: ≤ 800 ms, first visit per session only, never covers the LCP element, skippable, disabled under `prefers-reduced-motion`. (Both reference preloaders we audited gated content for ≥ 1.5 s.) |
| FR-GLOBAL-12 | M | Dev-only placeholder banner listing live `TODO_CONFIRM` items on the current page | Never rendered in production builds |
| FR-GLOBAL-13 | C | Custom dot cursor on fine pointers | Disabled on touch devices and under reduced motion; native cursor is never hidden outside the spinbar |
| FR-GLOBAL-14 | M | Custom 404 page with search and key links | `out/404.html` exists and is served by the host; it says the link may be old or mistyped and offers Home, Apply and search |
| FR-GLOBAL-15 | S | **Intake status pill** next to the Apply button (e.g. "Applications open · closes 30 Nov", "Rolling applications", or "Next intake: to be announced"), driven by `content/opportunities` | Evaluated at build **and** on the client; never shows "open" after `closesAt` |
| FR-GLOBAL-16 | M | Visible breadcrumbs on every internal page, matching the `BreadcrumbList` JSON-LD | Present on all pages except Home |
| FR-GLOBAL-17 | C | Thin reading-progress bar on long documents (policies, scheme pages, news) | `aria-hidden`, transform-only, off under reduced motion |
| FR-GLOBAL-18 | M | Copyright year and "Last updated" dates come from data (build date / entry `updatedAt`), never hard-coded | No stale years |

### 5.2 Home
The homepage follows `requirements.txt` §5 with the tie-breaker applied: sections 7 ("Choose your path") and 8 ("Quick Tour") are **merged** into one audience-card section. The full section order and specifications are in [SPEC.md §3](../SPEC.md#3-homepage).

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-HOME-1 | M | Hero: headline with emphasised words, one-line sub-copy, two CTAs (Apply / Explore Startups), three-stage strip | LCP element is text or a ≤ 200 KB poster; no autoplay video above the fold |
| FR-HOME-2 | M | Impact stats strip with count-up on view, driven by `content/stats.json` | Count-up runs once and not under reduced motion; unconfirmed stats are **hidden in production** (see §6.6) |
| FR-HOME-3 | M | "Why IICE" ecosystem tiles (labs and co-working, mentoring, funding access, IP/legal/regulatory, networking, training, BIRAC Edge) | Short text by default; expanded text on hover **and** on tap/focus (button with `aria-expanded`) |
| FR-HOME-4 | M | Incubation journey: three named stages with duration, audience, funding band and schemes | Each stage links to its stage page; unconfirmed amounts show "To be announced" in production, never an invented figure |
| FR-HOME-5 | M | "Choose your path": four audience cards (Founders, Students, Mentors, Investors & Partners) combining quick-entry and quick-tour | Each card has 2–3 deep links to real pages |
| FR-HOME-6 | M | Startup Spotlight (spinbar) with 6–8 items from `content/spotlight.json` | See FR-SPIN-* |
| FR-HOME-7 | M | Startup logo carousel linking to the directory; pauses on hover/focus; previous/next controls | Has a pause control (WCAG 2.2.2); works without JS as a scrollable list |
| FR-HOME-8 | M | Upcoming events and latest news side by side with date chips | Shows up to 3 of each; falls back to past events if there are no upcoming ones |
| FR-HOME-9 | S | Testimonials slider | Only testimonials with `consent: true`; no autoplay, or autoplay with a pause control |
| FR-HOME-10 | M | Funders and partners logo wall | DST/NSTEDB and IISER Bhopal always present; every logo has descriptive alt text |
| FR-HOME-11 | M | "Pitch to Us" CTA band with a short form | See FR-FORMS-* |

### 5.3 Startup Spotlight / spinbar (reusable)
| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-SPIN-1 | M | Tilted portrait cards on a two-slot zig-zag path (implemented as an arc; SPEC §5.1); active card large and sharp, others dimmed and blurred | Matches SPEC §5.1 visual spec |
| FR-SPIN-2 | M | Scroll-linked pinning advances the cards; hover/focus may *preview* another card but scroll position remains the source of truth | transform/opacity only; ≥ 55 fps on a mid-range Android device in a performance trace |
| FR-SPIN-3 | M | Cards are real `<a href>` links in DOM order (never `div role=button` + `window.open`); focusing a card makes it active | Middle-click/open-in-new-tab works; tab order equals visual order; no focus trap; no scroll trap |
| FR-SPIN-9 | M | The active card's description is visible without hover (touch and keyboard users get the same information) | Verified on touch emulation |
| FR-SPIN-4 | M | Visible previous/next buttons and a "Showing N of M" status | Status is in a polite live region, updated only after the card settles |
| FR-SPIN-5 | M | `prefers-reduced-motion` renders a plain grid with no pin and no tilt | Verified with emulated media in an e2e test |
| FR-SPIN-6 | M | Touch / < 1024 px renders the **deck** variant (sticky stacked cards, tilt ≤ 4°, brightness dimming instead of blur, segmented progress) | Verified at 360 px width; no `filter: blur` on mobile |
| FR-SPIN-7 | M | Data-driven (badge, title, description, optional image, link); 6–8 cards max | Content validation rejects < 3 or > 8 items |
| FR-SPIN-8 | S | Reused on About for Milestones | Same component, different data source |

### 5.4 About
| ID | P | Requirement | AC |
|---|---|---|---|
| FR-ABOUT-1 | M | About overview: origin story, vision, mission, key functions (legacy text, proofread and tightened), milestones timeline | No typos (spell check passes) |
| FR-ABOUT-2 | M | Ecosystem page (host institute, location, region) | Facts carried over from legacy; dated facts (e.g. rankings) flagged TODO_CONFIRM |
| FR-ABOUT-3 | M | **One** Team & Committees page with tabs: Team, Managing, Executive, Technical Evaluation, Management Advisory | Each tab is deep-linkable (`#managing-committee` etc.); tabs follow the ARIA tabs pattern; content visible without JS |
| FR-ABOUT-4 | M | Innovation Club page (purpose, objectives, past members) | Duplicate legacy entry removed |
| FR-ABOUT-5 | M | Support & Funding page | Acknowledges DST/NSTEDB (NIDHI-TBI) and IISER Bhopal |
| FR-ABOUT-6 | S | Director's / Coordinator's message page | Shows photo, name, **role**, message and a dated sign-off; TODO_CONFIRM until supplied |
| FR-ABOUT-7 | S | Mentors directory with filters (mentor type, sector, location) and a "Become a mentor" form | Hidden from nav until at least one confirmed mentor exists; the URL still resolves with the form; filter values derived from data |
| FR-ABOUT-8 | S | **Impact page ("IICE in numbers")**: every figure shows its source and an "as of" date; unconfirmed figures are omitted, not estimated | Includes derived counts (e.g. startups in the directory, events held) computed from content so they cannot contradict listings |
| FR-ABOUT-9 | S | **Partners page** grouped by partner type, with a "Partner with us / CSR" section and a Partner/Co-invest form | Every logo has a text name; no group renders empty |
| FR-ABOUT-10 | C | **In the news** (press coverage): outlet, date, title, type (article/video), linked out | Sorted by date; latest 3 also shown on About |

### 5.5 Incubation and programs
| ID | P | Requirement | AC |
|---|---|---|---|
| FR-PROG-1 | M | Incubation overview with the staged journey | Links to all stage pages, Apply and Facilities |
| FR-PROG-2 | M | One page per stage (program/stage template): who it is for, duration, offerings checklist, funding band, schemes, FAQs, CTA | All fields from `content/stages/*` |
| FR-PROG-3 | M | Funding-scheme cards with unique copy per scheme | Content validation rejects duplicate `oneLiner` across schemes |
| FR-PROG-4 | S | Student Innovators / pre-startup program page | Linked from "Choose your path → Students" |
| FR-PROG-5 | M | Named recurring workshop series pages (e.g. legacy "The Start-up Studio" webinar series) | Series lists its events, grouped by edition |
| FR-PROG-6 | M | **Engagement tracks** ("Ways to work with us"), each with who it's for, duration, support, terms (fees/equity) and its own Apply link. Candidates: Physical incubation · Virtual incubation · Pre-incubation (students) · Co-development with IISER Bhopal faculty | Only tracks IICE confirms are shown (SRD Q8); each Apply link pre-selects the track (`/apply/?track=…`) |
| FR-PROG-7 | M | Stage/program pages state **outcomes**, **selection steps**, **program flow** (e.g. workshops → check-ins → demo day) and link to the **next stage** | Fields from `content/stages/*` |

### 5.5a Funding schemes and open calls
| ID | P | Requirement | AC |
|---|---|---|---|
| FR-SCHEME-1 | M | One detail page per funding scheme, opening with an **"At a glance" table**: maximum support, duration, purpose, funding agency, expected output, who can apply | All values from content; unconfirmed rows show "To be confirmed", never a guessed figure |
| FR-SCHEME-2 | M | Scheme page sections: what you get · eligibility · what the grant covers · **what it does not cover** · important points (e.g. no parallel grants) · selection process with screening time · documents checklist · application window/status · FAQ · contact · "last reviewed" date | Section hidden when its data is empty; no duplicated copy across schemes (validation) |
| FR-SCHEME-3 | S | **Cohorts and beneficiaries** list per scheme (cohort label, startup name, one-line innovation, link to the startup page) | Doubles as implementation evidence for funders |
| FR-SCHEME-4 | M | Status banner: "Open · closes {date}", "Rolling", "Opens {date}", or "Closed" | Derived from the application window; a scheme cannot be both rolling and closed (validation) |
| FR-OPP-1 | S | **Open calls hub** (`/opportunities/`) listing current calls: cohort intakes, scheme calls, challenges, accelerator and corporate programmes, fellowships | Each shows sponsor, deadline and status; expired calls move to "Past calls" automatically (client + daily rebuild) |
| FR-OPP-2 | S | Announcements and the header status pill can reference an opportunity | Single source: the opportunity's dates drive all three |

### 5.5b Services from the host institute
| ID | P | Requirement | AC |
|---|---|---|---|
| FR-SERV-1 | S | **Services page**: IP and technology-transfer support, testing and validation through IISER Bhopal facilities, co-development with faculty, regulatory guidance | Each service lists who can use it, typical turnaround and an enquiry route; details TODO_CONFIRM |

### 5.6 Apply
| ID | P | Requirement | AC |
|---|---|---|---|
| FR-APPLY-1 | M | Apply page: intro, eligibility, thrust areas, numbered "Getting Started" process, documents required, FAQ, then the form | Eligibility and thrust areas carried over from legacy |
| FR-APPLY-2 | M | Eligibility check (3–4 questions) before the form, with a clear outcome | Outcomes: eligible, eligible-with-IISERB-mentor, not eligible (with an alternative route); never blocks submission outright |
| FR-APPLY-3 | M | Multi-step form (Applicant → Venture → Technology & IP → Needs → Review) with a progress indicator | Back/next keep values; errors are summarised at the top and linked to fields; works at 360 px |
| FR-APPLY-4 | M | Partner-university or external applicants must name an IISERB faculty mentor/collaborator | Conditional required fields enforced client- and endpoint-side |
| FR-APPLY-5 | M | Draft auto-saved to `localStorage` and restorable; cleared on success | Draft survives reload |
| FR-APPLY-6 | M | Business plan and IP documents collected as shareable links in v1 | URL fields validated as https URLs |
| FR-APPLY-7 | M | Track and stage can be pre-selected via query (`?track=virtual&stage=catalyse`) from track, stage and scheme pages | Invalid values are ignored, not errors |
| FR-APPLY-8 | S | Downloadable **templates** beside the form: pitch-deck template, Business Proposal Format | Served from Documents (category `template`); TODO_CONFIRM until IICE supplies them |
| FR-APPLY-9 | M | The confirmation screen shows a reference ID, what happens next, the expected screening time and a contact | Screening time TODO_CONFIRM; never promise a time IICE has not confirmed |

### 5.7 Startups
| ID | P | Requirement | AC |
|---|---|---|---|
| FR-START-1 | M | Directory with search and filters: sector, stage, cohort year, status | Filters reflected in the URL query string (shareable); works without JS as a full list |
| FR-START-2 | M | Startup detail page: logo, one-liner, description, sector, stage, status, founders, links, awards | Statically generated per startup |
| FR-START-3 | M | Seed with the 14 legacy startup names | Names carried over; all other fields TODO_CONFIRM |
| FR-START-4 | M | Filter values (facets) are **derived from the data**, show counts (e.g. "Healthcare & Bioengineering (5)"), combine with **AND across groups / OR within a group**, and are unit-tested | A reference site's filters silently matched nothing because labels ("Batch 1") differed from data ("Batch 01"); our tests must catch this class of bug |
| FR-START-5 | M | Additional filters: **track** and **funding scheme**; status tabs Current · Graduated · Pre-startups | Scheme filter links startups to the schemes that funded them |
| FR-START-6 | S | Optional **story** on startup pages in a Problem → Approach → Outcome format, with outcomes TODO_CONFIRM until verified | Stories also listed as "Success stories" on Incubation |
| FR-START-7 | M | Every stored field that is meant to be public is actually rendered (no "stored but hidden" data) | Schema review checklist |

### 5.8 Events and news
| ID | P | Requirement | AC |
|---|---|---|---|
| FR-EVENTS-1 | M | Events listing with Upcoming/Past tabs and filters (type, series, year) | Upcoming/past computed from dates in IST; re-evaluated client-side so that a stale build does not mislabel events |
| FR-EVENTS-2 | M | Event detail: date/time, venue, mode, speakers, summary, body, gallery, registration link | JSON-LD `Event` emitted |
| FR-EVENTS-3 | M | Add to calendar: downloadable `.ics` plus a Google Calendar link | `.ics` validates (RFC 5545) and uses the `Asia/Kolkata` time zone |
| FR-EVENTS-4 | M | Registration link shown only while open | Hidden after `registrationClosesAt` or the event start |
| FR-EVENTS-5 | M | Migrate legacy events (≈10, 2023–2026) | All legacy event pages reachable; old URLs redirect |
| FR-EVENTS-6 | S | Recurring series carry an **edition** label (e.g. "3.0"); series pages list all editions | — |
| FR-EVENTS-7 | S | Event pages support a **timeline** of rounds (call → deadline → shortlist → finale), a **day-wise agenda** (time, session, room, speakers), people by role (speaker, jury, panellist, moderator, chief guest), and **results/winners** after the event | Sections hidden when empty |
| FR-EVENTS-8 | S | "Invite IICE / partner on an event" call to action at the end of the events list | Opens Contact with topic preset |
| FR-NEWS-1 | M | News list and news detail template with cards | Sorted by date desc; OpenGraph per article |
| FR-NEWS-2 | S | RSS feed for news (`/news/rss.xml`), linked in the footer and `<head>` | Valid RSS 2.0 |

### 5.9 Documents
| ID | P | Requirement | AC |
|---|---|---|---|
| FR-DOCS-1 | M | Documents library: title, category, date, version, file size, search, PDF download | Downloads served from our own host, not Google Drive |
| FR-DOCS-2 | M | Resolutions/By-Laws and Incubation Policy carried over | PDFs obtained from IICE (handover item); TODO_CONFIRM until supplied |
| FR-DOCS-3 | S | Superseded versions remain accessible, labelled "Superseded" | — |

### 5.10 Facilities, Careers, BIRAC Edge, Contact
| ID | P | Requirement | AC |
|---|---|---|---|
| FR-FAC-1 | M | Facilities: gallery plus equipment list | 12 legacy facility types carried over, with typos fixed |
| FR-FAC-2 | M | Facilities are **quantified** where known: floor area, seats, private offices, meeting rooms, hours of access; a co-working facts block | Unknown numbers hidden (TODO_CONFIRM), never estimated |
| FR-FAC-3 | S | **Instrument catalogue** (`/incubation/facilities/instruments/`): category, make/model, key specs, typical uses, access mode (self-use / operator-assisted / via the Central Instrumentation Facility), and an indicative **rate card by user category** (incubatee, IISER Bhopal, external academic, industry) with unit and GST note | Rates TODO_CONFIRM; one rate source per instrument (no conflicting tables); links to IISER Bhopal CIF pages instead of duplicating them |
| FR-FAC-4 | S | **Booking request form** for facilities and instruments (instrument, preferred dates, sample type, user category) | Sends to the form endpoint; the confirmation explains that the office confirms availability |
| FR-FAC-5 | S | Usage policy for shared facilities available as an accessible HTML page with an optional PDF | Listed in Documents |
| FR-CAREER-1 | M | Careers split into "Work with IICE" and "Work with incubated startups" | Expired jobs hidden automatically; empty state links to Contact |
| FR-BIRAC-1 | M | BIRAC Edge page | Content TODO_CONFIRM; must not say "Coming Soon" in production |
| FR-CONTACT-1 | M | Contact page: form beside the address, phones, emails, click-to-load map | Contact details exactly as in `requirements.txt` §2 |
| FR-CONTACT-2 | S | Contact channels **by intent** (Incubation · Partnerships & investors · Facilities & bookings · Media · General), office hours, and a "Get directions" link | Channel emails and hours TODO_CONFIRM; a stated response time appears only if IICE commits to it |
| FR-LEGAL-1 | M | Privacy policy names a **Grievance Officer**, the applicable law (Digital Personal Data Protection Act, 2023), purposes, retention and a "last updated" date | Officer name TODO_CONFIRM |

### 5.11 Forms (Contact, Pitch, Apply)
| ID | P | Requirement | AC |
|---|---|---|---|
| FR-FORMS-1 | M | Forms POST to a single endpoint configured by an environment variable | No endpoint configured → forms render a mailto fallback and a dev warning |
| FR-FORMS-2 | M | Client validation (shared schema) **and** endpoint-side validation | Endpoint rejects invalid payloads with field errors |
| FR-FORMS-3 | M | Spam protection without paid SDKs: honeypot field + minimum fill time | Bot payloads are silently accepted (HTTP 200) but discarded |
| FR-FORMS-4 | M | Success and error states; network failure keeps the user's input | Error state offers retry and a mailto fallback |
| FR-FORMS-5 | M | Consent checkbox and privacy notice link | Submission blocked without consent |
| FR-FORMS-6 | M | Submissions are stored (Sheet) and the IICE office is notified by email | Reference Apps Script provided |
| FR-FORMS-7 | S | Additional form types on the same endpoint: **mentor** (Become a mentor), **partner** (Partner / Co-invest / CSR), **booking** (facility/instrument request); **newsletter** (could) | Each routed to its own Sheet tab and notification address |
| FR-FORMS-8 | M | Every input has a programmatically associated `<label>` (placeholders are never the only label); required fields are marked in text, not only with an asterisk; buttons have specific labels ("Send pitch", not "Submit") | axe + HTML audit pass |

### 5.12 Content editing (CMS)
| ID | P | Requirement | AC |
|---|---|---|---|
| FR-CMS-1 | M | Editors can create and edit startups, events, news, documents, announcements, jobs, people and partners via a web UI | Demonstrated end-to-end once the hosting/auth decision is made (see TRD §9) |
| FR-CMS-2 | M | Every publish triggers validation and a build; invalid content fails the build with a readable message | Error names the file and the field |
| FR-CMS-3 | M | Image uploads are optimised automatically at build time | No manual resizing needed |
| FR-CMS-4 | M | Announcements have start and expiry dates | Expired ones disappear without an edit |

### 5.13 Developer tooling
| ID | P | Requirement | AC |
|---|---|---|---|
| FR-DEV-1 | M | `npm run todo:confirm` lists every `TODO_CONFIRM` with file, field path and note | Exit code 0; prints a count |
| FR-DEV-2 | M | `npm run check:launch` fails while any `TODO_CONFIRM` remains in content used by a production page | Intended as the pre-launch gate |
| FR-DEV-3 | M | `lint`, `typecheck` and `build` pass in CI | Required before merge |

---

## 6. Non-functional requirements

### 6.1 Performance
| ID | Requirement |
|---|---|
| NFR-PERF-1 | Lighthouse **mobile**: Performance ≥ 90, Accessibility = 100, Best Practices ≥ 95, SEO ≥ 95, on every page template |
| NFR-PERF-2 | LCP < 2.5 s, CLS < 0.1, INP < 200 ms (Lighthouse mobile throttling) |
| NFR-PERF-3 | No hero asset > 500 KB (target ≤ 200 KB); images in AVIF/WebP with responsive `srcset` and lazy loading below the fold |
| NFR-PERF-4 | Budgets in TRD §12 (JS, CSS, fonts) are enforced in CI |
| NFR-PERF-5 | Ship **one** animation library (Motion). No GSAP, jQuery, WOW.js, particles.js or odometer widgets. No GIFs (convert to video or animated WebP/AVIF). No image frame-sequence heroes |
| NFR-PERF-6 | Lists and directories (startups, mentors, events, instruments) are pre-rendered as HTML at build time, never fetched and parsed in the browser (e.g. from spreadsheets) |

### 6.2 Accessibility and GIGW
| ID | Requirement |
|---|---|
| NFR-A11Y-1 | WCAG 2.2 AA: contrast, keyboard operability, skip link, landmarks, focus visible (2.4.11 focus not obscured), target size ≥ 24×24 px (2.5.8) |
| NFR-A11Y-2 | Never disable zoom (`user-scalable=no` / `maximum-scale=1` are forbidden) |
| NFR-A11Y-3 | Every meaningful image has descriptive alt text; decorative images use `alt=""`. Generic alts ("logo", "image", "index", "web design") are rejected by validation |
| NFR-A11Y-4 | All motion respects `prefers-reduced-motion`; nothing flashes more than 3 times per second |
| NFR-A11Y-5 | GIGW 3.0 where practical: accessibility statement, privacy policy, terms/disclaimer, copyright, hyperlink policy, "last updated" date on content pages, sitemap page, feedback/contact, Screen Reader Access page, Hindi-ready structure |
| NFR-A11Y-6 | Exactly one `<h1>` per page; no skipped heading levels; headings are never used for styling only |
| NFR-A11Y-7 | Every icon-only control (menu, social, close, carousel arrows, scroll-to-top) has an accessible name; every `<iframe>` has a `title`; linked logos have alt text naming the destination |
| NFR-A11Y-8 | No generic link text ("Click here", "Read more", "Know more") without an accessible name that includes the destination; one tab stop per card (no duplicate image + title links) |
| NFR-A11Y-9 | Never hide the page scrollbar; never remove focus outlines without a visible replacement; ARIA IDs contain no spaces |
| NFR-A11Y-10 | Information is never only in an image (e.g. a process diagram must also be text) |

### 6.3 Security and privacy
| ID | Requirement |
|---|---|
| NFR-SEC-1 | No secrets in the client bundle; the form endpoint URL is public by nature and is protected by validation and spam controls |
| NFR-SEC-2 | Security headers configured on the host (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy); samples in TRD §14 |
| NFR-SEC-3 | Third-party requests (map, video, analytics) occur only after user action or consent where applicable |
| NFR-SEC-4 | Personal data collected only via forms, for stated purposes; the retention period is documented in the privacy policy (TODO_CONFIRM with IICE) |
| NFR-SEC-5 | No placeholder contact data (e.g. `contact@example.com`), no links to staging/preview hosts, no malformed `mailto:` (`http://`, `%20`), and displayed email = `mailto` target. Checked at build |

### 6.4 SEO
| ID | Requirement |
|---|---|
| NFR-SEO-1 | Per-page title and description, canonical URL, OpenGraph and Twitter cards |
| NFR-SEO-2 | `sitemap.xml` and `robots.txt` generated at build |
| NFR-SEO-3 | JSON-LD: `Organization` (site-wide), `Event` (event pages), `BreadcrumbList` (internal pages); `NewsArticle` on news pages (should) |
| NFR-SEO-4 | Unique `<title>` and meta description on every page (no duplicated brand like "IICE - IICE"); `og:type=website` on Home, `article` on news; drafts and sample pages never appear in the sitemap; every sitemap URL returns 200 |
| NFR-SEO-5 | Numbers that animate (stats) are present as final values in the HTML, so crawlers, link previews and no-JS users never see "0" |

### 6.5 Internationalisation
| ID | Requirement |
|---|---|
| NFR-I18N-1 | English default. All UI strings come from a message catalogue, not hard-coded |
| NFR-I18N-2 | Adding Hindi later requires only translated files plus a locale switch, with no component rewrites |
| NFR-I18N-3 | The font stack includes a Devanagari-capable fallback; layouts tolerate roughly 30% longer strings |

### 6.6 Content integrity (honesty rules, `requirements.txt` §10)
| ID | Requirement |
|---|---|
| NFR-CONTENT-1 | Never invent statistics, funding amounts, startup names, testimonials, team members or dates. Unknown values carry `TODO_CONFIRM` |
| NFR-CONTENT-2 | All copy passes spell check (custom dictionary for proper nouns) |
| NFR-CONTENT-3 | No lorem ipsum anywhere; CI fails on `lorem`, `ipsum`, `Goodwill, Sam`, `Course Name`, `Article Name Here` |
| NFR-CONTENT-4 | Placeholder copy reads plausibly but is flagged. Unconfirmed **numbers** are not rendered as numbers in production |
| NFR-CONTENT-5 | Text, images, logos, code and distinctive layouts from reference sites are never copied; only ideas are reused |
| NFR-CONTENT-6 | **One source of truth per fact.** Money is always formatted by one helper (e.g. "₹10 lakh"); dates by one helper ("12 Nov 2026"); counts that can be derived from content (startups listed, events held) are derived, not typed. A claimed stat that contradicts a derived count fails validation |
| NFR-CONTENT-7 | Every event, news item, call and job is dated with a full date including the year; deadlines without a year are invalid |
| NFR-CONTENT-8 | Testimonials are attributed to a named founder of the named startup (validated against the startup's founder list when both exist) |
| NFR-CONTENT-9 | "Coming soon", "Sample Page", "example.com" and empty sections never ship in production; a page with no content is removed from nav and sitemap instead |

### 6.7 Compatibility and quality
| ID | Requirement |
|---|---|
| NFR-COMPAT-1 | Responsive from 360 px to 1920 px, mobile-first |
| NFR-COMPAT-2 | Last 2 versions of Chrome, Edge, Firefox and Safari (iOS and macOS), plus Samsung Internet |
| NFR-COMPAT-3 | Core content and navigation work without JavaScript; enhancements degrade gracefully |
| NFR-QUAL-1 | Static export, deployable to any static host including institute servers |
| NFR-QUAL-2 | Build fails on invalid content, broken references or type errors |
| NFR-QUAL-3 | 0 broken internal links; external links checked weekly (warning only) |
| NFR-QUAL-4 | An **HTML audit** of the built site enforces the anti-pattern checklist in Appendix A.6 (no `href="#"`, no action-less buttons, alt-text rules, one h1, iframe titles, unique titles/descriptions, no forbidden copy, no hotlinked third-party images, no filenames with spaces) and fails CI on violations |

---

## 7. Content migration

### 7.1 Inventory from the legacy mirror
| Legacy page | Usable content | Action |
|---|---|---|
| `home` | Intro, vision, mission, key functions, funding acknowledgement, contact | Proofread, tighten, reuse (SPEC §8) |
| `about-us` | **Template placeholder** | Discard; write a new About overview |
| `about-us/ecosystem` | 3 paragraphs on campus and region | Reuse; flag "Nature Index 2020" ranking and the "IT Park under construction" claim TODO_CONFIRM (dated). The legacy text says 11 departments but lists 9 |
| `about-us/team` | 3 people with emails and phones | Reuse; current roster TODO_CONFIRM (see L10) |
| `about-us/committees/*` | Managing (7), Executive (6), TEC (9) members; Management Advisory empty | Reuse; all flagged TODO_CONFIRM for currency; MAC members needed |
| `about-us/innovation-club` | Purpose, 3 "C"s, objectives, 11 past members (1 duplicate) | Reuse; deduplicate |
| `about-us/support-funding` | 1 paragraph | Reuse |
| `about-us/resolutions`, `incubation-policy` | Google Drive PDF embeds | Obtain PDFs (handover); add to Documents |
| `incubation` | **Template placeholder** | Discard; new Incubation overview |
| `incubation/apply` | Eligibility (4 rules + footnote), 5 thrust areas, required documents | Reuse in Apply |
| `incubation/facilities` | 12 facility names | Reuse with typos fixed; descriptions TODO_CONFIRM |
| `startups` | 14 startup names, some logos | Seed directory; all details TODO_CONFIRM |
| `activities` | **Template placeholder** | Discard |
| `activities/past-events` + 4 event pages | ≈10 events, 2023-01 to 2026-08, with dates, speakers, descriptions | Migrate to `content/events/` |
| `activities/upcoming-events`, `careers`, `birac-edge`, `docs/application-form` | Empty | New content TODO_CONFIRM |
| Images | 26 present locally, 50 never downloaded, 21 banner images remote-only | Request originals from IICE; never hotlink Google image URLs |

### 7.2 Legacy URL redirects (FR-GLOBAL-10)
| Legacy path | New path |
|---|---|
| `/home` | `/` |
| `/birac-edge` | `/birac-edge/` |
| `/about-us` | `/about/` |
| `/about-us/ecosystem` | `/about/ecosystem/` |
| `/about-us/team` | `/about/team/` |
| `/about-us/committees` | `/about/team/#committees` |
| `/about-us/committees/managing-committee` | `/about/team/#managing-committee` |
| `/about-us/committees/executive-committee` | `/about/team/#executive-committee` |
| `/about-us/committees/technical-evaluation-committee` | `/about/team/#technical-evaluation-committee` |
| `/about-us/committees/management-advisory-committee` | `/about/team/#management-advisory-committee` |
| `/about-us/innovation-club` | `/about/innovation-club/` |
| `/about-us/support-funding` | `/about/support-funding/` |
| `/about-us/resolutions` | `/documents/?category=resolution` |
| `/about-us/incubation-policy` | `/documents/?category=policy` |
| `/incubation` | `/incubation/` |
| `/incubation/apply` | `/apply/` |
| `/incubation/facilities` | `/incubation/facilities/` |
| `/startups` | `/startups/` |
| `/activities` | `/events/` |
| `/activities/upcoming-events` | `/events/` |
| `/activities/past-events` | `/events/?view=past` |
| `/activities/aesdp` | `/events/a-esdp-data-science-2026/` |
| `/activities/ramp` | `/events/ramp-mp-laghu-udyog-nigam-orientation-2026/` |
| `/activities/ramp-day-2-11-may` | `/events/ramp-msme-exposure-session-2026/` |
| `/activities/industry-acadamia-conclave-2-0` | `/events/industry-academia-conclave-2026/` |
| `/careers` | `/careers/` |
| `/docs/application-form` | `/apply/` |

Final event slugs are fixed in `content/events/`; this table must be kept in sync, and a test enforces that every redirect target exists.

---

## 8. Assumptions, constraints, dependencies

### 8.1 Constraints
- Static export only: there is no application server we run. Dynamic behaviour is client-side, or lives at the external form endpoint.
- Must be hostable on IISER Bhopal institute servers (assumed Apache or Nginx; TODO_CONFIRM).
- No paid SDKs or services are required to operate the site.

### 8.2 Assumptions (to validate)
- A1: IICE can create a Google Workspace / Gmail-owned Apps Script and Sheet for form submissions.
- A2: The site's source will live in a GitHub repository owned by IICE or IISERB (needed for CMS and CI).
- A3: IISER Bhopal permits the use of its logo; brand colours will be supplied.
- A4: Event times are in IST (Asia/Kolkata).

### 8.3 Dependencies on IICE (handover checklist)
Engagement tracks offered and their terms · funding-scheme details (at-a-glance values, covered and non-permitted uses, cohorts and beneficiaries) · open calls with dates · facility capacities (area, seats, offices) · instrument list with make/model and rate cards · services offered via IISER Bhopal · mentor list with types and sectors · partner list with categories · press coverage links · contact channels by intent, office hours · Grievance Officer · pitch-deck template · Logo SVGs (IICE, IISER Bhopal, DST/NSTEDB, BIRAC) · brand colours · photos (lab, campus, events, team) · the 50 missing legacy images in original resolution · startup data (sector, stage, year, status, founders, logo, website) · team bios and photos · current committee lists, including the Management Advisory Committee · real social URLs · Incubation Policy, By-Laws and Business Proposal Format PDFs · final stats with sources · stage durations and funding bands · funding schemes IICE actually administers · testimonials with written consent · director's message · privacy-policy retention period · form endpoint owner account · analytics choice and ID · hosting target and deploy access · domain/DNS access.

### 8.4 Open questions
| # | Question | Blocks |
|---|---|---|
| Q1 | Who is the current CEO / Deputy CEO, and what is the full current team? (Legacy pages conflict) | Team page |
| Q2 | Who is the current IISER Bhopal Director, for the message page? (A Feb 2026 page names Prof. Gobardhan Das; an Aug 2026 page names Prof. Raghuvir Singh Tomar as Director In-Charge) | Director's message, Managing Committee |
| Q3 | Hosting: institute server, or a static host (Cloudflare Pages / Netlify / GitHub Pages)? | CMS auth, redirects, headers |
| Q4 | Which funding schemes does IICE administer today, and with what amounts? | Journey, scheme cards |
| Q5 | Stage durations and intake cycle (rolling or cohorts)? | Stage pages, Apply |
| Q6 | Is BIRAC Edge an active program at IICE, with what content? | BIRAC Edge page |
| Q7 | Analytics: none, privacy-friendly (Plausible/Umami), or GA4? | Consent text |
| Q8 | Which engagement tracks does IICE offer (physical, virtual, pre-incubation, co-development), and on what terms (fees, equity)? | Tracks section, Apply |
| Q9 | Can IICE publish instrument access and indicative charges, and does the CIF handle external bookings? | Instrument catalogue, booking form |
| Q10 | Does IICE accept CSR funding or co-investment partners, and who is the contact? | Partners page, partner form |
| Q11 | Who is the Grievance Officer for the privacy policy? | Privacy page |
| Q12 | Should the site offer a newsletter, and who will send it? | Newsletter form (could) |
| Q13 | Does IICE publish tenders? (Common on government-funded TBI sites; add a Documents category only if yes) | Documents |

---

## 9. Traceability (requirements.txt → this SRD)
| requirements.txt | Covered by |
|---|---|
| §1 Goals (a)–(e) | G1–G5, FR-HOME-*, FR-CMS-*, NFR-PERF-* |
| §1 Legacy problems | §4 L1–L5 |
| §2 Pages and contact | §5.4–5.10, FR-CONTACT-1, §7 |
| §3 Reference ideas | FR-GLOBAL-1/3/4/5/11/13, FR-HOME-*, FR-PROG-*, FR-ABOUT-6/7, FR-CAREER-1 (mapping in SPEC §9) |
| §3b Flaws to avoid | FR-GLOBAL-9, FR-PROG-3, NFR-A11Y-2/3, NFR-CONTENT-2, FR-HOME-1, FR-GLOBAL-11 |
| Tie-breakers | FR-GLOBAL-3, NFR-PERF-4, FR-HOME-5 |
| §4 Spinbar | FR-SPIN-1…8 |
| §5 Homepage order | FR-HOME-*, SPEC §3 |
| §6 Templates | §5.5–5.10 |
| §7 Design | SPEC §6 |
| §8 Tech | TRD |
| §9 Quality bars | §6 NFRs, TRD §12–13 |
| §10 Honesty | NFR-CONTENT-*, FR-DEV-1/2, FR-GLOBAL-12 |
| §11 Deliverables | TRD §16 |
| Reference-site audit (2026-10-13) | Appendix A; FR-GLOBAL-15…18, FR-PROG-6/7, FR-SCHEME-*, FR-OPP-*, FR-SERV-1, FR-APPLY-7…9, FR-START-4…7, FR-EVENTS-6…8, FR-NEWS-2, FR-FAC-2…5, FR-CONTACT-2, FR-LEGAL-1, FR-FORMS-7/8, NFR-A11Y-6…10, NFR-PERF-5/6, NFR-SEO-4/5, NFR-CONTENT-6…9, NFR-SEC-5, NFR-QUAL-4 |

---

## Appendix A. Reference-site audit (2026-10-13)
Each site was fetched page by page (homepage, navigation, sitemaps and key templates). Only **ideas** are recorded here; nothing was copied. Findings that became requirements are linked by ID.

### A.1 IIT Mandi Catalyst (iitmandicatalyst.in)
- **Hand-built static Bootstrap site.** Directories are loaded from `.xlsx` files parsed in the browser.
- **Learned:**
  - "Grant at a glance" table per scheme (FR-SCHEME-1).
  - Non-permitted uses and important points (FR-SCHEME-2).
  - Program flow and next phase (FR-PROG-7).
  - Lab rate card by user category, with GST and billing unit (FR-FAC-3).
  - Co-work facts block (FR-FAC-2).
  - Day-wise event agenda and past-edition numbers (FR-EVENTS-7).
  - Directory filtered by scheme (FR-START-5).
  - Mentor filters by type, sector and location (FR-ABOUT-7).
  - Privacy policy with a named grievance officer (FR-LEGAL-1).
- **Avoid:**
  - `#` links on every dropdown parent and on about 25 buttons.
  - `contact@example.com` left live.
  - Filter labels that don't match the data, and OR-combined facets.
  - The same amount shown as "10 Lacs", "10 Lakhs" and "₹10 Lakhs".
  - A "600+ startups" claim against about 414 listed.
  - "Closed" and "rolling" shown on the same scheme.
  - Jobs past their closing date still advertised.
  - A process shown only as an image with `alt="img"`.
  - JS-only lists and counters, a full-screen preloader, about 3.4 MB of homepage images, and no contact page.

### A.2 BITS Pilani Hyderabad TBI (tbi.bits-hyderabad.ac.in)
- **Astro static site with islands, fast HTML.**
- **Learned:**
  - Three program tiers: incubation, pre-incubation and virtual (FR-PROG-6).
  - Facilities with area, counts and equipment, linking to the host's shared facilities (FR-FAC-2/3).
  - Separate governance and stakeholder groups.
  - A landing-page template per government scheme (FR-SCHEME-*).
  - A numbered student pitch series with editions (FR-EVENTS-6).
  - Office hours and directions (FR-CONTACT-2).
  - Stats for employment generated and startup revenue (candidate stats).
- **Avoid:**
  - Apply buttons that do nothing, `#` links, and a 404 from the footer contact link.
  - Live lorem ipsum, and "Coming Soon" pages linked from the nav.
  - Counts in prose ("thirteen") that contradict the cards shown (23).
  - Counters that read "0" in the HTML.
  - `alt="index"` on startup logos.
  - Unnamed icon buttons, untitled map iframes, multiple h1s, ARIA IDs containing spaces.
  - A 4.4 MB decorative GIF.
  - No meta description, OpenGraph tags, sitemap or robots.txt, and undated news and events.
  - Program pages with no eligibility or terms. This is the biggest conversion gap.

### A.3 AIC-CCMB (aic.ccmb.res.in)
- **WordPress + Elementor site, about 25 scripts and 5 font families.**
- **Learned:**
  - An engagement-model chooser: physical, virtual, pre-incubation and co-development (FR-PROG-6).
  - A separate instruments catalogue (FR-FAC-3).
  - A host-institute services and technology-transfer page (FR-SERV-1).
  - Scheme template with uses of funds, quantum and status (FR-SCHEME-*).
  - Portfolio tabs for residents, graduates and funded startups, with scheme and year (FR-START-5).
  - Contact split by intent (FR-CONTACT-2).
  - Student program with modules and past cohorts.
  - Press coverage with outlet (FR-ABOUT-10).
- **Avoid:**
  - Nav parents set to `#`.
  - Counters at "0" that leak into the OG description.
  - The same tile block duplicated across five pages.
  - Filename or empty alt text, and generic "Read more" links.
  - No h1 on Home.
  - Stale events and media (newest from 2022).
  - Wrong mentor and startup links, and displayed emails that differ from their `mailto` target.
  - WordPress "Sample Page" still indexed.
  - 1.3–1.7 MB PNG hero banners with text baked into the image.

### A.4 DERBI Foundation (derbifoundation.com)
- **WordPress + Divi site, about 36 scripts and 3 font families in all weights.**
- **Learned:**
  - Co-investor intake form and mentor sign-up form (FR-FORMS-7).
  - Pitch-deck template download (FR-APPLY-8).
  - Program pages built on outcomes and selection steps (FR-PROG-7).
  - Scheme pages listing cohorts and beneficiaries (FR-SCHEME-3).
  - Partners grouped by type (FR-ABOUT-9).
  - Equipment catalogue with charges (FR-FAC-3).
  - An open-calls hub (FR-OPP-1).
  - Event round timelines and results (FR-EVENTS-7).
  - Sector focus tiles.
- **Avoid:**
  - Zoom blocked (`user-scalable=0`).
  - `#` parents, an anchor with no target, and links to a staging host.
  - "Click here" links.
  - UUID alt text.
  - Duplicated blocks and copy, and testimonials attributed to the wrong person.
  - Stale posts, with an empty but indexed events page.
  - A deadline with no year.
  - An autoplay hero video with no poster.
  - A blocking preloader.
  - Two h1s, and draft pages left in the sitemap.
  - Form fields marked only with an asterisk, and no privacy notice or success message.

### A.5 Zaid Sayyed portfolio (zaidsayyed.in)
- **Next.js (not a static export), with GSAP + ScrollTrigger and Motion both shipped, about 990 KB of JS.**
- **Learned:**
  - The spinbar is really a **rotating arc**. Cards are rotated tangent to a circle and the lower half is masked out. On touch devices it becomes a **sticky deck** with segmented progress (SPEC §5.1).
  - Section headings with an index and a data-derived count.
  - A "live numbers" page where every figure names its source and hides when it can't be verified (FR-ABOUT-8).
  - Problem → Approach → Outcome case studies (FR-START-6).
  - An availability pill (FR-GLOBAL-15).
  - Breadcrumbs, and filter chips with counts (FR-GLOBAL-16, FR-START-4).
  - A reading-progress bar (FR-GLOBAL-17).
  - RSS (FR-NEWS-2) and a friendly 404 (FR-GLOBAL-14).
  - Command palette groups with hints.
- **Avoid:**
  - Gallery cards built as `div role=button` + `window.open` instead of links.
  - Descriptions that only appear on hover.
  - `href="#"` repository links.
  - Labels not tied to inputs, and a generic "Submit" button.
  - A hidden scrollbar.
  - About 3:1 contrast on metadata text.
  - No skip link, and dark mode only.
  - A preloader of 1.5 s or more.
  - A 120-frame hero image sequence.
  - Two animation libraries shipped.

### A.6 Anti-pattern checklist (enforced by NFR-QUAL-4)
The patterns below are checked mainly by the HTML audit over `out/`, with some checks in content validation.
1. `href="#"`, an empty `href`, or an anchor whose target doesn't exist.
2. A `<button>` with neither a handler nor `type="submit"`.
3. Alt text that is empty on a meaningful image; equal to its filename; made of digits only; a UUID; or a generic word (`logo`, `image`, `img`, `icon`, `index`, `card`, `banner`, `web design`, `clients`, `loader image`).
4. More than one `<h1>`; a skipped heading level; an `<iframe>` without a `title`; an icon-only control without a name; a form control without a label.
5. A duplicate `<title>` or meta description; a missing description.
6. Forbidden copy: `lorem`, `ipsum`, `Coming Soon`, `Sample Page`, `example.com`, `Course Name`, `Article Name Here`, `Goodwill, Sam`.
7. Hotlinked third-party images; links to staging or preview hosts; malformed `mailto:`.
8. Asset filenames containing spaces; GIF files; images over budget.
9. Stat elements whose server-rendered value is `0` or empty.
10. `maximum-scale` or `user-scalable` in the viewport; `scrollbar-width: none`; `outline: none` without a `:focus-visible` replacement.
