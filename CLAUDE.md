# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this project is
A from-scratch rebuild of the official website of **IICE** (Innovation and Incubation Centre for Entrepreneurship), the DST NIDHI-TBI technology business incubator at **IISER Bhopal**. It replaces a Google Sites website. The goals, in priority order: convert visitors into incubation applicants, build credibility fast, explain programs, funding and facilities, let staff edit content without a developer, and be fast on mid-range phones.

**Status:** planning complete (docs v0.2, revised after a live audit of the five reference sites on 2026-10-13), code not yet scaffolded. The docs below are the source of truth. If the code and the docs disagree, raise it; don't silently pick one. SRD Appendix A records what we learned from each reference site and what to avoid.

| Doc | Use it for |
|---|---|
| [requirements.txt](requirements.txt) | The client's original brief. Highest authority on intent |
| [docs/SRD.md](docs/SRD.md) | Requirements with IDs (FR-*, NFR-*) and acceptance criteria, legacy content inventory, redirects, open questions |
| [SPEC.md](SPEC.md) | IA, page and section specs, components (incl. the spinbar), design tokens, draft copy |
| [docs/TRD.md](docs/TRD.md) | Architecture, stack decisions, build pipeline, CI, deployment, budgets |
| [docs/BACKEND_SCHEMA.md](docs/BACKEND_SCHEMA.md) | Zod content schemas, TODO_CONFIRM encoding, form payload contracts, Sheet layout |

## Stack (summary; details in TRD)
Next.js App Router with **`output: 'export'`** (static) · TypeScript strict · Tailwind CSS v4 · Motion (spinbar and slider only; never add GSAP or jQuery-era widgets) · content as JSON/Markdown/MDX in `/content`, validated by Zod · Decap CMS at `/admin/` · MiniSearch + cmdk for the command palette · sharp build-time image pipeline · forms POST to `NEXT_PUBLIC_FORM_ENDPOINT` (reference Google Apps Script in `apps-script/`) · Vitest, Playwright + axe, Lighthouse CI.

## Commands (once scaffolded)
```
npm run dev               # dev server
npm run build             # prebuild (validate content, images, search index, .ics, redirects) + next build → out/
npm run lint / typecheck / test / test:e2e / lhci / links / spell
npm run content:validate  # Zod + referential integrity for /content
npm run todo:confirm      # list every TODO_CONFIRM placeholder
npm run check:launch      # pre-launch gate: fails if placeholders are reachable from production pages
npm run audit:html        # anti-pattern audit over out/ (SRD Appendix A.6, TRD §13.3)
npm run content:stale     # schemes, rate cards, rosters not reviewed in 180+ days
```
Before saying a task is done: `lint`, `typecheck`, `test` and `build` must pass. For UI changes, also run the relevant Playwright/axe tests.

