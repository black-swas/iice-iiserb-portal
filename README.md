# IICE IISER Bhopal Website — zlm_final

Final build of the **Innovation and Incubation Centre for Entrepreneurship (IICE), IISER Bhopal** website — the approved template, rebuilt with:

## This iteration (3)
- **Motion & feel pass**: route changes get a subtle brand wash — a barely-there warm veil fades over the swap while the outgoing page dips out (150ms) and the new page rises in with a 32ms stagger cascade; a global capture-phase click interceptor routes the template's own links through the same transition (React Router respects `defaultPrevented`). Overlay blocks (section heads, flip-card row, bento cells, CEO card) reveal once on scroll. The spinbar was retuned — scroll distance cut ~30% (52svh/card ring, 34svh/card deck), snappier follow (185ms exp + 235/0.82 spring, 85ms settle), active card lifts with an amber glow, and the mobile **deck** no longer ghosts: incoming card rises *under* the active one, the outgoing card fades out before the half-step park, deck cards are fully opaque, card height fits content.
- **Mobile header fix**: the 6.7:1 logo lockup kept height-based sizing on phones and overflowed the bar — the burger ended up off-screen and the menu was unreachable. Below 700px the logo now sizes by width (`clamp(148px, 43vw, 205px)`, height auto) and the CTA/burger compact.
- **Strict tint alternation**: bands re-keyed to DOM-position parity over structurally real bands only — invisible spacers and nested overlay sections no longer shift the rhythm, and re-passes can't re-shuffle painted bands (the "abaa" drift). Home now reads `a b a b a b a b` deterministically.
- **Scroll perf**: the full-page column slab lost its `backdrop-filter` (kept the translucent warm tint — aurora still reads through), card blur trimmed 15→13px. The spin tracks no longer eat a third of the homepage scroll.
- **Tinted liquid glass everywhere (§10 + `glassify()`)**: a JS pass tags every rounded neutral surface the template renders — cards, stat strips, form fields, hero badges — with a warm tinted-glass material (cream / amber / rose variants, backdrop blur + saturate, specular inset edges, transform-only hover sheen clipped to each card's own radius). The white content column becomes a glass slab over an ambient aurora (`body::before`), the ink footer gains maroon/amber aurora pools, warm bands gain liquid color pools, and maroon pill buttons / the cookie toast share the `.zlm-cta` material. `prefers-reduced-transparency` falls back to **opaque tinted** glass (same gradients, highlights and sheens, no blur/translucency) instead of plain white; weak GPUs get thinner blur, mobile drops the column slab; marquee tiles are tint-only (no per-frame re-filter). Overlay asset URLs carry a `?v=N` cache-buster in `index.html` — bump it after every zlm.js/zlm.css edit.
- **Boot header fix**: the overlay header is now retried into position until React mounts (it used to stay stranded at the end of `<body>` — the bottom of the page — whenever React rendered after `DOMContentLoaded`). Template ancestors with `overflow: hidden` are converted to `overflow: clip` so `position: sticky` keeps working.
- **Crisp header lockup**: the fuzzy raster logo is replaced with an inline SVG lockup — real IICE icon + IISERB seal + vector text in Plus Jakarta Sans (the `Fonts/` directory is now shipped; the template CSS referenced it but it was missing). `assets/logo_header.svg` is the static twin of the inline lockup.
- **Stakeholder Gateways spinbar** ("05 / Stakeholder Gateways — Information by Stakeholder Category", ported from the previous Next.js iteration's Spinbar): scroll-scrubbed card **ring** on desktop, **deck** on touch, static **grid** under reduced motion; Founders / Students / Mentors / Investors & Partners cards with badges, floating icon watermarks, deep links and per-card fill lines; liquid under-damped spring for button jumps, staggered rise-in entry. Replaces the featured-ventures card row.
- **All 14 partner logos are real** — Startup India (#startupindia), ANRF and MeitY Startup Hub logos fetched from official sources, the official green Lupin logo from Lupin's media kit, plus DST, BIRAC, MSME, HDFC, BHEL, Zydus, SINE IIT-B, FITT IIT-D, IISER Bhopal. Both the home marquee and the /partners page read these tiles.
- **Startup directory repaired**: all 14 tiles rebuilt at the card's exact 6:5 aspect (real logos for Plabeltech, Xtalsphere, Intisen, Miniguru; consistent typographic brand tiles for the rest) so nothing is cropped or offset; broken "visit website" self-links removed — the seven startups with real sites (Plabeltech, Cytoforge, Luminojen, SimDaas, Xtalsphere, Richnex, Powernet) link out, the rest carry no button.
- **CIF booking links corrected** to the real portals: www.iiserb.ac.in/cif and www.istem.gov.in (nav, footer, startups-page CTAs and the step-by-step CIF text on the labs page).
- **CEO spotlight on /our-team**: Dr. Sandeep Raut's full profile (PhD, past roles, awards, 55+ sessions) with email/phone chips, sourced from the previous iteration's people data; his team card carries the credential and no more placeholder self-links.
- **Bento grid**: the brown overlay no longer covers the photos on load (it now parks off-cell), and the directional wipe is a GPU transform slide from the mouse's entry edge — liquid, no backdrop-filter in the animated layer.
- **Flip cards**: instrument photos use a blurred cover backdrop + contained sharp subject, so the wide CIF shots keep their subject instead of an awkward crop.
- **Liquid glass, GPU-only**: header/hinge/mobile/spinbar share a tuned material (blur + saturate + specular inset edges); animated properties are transform/opacity only; screens ≤768px get thinner blur and no sheen sweeps; `prefers-reduced-transparency` falls back to solid, `prefers-reduced-motion` stops all sweeps.
- **Readability tints on every page**: subtle alternating warm washes across neutral sections (home, partners, team, startups…), skipping dark heroes, cards and the spin track.
- **Crash watchdog**: if the React tree ever unmounts, the page reloads once per session; errors are mirrored to `localStorage["zlm-last-error"]` for diagnosis.
- Mobile: panel sits above the page stacking context with its own close button; responsive logo sizing; no horizontal overflow; burger menu works.

## Prior iteration
Real photography throughout (20 verified people photos, CIF instruments, campus, YouTube thumbnails), no photo reused across different content, deep funding-scheme pages (NIDHI-EIR, NIDHI-TBI Seed), designed default page banner.

## Run locally
```bash
python server.py 3000      # open http://localhost:3000
# or: PORT=8080 python server.py
```

## Deploy on Vercel
`vercel.json` ships with the repo: every route rewrites to `index.html`
(SPA fallback — filesystem still wins, so all real assets serve directly),
the hashed bundle and fonts cache immutably, other assets cache a day.

1. Vercel → **Add New → Project** → import `black-swas/iice-iiserb-portal`
2. Framework Preset **Other** — no build command, no output directory, nothing to set
3. **Deploy**

Local development still uses the Python server (`python server.py 3000`);
it is not part of the deployment.

## Structure
- `assets/index-*.js|css` — SPA bundle (patched: people photos, events, programs, boot, redirects)
- `assets/zlm.css|zlm.js` — hinge header + gateways spinbar + flip cards + bento overlay layer
- `Fonts/` — Plus Jakarta Sans (required by the template CSS; was missing before)
- `assets/media/` — all imagery (`people/`, `ventures/`, `cif_*`, `campus_*`, `bento_*`, `iice_*`, `yt_*`, `logo_iice.webp`, `logo_iiserb.webp`)
- `assets/partners/partner-N.svg` — real partner logos (webp-embedded SVG tiles)
- `assets/startups/startup-N.svg` — real logos / typographic brand tiles
