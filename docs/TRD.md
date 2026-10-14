# TRD: Technical Requirements and Design
**Version:** 0.2 (draft) · **Date:** 2026-10-13. 0.2 adds the outcomes of the reference-site audit (SRD Appendix A): ring/deck spinbar, data-derived facets, derived stats and formatters, an HTML anti-pattern audit, RSS, and new routes, collections and form types.
**Read with:** [SRD.md](SRD.md) (what and acceptance) · [../SPEC.md](../SPEC.md) (UX) · [BACKEND_SCHEMA.md](BACKEND_SCHEMA.md) (data)

This document defines **how** the site is built, deployed and verified. Where it departs from the defaults in `requirements.txt` §8, it says so and gives a one-paragraph justification.

---

## 1. Architecture overview

```
 Editors ──► CMS UI (/admin, Decap) ──commit──►  GitHub repo  ◄──commit── Developers
                                                    │
                                          GitHub Actions CI
              validate content (Zod) → lint → typecheck → test → build (next build, output: export)
              → image pipeline → search index → .ics → sitemap/robots → link check → a11y + Lighthouse
                                                    │
                                              out/ (static)
                                                    │
                          deploy: rsync/SFTP to institute server  OR  static host (Pages/Netlify)
                                                    │
 Visitors ──► static HTML/CSS/JS ──(form POST)──► Form endpoint (Google Apps Script web app)
                                                    ├─► Google Sheet (contact | pitch | applications)
                                                    └─► Email notification to IICE office
```

- **No application server** is run by us. All pages are pre-rendered HTML.
- **Dynamic bits** run client-side: search, filters, date-sensitive labels, forms, theme. A single external endpoint receives form data.
- **Content** is plain files in `/content`, validated at build time against Zod schemas. Invalid content fails the build.

---

## 2. Technology stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js (App Router)**, `output: 'export'`, `trailingSlash: true` | Pin exact versions in `package.json` at scaffold time (latest stable) |
| Language | **TypeScript**, `strict: true`, `noUncheckedIndexedAccess: true` | |
| UI runtime | React (the version bundled with the chosen Next.js) | Server Components by default; `"use client"` only where needed |
| Styling | **Tailwind CSS v4** (CSS-first `@theme` tokens) | Tokens from SPEC §6 in `src/styles/tokens.css` |
| Motion | **Motion** (formerly Framer Motion) **only inside the spinbar and testimonial slider**, code-split. Reveals, count-up, ticker and marquee use IntersectionObserver plus CSS. **Never also add GSAP**: the audited spinbar reference ships both libraries (~990 KB JS) | Keeps motion within the default while meeting the "speed beats flair" tie-breaker |
| Content | JSON + Markdown/MDX in `/content`; **Zod** schemas; `gray-matter` for front matter; MDX via `@next/mdx` / `next-mdx-remote-client` (RSC) | See §5 |
| CMS | **Decap CMS** (static SPA at `/admin/`) | Justification in §9 |
| Search | **MiniSearch** with an index generated at build; **cmdk** for the palette UI | Index lazy-loaded on first open |
| Icons | **lucide-react** (tree-shaken per icon) | |
| Images | **sharp** build-time pipeline + custom `<Picture>` | Justification in §6 |
| Fonts | `next/font/local` with self-hosted WOFF2 | |
| Forms | Native forms + Zod (shared schema), no form library | Small bundle |
| Dates | `Intl.DateTimeFormat` + small helpers; IST fixed (`Asia/Kolkata`) | No moment/dayjs |
| Testing | Vitest (units, schemas), Playwright + `@axe-core/playwright` (e2e, a11y), Lighthouse CI | |
| Quality | ESLint (`next/core-web-vitals`, `jsx-a11y`), Prettier, cspell, linkinator, and a custom **HTML audit** over `out/` (`node-html-parser`) | §13.3 |
| Feeds | Hand-written RSS 2.0 generator script (no dependency) | `/news/rss.xml` |
| Runtime | Node.js 22 LTS or newer (the dev machine has Node 24) | `.nvmrc` + `engines` |
| Package manager | npm (lockfile committed) | Simplest for handover |

**Scripts must be cross-platform.** Development happens on Windows, and CI runs on Linux. Write tooling scripts in Node/TypeScript (`tsx`), never in bash, and use `path.join` and forward-slash URLs.

---

## 3. Repository structure

```
/
├─ CLAUDE.md  SPEC.md  README.md  requirements.txt
├─ docs/                    SRD.md TRD.md BACKEND_SCHEMA.md HANDOVER.md (later)
├─ content/                 ← all editable content (see BACKEND_SCHEMA.md §3)
│  ├─ settings/  pages/  announcements/  stats.json  ecosystem-tiles.json  paths.json
│  ├─ stages/  tracks/  funding-schemes/  opportunities/  startups/  spotlight.json  milestones.json
│  ├─ events/  event-series/  news/  press/  documents/  people/  committees/  mentors/
│  ├─ testimonials/  partners/  facilities/  instruments/  services/  jobs/  faqs/  innovation-club.json
│  └─ media/                ← source images (originals; optimised at build)
├─ messages/en.json         ← UI strings (i18n catalogue)
├─ public/
│  ├─ admin/                index.html + config.yml (Decap)
│  ├─ documents/            PDFs served for download
│  ├─ fonts/                (only if not colocated with next/font)
│  └─ _redirects/ (generated legacy stubs)  .htaccess (generated)
├─ scripts/                 build-time tooling (TypeScript, run via tsx)
│  ├─ validate-content.ts   images.ts   search-index.ts   ics.ts   sitemap.ts   rss.ts
│  ├─ redirects.ts          todo-confirm.ts   check-launch.ts   check-forbidden-copy.ts
│  ├─ audit-html.ts         form-rules.ts     stale-content.ts
├─ apps-script/             Code.gs (reference form endpoint) + README
├─ src/
│  ├─ app/                  routes (see §4)
│  ├─ components/           ui/ (primitives)  sections/ (home sections)  spinbar/  forms/  layout/
│  ├─ content/              schema.ts (Zod)  loaders.ts  queries.ts  todo.ts  derived.ts  forms.ts
│  ├─ lib/                  dates.ts  money.ts  facets.ts  status.ts  seo.ts  jsonld.ts  i18n.ts  analytics.ts  motion.ts
│  └─ styles/               globals.css  tokens.css
├─ tests/                   unit/  e2e/  a11y/
├─ .github/workflows/       ci.yml  deploy.yml  weekly-external-links.yml
└─ lighthouserc.json  cspell.json  .nvmrc  next.config.ts  tsconfig.json
```