## Hard rules (do not break)
1. **Honesty.** Never invent statistics, funding amounts, startup names or details, testimonials, people, roles or dates. Use `TODO_CONFIRM` exactly as described in BACKEND_SCHEMA §2.3. Unconfirmed numbers never render as numbers in production. No lorem ipsum, ever.
2. **Reference sites give ideas only.** Never copy text, images, logos, code or distinctive layouts from iitmandicatalyst.in, tbi.bits-hyderabad.ac.in, aic.ccmb.res.in, derbifoundation.com or zaidsayyed.in.
3. **Static export only.** Don't use Server Actions, request-reading Route Handlers, Middleware, ISR/revalidate, `cookies()`/`headers()`, or default `next/image` optimisation. Use the `<Picture>` component and the image pipeline.
4. **No dead links.** No `href="#"`, and no nav entry without a real page. Hide what doesn't exist yet.
5. **Accessibility is a gate.** WCAG 2.2 AA and Lighthouse a11y = 100. Never set `maximum-scale` or `user-scalable=no`. Every image gets descriptive alt text (or `alt=""` when decorative; never "logo"/"image"). Every motion effect respects `prefers-reduced-motion`. Keyboard access everywhere, with no focus or scroll traps.
6. **Performance is a gate.** Lighthouse mobile Perf ≥ 90, LCP < 2.5 s, CLS < 0.1. Respect the JS/CSS/font budgets in TRD §12. Animate only `transform`/`opacity` (and the budgeted `filter` in the spinbar). Speed beats flair.
7. **Content goes through the schema.** Pages read content only via `src/content/loaders.ts`. When you add a field: update the Zod schema, the Decap `config.yml`, and the seed content together. The CMS-drift test enforces this.
8. **UI strings** come from `messages/en.json` via `t()`, never hard-coded in components (i18n-ready; Hindi comes later).
9. **Copy quality.** Proofread. Indian English. cspell must pass; add genuine proper nouns to the cspell dictionary rather than disabling the check.
10. **Accent colour contrast.** The amber accent always carries dark `ink` text, never white text (2.05:1 fails). The light-mode focus ring is `primary-600`, not amber.
11. **One source of truth per fact.** Amounts go through `formatINR()` only ("₹10 lakh"), dates through `src/lib/dates.ts` only. Counts that can be derived from content (startups listed, events held, section counts like "(06)") are derived, never typed. All four TBI reference sites contradicted their own numbers.
12. **Status is computed, not stored.** Open/closed/rolling for calls, schemes, registrations and jobs comes from `windowStatus()` in `src/lib/status.ts`, on both build and client. Never add an `open: true` flag.
13. **Facets come from the data.** Filter values and counts are built by `src/lib/facets.ts` (OR within a group, AND across groups) and are unit-tested. Never hand-type filter labels.
14. **Real links and visible information.** Interactive cards (including the spinbar) are `<a href>`, never `div role=button` + `window.open`. Nothing important is hover-only. No action-less `<button>`s, no generic link text ("Read more", "Click here") without an accessible name, no hidden scrollbars. Animated numbers ship their final value in the HTML.
15. **No preloader by default.** The optional one stays feature-flagged off. No GIFs, no frame-sequence heroes, no autoplay video above the fold.

## Conventions
- Server Components by default; `"use client"` only for interactive leaves. Lazy-load heavy client components (spinbar, command palette, testimonials) with `next/dynamic`.
- Components: `src/components/{ui,layout,sections,spinbar,forms}`. One component per file, PascalCase. Hooks and utilities in `src/lib`.
- Slugs are kebab-case and equal the filename. Dates are ISO 8601 with the IST offset `+05:30`. Asset filenames have no spaces.
- Content collections (see BACKEND_SCHEMA §3): stages, tracks, funding-schemes, opportunities, startups, spotlight, milestones, events, event-series, news, press, documents, people, committees, mentors, testimonials, partners, facilities, instruments, services, jobs, faqs, plus settings singletons. Form types: contact, pitch, application, mentor, partner, booking, newsletter.
- Spinbar: a ring (desktop, fine pointer) / deck (touch, < 1024 px) / grid (reduced motion). Its geometry lives in pure functions in `spinbar/geometry.ts` with unit tests. See SPEC §5.1 and TRD §8.2.
- Tooling scripts are TypeScript run with `tsx`, and must be **cross-platform**: development is on Windows, CI runs on Linux. No bash-only scripts; use `path` APIs.
- Time-sensitive UI (announcements, upcoming/past events, registration, job expiry) must evaluate on the client as well as at build time.
- Commit only when asked. Never commit secrets; `NEXT_PUBLIC_*` values are public.

## Legacy material
`iice.iiserb.ac.in/` and `_external/` are an **offline mirror of the old Google Site** (downloaded 2026-10-12), kept only as a content reference. It is IICE's own content, so the text may be reused after proofreading. Don't import code, CSS or markup from it, and don't hotlink its Google-hosted images. It contains template placeholder pages (About Us, Incubation, Activities), broken links, 50 missing images and stale people data; see SRD §4 and §7. Move it to `legacy/` when scaffolding, and exclude it from lint, build and search.

## Open decisions (check SRD §8.4 before assuming)
Hosting target (institute server or static host), which determines CMS auth and redirects · current team and committee rosters · funding schemes and amounts · stage durations · engagement tracks offered and their terms · instrument access and rate cards · CSR/co-investment partnerships · Grievance Officer · newsletter · tenders · BIRAC Edge content · analytics provider · brand colours (interim teal/amber tokens until the IISER Bhopal logo is supplied). Until confirmed, these render as TODO_CONFIRM or are hidden, never invented.
