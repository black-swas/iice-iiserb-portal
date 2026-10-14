# IICE website

The official website of the Innovation and Incubation Centre for Entrepreneurship (IICE), the DST NIDHI-TBI technology
business incubator at IISER Bhopal. It replaces the old Google Sites website.

It is a **static site**: every page is built to plain HTML ahead of time and can be served from any web server. Staff edit
content (text, startups, events, news, documents…) in a browser-based editor, with no developer involved. Forms send to a
small endpoint that saves to a Google Sheet and emails the office.

## Get started

You need Node 22 (`.nvmrc` names the exact version) and npm.

```
npm ci
npm run dev        # http://localhost:3000, rebuilds as you edit
```

On Windows PowerShell, run npm as `npm.cmd` if scripts are blocked by the execution policy.

## Commands

| Command                                         | What it does                                                                                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                                   | Development server. Placeholders and pages that do not exist yet are shown, outlined                                                                                                 |
| `npm run build`                                 | Validates content, builds images, calendar files, feed, redirects and search index, builds the site into `out/`, then writes redirect stubs and the per-page Content-Security-Policy |
| `npm start`                                     | Serves `out/` locally, the way a host would                                                                                                                                          |
| `npm run lint` / `typecheck` / `test` / `spell` | Code style and accessibility lint, types, unit tests, spelling                                                                                                                       |
| `npm run test:e2e`                              | Builds a preview and a fully populated test copy, then runs the Playwright tests and axe on both                                                                                     |
| `npm run content:validate`                      | Checks every content file against its schema, and the rules between files                                                                                                            |
| `npm run content:stale`                         | Lists schemes, rate cards, committees and figures not re-confirmed for 180 days                                                                                                      |
| `npm run todo:confirm`                          | Lists every `TODO_CONFIRM` placeholder                                                                                                                                               |
| `npm run check:launch`                          | The gate before going live: fails while any placeholder would show on a production page                                                                                              |
| `npm run size`                                  | Measures first-load JavaScript and CSS per page against the budgets in `docs/TRD.md` §12                                                                                             |
| `npm run lhci`                                  | Lighthouse on the mobile profile, against the thresholds in `lighthouserc.json`                                                                                                      |
| `npm run links`                                 | Checks every internal link and `#anchor` in `out/`, and that the sitemap lists only built pages                                                                                      |
| `npm run audit:html`                            | Anti-pattern audit of every built page (dead links, alt text, headings, labels, forbidden copy)                                                                                      |
| `npm run form-rules`                            | Regenerates the form validation rules shared by the page and `apps-script/Code.gs`                                                                                                   |
| `npm run cms` / `cms:config`                    | Local editor backend for offline editing / regenerates the editor's `config.yml` from the schemas                                                                                    |

## Editing content

Everything editable is in `content/`, as JSON, Markdown and MDX, and is checked against the schemas in
`src/content/schema.ts` at build time. The editor at `/admin/` (Decap CMS) is generated from the same schemas, so it cannot
offer a field the build rejects. See `docs/BACKEND_SCHEMA.md` for every field.

**Nothing is invented.** A value IICE has not confirmed is written `TODO_CONFIRM: …` (or the entry carries
`_status: TODO_CONFIRM`). Unconfirmed numbers never show as numbers on the live site. Run `npm run check:launch` to see
what still stands between the site and a launch.

## How it is organised

```
content/        everything editable             messages/en.json   every word of interface text
src/app/        the home page and one catch-all route that builds every other page from src/content/page-routes.ts
src/components/ pages, sections, forms, layout, the spinbar, the command palette
src/lib/        dates, money, status, facets, forms, SEO, security: small pure modules with unit tests
scripts/        build tooling (TypeScript, run with tsx, cross-platform)
apps-script/    the reference form endpoint (Google Apps Script) and how to set it up
tests/          unit tests (Vitest) and browser tests (Playwright, axe)
docs/           SRD (requirements), TRD (architecture), BACKEND_SCHEMA, DEPLOY
```

The rules the code holds itself to are in `CLAUDE.md`; the ones worth knowing first: honesty about unconfirmed facts, no
dead links (a page that has no content is not built, and nothing links to it), WCAG 2.2 AA and the Lighthouse scores as
gates, amounts only through `formatINR()`, and dates only through `src/lib/dates.ts`.

## Checks

`.github/workflows/ci.yml` runs on every pull request and every push to `main`: content validation, lint, types, spelling,
unit tests, a dependency audit, the build, the budgets, links, the HTML audit, Lighthouse, then the end-to-end and axe
tests. `deploy.yml` rebuilds and deploys on `main` and every day at 00:30 IST, so things that depend on the date (a call
that has closed, an event that has passed) are right in the pages. `weekly-external-links.yml` checks links to other
websites and stale content once a week and opens an issue. Deployment and hosting are in `docs/DEPLOY.md`.