The legacy mirror (`iice.iiserb.ac.in/`, `_external/`) is **reference material only**. Move it to `legacy/` when scaffolding, exclude it from the build, lint and search, and never import from it.

---

## 4. Routing and rendering

### 4.1 Static export constraints (enforced)
With `output: 'export'` the following are **unavailable and must not be used**: Route Handlers that read requests, Server Actions, Middleware, ISR/revalidate, `cookies()`/`headers()`, default `next/image` optimisation, and runtime rewrites/redirects.

**Navigation (decision, 2026-10-14).** Internal links are plain `<a href>` elements (`SmartLink`), not `next/link`, and the command palette navigates with `location.assign`. This is a set of static pages, so a click is an ordinary page load, which is fast (about 15 KB of HTML, cached assets), works with the back button and bfcache, and avoids what the App Router's links add: three or four prefetch requests for every link in view, and 404s for the catch-all route's prefetch files (Next's static export writes them under `__next.$c$slug/__PAGE__.txt` but the client asks for `__next.$c$slug.__PAGE__.txt`). `tests/e2e/shell.spec.ts` asserts that a page load makes no failing request and no `_rsc`/`__next.` request.

### 4.2 Route table
| Route | Source | Generation |
|---|---|---|
| `/` | many collections | static |
| `/about/…`, `/incubation/…`, `/apply/`, `/birac-edge/`, `/careers/`, `/contact/`, GIGW pages | `content/pages`, collections | static |
| `/startups/[slug]/` | `content/startups/*.md` | `generateStaticParams` |
| `/events/[slug]/` | `content/events/*.md` | `generateStaticParams` |
| `/events/series/[slug]/` | `content/event-series/*.json` | `generateStaticParams` |
| `/news/[slug]/` | `content/news/*.md` | `generateStaticParams` |
| `/incubation/[stage]/` | `content/stages/*.mdx` | `generateStaticParams` (3) |
| `/incubation/funding/[slug]/` | `content/funding-schemes/*.json` | `generateStaticParams` |
| `/incubation/facilities/instruments/` | `content/instruments/*.json` | static (client-side facets) |
| `/incubation/services/` | `content/services/*.json` | static |
| `/opportunities/` | `content/opportunities/*.json` | static + client status |
| `/about/impact/`, `/about/partners/`, `/about/in-the-news/` | stats + `derived.ts`, partners, press | static |
| `/news/rss.xml` | `scripts/rss.ts` → `public/news/rss.xml` | prebuild |
| `/sitemap.xml`, `/robots.txt` | `app/sitemap.ts`, `app/robots.ts` (static-export compatible) | static |
| `/events/[slug].ics` | `scripts/ics.ts` → `public/events/` | prebuild |
| `/search-index.json` | `scripts/search-index.ts` → `public/` | prebuild |
| `/404` | `app/not-found.tsx` | static |

`dynamicParams = false` on all dynamic segments.

### 4.3 Time-sensitive content in a static site
Announcements, the intake status pill, open calls, scheme application windows, upcoming/past events, open registrations and job expiry all depend on "now". One shared function, `src/lib/status.ts → windowStatus({opensAt, closesAt, rolling}, now)` returning `upcoming | open | rolling | closed`, is used at build time and on the client, so the two can never disagree. It is handled in three layers:
1. **Build time:** pages are rendered using the build date.
2. **Client time:** a tiny client component re-evaluates visibility and labels (it hides expired announcements, moves events to "Past", hides closed registration buttons) so that a stale build never shows expired content.
3. **Scheduled rebuild:** a CI cron rebuilds and deploys daily at 00:30 IST.

---

## 5. Content layer
- Schemas live in `src/content/schema.ts` (Zod) and are the **single source of truth**. TS types are inferred (`z.infer`).
- `scripts/validate-content.ts` runs first in `prebuild`. It:
  1. parses every file (JSON / front matter),
  2. validates it against its schema,
  3. checks referential integrity (e.g. `event.seriesSlug` exists, `committee.members[].personSlug` exists, spotlight `startupSlug` exists),
  4. checks uniqueness (slugs, scheme `oneLiner`s, card copy),
  5. rejects forbidden alt texts and forbidden copy (`lorem`, `ipsum`, template remnants),
  6. checks that every referenced media file exists, and that no asset filename contains spaces or uses `.gif`;
  7. checks consistency:
     - a scheme cannot be both `rolling` and have a past `closesAt`;
     - a claimed stat cannot be lower than its derived equivalent (e.g. "startups incubated" < number of listed startups);
     - testimonial authors must be founders of the referenced startup;
     - two different entities must not share the same website or LinkedIn URL (warning);
  8. checks contact hygiene: no `example.com` or staging/preview hosts; `mailto:` targets are valid emails;
  9. warns on stale entries: schemes, rate cards and committees whose `lastReviewed`/`asOf` is older than 180 days. `scripts/stale-content.ts` also prints these in the weekly CI job.

  On failure it prints `content/events/foo.md › people[1].name: Required` and exits non-zero.
- `src/content/loaders.ts` reads and caches the validated content for Server Components. Pages never read files directly.
- JSON Schema files are generated from Zod (`zod-to-json-schema`) into `content/.schemas/`, and JSON content files reference them with `$schema`. That gives editors autocompletion in VS Code.
- **Markdown versus MDX:** collections edited through the CMS (events, news, startups, jobs) use **plain Markdown bodies** (`.md`), which Decap can round-trip safely. Developer-owned pages (`content/pages/*.mdx`, `content/stages/*.mdx`) may use MDX components.

### 5.0 Derived data and single formatters (NFR-CONTENT-6)
Two of the audited sites contradicted themselves: the same grant amount was written three ways, a "600+ startups" claim sat beside about 414 listings, and counts in prose disagreed with the cards. We prevent this structurally:
- `src/content/derived.ts` computes counts from content at build time: startups by status, events held, scheme beneficiaries, mentors, partners and instruments. The Impact page and stat strip can show a derived stat (`kind: "derived"` in `stats.json`) instead of a typed number. Derived counts include only non-draft, non-TODO entries.
- `src/lib/money.ts → formatINR(money)` is the only way amounts reach the UI. It uses Indian units ("₹10 lakh", "₹1.5 crore", ranges as "₹5–10 lakh"). An ESLint `no-restricted-syntax` rule flags `₹`, `Lakh` and `Lac` literals in components.
- `src/lib/dates.ts` is the only date formatter. It formats in IST and always includes the year for deadlines.
- Section counts in headings (e.g. `STARTUP SPOTLIGHT (06)`) and filter-chip counts come from the data, never from typed text.

### 5.1 TODO_CONFIRM handling (SRD §6.6)
- Convention (details in BACKEND_SCHEMA §2.3):
  - string values prefixed `TODO_CONFIRM:` hold placeholder copy;
  - unknown numbers are `null` with `"_status": "TODO_CONFIRM"` on the entry;
  - an optional `_note` explains what to confirm.
- `src/content/todo.ts`:
  - `isTodo(value)` checks a value;
  - `display(value)` strips the prefix for rendering;
  - `collectTodos(entry)` returns field paths.
- **Rendering rule:** placeholder *text* renders (it is plausible copy). Placeholder *numbers, amounts and dates* never render in production: the component shows "To be announced" or hides the item, as specified per component in SPEC.
- In dev (`NODE_ENV=development` or `NEXT_PUBLIC_SHOW_TODOS=1` on preview deploys), elements rendered from TODO values get `data-todo="path"`. `PlaceholderBanner` lists them and CSS outlines them in dashed amber.
- `npm run todo:confirm` scans `/content` and prints a table (file, field path, note) plus totals. `npm run check:launch` exits 1 if any TODO is reachable from a production route.

---

## 6. Images

**Deviation from default (`next/image`), with justification:** static export disables Next's on-demand image optimiser. The alternatives are `unoptimized: true`, which fails the AVIF/WebP and responsive-size requirements, or a third-party image CDN, which adds a paid or external dependency and breaks institute-server hosting. A ~150-line build-time **sharp** pipeline produces AVIF and WebP at fixed widths into `public/_img/`, together with a manifest of intrinsic sizes and dominant colours. A custom `<Picture>` component then emits `<picture>` with both formats, `srcset`/`sizes`, explicit `width`/`height` (no CLS), `loading="lazy"` and `decoding="async"` (except for priority images, which get `fetchpriority="high"`). It works on any static host, and CMS uploads are optimised automatically on the next build.

- Source folders: `content/media/**` and CMS uploads in `content/media/uploads/`.
- Widths: 320, 640, 960, 1280, 1920 (never upscaled). Quality: AVIF 50, WebP 72. Logos are SVG and passed through unchanged (sanitised with SVGO).
- Output cache: hashed by source checksum and options, and cached in CI to keep builds fast.
- Budgets: hero ≤ 200 KB at 1280 w (hard cap 500 KB per NFR-PERF-3). The script warns above 300 KB and fails above 500 KB for images flagged `priority`.
- Never hotlink `lh*.googleusercontent.com` or Drive URLs; a lint rule (`scripts/check-forbidden-copy.ts`) rejects those hosts in content.

---

## 7. Styling, fonts, theming
- Tailwind v4 with tokens defined via `@theme` in `tokens.css` (colours from SPEC §6.1 as CSS variables, with a `.dark` override).
- **Dark mode:** a `class` strategy on `<html>`. A ≤ 500-byte blocking inline script in `<head>` reads `localStorage.theme` or the system preference before paint (prevents a flash). Its hash goes into the CSP.
- **Fonts:** `next/font/local` with a display and a text face (proposals in SPEC §6.2), Latin subset WOFF2, 2 weights each, `adjustFontFallback` for metric matching. Devanagari loads only on `lang="hi"` routes.
- **Never** set `maximum-scale`/`user-scalable` in the viewport meta. Next's default viewport is fine; a unit test asserts this on the built HTML.

---

## 8. Motion and interaction implementation

### 8.1 General
- `src/lib/motion.ts` exports `useReducedMotion()` (matchMedia, SSR-safe default = reduced) and `useInView()` (IntersectionObserver).
- Section reveals use the CSS class `.reveal`, toggled by IntersectionObserver (transform/opacity only). A `prefers-reduced-motion` media query neutralises it.
- Count-up runs `requestAnimationFrame` over 1.2 s. The **final number is in the SSR HTML** and the JS only animates it, so no-JS users and SEO get correct values.

### 8.2 Spinbar (SPEC §5.1)
- **Structure:** `<section>` → header → `<div class="track" style="height: calc(var(--n) * 70vh + 100vh)">` → `<div class="stage" style="position: sticky; top: 0; height: 100vh">` → `<ol>` of `<li><a class="card" href>`. Cards are always real anchors, never `div role=button` + `window.open` as in the reference.
- **Progress:**
  - One passive `scroll` listener schedules a single rAF.
  - Each frame reads `track.getBoundingClientRect()` **once** and computes `p = clamp(-top / segment, 0, n-1)`.
  - A smoothed value `ps` follows `p` (exponential smoothing with τ ≈ 0.3 s, giving the "scrub" feel).
  - It then writes styles only (no reads after writes, so no layout thrash).
  - The listener detaches when the section is off-screen (IntersectionObserver).
- **Desktop ring** (`(min-width:1024px) and (pointer:fine)`):
  - **Geometry:** each card `i` has angle `θᵢ = (i − ps) × 30°`. Its transform is `rotate(θᵢ) translateY(−R) rotate(0)` around a ring centre placed below the stage, which positions the card on the arc and rotates it tangent to it, as one composited transform per card.
  - **Visibility:** `|θᵢ| ≤ 30°` are the focus and neighbour slots; `|θᵢ| = 60°` are the corner peeks; beyond 75° the card gets `visibility: hidden`. A CSS `mask-image` linear gradient on the stage fades out the lower arc.
  - **Scale, opacity, blur** per card come from `|i − ps|`: active is scale 1, opacity 1, no filter. Neighbours are scale 0.78, opacity 0.55, `blur(3px) grayscale(1)` for photos.
  - **Settle:** when scrolling stops (150 ms idle), Motion's `animate` springs `ps` to `round(p)`. Motion is used only for the settle, the entry stagger and the cursor.
  - **Hover/focus preview:** sets `data-preview` on a non-active card. CSS lifts it (`translateY(-8px)`, no blur) without changing `ps`.
- **Touch / < 1024 px deck:**
  - The same progress loop with a different mapping. For each card, offset `o = ps·N − i` is mapped piecewise to `translateY`, `scale` and `rotate` (≤ 4°), using `opacity` and `filter: brightness()` only (no blur).
  - Segmented progress uses `n` spans, each toggling `opacity`.
  - Track height is `N × 45svh + 30svh`.
  - The "record" list (768–1023 px) highlights `round(ps)`.
- **Blur budget:** `filter: blur()` only on desktop and only for `|d| ≤ 2`. It is disabled for `prefers-reduced-transparency` and under 1024 px.
- **`will-change: transform`** applies only to cards with `|d| ≤ 2`, and is removed after settle.
- **Focus sync:** `focusin` on a card calls `window.scrollTo({ top: trackTop + i * segment, behavior: reduced ? 'auto' : 'smooth' })`. Prev/next buttons do the same. The live region updates after a 250 ms debounce once settled.
- **Variant selection:** the CSS media queries `(prefers-reduced-motion: reduce)` → grid, `(min-width:1024px) and (pointer:fine)` → ring, otherwise → deck. They are applied before hydration, so there is no flash, and JS reads the same queries via `matchMedia`. SSR markup is the static grid, which is also the no-JS fallback.
- **Entry:** IntersectionObserver at `threshold 0.2` adds `.is-in`. A CSS transition (`scale .85→1`, opacity, `transition-delay: calc(var(--i) * 50ms)`) runs once. It is skipped under reduced motion.
- **Custom cursor:** mounted only when `matchMedia('(hover: hover) and (pointer: fine)')` matches and reduced motion is off. Its position is written via transform in rAF. The native cursor is hidden only inside `.spinbar .stage`, and the custom cursor hides whenever a `[role=dialog][aria-modal=true]` is open.
- **Bundle:** the spinbar is a separate client chunk loaded with `next/dynamic`, mounted when the section nears the viewport (`rootMargin: 200%`). SSR renders the static grid as the baseline markup, which avoids layout shift. Target ≤ 25 KB gz including Motion's used exports; verify with `@next/bundle-analyzer`.
- **Tests:**
  - A unit test of the slot/deck mapping functions (pure functions in `spinbar/geometry.ts`).
  - Playwright: scroll sets active; Tab focuses the next card and scrolls; middle-click opens the href; reduced-motion shows the grid; the 360 px deck has no `blur`.

### 8.3 Command palette
- `cmdk` dialog, mounted on demand (the trigger button is static HTML; the palette chunk loads on first Ctrl/Cmd+K, `/`, or click).
- On first open, fetch `/search-index.json` (built by `scripts/search-index.ts`; target ≤ 60 KB gz). It holds title, type, url, summary and keywords for pages, startups, events, news, documents and people. MiniSearch runs with prefix and fuzzy (0.2) matching and boosts titles.
- Groups (in order): Pages (including in-page anchors from a curated list), Startups, Events, Open calls, News, Documents, People, Actions (Apply, Pitch to us, Toggle theme, Copy email). Each item may carry a hint (status, file size).
- **Accessibility:** cmdk supplies the combobox/listbox roles and `aria-activedescendant`. The dialog uses `aria-modal="true"` and contains focus while open (the correct modal behaviour); Esc closes it and focus returns to the trigger. This fixes the gaps found in the reference palette, which had no listbox roles and let Tab escape the dialog.

### 8.4 Facets and filtering (startups, mentors, instruments, events)
- `src/lib/facets.ts → buildFacets(items, facetDefs)` derives each facet's values **from the data**, with counts. Labels come from enum label maps in `messages/en.json`, never from free text, so a mismatch like "Batch 1" vs "Batch 01" can't occur.
- `applyFilters(items, selection)` uses OR within a facet and AND across facets. Counts update to reflect the other active facets (standard faceted search).
- State is synced to the URL query (`?sector=iot-ai,healthcare-bioengineering&status=current`) with `history.replaceState`. Unknown values are ignored.
- The SSR output contains the full list (no-JS); the client hydrates the filters.
- Unit tests cover every facet with fixtures, including empty values, multi-valued fields, AND/OR combination and the URL round-trip.

---

## 9. CMS and editorial workflow

**Decision: Decap CMS rather than Keystatic.** Keystatic's GitHub/Cloud editing mode depends on API routes inside the Next.js app, which a static export cannot provide, so on an institute server it would only work locally for developers. Decap is a self-contained static SPA served at `/admin/` that commits directly to the Git repository, so it fits the static-export and any-host constraints. Its one infrastructure need is a GitHub OAuth handshake. That comes from the host (Netlify Identity/Git Gateway, or Cloudflare Pages with a tiny OAuth Worker), or from a small open-source OAuth proxy that can also run on an institute server. Which of these is used depends on SRD Q3 (hosting).

- `public/admin/config.yml` defines **folder collections** (one file per entry: startups, events, news, documents, announcements, jobs, people, partners, testimonials, facilities, funding schemes) and **file collections** for singletons (site settings, stats, paths, ecosystem tiles, spotlight, milestones, committees, innovation club, FAQs).
- Field names mirror the Zod schemas exactly. `tests/unit/cms-config.test.ts` parses `config.yml` and asserts that every CMS field exists in the corresponding Zod schema (and that required fields are required), which catches drift.
- **Editorial workflow:** Decap's `editorial_workflow` (Draft → In review → Ready) opens a PR per change. CI validates the content and builds a preview (where the host supports previews). Merging to `main` deploys.
- Media uploads go to `content/media/uploads/`, and the image pipeline handles optimisation.
- Editors never touch code. Validation errors are reported in the PR check with the file and field.

---

## 10. Forms

### 10.1 Client
- Form types: `contact`, `pitch`, `application` (must); `mentor`, `partner`, `booking` (should); `newsletter` (could). Payload schemas are in BACKEND_SCHEMA §5, shared via `src/content/forms.ts` (Zod). All of them post to the same endpoint, and the endpoint routes by `formType` to a Sheet tab and a notification address from its config.
- **Markup rules** (from the audit): every control has a `<label for>`; placeholders are hints only; required fields say "(required)" in the label text; groups use `<fieldset>`/`<legend>`; submit buttons have specific verbs. `scripts/audit-html.ts` checks this.
- Progressive enhancement: the `<form>` has `action={FORM_ENDPOINT}` and `method="post"`, so it works without JS (the endpoint then returns a minimal HTML thank-you page that links back). With JS, the client validates, then `fetch` POSTs.
- **Transport to Apps Script:** `POST` with `Content-Type: text/plain;charset=utf-8` and a JSON string body. This is a "simple request", so there is no CORS preflight (Apps Script web apps can't answer preflight `OPTIONS`). Apps Script responds via redirect to `script.googleusercontent.com`, and `fetch` follows it and reads the JSON.
- **Spam:**
  - Honeypot input `website` (visually hidden, `tabindex="-1"`, `autocomplete="off"`).
  - `startedAt` timestamp; submissions under 3 s are flagged.
  - Both are checked again at the endpoint. Spam returns `200 {ok:true}` and is discarded, so bots get no signal.
- **UX:**
  - Inline errors on blur and on submit.
  - A top `ErrorSummary` with links to the fields; focus moves to the summary on submit failure.
  - The submit button shows a busy state with `aria-busy`.
  - The success panel replaces the form and receives focus.
  - On network error, input is kept, a retry is offered, and a `mailto:` fallback is pre-filled.
- **Apply drafts:** `localStorage` key `iice:apply:draft:v1`, debounced 500 ms, cleared on success, with a "Clear draft" button.
- **No endpoint configured:** the forms render a `mailto:` fallback, and the dev console warns.

### 10.2 Endpoint (reference: `apps-script/Code.gs`)
- A `doPost(e)` script with the following steps:
  1. parse the JSON;
  2. check the honeypot and fill time;
  3. validate with hand-written rules mirroring Zod (Apps Script can't import Zod; keep a shared rules table in BACKEND_SCHEMA §5 and a **contract test** that posts fixture payloads to a deployed test endpoint in CI, opt-in via secret);
  4. apply a rate limit of 5 submissions per email per hour via `CacheService`;
  5. append a row to the matching Sheet tab;
  6. `MailApp.sendEmail` to the configured office address;
  7. return `{ ok, id }` or `{ ok:false, errors }`.
- Deployed as a web app with "Execute as: Me (owner account)" and "Who has access: Anyone". The owner is an IICE-controlled account (handover).
- The endpoint is swappable: any service accepting the same JSON (Formspree, Getform, a custom serverless function) works by changing `NEXT_PUBLIC_FORM_ENDPOINT`. The client-side `FormAdapter` normalises responses.

---

## 11. SEO, metadata, i18n

### 11.1 SEO
- Every route exports `generateMetadata` built with `src/lib/seo.ts`: title template `"{page} · IICE, IISER Bhopal"`, description, canonical (`NEXT_PUBLIC_SITE_URL`), OpenGraph and Twitter tags.
- OG images: a static default (1200×630) plus per-collection images taken from the cover/logo. Optionally, they can be generated at build with `@vercel/og`-compatible static rendering via a script into `public/og/`; dynamic OG routes aren't available in export.
- JSON-LD (`src/lib/jsonld.ts`): `Organization` in the root layout (name, logo, address, phones, emails, `sameAs` from **confirmed** socials only); `Event` per event; `BreadcrumbList` per internal page; `NewsArticle` per news item.
- `app/sitemap.ts` lists all static routes and collection entries with `lastModified`, excluding drafts and empty pages. `app/robots.ts` allows all and points to the sitemap. Preview builds set `noindex`.
- **Titles and descriptions** are unique per page (the HTML audit fails on duplicates). The title template never repeats the brand. `og:type` is `website` on Home and `article` on news.
- **RSS:** `scripts/rss.ts` writes `public/news/rss.xml` (latest 20 items, absolute URLs). It is linked via `<link rel="alternate" type="application/rss+xml">` in the root layout and in the footer.
- **Stats in HTML:** stat components render the final value server-side. The OG description is written content, never assembled from counters (in one audited site, the OG description showed "0 + Startups").

### 11.2 i18n-ready structure
**Deviation note:** Next's built-in i18n routing isn't supported with static export.
- English routes live at the root (no `/en/` prefix). That keeps clean URLs and keeps the legacy redirects simple.
- All UI strings live in `messages/en.json`, accessed through a typed `t()` helper (`src/lib/i18n.ts`), and a lint rule discourages raw string literals in JSX in `src/components`.
- Content entries are English. Hindi can be added later as sibling files (`foo.hi.md`, `site.hi.json`) with per-field fallback to English.
- Hindi routes will live under `app/hi/…`, re-using the same page components with `locale="hi"`.
- `<html lang>` and `hreflang` alternates are emitted from the start (English only for now).

---

## 12. Performance budgets (enforced in CI)
| Budget | Target | Enforcement |
|---|---|---|
| Lighthouse mobile (each template) | Perf ≥ 90, A11y 100, BP ≥ 95, SEO ≥ 95 | `lighthouserc.json` assertions |
| LCP / CLS / TBT (lab) | < 2.5 s / < 0.1 / < 200 ms | Lighthouse CI |
| Initial JS (gz), Home | ≤ 430 KB | `npm run size` on build output (`scripts/size.ts`) |
| Initial JS (gz), other pages | ≤ 400 KB | `npm run size` |
| CSS (gz) | ≤ 35 KB | `npm run size` |
| Fonts | ≤ 4 files, ≤ 120 KB total | script check |
| Hero image | ≤ 200 KB target, 500 KB hard cap | image script |
| Third-party requests on first load | 0 (analytics deferred; map and video click-to-load) | Playwright network assertion |
| Image formats | No GIF; logos SVG (≤ 15 KB after SVGO) or ≤ 30 KB raster; no frame-sequence animations | Image script + HTML audit |

Reference baselines (homepage, audited 2026-10-13), for comparison:
- AIC-CCMB: ~25 scripts, 26 stylesheets, 1.3–1.7 MB PNG banners.
- DERBI: ~36 scripts, ~36 stylesheets, 1.1 MB autoplay video.
- IIT Mandi: ~3.4 MB of images.
- Zaid Sayyed: ~990 KB JS.
- BITS Hyderabad: fastest of the five (static Astro islands, ~35 KB HTML, system fonts), but with a 4.4 MB GIF.

Our budgets above aim well below all of them.

**Revision (2026-10-14): the JS ceilings were raised by 300 KB** (Home 130 → 430 KB, other pages 100 → 400 KB, gzipped). The original numbers could not be met: React 19 and the Next.js runtime alone come to about 120 KB gzipped, before any site code, and the first build measured 166–170 KB per page. The ceilings are a guard against growth, not a target; the Lighthouse mobile scores (Performance ≥ 90, LCP < 2.5 s, TBT < 200 ms) remain the real performance gate, so a build that stays under the new ceiling but scores lower still fails. `scripts/size.ts` prints the measured figure for every template and the headroom left, and the figure should be reported with each release.

Templates audited: `/`, `/about/`, `/about/team/`, `/incubation/culture/`, `/apply/`, `/startups/`, one startup, `/events/`, one event, `/news/` + one article, `/documents/`, `/incubation/facilities/`, `/careers/`, `/contact/`, `/birac-edge/`.

---

## 13. Testing and CI

### 13.1 Pipeline (`ci.yml`, on every PR and push to `main`)
1. `npm ci` (with cache)
2. `npm run content:validate`
3. `npm run lint` and `npm run typecheck`
4. `npm run spell` (cspell on `/content`, `/messages`, `SPEC.md`; custom dictionary of proper nouns)
5. `npm run test` (Vitest: schemas, `todo` utilities, date logic, `.ics` generation, redirects table, CMS config drift, viewport meta)
6. `npm run build` (prebuild: images, search index, ics, redirects)
7. `npm run links` (linkinator on `out/`, internal links only, which also fails on `href="#"`; also requests every URL in `sitemap.xml`)
7a. `npm run audit:html` (anti-pattern audit, §13.3)
8. `npm run test:e2e` (Playwright against `npx serve out`):
   - nav, forms with a mock endpoint, filters, palette, spinbar keyboard and reduced-motion, tabs hash, theme
   - **axe** on every template, light and dark
9. `npm run lhci` (Lighthouse CI with budgets)
10. `npm run size`
11. Upload a `todo:confirm` report as a CI artifact (informational).

### 13.2 Other workflows
- `deploy.yml`: on `main`, rebuild and deploy (§15), plus a daily cron at 00:30 IST.
- `weekly-external-links.yml`: external link check that opens an issue on failures (never blocks). It also runs `stale-content.ts` and lists entries not reviewed for 180 days or more.

### 13.3 HTML anti-pattern audit (`scripts/audit-html.ts`)
This parses every `out/**/*.html` and fails with `file › selector › rule` on any of the following (SRD Appendix A.6):
1. `a[href="#"]`, `a[href=""]`, anchors pointing to missing IDs, `a` without `href`.
2. A `button` without `type="submit"` inside a form and without a client handler marker (`data-action`, added by our `Button` component).
3. An `img` whose alt is missing, equal to its filename, digits only, a UUID, or in the generic-word list (unless `alt=""` with `role="presentation"`/decorative).
4. ≠ 1 `h1`; a heading level skip; an `iframe` without `title`; an icon-only `a`/`button` without an accessible name; an `input`/`select`/`textarea` without a label.
5. A duplicate `<title>` or `meta[name=description]` across pages; a missing description.
6. Forbidden copy in text nodes: `lorem`, `ipsum`, `coming soon`, `sample page`, `example.com`, plus the legacy template phrases.
7. `img[src]` or `link[href]` pointing to third-party image hosts; links to `*.vercel.app` or `*.netlify.app` previews or `localhost`; malformed `mailto:`.
8. URLs with spaces (`%20`) in asset paths.
9. `[data-stat]` elements whose text is empty or `0`.
10. A viewport meta with `maximum-scale` or `user-scalable`. The built CSS is also grepped for `scrollbar-width:none` and `::-webkit-scrollbar{display:none}`.

Generic link text ("read more", "click here", "know more") fails unless the element has an `aria-label` containing more than the generic words.

---

## 14. Security and privacy
- **Content-Security-Policy, per page.** `scripts/csp.ts` (run by `postbuild`) puts a `<meta http-equiv="content-security-policy">` in every built page, with `default-src 'self'`, the SHA-256 hash of each of that page's inline scripts (the theme script, Next's bootstrap and its page payload, which differ page to page, so one header could not name them), `style-src 'self'` with `style-src-attr 'unsafe-inline'` (React writes a few `style=""` attributes), `frame-src` for the map and `youtube-nocookie.com` only, and `connect-src`/`form-action` for the form endpoint (plus `script.googleusercontent.com` for Apps Script, which redirects there) and the analytics host. No `unsafe-eval` and no `unsafe-inline` for scripts. `/admin/` is left out: the CMS is its own application.
- **Headers** (on the host): `frame-ancestors 'none'` (the one directive a `<meta>` policy cannot carry), `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and `Permissions-Policy` (camera, microphone, geolocation, payment and USB off), generated from `src/lib/security.ts` into `public/.htaccess`, `deploy/nginx-redirects.conf` and `public/_headers`. See `docs/DEPLOY.md`.
- **No secrets in the repo or bundle.** `NEXT_PUBLIC_*` variables are public by definition. CI secrets cover deploy credentials only.
- **External links** use `rel="noopener noreferrer"` and show an external-link icon with an accessible "(opens in new tab)" label (GIGW).
- **PII** lives only in the form submissions Sheet, which is owned and access-controlled by IICE. The retention policy is stated on `/privacy/` (TODO_CONFIRM).
- **Analytics:** off by default. If enabled, use a cookieless provider (Plausible/Umami) loaded after `requestIdleCallback`. GA4 is supported only with a consent banner.
- **Dependencies:** Dependabot weekly; `npm audit --omit=dev` must have no high/critical vulnerabilities in CI.

---

## 15. Deployment and environments

### 15.1 Environment variables
| Variable | Scope | Example | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | build | `https://iice.iiserb.ac.in` | Canonicals, sitemap, OG |
| `NEXT_PUBLIC_FORM_ENDPOINT` | build | `https://script.google.com/macros/s/…/exec` | Form POST target |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | build | `none` \| `plausible` \| `umami` \| `ga4` | Analytics switch |
| `NEXT_PUBLIC_ANALYTICS_ID` | build | `iice.iiserb.ac.in` | Provider site ID |
| `NEXT_PUBLIC_SHOW_TODOS` | build | `1` on previews | Placeholder banner outside dev |
| `NEXT_PUBLIC_MAP_EMBED_URL` | build | Google/OSM embed URL | Click-to-load map |
| `DEPLOY_*` | CI secret | — | SFTP/rsync or host tokens |

A committed `.env.example` documents all of them.

### 15.2 Targets
- **Institute server (Apache/Nginx):** CI builds `out/` and deploys via `rsync` over SSH (or SFTP) atomically: upload to `releases/<sha>/`, then switch a `current` symlink. Generated configs:
  - `.htaccess` / `nginx.conf` snippet with 301s for the legacy paths (SRD §7.2), `ErrorDocument 404 /404.html`, long-cache headers for `/_next/static/*` and `/_img/*` (`immutable`), short cache for HTML, and the security headers.
- **Static host** (Cloudflare Pages / Netlify / GitHub Pages): a `_redirects` file and `_headers` are generated from the same source table.
- **Vercel:** a committed `vercel.json` (generated by `scripts/redirects.ts` from the same table and `src/lib/security.ts`, because Vercel reads it before building) holds the build settings, redirects and headers. Vercel's own Git integration deploys each push; `deploy.yml` calls a Deploy Hook daily so date-dependent content stays right. The SSH route runs only when `DEPLOY_TARGET=ssh`.
- **Fallback:** for hosts with no redirect support, `scripts/redirects.ts` also emits HTML stubs at legacy paths (`<meta http-equiv="refresh">`, `rel=canonical`, a visible link).

### 15.3 Browser support
The last 2 versions of evergreen browsers plus Safari iOS 16+. No polyfills beyond what Next includes. Features like `scroll-snap`, `:focus-visible` and `aspect-ratio` are baseline.

---

## 16. npm scripts (planned)
| Script | Does |
|---|---|
| `dev` | `next dev` (runs `content:validate` + `images` once first) |
| `build` | `prebuild` (validate, images, search index, ics, redirects) + `next build` |
| `start` | serve `out/` locally (`serve out`, port 3000) |
| `lint` / `lint:fix` | ESLint + Prettier check |
| `typecheck` | `tsc --noEmit` |
| `test` / `test:e2e` / `lhci` / `size` / `links` / `spell` | §13 |
| `content:validate` | Zod validation + integrity checks |
| `images` | sharp pipeline |
| `todo:confirm` | List every `TODO_CONFIRM` (file, field path, note, count) |
| `audit:html` | Anti-pattern audit over `out/` (§13.3) |
| `content:stale` | List schemes, instruments and rate cards, services, committees and figures not reviewed for 180 days or more (`-- --fail` exits 1, `-- --days=N` changes the limit) |
| `rss` | Generate `/news/rss.xml` (part of prebuild) |
| `ics` | Generate `public/events/{slug}.ics` for every event (part of prebuild) |
| `redirects` | Write `public/.htaccess`, `public/_redirects`, `public/_headers` and `deploy/nginx-redirects.conf` (legacy redirects from `src/content/redirects.ts`, security headers and caching from `src/lib/security.ts`); with `-- --stubs`, write HTML stubs into `out/` (runs as `postbuild`) |
| `csp` | Write each page's Content-Security-Policy `<meta>` into `out/` (runs as `postbuild`, after the redirect stubs) |
| `size` | Measure first-load JS, CSS and fonts per page against §12, and fail on a breach or on any first-load request to another site; `-- --chunks` lists the shared chunks |
| `lhci` | Lighthouse CI on the templates in `scripts/lib/templates.ts`, mobile profile, assertions in `lighthouserc.json`; prints a score table |
| `links` | Crawl `out/` for broken internal links and anchors and unbuilt sitemap addresses; `-- --external` checks other sites and only reports |
| `form-rules` | Generate `src/content/form-rules.json` and the rules block of `apps-script/Code.gs` from the Zod form schemas; `-- --check` fails if either is stale (part of prebuild) |
| `check:launch` | Builds production and a second copy that keeps the `TODO_CONFIRM` markers (`NEXT_PUBLIC_KEEP_TODO=1`, into `.cache/launch`), lists every placeholder a production page would show and every published entry still flagged, then runs `audit:html`, `links` and `spell`. Fails until the content is confirmed; `-- --report` exits 0 |
| `cms` / `cms:config` | Local Decap backend (`decap-server`) for offline editing / regenerate `public/admin/config.yml` from the schemas |

---

## 17. Risks and mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| CMS auth unavailable on institute hosting | Editors can't self-serve (G4) | Choose the OAuth provider in the hosting decision; fallback is GitHub web editing with JSON Schemas and PR validation |
| Apps Script quotas/limits (email/day, execution time) | Lost notifications | Daily digest mode; Sheet is the source of truth; endpoint is swappable |
| Spinbar jank on low-end phones | Perf < 90 | The mobile deck uses transform, opacity and brightness only (no blur); one rect read per frame; the listener detaches off-screen; Lighthouse on the Home template gates the merge. Fallback if traces still show jank: switch the deck to a CSS scroll-snap carousel (no JS scroll-linking), which the brief also allows |
| Placeholders shipping to production | Credibility | Production hides unconfirmed numbers; `check:launch` gate; dev banner |
| Stale time-sensitive content | Expired announcements shown | Client-side re-evaluation + daily rebuild |
| Content drift between Decap config and Zod | Build failures for editors | CMS config drift test |
| Brand colours change after logo arrives | Rework | All colours are tokens; contrast unit test over the token pairs |
| Scheme details, rate cards and rosters go stale (seen on all four TBI references) | Wrong information to applicants | `lastReviewed`/`asOf` fields; stale-content warnings in CI; dates shown on pages |
| Facet bugs hide startups | Credibility | Data-derived facet values plus unit tests (§8.4) |
| Contradictory numbers across pages | Credibility with funders | Derived counts, `formatINR`, validation that a claimed stat cannot be lower than its derived count (§5.0) |
