/* ============================================================
   ZLM overlay layer v2 — DERBI hinge mega-menu header,
   expanding 3D flip program cards, photo bento grid.
   Loaded via index.html after the SPA bundle.
   ============================================================ */
(function () {
  "use strict";

  /* Re-apply the persisted theme before anything paints (belt-and-braces
     with the inline head script in index.html). */
  try {
    var __t = localStorage.getItem("zlm-theme");
    if (__t) document.documentElement.setAttribute("data-zlm-theme", __t);
  } catch (e) {}

  /* ---------------- data ---------------- */
  var NAV = [
    {
      label: "About IICE",
      match: ["/who-we-are", "/board-of-directors", "/our-team", "/noida-office"],
      groups: [
        {
          heading: "About IICE",
          items: [
            ["Who We Are", "/who-we-are"],
            ["Managing Committee", "/board-of-directors"],
            ["Team & Committees", "/our-team"],
            ["Bhopal Ecosystem", "/noida-office"],
          ],
        },
      ],
    },
    {
      label: "Incubation",
      match: ["/programs", "/facilities", "/lab", "/office-spaces", "/branding", "/partners", "/ipr"],
      groups: [
        {
          heading: "Programs & Funding",
          items: [
            ["Programs & Grants", "/programs"],
            ["Support & Partners", "/partners"],
            ["IPR & Policy", "/ipr"],
          ],
        },
        {
          heading: "Facilities",
          items: [
            ["CIF & Innovation Labs", "/lab"],
            ["Incubation Space", "/office-spaces"],
            ["Ecosystem & Campus", "/noida-office"],
            ["IPR & Marketing Help", "/branding"],
          ],
        },
      ],
    },
    { label: "Startups", link: "/startups", match: ["/startups"] },
    {
      label: "Initiatives",
      match: ["/programs/birac-edge-program", "/programs/student-innovation-grant-sig", "/programs/iice-innovation-club"],
      groups: [
        {
          heading: "Flagship Initiatives",
          items: [
            ["BIRAC-EDGE Program", "/programs/birac-edge-program"],
            ["Student Innovation Grant (SIG)", "/programs/student-innovation-grant-sig"],
            ["CIF Booking — IISER Bhopal", "https://www.iiserb.ac.in/cif", true],
            ["I-STEM Instrument Portal", "https://www.istem.gov.in/", true],
            ["IICE Innovation Club", "/programs/iice-innovation-club"],
          ],
        },
      ],
    },
    {
      label: "Join Us",
      match: ["/join-as-mentor", "/join-as-investor", "/careers"],
      groups: [
        {
          heading: "Join Us",
          items: [
            ["As a Faculty / Industry Mentor", "/join-as-mentor"],
            ["As an Investor / Partner", "/join-as-investor"],
            ["Careers @ IICE", "/careers"],
          ],
        },
      ],
    },
    {
      label: "Activities",
      match: ["/upcoming-events", "/latest-news"],
      groups: [
        {
          heading: "Activities",
          items: [
            ["Conclaves & Events", "/upcoming-events"],
            ["News & Past Events", "/latest-news"],
          ],
        },
      ],
    },
    { label: "Contact", link: "/contact", match: ["/contact"] },
  ];

  /* DERBI spec §2 — three-stage incubation framework (content from the
     previous Next.js iteration's stages collection) */
  var STAGES = [
    {
      num: "01",
      img: "/assets/media/cif_laser.webp",
      sub: "Pre-Incubation · TRL 1–3",
      name: "Catalyse",
      cat: "Stage 01 — Catalyse",
      heading: "Validate your idea and build a proof of concept",
      body: "Turn laboratory research into a defensible venture thesis. NIDHI-EIR fellowships, BIRAC BIG grants and IICE faculty advisory panels help founders de-risk the science before incorporation.",
      chips: ["NIDHI-EIR", "BIRAC BIG", "SIG"],
      cta: "Explore NIDHI-EIR",
      href: "/programs/dst-nidhi-eir",
    },
    {
      num: "02",
      img: "/assets/media/cif_nmr_700.webp",
      sub: "Incubation · TRL 4–6",
      name: "Culture",
      cat: "Stage 02 — Culture",
      heading: "Build your product with labs, CIF instruments, and mentors",
      body: "Physically incubate on the 20,000 sq.ft floor with wet/dry labs, the 700 MHz NMR suite, FE-SEM, XRD and HRMS at incubatee rates, plus milestone-linked seed support of Rs 10L–1 Cr.",
      chips: ["NIDHI-TBI Seed", "BIRAC-EDGE", "CIF Access"],
      cta: "Explore Seed Support",
      href: "/programs/dst-nidhi-tbi-seed",
    },
    {
      num: "03",
      img: "/assets/media/cif_fesem.webp",
      sub: "Commercialisation · TRL 7–9",
      name: "Commercialise",
      cat: "Stage 03 — Commercialise",
      heading: "Reach enterprise customers, venture capital, and scale",
      body: "Graduate with IP portfolios, industry pilots and investor connects from the conclave network — from Plabeltech's bioconjugation platform to Cytoforge's cell therapies.",
      chips: ["Investor Connects", "Tech Transfer", "CSR Grants"],
      cta: "Meet the Startups",
      href: "/startups",
    },
  ];

  var BENTO = [
    { img: "/assets/media/bento_conclave_expo.webp", span: 2, tag: "Conclave 2.0", name: "Startup Exhibition", sub: "Industry–Academia Conclave 2.0, IISER Bhopal" },
    { img: "/assets/media/bento_conclave_session.webp", span: 1, tag: "Conclave 2.0", name: "Fireside Session", sub: "Leaders from ADB, Zydus & IIT Bombay" },
    { img: "/assets/media/bento_ramp_workshop.webp", span: 1, tag: "RAMP · MSME", name: "Ecosystem Workshop", sub: "RAMP exposure programme, May 2026" },
    { img: "/assets/media/bento_ramp_lab.webp", span: 1, tag: "RAMP · MSME", name: "CIF Lab Tour", sub: "Central Instrumentation Facility visit" },
    { img: "/assets/media/bento_ramp_panel.webp", span: 1, tag: "RAMP · MSME", name: "Orientation Session", sub: "MP Laghu Udyog Nigam delegation" },
    { img: "/assets/media/bento_conclave_visit.webp", span: 2, tag: "Conclave 2.0", name: "Distinguished Visits", sub: "Guests engaging with incubated ventures" },
    { img: "/assets/media/bento_ramp_tour.webp", span: 2, tag: "Training", name: "A-ESDP Data Science", sub: "Ministry of MSME skill programme" },
    { img: "/assets/media/bento_ramp_demo.webp", span: 2, tag: "Innovation", name: "Live Demonstrations", sub: "Founders showcasing deep-science prototypes" },
  ];

  /* ---------------- helpers ---------------- */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function isExternal(u) { return /^https?:/.test(u) && u.indexOf(location.origin) !== 0; }

  /* ---------------- theme system (Theme Studio) ----------------
     Every color on the site hangs off the --t-* variables in zlm.css §0;
     a theme switch just sets html[data-zlm-theme] and the whole site
     (overlay + template, whose --primary/--secondary/--color-primary-
     highlight are bridged to the same variables) rethemes live.
     Selection persists in localStorage("zlm-theme"). */
  var THEME_KEY = "zlm-theme";
  var THEMES = [
    { id: "signature", name: "Signature Maroon", tag: "The IICE classic — heritage maroon, warm copper amber",
      sw: ["#6C3231", "#5E2928", "#E66A1F", "#F3ECE3", "#23201E", "#09181D"] },
    { id: "navy", name: "Institute Navy", tag: "Academic navy, gold spark — formal, campus-grade",
      sw: ["#1E3A5F", "#152E4D", "#F59E0B", "#EEF0F4", "#1A2430", "#0B1526"] },
    { id: "emerald", name: "Emerald Campus", tag: "Deep greens, citrine spark — growth and energy",
      sw: ["#14584A", "#0E463A", "#EAB308", "#EDF3EE", "#15241E", "#07201A"] },
    { id: "indigo", name: "Royal Indigo", tag: "Scholarly indigo, electric rose spark — modern research",
      sw: ["#3F3A9E", "#322D80", "#F43F5E", "#EFEDF7", "#201C3A", "#131030"] },
    { id: "terracotta", name: "Terracotta Dusk", tag: "Baked clay, warm honey — earthy incubator warmth",
      sw: ["#9C4A2F", "#7E3722", "#E59819", "#F6EEE4", "#2B1D14", "#241209"] },
    { id: "teal", name: "Teal Lagoon", tag: "Deep teal, tropical sea-coral flare — fresh and technical",
      sw: ["#0E5F66", "#0A4B51", "#FF6B6B", "#EAF2F2", "#12302F", "#052124"] },
    { id: "plum", name: "Plum Orchard", tag: "Berry plum, ripe apricot blossom — distinctive and warm",
      sw: ["#6D2F5E", "#57244A", "#FB923C", "#F4EDF3", "#2A1A26", "#1E0E1A"] },
    { id: "graphite", name: "Graphite Slate", tag: "Ink graphite, electric cyan spark — minimal, product-grade",
      sw: ["#3A4552", "#2C3540", "#0EA5E9", "#F0F1F0", "#1B232B", "#0F151B"] },
  ];
  function themeIndex() {
    var id = document.documentElement.getAttribute("data-zlm-theme") || "signature";
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return i;
    return 0;
  }
  function syncStudio() {
    var id = document.documentElement.getAttribute("data-zlm-theme") || "signature";
    var cards = document.querySelectorAll(".zlm-studio__card");
    for (var i = 0; i < cards.length; i++) {
      var on = cards[i].getAttribute("data-theme-id") === id;
      cards[i].classList.toggle("is-active", on);
      /* write-only-if-changed: unconditional setAttribute/textContent fires
         mutation records even for identical values, which would re-trigger
         the MutationObserver into an infinite loop */
      var want = on ? "true" : "false";
      if (cards[i].getAttribute("aria-pressed") !== want) cards[i].setAttribute("aria-pressed", want);
    }
    var lbl = document.querySelector(".zlm-studio__trigger-label b");
    var name = THEMES[themeIndex()].name;
    if (lbl && lbl.textContent !== name) lbl.textContent = name;
  }
  function applyTheme(id) {
    var known = false;
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) known = true;
    if (!known) id = "signature";
    var html = document.documentElement;
    if (html.getAttribute("data-zlm-theme") !== id) {
      html.classList.add("zlm-theming");
      clearTimeout(applyTheme._t);
      applyTheme._t = setTimeout(function () { html.classList.remove("zlm-theming"); }, 700);
    }
    html.setAttribute("data-zlm-theme", id);
    try { localStorage.setItem(THEME_KEY, id); } catch (e) {}
    syncStudio();
    themeSvgPass();
    inlineThemedImages();
  }
  function cycleTheme(dir) {
    var n = THEMES.length;
    applyTheme(THEMES[(themeIndex() + dir + n) % n].id);
  }
  function studioOnScreen() {
    var s = document.querySelector(".zlm-studio");
    if (!s || !s.classList.contains("is-open")) return false;
    var r = s.getBoundingClientRect();
    return r.top < (window.innerHeight || document.documentElement.clientHeight) && r.bottom > 0;
  }
  /* SVG presentation attributes can't hold var() — rewrite them to themed
     CSS variable inline styles on every pass with coverage for all theme shades. */
  var SVG_ATTR_MAP = {
    "#6c3231": "var(--t-brand)", "#5e2928": "var(--t-brand-2)",
    "#522322": "color-mix(in srgb, var(--t-brand) 76%, black)",
    "#4a1f1e": "color-mix(in srgb, var(--t-brand) 68%, black)",
    "#8a3f3d": "color-mix(in srgb, var(--t-brand) 90%, var(--t-accent))",
    "#ff8a40": "var(--t-accent)", "#e8621a": "var(--t-accent-2)",
    "#e2701e": "var(--t-accent-2)", "#c2410c": "var(--t-accent-2)",
    "#ea580c": "var(--t-accent-2)", "#f97316": "var(--t-accent)",
    "#9a3412": "var(--t-accent-text)", "#d97706": "var(--t-accent-2)",
    "#f59e0b": "var(--t-accent)", "#eab308": "var(--t-accent)",
    "#f43f5e": "var(--t-accent)",
    "#ffab4d": "var(--t-accent)", "#ffc07a": "var(--t-accent-soft)",
    "#ffc247": "var(--t-accent-soft)", "#fdba74": "var(--t-accent-soft)",
    "#fb923c": "var(--t-accent)", "#f0a832": "var(--t-accent)",
    "#ff9d5c": "var(--t-accent)", "#e9b44c": "var(--t-accent)",
    "#e59819": "var(--t-accent)", "#ff8a5c": "var(--t-accent)",
    "#ff6b6b": "var(--t-accent)", "#ffb36b": "var(--t-accent)",
    "#0ea5e9": "var(--t-accent)", "#09181d": "var(--t-dark)",
    "#2d415c": "var(--t-secondary)",
    "#17233c": "color-mix(in srgb, var(--t-secondary) 60%, black)",
    "#0b1b3a": "color-mix(in srgb, var(--t-secondary) 45%, black)",
  };
  function themeSvgPass() {
    var nodes = document.querySelectorAll("svg, svg *, [data-theme-svg]");
    Array.prototype.forEach.call(nodes, function (n) {
      ["fill", "stroke", "stop-color"].forEach(function (attr) {
        var v = (n.getAttribute(attr) || "").toLowerCase().trim();
        if (v && SVG_ATTR_MAP[v]) { n.style.setProperty(attr, SVG_ATTR_MAP[v]); }
      });
      if (n.style) {
        if (n.style.fill && SVG_ATTR_MAP[n.style.fill.toLowerCase()]) {
          n.style.fill = SVG_ATTR_MAP[n.style.fill.toLowerCase()];
        }
        if (n.style.stroke && SVG_ATTR_MAP[n.style.stroke.toLowerCase()]) {
          n.style.stroke = SVG_ATTR_MAP[n.style.stroke.toLowerCase()];
        }
        if (n.style.stopColor && SVG_ATTR_MAP[n.style.stopColor.toLowerCase()]) {
          n.style.stopColor = SVG_ATTR_MAP[n.style.stopColor.toLowerCase()];
        }
      }
    });
  }
  function inlineThemedImages() {
    var imgs = document.querySelectorAll('img[src*="KnowYourJourney"], img[src*="Branding"], img[src*="knowUsGradient"], img[src*="gradient.svg"], img[src*="hover-icons"], img[src*="Approval"], img[src*="BoardOfDirectors"], img[src*="OurTeam"], img[src*="WhoWeAre"], img[src*="OfficeSpace"], img[src*="noida-office"], img[src*="Labs"], img[src*="UpcomingEvents"], img[src*="IPR"], img[src*="Careers"], img[src*="avatar_"], img[src*="banner_"], img[src*="cover_"], img[src*="iice-building-hero"]');
    Array.prototype.forEach.call(imgs, function (img) {
      if (img.dataset.zlmInlined === "1") return;
      var src = img.getAttribute("src");
      if (!src || src.indexOf(".svg") === -1) return;
      img.dataset.zlmInlined = "1";
      fetch(src)
        .then(function (res) { return res.ok ? res.text() : ""; })
        .then(function (svgText) {
          if (!svgText || svgText.indexOf("<svg") === -1) return;
          var parser = new DOMParser();
          var doc = parser.parseFromString(svgText, "image/svg+xml");
          var svg = doc.querySelector("svg");
          if (!svg || !img.parentNode) return;
          if (img.className) svg.setAttribute("class", (svg.getAttribute("class") || "") + " " + img.className);
          if (img.id) svg.id = img.id;
          svg.setAttribute("data-theme-svg", "1");
          img.parentNode.replaceChild(svg, img);
          themeSvgPass();
        })
        .catch(function () {});
    });
  }
  function buildThemeStudio() {
    var sec = document.querySelector(".zlm-studio");
    if (!sec) {
      var cards = THEMES.map(function (t) {
      var sw = t.sw.map(function (hex) {
        var n = parseInt(hex.slice(1), 16);
        var lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
        return '<span class="zlm-studio__sw" style="background:' + hex + '"><i style="color:' +
          (lum > 0.62 ? "rgba(20,20,20,0.6)" : "rgba(255,255,255,0.88)") + '">' + hex + "</i></span>";
      }).join("");
      return '<button type="button" class="zlm-studio__card" data-theme-id="' + t.id + '" aria-pressed="false">' +
        '<span class="zlm-studio__check" aria-hidden="true">&#10003;</span>' +
        '<span class="zlm-studio__strip">' + sw + "</span>" +
        '<span class="zlm-studio__meta"><span class="zlm-studio__name">' + esc(t.name) +
        '</span><span class="zlm-studio__tag">' + esc(t.tag) + "</span></span></button>";
    }).join("");
    sec = el("section", "zlm-studio");
    sec.id = "zlm-theme-studio";
    sec.setAttribute("aria-label", "Theme settings");
    sec.innerHTML =
      '<div class="zlm-studio__inner">' +
      '<button type="button" class="zlm-studio__trigger" data-studio="toggle" aria-expanded="false" aria-controls="zlm-studio-panel">' +
      '<span class="zlm-studio__trigger-swatch" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
      '<span class="zlm-studio__trigger-label">Theme Studio &middot; <b>' + esc(THEMES[themeIndex()].name) + "</b></span>" +
      '<span class="zlm-studio__trigger-chevron" aria-hidden="true">&#9662;</span>' +
      "</button>" +
      '<div class="zlm-studio__panelwrap" id="zlm-studio-panel"><div class="zlm-studio__panel-clip"><div class="zlm-studio__panel">' +
      '<span class="zlm-studio__eyebrow">Settings &middot; Theme Studio</span>' +
      '<h2 class="zlm-studio__h">One palette drives the whole site</h2>' +
      '<p class="zlm-studio__sub">Every surface, button, glow and band is wired to a single color template — click one to apply it across the entire website. Your choice survives reload; cycle through and land on the one to finalize.</p>' +
      '<div class="zlm-studio__bar">' +
      '<button type="button" class="zlm-studio__nav" data-studio="prev" aria-label="Previous palette">&#8592;</button>' +
      '<button type="button" class="zlm-studio__nav" data-studio="next" aria-label="Next palette">&#8594;</button>' +
      '<button type="button" class="zlm-studio__shuffle" data-studio="shuffle">&#8644; Cycle palette</button>' +
      '<button type="button" class="zlm-studio__reset" data-studio="reset">Reset to Signature</button>' +
      '<span class="zlm-studio__keyhint">While the studio is open: <kbd>Space</kbd> or <kbd>&#8592;</kbd> <kbd>&#8594;</kbd> cycle</span>' +
      "</div>" +
      '<div class="zlm-studio__grid">' + cards + "</div>" +
      '<p class="zlm-studio__note">Swatches read: Brand &middot; Brand deep &middot; Accent &middot; Page base &middot; Ink &middot; Dark. Official marks (logos, badges) stay constant by design.</p>' +
      "</div></div></div></div>";
    sec.addEventListener("click", function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest("[data-theme-id],[data-studio]") : null;
      if (!b || !sec.contains(b)) return;
      if (b.getAttribute("data-theme-id")) { applyTheme(b.getAttribute("data-theme-id")); return; }
      var k = b.getAttribute("data-studio");
      if (k === "toggle") {
        var open = sec.classList.toggle("is-open");
        b.setAttribute("aria-expanded", open ? "true" : "false");
        return;
      }
      if (k === "prev") cycleTheme(-1);
      else if (k === "next" || k === "shuffle") cycleTheme(1);
      else if (k === "reset") applyTheme("signature");
    });
    }
    /* Home: live inside the white column (the footer slides in BEHIND it
       at -z-10, so nothing overlaps). Elsewhere: right before the footer.
       Re-parented on every pass — React re-renders can orphan it, and the
       first pass may run before React has rendered either anchor. */
    var column = document.querySelector('div[class*="-mt-20"][class*="bg-white"][class*="min-h-screen"]');
    var footer = document.querySelector('div[class*="bg-[#09181D]"][class*="-mt-20"]');
    if (column && column !== footer) { if (sec.parentNode !== column) column.appendChild(sec); }
    else if (footer && footer.parentNode && sec.parentNode !== footer.parentNode) footer.parentNode.insertBefore(sec, footer);
    else if (!sec.parentNode) document.body.appendChild(sec);
    syncStudio();
    buildThemeFAB();
  }
  /* floating palette button — always visible, bottom-left; jumps to + opens the studio */
  function buildThemeFAB() {
    var fab = document.querySelector(".zlm-themefab");
    if (!fab) {
      fab = el("button", "zlm-themefab");
      fab.type = "button";
      fab.setAttribute("aria-label", "Open color themes");
      fab.title = "Color themes";
      fab.innerHTML =
        '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2.2-.9 2.2-1.8 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4.5 4.5 0 0 0 4.5-4.5C21.5 6.2 17.2 3 12 3Z"/>' +
        '<circle cx="7.6" cy="11.6" r="0.9" fill="currentColor" stroke="none"/>' +
        '<circle cx="10.6" cy="7.6" r="0.9" fill="currentColor" stroke="none"/>' +
        '<circle cx="15.1" cy="7.9" r="0.9" fill="currentColor" stroke="none"/>' +
        '<circle cx="17.4" cy="11.6" r="0.9" fill="currentColor" stroke="none"/>' +
        '</svg>';
      fab.addEventListener("click", function () {
        var sec2 = document.querySelector(".zlm-studio");
        if (!sec2) return;
        sec2.classList.add("is-open");
        var trg = sec2.querySelector(".zlm-studio__trigger");
        if (trg) trg.setAttribute("aria-expanded", "true");
        sec2.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      document.body.appendChild(fab);
    } else if (!fab.parentNode) {
      document.body.appendChild(fab);
    }
  }

  /* Crisp vector lockup (real IICE icon + IISERB seal + live text) — inline so
     the site's Plus Jakarta Sans applies; /assets/logo_header.svg is the static twin. */
  var LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 462 72" width="462" height="72" font-family="'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif" role="img" aria-label="IICE IISER Bhopal">
  <image x="0" y="7" width="58" height="58" preserveAspectRatio="xMidYMid meet" href="/assets/media/logo_iice.webp"/>
  <rect x="67" y="12" width="1.5" height="48" rx="1" fill="#e7e2dc"/>
  <clipPath id="sealClip"><circle cx="103" cy="36" r="27"/></clipPath>
  <image x="76" y="9" width="54" height="54" preserveAspectRatio="xMidYMid slice" clip-path="url(#sealClip)" href="/assets/media/logo_iiserb.webp"/>
  <circle cx="103" cy="36" r="26" fill="none" stroke="#e7e2dc" stroke-width="1.2"/>
  <text x="142" y="33" font-size="27" font-weight="800" letter-spacing="0.5" fill="#6c3231">IICE</text>
  <text x="142" y="51" font-size="12.5" font-weight="700" fill="#3d3733">Innovation &amp; Incubation Centre for Entrepreneurship</text>
  <text x="142" y="66" font-size="10.5" font-weight="500" fill="#8a7d7a">Indian Institute of Science Education and Research Bhopal</text>
</svg>`;

/* compact lockup for phone bars — icon + seal + IICE only; badges and the
   two long text lines of the full lockup are unreadable below ~30px tall */
var LOGO_SVG_COMPACT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 72" width="210" height="72" font-family="'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif" role="img" aria-label="IICE IISER Bhopal">
  <image x="0" y="7" width="58" height="58" preserveAspectRatio="xMidYMid meet" href="/assets/media/logo_iice.webp"/>
  <rect x="67" y="12" width="1.5" height="48" rx="1" fill="#e7e2dc"/>
  <clipPath id="sealClipM"><circle cx="103" cy="36" r="27"/></clipPath>
  <image x="76" y="9" width="54" height="54" preserveAspectRatio="xMidYMid slice" clip-path="url(#sealClipM)" href="/assets/media/logo_iiserb.webp"/>
  <circle cx="103" cy="36" r="26" fill="none" stroke="#e7e2dc" stroke-width="1.2"/>
  <text x="138" y="47" font-size="34" font-weight="800" letter-spacing="0.5" fill="#6c3231">IICE</text>
</svg>`;

  /* global route transition: a brand veil sweeps across while the route
     swaps underneath, then the new page's sections rise in staggered.
     popstate (back/forward) only gets the rise. */
  var pageTransition = {
    lastPath: null,
    enterScheduled: 0,
    leave: function (cb) {
      var w = header ? header.parentElement : null;
      if (!w || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { cb(); return; }
      var v = buildVeil();
      v.classList.remove("zlm-veil--out");
      /* restart the cover animation if a transition is still in flight */
      v.classList.remove("zlm-veil--in");
      void v.offsetWidth;
      v.classList.add("zlm-veil--in");
      w.classList.add("zlm-route-leave");
      setTimeout(function () { cb(); }, 150);
    },
    enter: function () {
      var w = header ? header.parentElement : null;
      if (!w) return;
      w.classList.remove("zlm-route-leave");
      w.classList.add("zlm-route-enter");
      clearTimeout(this.enterScheduled);
      this.enterScheduled = setTimeout(function () {
        w.classList.remove("zlm-route-enter");
      }, 650);
      var v = document.querySelector(".zlm-veil");
      if (v && v.classList.contains("zlm-veil--in")) {
        v.classList.remove("zlm-veil--in");
        v.classList.add("zlm-veil--out");
      }
    },
  };

  /* the brand veil — one fixed element, transform-only animation */
  function buildVeil() {
    var v = document.querySelector(".zlm-veil");
    if (v) return v;
    v = el("div", "zlm-veil");
    v.setAttribute("aria-hidden", "true");
    v.innerHTML = '<span class="zlm-veil__edge"></span><span class="zlm-veil__sheen"></span>';
    document.body.appendChild(v);
    return v;
  }

  /* SPA-safe navigation: react-router listens to popstate */
  function navigate(href) {
    if (href.indexOf("/") === 0 && href.indexOf("//") !== 0) {
      try {
        pageTransition.leave(function () {
          history.pushState({}, "", href);
          window.dispatchEvent(new PopStateEvent("popstate"));
          setTimeout(function () { pageTransition.enter(); }, 120);
        });
        return;
      } catch (err) { /* fall through */ }
    }
    window.location.href = href;
  }
  function bindSpaLink(a, href, external) {
    if (external) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      return;
    }
    a.addEventListener("click", function (ev) {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0) return;
      ev.preventDefault();
      navigate(href);
    });
  }

  /* ---------------- header (DERBI spec §1) ---------------- */
  var header, popovers = [], closeTimer = null;

  function activeCategory() {
    var path = location.pathname;
    for (var i = 0; i < NAV.length; i++) {
      var n = NAV[i];
      if (n.link === path) return n.label;
      for (var j = 0; j < (n.match || []).length; j++) {
        if (path === n.match[j] || path.indexOf(n.match[j] + "/") === 0) return n.label;
      }
    }
    return null;
  }

  function buildHeader() {
    if (document.querySelector(".zlm-header")) return;

    header = el("header", "zlm-header");
    header.setAttribute("role", "banner");
    var inner = el("div", "zlm-header__inner");

    var glass = el("span", "zlm-header__glass", '<span class="zlm-header__sheen"></span>');
    glass.setAttribute("aria-hidden", "true");
    header.appendChild(glass);

    var logo = el("a", "zlm-logo");
    logo.setAttribute("aria-label", "IICE IISER Bhopal — Home");
    logo.innerHTML =
      '<span class="zlm-logo__f">' + LOGO_SVG + "</span>" +
      '<span class="zlm-logo__m">' + LOGO_SVG_COMPACT + "</span>";
    logo.addEventListener("click", function (ev) { ev.preventDefault(); navigate("/"); });
    inner.appendChild(logo);

    var nav = el("ul", "zlm-nav");
    nav.setAttribute("role", "menubar");

    NAV.forEach(function (item) {
      var li = el("li", "zlm-nav__item");
      li.setAttribute("role", "none");
      var a = el("a", "zlm-nav__link", esc(item.label));
      a.setAttribute("role", "menuitem");
      if (item.link) {
        a.href = item.link;
        bindSpaLink(a, item.link);
      } else {
        a.href = "#";
        a.setAttribute("aria-haspopup", "true");
        a.setAttribute("aria-expanded", "false");
      }
      li.appendChild(a);
      item._link = a;
      item._li = li;

      if (item.groups) {
        var pop = el("div", "zlm-pop");
        pop.setAttribute("role", "menu");
        var cols = el("div", "zlm-pop__cols");
        item.groups.forEach(function (g) {
          var col = el("div");
          col.appendChild(el("p", "zlm-pop__heading", esc(g.heading)));
          var ul = el("ul", "zlm-pop__list");
          g.items.forEach(function (entry) {
            var label = entry[0], href = entry[1], ext = entry[2] || isExternal(href);
            var li2 = el("li");
            var a2 = el("a", "zlm-pop__link", esc(label) + (ext ? ' <span class="zlm-ext">↗</span>' : ""));
            a2.href = href;
            a2.setAttribute("role", "menuitem");
            bindSpaLink(a2, href, ext);
            li2.appendChild(a2);
            ul.appendChild(li2);
          });
          col.appendChild(ul);
          cols.appendChild(col);
        });
        pop.appendChild(cols);
        li.appendChild(pop);
        item._pop = pop;
        popovers.push(item);

        li.addEventListener("mouseenter", function () { openPopover(item); });
        li.addEventListener("mouseleave", function () { scheduleClose(); });
        pop.addEventListener("mouseenter", function () { cancelClose(); });
        pop.addEventListener("mouseleave", function () { scheduleClose(); });
        a.addEventListener("click", function (ev) { ev.preventDefault(); togglePopover(item); });
        a.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); togglePopover(item); }
          if (ev.key === "Escape") closeAllPopovers();
        });
      } else {
        li.addEventListener("mouseenter", function () { closeAllPopovers(); });
      }
      nav.appendChild(li);
    });
    inner.appendChild(nav);

    var cta = el("a", "zlm-cta", "Apply Now");
    cta.href = "/programs";
    bindSpaLink(cta, "/programs");
    inner.appendChild(cta);

    var burger = el("button", "zlm-burger", "<span></span><span></span><span></span>");
    burger.setAttribute("aria-label", "Open menu");
    burger.setAttribute("aria-expanded", "false");
    inner.appendChild(burger);

    header.appendChild(inner);
    document.body.appendChild(header);

    burger.addEventListener("click", function () {
      var open = mobile.classList.toggle("is-open");
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });

    window.addEventListener("scroll", function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
      /* sub-categories are NOT sticky: any open mega-menu collapses the
         moment the page scrolls (the header itself stays pinned) */
      closeAllPopovers();
    }, { passive: true });

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") { closeAllPopovers(); closeMobile(); }
    });

    syncActive();
  }

  function openPopover(item) {
    cancelClose();
    popovers.forEach(function (o) {
      var on = o === item;
      o._pop.classList.toggle("is-open", on);
      o._link.setAttribute("aria-expanded", on ? "true" : "false");
    });
  }
  function togglePopover(item) {
    if (item._pop.classList.contains("is-open")) closeAllPopovers();
    else openPopover(item);
  }
  function scheduleClose() {
    cancelClose();
    closeTimer = window.setTimeout(closeAllPopovers, 160);
  }
  function cancelClose() { if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; } }
  function closeAllPopovers() {
    popovers.forEach(function (o) {
      o._pop.classList.remove("is-open");
      o._link.setAttribute("aria-expanded", "false");
    });
  }
  function syncActive() {
    var active = activeCategory();
    NAV.forEach(function (n) { n._li.classList.toggle("is-active", n.label === active); });
  }

  /* ---------------- mobile panel ---------------- */
  var mobile;
  function buildMobile() {
    if (document.querySelector(".zlm-mobile")) return;
    mobile = el("div", "zlm-mobile");
    mobile.setAttribute("role", "dialog");
    mobile.setAttribute("aria-label", "Site menu");
    /* the panel covers the header (page wrapper stacks at z-10), so it
       carries its own close control */
    var closeB = el("button", "zlm-mobile__close",
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>');
    closeB.setAttribute("type", "button");
    closeB.setAttribute("aria-label", "Close menu");
    closeB.addEventListener("click", closeMobile);
    mobile.appendChild(closeB);
    NAV.forEach(function (item) {
      var group = el("div", "zlm-mobile__group");
      if (item.groups) {
        var toggle = el("button", "zlm-mobile__toggle", esc(item.label) +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>');
        var sub = el("div", "zlm-mobile__sub");
        var subInner = el("div");
        item.groups[0].items.forEach(function (entry) {
          var label = entry[0], href = entry[1], ext = entry[2] || isExternal(href);
          var a = el("a", null, esc(label) + (ext ? " ↗" : ""));
          a.href = href;
          bindSpaLink(a, href, ext);
          a.addEventListener("click", closeMobile);
          subInner.appendChild(a);
        });
        sub.appendChild(subInner);
        toggle.addEventListener("click", function () {
          var open = group.classList.contains("is-open");
          document.querySelectorAll(".zlm-mobile__group.is-open").forEach(function (g) { g.classList.remove("is-open"); });
          if (!open) group.classList.add("is-open");
        });
        group.appendChild(toggle);
        group.appendChild(sub);
      } else {
        var a = el("a", "zlm-mobile__toggle", esc(item.label));
        a.href = item.link;
        bindSpaLink(a, item.link);
        a.addEventListener("click", closeMobile);
        group.appendChild(a);
      }
      mobile.appendChild(group);
    });
    var cta = el("a", "zlm-cta zlm-mobile__cta", "Apply Now");
    cta.href = "/programs";
    bindSpaLink(cta, "/programs");
    cta.addEventListener("click", closeMobile);
    mobile.appendChild(cta);
    document.body.appendChild(mobile);
  }
  function closeMobile() {
    if (!mobile) return;
    mobile.classList.remove("is-open");
    var b = document.querySelector(".zlm-burger");
    if (b) { b.classList.remove("is-open"); b.setAttribute("aria-expanded", "false"); }
  }

  /* ---------------- flagship flip cards (DERBI spec §2) ---------------- */
  function buildFlagship() {
    if (document.querySelector(".zlm-flagship")) return;
    /* anchor: insert before the journey section heading if present, else before bento/pride */
    var anchor = null;
    var heads = document.querySelectorAll("h1, h2");
    for (var i = 0; i < heads.length; i++) {
      var t = (heads[i].textContent || "").trim().toLowerCase();
      if (t === "know your journey" || t === "our pride" || t === "our partners") {
        anchor = heads[i].closest("section") || heads[i].parentElement;
        break;
      }
    }
    if (!anchor || !anchor.parentElement) return;

    var sec = el("section", "zlm-flagship");
    sec.setAttribute("aria-labelledby", "zlm-flag-title");
    var head = el("div", "zlm-flagship__head");
    head.appendChild(el("div", null,
      '<span class="zlm-flagship__eyebrow">Flagship Incubation Stages</span>' +
      '<h2 class="zlm-flagship__title" id="zlm-flag-title">From Idea to Enterprise</h2>' +
      '<p class="zlm-flagship__sub">IICE runs a three-stage incubation framework that carries deep-science ventures from proof of concept to commercial scale — open a stage to see the funding, facilities and mentorship behind it.</p>'));
    sec.appendChild(head);

    var cards = el("div", "zlm-flagship__cards");
    cards.setAttribute("role", "list");
    STAGES.forEach(function (s, idx) {
      var card = el("div", "zlm-flip-card" + (idx === 1 ? " is-active" : ""));
      card.setAttribute("role", "listitem");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", s.name + " — " + s.heading);

      var innerC = el("div", "zlm-flip-inner");

      var front = el("div", "zlm-flip-face zlm-flip-front");
      /* full-bleed poster photo: collapsed cards read as image covers */
      var img = el("img");
      img.src = s.img;
      img.alt = s.name + " stage";
      img.loading = "lazy";
      img.decoding = "async";
      front.appendChild(img);
      front.appendChild(el("div", "zlm-flip-scrim"));
      front.appendChild(el("span", "zlm-flip-num", "STAGE " + esc(s.num)));
      var info = el("div", "zlm-flip-info");
      info.appendChild(el("span", "zlm-flip-sub", esc(s.sub)));
      info.appendChild(el("div", "zlm-flip-name", esc(s.name)));
      front.appendChild(info);
      innerC.appendChild(front);

      var back = el("div", "zlm-flip-face zlm-flip-back");
      back.appendChild(el("span", "zlm-flip-cat", esc(s.cat)));
      back.appendChild(el("h3", "zlm-flip-h", esc(s.heading)));
      back.appendChild(el("p", "zlm-flip-p", esc(s.body)));
      var chips = el("div", "zlm-flip-chips");
      s.chips.forEach(function (c) { chips.appendChild(el("span", "zlm-flip-chip", esc(c))); });
      back.appendChild(chips);
      var cta = el("a", "zlm-flip-cta", esc(s.cta) + " →");
      cta.href = s.href;
      bindSpaLink(cta, s.href);
      back.appendChild(cta);
      innerC.appendChild(back);

      card.appendChild(innerC);

      function setActive(on) {
        card.classList.toggle("is-active", on);
      }
      card.addEventListener("mouseenter", function () {
        cards.querySelectorAll(".zlm-flip-card").forEach(function (c) { c.classList.remove("is-active"); });
        card.classList.add("is-active");
      });
      card.addEventListener("click", function (ev) {
        if (ev.target.closest(".zlm-flip-cta")) return;
        var on = !card.classList.contains("is-active");
        cards.querySelectorAll(".zlm-flip-card").forEach(function (c) { c.classList.remove("is-active"); });
        if (on) card.classList.add("is-active");
      });
      card.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          card.click();
        }
      });
      card.addEventListener("focus", function () {
        cards.querySelectorAll(".zlm-flip-card").forEach(function (c) { c.classList.remove("is-active"); });
        card.classList.add("is-active");
      });
      cards.appendChild(card);
    });
    cards.addEventListener("mouseleave", function () {
      cards.querySelectorAll(".zlm-flip-card").forEach(function (c, i) {
        c.classList.toggle("is-active", i === 1);
      });
    });
    sec.appendChild(cards);
    anchor.parentElement.insertBefore(sec, anchor);
  }

  /* ---------------- stakeholder gateways (spinbar) ----------------
     Vanilla-JS port of the previous Next.js iteration's Spinbar
     ("05 / Stakeholder Gateways — Information by Stakeholder Category"):
     scroll-scrubbed card ring on desktop, deck on touch, grid for
     reduced motion. Replaces the featured-ventures card row. */
  var GATEWAYS = [
    {
      id: "founders", title: "Founders", badge: "Apply & Incubate", icon: "rocket", img: "/assets/media/event_startup_studio.webp",
      desc: "Check your eligibility, see the incubation journey and apply.",
      href: "/programs",
      links: [["Apply for incubation", "/programs"], ["CIF & Innovation Labs", "/lab"], ["Incubation Space", "/office-spaces"]],
    },
    {
      id: "students", title: "Students", badge: "Learn & Build", icon: "bulb", img: "/assets/media/event_sig_innovation_lab.webp",
      desc: "Join the Innovation Club, attend events and turn a project into a pre-startup.",
      href: "/programs/student-innovation-grant-sig",
      links: [["Student Innovation Grant (SIG)", "/programs/student-innovation-grant-sig"], ["IICE Innovation Club", "/programs/iice-innovation-club"], ["Events", "/upcoming-events"]],
    },
    {
      id: "mentors", title: "Mentors", badge: "Guide Ventures", icon: "handshake", img: "/assets/media/iice_mentorship.webp",
      desc: "Share your expertise with early-stage ventures and see the startups you could help.",
      href: "/join-as-mentor",
      links: [["Become a mentor", "/join-as-mentor"], ["Meet the startups", "/startups"]],
    },
    {
      id: "investors", title: "Investors & Partners", badge: "Fund & Collaborate", icon: "building", img: "/assets/media/bento_conclave_session.webp",
      desc: "Explore the startup directory and IICE's impact, or get in touch about partnering.",
      href: "/join-as-investor",
      links: [["Join as an investor", "/join-as-investor"], ["Startup directory", "/startups"], ["Contact IICE", "/contact"]],
    },
  ];

  var GATEWAY_ICONS = {
    rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
    bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    handshake: '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>',
    building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
  };

  function gatewayIcon(name, cls) {
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + GATEWAY_ICONS[name] + "</svg>";
  }

  /* --- spinbar geometry (tuned for lightweight, snappy responsiveness) --- */
  var RING_STEP = 30, RING_HIDE = 75, RING_R_AT_1280 = 520;
  var RING_SEG = 48, DECK_SEG = 34, DECK_EXTRA = 20;

  function clampN(n, a, b) { return Math.min(b, Math.max(a, n)); }
  function lerpN(a, b, t) { return a + (b - a) * t; }
  function piecewise(x, pts) {
    if (x <= pts[0][0]) return pts[0][1];
    for (var i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) return lerpN(pts[i - 1][1], pts[i][1], (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
    }
    return pts[pts.length - 1][1];
  }
  function segFill(i, ps) { return clampN(ps - (i - 0.5), 0, 1); }
  function trackHeightCss(variant, n) {
    return variant === "ring"
      ? "calc(" + n + " * " + RING_SEG + "svh + 100svh)"
      : "calc(" + n + " * " + DECK_SEG + "svh + " + DECK_EXTRA + "svh)";
  }
  function segmentPx(variant, vh) { return ((variant === "ring" ? RING_SEG : DECK_SEG) / 100) * vh; }
  function ringRadius(vw) { return Math.round(clampN((RING_R_AT_1280 * vw) / 1280, 380, 760)); }
  function ringPose(i, ps) {
    var d = Math.abs(i - ps), angle = (i - ps) * RING_STEP;
    return {
      angle: angle,
      visible: Math.abs(angle) <= RING_HIDE,
      scale: piecewise(d, [[0, 1], [1, 0.78], [2, 0.7]]),
      opacity: piecewise(d, [[0, 1], [1, 0.55], [2, 0.4], [2.5, 0]]),
      active: Math.round(ps) === i,
      animating: d <= 2,
    };
  }
  /* deck choreography: outgoing card lifts up and away (-58%, -4deg),
     waiting card sits beneath and rises as the active one lifts off */
  function deckPose(i, ps, n) {
    var o = ps - i;
    return {
      ty: piecewise(o, [[-1, 8], [0, 0], [1, -58]]),
      scale: piecewise(o, [[-1, 0.92], [0, 1], [1, 1.02]]),
      rot: piecewise(o, [[-1, 1.5], [0, 0], [1, -4]]),
      opacity: piecewise(o, [[0.55, 1], [1, 0]]),
      visible: o > -2.5 && o < 1,
      active: Math.round(ps) === i,
      animating: Math.abs(o) <= 2,
      zIndex: n - i,
    };
  }

  /* --- scroll engine: layout-free, passive scroll, fast spring follow --- */
  function spinEngine(variant, n, track, stage, slots, hooks) {
    var pin = 0, segment = 1, maxSticky = 1000, radius = 520, trackTopDoc = 0;
    var p = 0, ps = 0, lastT = 0, raf = 0, settleTimer = 0, active = -1, moving = false;
    var spring = null, progUntil = 0, tailSlack = 0, lastRaw = 0, attached = false;

    function measure() {
      pin = parseFloat(getComputedStyle(stage).top) || 0;
      var vh = stage.offsetHeight + pin;
      segment = segmentPx(variant, vh);
      maxSticky = Math.max(segment, track.offsetHeight - stage.offsetHeight);
      radius = ringRadius(stage.clientWidth);
      stage.style.setProperty("--ring-r", radius + "px");
      var scrollY = window.scrollY || window.pageYOffset || 0;
      trackTopDoc = track.getBoundingClientRect().top + scrollY;
    }
    function readProgress() {
      var scrollY = window.scrollY || window.pageYOffset || 0;
      var top = (trackTopDoc - scrollY) - pin;
      var raw = -top;
      var maxCard = Math.max(0, (n - 1) * segment);
      /* tail slack: lets the ring's last slide release its overshoot immediately when scrolling back up */
      if (raw > maxCard) {
        tailSlack = Math.min(Math.max(0, maxSticky - maxCard), Math.max(tailSlack, raw - maxCard));
      } else if (raw < lastRaw && tailSlack > 0) {
        var deltaUp = lastRaw - raw;
        if (raw <= 0) tailSlack = 0;
        else tailSlack = Math.max(0, tailSlack - deltaUp * 0.35);
      } else if (raw <= 0) tailSlack = 0;
      lastRaw = raw;
      var adjTop = top + tailSlack;
      /* deck compression: remap remaining scroll so last card settles cleanly before unpin */
      if (variant === "deck" && n > 3 && maxSticky < maxCard) {
        var pivot = 2.1 * segment, scrolled = -adjTop;
        if (scrolled > pivot) {
          var usableEnd = Math.max(pivot + 1, maxSticky - 16);
          var t = Math.min(1, (scrolled - pivot) / (usableEnd - pivot));
          var mapped = pivot + t * (maxCard - pivot);
          return clampN(mapped / segment, 0, n - 1);
        }
      }
      return clampN(-adjTop / segment, 0, n - 1);
    }
    function draw() {
      hooks.render({ ps: ps, radius: radius, moving: moving });
      var a = clampN(Math.round(ps), 0, n - 1);
      if (!isFinite(a)) a = 0;
      if (a !== active) { active = a; hooks.onActive(a); }
    }
    function frame(now) {
      raf = 0;
      var dt = lastT ? Math.min(now - lastT, 64) : 16;
      lastT = now;
      p = readProgress();
      if (!isFinite(p)) p = ps;
      if (!isFinite(ps)) ps = 0;
      /* fast 75ms tau for zero-drag follow */
      var tau = p >= n - 1.5 ? 65 : 75;
      ps += (p - ps) * (1 - Math.exp(-dt / tau));
      if (Math.abs(p - ps) > 0.001) { draw(); schedule(); }
      else { ps = p; lastT = 0; draw(); }
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(frame); }
    /* snappy spring for button/focus jumps and settle: k=280, c=24 (0.72 damping ratio) */
    function startSpring(target) {
      stopSpring();
      var x = ps, v = 0, k = 280, c = 24, prev = performance.now();
      moving = true;
      spring = requestAnimationFrame(function step(now) {
        var dt = Math.min((now - prev) / 1000, 0.032);
        prev = now;
        v += (-k * (x - target) - c * v) * dt;
        x += v * dt;
        ps = x;
        draw();
        if (Math.abs(x - target) < 0.001 && Math.abs(v) < 0.001) {
          ps = target; moving = false; spring = null; draw();
        } else {
          spring = requestAnimationFrame(step);
        }
      });
    }
    function stopSpring() {
      if (spring) { cancelAnimationFrame(spring); spring = null; }
    }
    function settle() {
      stopSpring();
      raf = 0; lastT = 0;
      var target = clampN(Math.round(readProgress()), 0, n - 1);
      startSpring(target);
    }
    function onScroll() {
      if (performance.now() < progUntil && spring) {
        var scrollY = window.scrollY || window.pageYOffset || 0;
        lastRaw = -(trackTopDoc - scrollY - pin);
        return;
      }
      moving = true;
      stopSpring();
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 75);
      schedule();
    }
    function attach() {
      if (attached) return;
      attached = true;
      measure();
      p = ps = readProgress();
      draw();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    function detach() {
      if (!attached) return;
      attached = false;
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf); raf = 0;
      clearTimeout(settleTimer);
      stopSpring();
      p = ps = clampN(Math.round(readProgress()), 0, n - 1);
      moving = false; lastT = 0;
      draw();
    }
    measure();
    p = ps = readProgress();
    draw();

    var ro = new ResizeObserver(function () {
      measure();
      p = readProgress();
      if (!attached) ps = p;
      schedule();
    });
    ro.observe(stage);
    var io = new IntersectionObserver(function (entries) {
      entries[0].isIntersecting ? attach() : detach();
    }, { rootMargin: "100px 0px" });
    io.observe(track);

    return {
      redraw: function () { draw(); },
      goTo: function (i) {
        var idx = clampN(i, 0, n - 1);
        var scrollY = window.scrollY || window.pageYOffset || 0;
        var trackTop = trackTopDoc || (track.getBoundingClientRect().top + scrollY);
        tailSlack = 0;
        var target = Math.round(trackTop - pin + idx * segment);
        if (variant === "deck" && maxSticky < (n - 1) * segment) {
          var maxAllowed = Math.round(trackTop - pin + maxSticky - 12);
          if (idx === n - 1) target = maxAllowed;
          else target = Math.min(target, maxAllowed);
        }
        clearTimeout(settleTimer);
        cancelAnimationFrame(raf); raf = 0; lastT = 0;
        progUntil = performance.now() + 450;
        startSpring(idx);
        window.scrollTo({ top: target, behavior: "smooth" });
      },
      destroy: function () {
        detach();
        ro.disconnect(); io.disconnect();
      },
    };
  }

  function gatewayCardHTML(g, i, total) {
    var pad = function (x) { return String(x).padStart(2, "0"); };
    var links = g.links.map(function (l) {
      return '<li><a href="' + l[1] + '">' + esc(l[0]) + "</a></li>";
    }).join("");
    return (
      '<article class="spin-card" data-gw-card aria-labelledby="gw-' + g.id + '-t" aria-describedby="gw-' + g.id + '-d">' +
      '<span class="spin-card__media" aria-hidden="true">' +
      '<img class="spin-card__photo" src="' + g.img + '" alt="" loading="lazy" decoding="async"/>' +
      '<span class="spin-card__scrim"></span>' + gatewayIcon(g.icon, "spin-card__icon") + "</span>" +
      '<span class="spin-card__badge" aria-hidden="true">' + esc(g.badge) + "</span>" +
      '<span class="spin-card__index" aria-hidden="true">' + pad(i + 1) + "/" + pad(total) + "</span>" +
      '<span class="spin-card__arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg></span>' +
      '<span class="spin-card__body">' +
      '<a id="gw-' + g.id + '-t" class="spin-card__title" href="' + g.href + '">' + esc(g.title) + "</a>" +
      '<span id="gw-' + g.id + '-d" class="spin-card__desc">' + esc(g.desc) + "</span>" +
      '<ul class="spin-card__links">' + links + "</ul>" +
      "</span>" +
      '<span class="spin-card__line" aria-hidden="true"><span class="spin-card__fill"></span></span>' +
      "</article>"
    );
  }

  function buildGateways() {
    if (document.querySelector(".zlm-gateways")) return;
    var heads = document.querySelectorAll("h2");
    var pride = null, partners = null;
    for (var i = 0; i < heads.length; i++) {
      var t = (heads[i].textContent || "").trim();
      if (t === "Our Pride" && !pride) pride = heads[i].closest("section");
      if (t === "Our Partners") partners = heads[i].closest("section");
    }
    if (!partners || !partners.parentElement) return;
    if (pride) pride.style.display = "none";

    var n = GATEWAYS.length;
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var ring = window.matchMedia && window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
    var variant = reduced ? "grid" : ring ? "ring" : "deck";

    var sec = el("section", "zlm-gateways");
    sec.setAttribute("aria-labelledby", "zlm-gw-title");
    sec.innerHTML =
      '<div class="zlm-gw__head">' +
      '<span class="zlm-gw__eyebrow">05 / Stakeholder Gateways</span>' +
      '<h2 class="zlm-gw__title" id="zlm-gw-title">Information by Stakeholder Category</h2>' +
      '<p class="zlm-gw__sub">Four gateways into IICE — keep scrolling to bring each one forward, or jump straight to a gateway with the controls.</p>' +
      "</div>";

    if (variant === "grid") {
      var grid = el("ul", "spin-grid");
      GATEWAYS.forEach(function (g, i) {
        var li = el("li", "spin-grid__item");
        li.innerHTML = gatewayCardHTML(g, i, n);
        grid.appendChild(li);
      });
      sec.appendChild(grid);
    } else {
      var track = el("div", "spin-track");
      track.style.height = trackHeightCss(variant, n);
      var stage = el("div", "spin-stage");
      stage.setAttribute("data-variant", variant);
      stage.setAttribute("data-entered", "false");
      var list = el("ol", "spin-list");
      var slots = [];
      GATEWAYS.forEach(function (g, i) {
        var li = el("li", "spin-slot");
        li.setAttribute("data-index", i);
        li.innerHTML = gatewayCardHTML(g, i, n);
        li.style.setProperty("--i", i);
        if (variant === "deck") li.style.zIndex = n - i;
        list.appendChild(li);
        slots.push(li);
      });
      stage.appendChild(list);

      if (variant === "deck") {
        var segs = el("div", "spin-segments");
        segs.setAttribute("aria-hidden", "true");
        GATEWAYS.forEach(function () { segs.appendChild(el("span")); });
        stage.appendChild(segs);
        var record = el("ol", "spin-record");
        record.setAttribute("aria-label", "Gateway index");
        GATEWAYS.forEach(function (g, i) {
          var li = el("li");
          var b = el("button", null, '<span aria-hidden="true">' + String(i + 1).padStart(2, "0") + "</span> " + esc(g.title));
          b.setAttribute("type", "button");
          b.setAttribute("data-goto", i);
          b.setAttribute("aria-current", i === 0 ? "true" : "false");
          li.appendChild(b);
          record.appendChild(li);
        });
        stage.appendChild(record);
      }

      var controls = el("div", "spin-controls");
      var prevB = el("button", null, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>');
      var nextB = el("button", null, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>');
      prevB.setAttribute("type", "button"); nextB.setAttribute("type", "button");
      prevB.setAttribute("aria-label", "Show the previous card");
      nextB.setAttribute("aria-label", "Show the next card");
      prevB.setAttribute("aria-disabled", "true");
      nextB.setAttribute("aria-disabled", "false");
      var status = el("p", "spin-status");
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.textContent = "Showing 1 of " + n;
      controls.appendChild(prevB); controls.appendChild(status); controls.appendChild(nextB);
      stage.appendChild(controls);
      track.appendChild(stage);
      sec.appendChild(track);

      var previewIdx = null;
      var engine = spinEngine(variant, n, track, stage, slots, {
        render: function (f) {
          for (var i = 0; i < n; i++) {
            var slot = slots[i];
            if (!slot) continue;
            var st = slot.style;
            var reachable = false; /* keyboard focus handled below via preview */
            if (variant === "ring") {
              var pose = ringPose(i, f.ps);
              var previewing = previewIdx === i && !pose.active;
              st.transform = "rotate(" + pose.angle.toFixed(2) + "deg) translateY(" + -f.radius + "px) scale(" + pose.scale.toFixed(3) + ") translateZ(0)";
              st.opacity = String(previewing ? Math.max(pose.opacity, 0.9) : pose.opacity.toFixed(3));
              st.visibility = pose.visible || reachable ? "visible" : "hidden";
              st.zIndex = String(100 - Math.round(Math.abs(i - f.ps) * 10));
            } else {
              var d = deckPose(i, f.ps, n);
              st.transform = "translateY(" + d.ty.toFixed(2) + "%) rotate(" + d.rot.toFixed(2) + "deg) scale(" + d.scale.toFixed(3) + ") translateZ(0)";
              st.opacity = String(d.opacity.toFixed(3));
              st.visibility = d.visible ? "visible" : "hidden";
              st.zIndex = String(d.active ? n + 2 : d.zIndex);
            }
            st.setProperty("--fill", String(segFill(i, f.ps).toFixed(3)));
          }
        },
        onActive: function (a) {
          var cards = stage.querySelectorAll(".spin-card");
          for (var i = 0; i < cards.length; i++) cards[i].setAttribute("data-active", i === a ? "true" : "false");
          if (segs) {
            var sp = segs.querySelectorAll("span");
            for (var j = 0; j < sp.length; j++) sp[j].setAttribute("data-active", j === a ? "true" : "false");
          }
          if (record) {
            var rb = record.querySelectorAll("button");
            for (var k = 0; k < rb.length; k++) rb[k].setAttribute("aria-current", k === a ? "true" : "false");
          }
          status.textContent = "Showing " + (a + 1) + " of " + n;
          prevB.setAttribute("aria-disabled", a === 0 ? "true" : "false");
          nextB.setAttribute("aria-disabled", a === n - 1 ? "true" : "false");
        },
      });

      prevB.addEventListener("click", function () { engine.goTo(clampN(Math.round(currentPs()) - 1, 0, n - 1)); });
      nextB.addEventListener("click", function () { engine.goTo(clampN(Math.round(currentPs()) + 1, 0, n - 1)); });
      if (record) {
        record.addEventListener("click", function (ev) {
          var b = ev.target.closest("button[data-goto]");
          if (b) engine.goTo(Number(b.getAttribute("data-goto")));
        });
      }

      /* hover preview + keyboard focus bring-to-front */
      function setPreview(idx) {
        previewIdx = idx;
        var cards = stage.querySelectorAll(".spin-card");
        for (var i = 0; i < cards.length; i++) {
          if (idx != null && i === idx && cards[i].getAttribute("data-active") !== "true") {
            cards[i].setAttribute("data-preview", "true");
          } else {
            cards[i].removeAttribute("data-preview");
          }
        }
        engine.redraw();
      }
      list.addEventListener("mouseover", function (ev) {
        var li = ev.target.closest(".spin-slot");
        if (li) setPreview(Number(li.getAttribute("data-index")));
      });
      list.addEventListener("mouseleave", function () { setPreview(null); });
      list.addEventListener("focusin", function (ev) {
        var li = ev.target.closest(".spin-slot");
        if (!li) return;
        var idx = Number(li.getAttribute("data-index"));
        setPreview(idx);
        engine.goTo(idx);
      });
      list.addEventListener("focusout", function (ev) {
        if (!list.contains(ev.relatedTarget)) setPreview(null);
      });

      /* whole-card click acts as the primary link unless an inner link was hit */
      list.addEventListener("click", function (ev) {
        if (ev.target.closest("a")) return;
        var li = ev.target.closest(".spin-slot");
        if (!li) return;
        var g = GATEWAYS[Number(li.getAttribute("data-index"))];
        if (g) { ev.preventDefault(); navigate(g.href); }
      });

      /* entry animation: plays once at 20% visibility, 4s fallback */
      setTimeout(function () { stage.setAttribute("data-entered", "true"); }, 4000);
      var entryIO = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          stage.setAttribute("data-entered", "true");
          entryIO.disconnect();
        }
      }, { threshold: 0.2 });
      entryIO.observe(stage);

      /* the ring's custom dot cursor (original SpinbarCursor): a small
         accent dot that follows the mouse and grows to "Open" over the
         active card */
      if (variant === "ring") {
        var cursor = el("div", "spin-cursor", "<span>Open</span>");
        cursor.setAttribute("aria-hidden", "true");
        document.body.appendChild(cursor);
        var cx = 0, cy = 0, cInside = false, cOver = false, cRaf = 0;
        var cPaint = function () {
          cRaf = 0;
          cursor.style.transform = "translate3d(" + cx + "px," + cy + "px,0) translate(-50%,-50%)";
          cursor.setAttribute("data-state", cOver ? "open" : "dot");
          cursor.style.opacity = cInside ? "1" : "0";
        };
        var cSched = function () { if (!cRaf) cRaf = requestAnimationFrame(cPaint); };
        stage.addEventListener("pointermove", function (ev) {
          if (ev.pointerType !== "mouse") return;
          cx = ev.clientX; cy = ev.clientY; cInside = true;
          cOver = !!(ev.target && ev.target.closest && ev.target.closest('.spin-card[data-active="true"]'));
          cSched();
        }, { passive: true });
        stage.addEventListener("pointerleave", function () { cInside = false; cSched(); }, { passive: true });
        sec.__gwCursor = cursor;
      }

      function currentPs() {
        var a = stage.querySelector('.spin-card[data-active="true"]');
        return a ? Number(a.closest(".spin-slot").getAttribute("data-index")) : 0;
      }
    }

    sec.querySelectorAll(".spin-card__photo").forEach(function (img) {
      img.addEventListener("error", function () { img.remove(); });
    });
    partners.parentElement.insertBefore(sec, partners);
    fixStickyAncestors(sec);
    fixStickyAncestors(header || sec);
    if (engine) {
      sec.__gwDestroy = function () {
        engine.destroy();
        if (sec.__gwCursor) { sec.__gwCursor.remove(); sec.__gwCursor = null; }
      };
    }
    bindSpaLinks(sec);
  }

  function bindSpaLinks(scope) {
    scope.querySelectorAll("a[href^='/']").forEach(function (a) {
      var href = a.getAttribute("href");
      if (href && href.indexOf("/") === 0 && href.indexOf("//") !== 0 && !a.dataset.spaBound) {
        a.dataset.spaBound = "1";
        bindSpaLink(a, href);
      }
    });
  }

  /* ---------------- Leadership spotlight (/our-team) ----------------
     Dual leadership spotlight for Coordinator Dr. Bharadwaj Satyamurthy
     and Chief Executive Officer Dr. Sandeep Raut. Inserted above "Our Leadership". */
  var LEADERS = [
    {
      name: "Dr. Bharadwaj Satyamurthy",
      role: "Coordinator, IICE & Associate Professor, Dept. of Chemistry",
      credential: "IISER Bhopal",
      badge: "Coordinator, IICE",
      img: "/assets/media/people/bharathwaj.webp",
      email: "coordinator_iice@iiserb.ac.in",
      phone: "+91 755 269 2386",
      bio: "Dr. Bharadwaj Satyamurthy leads the Innovation and Incubation Centre for Entrepreneurship (IICE) as its Coordinator. An Associate Professor in the Department of Chemistry at IISER Bhopal, he spearheads innovation initiatives, translational research, startup incubation, and deep-tech entrepreneurship across the institute.",
    },
    {
      name: "Dr. Sandeep Raut",
      role: "Chief Executive Officer (CEO), IICE",
      credential: "PhD, Biological Sciences (IISER Bhopal)",
      badge: "Chief Executive Officer",
      img: "/assets/media/people/sandeep.webp",
      email: "ceo_iice@iiserb.ac.in",
      phone: "+91 755 269 2387",
      bio: "Dr. Sandeep Raut leads IICE as its Chief Executive Officer. He holds a PhD in Biological Sciences from IISER Bhopal and has served as Incubation Manager at IISER Bhopal and IISER Pune, and General Manager of the TBI at BITS Pilani Hyderabad Campus. A Startup India Mentor and awardee of the National Innovation Award (IGNOU), the Best Startup Award (CSIR), and the Best Innovation Award (MPCST).",
    }
  ];

  function buildCeoSpotlight() {
    if (document.querySelector(".zlm-leadership-duo") || document.querySelector(".zlm-ceo")) return;
    var head = null;
    var heads = document.querySelectorAll("h1, h2, h3");
    for (var i = 0; i < heads.length; i++) {
      if (/our leadership/i.test((heads[i].textContent || "").trim())) { head = heads[i]; break; }
    }
    if (!head || !head.parentElement || !head.parentElement.parentElement) return;

    var container = el("div", "zlm-leadership-duo");
    for (var j = 0; j < LEADERS.length; j++) {
      var leader = LEADERS[j];
      var wrap = el("div", "zlm-ceo zlm-ceo--duo");
      wrap.innerHTML =
        '<div class="zlm-ceo__photo"><img src="' + leader.img + '" alt="' + esc(leader.name) + '" loading="lazy" decoding="async"/>' +
        '<span class="zlm-ceo__badge">' + esc(leader.badge) + '</span></div>' +
        '<div class="zlm-ceo__body">' +
        '<span class="zlm-ceo__eyebrow">Leadership Spotlight</span>' +
        '<h3 class="zlm-ceo__name">' + esc(leader.name) + "</h3>" +
        '<p class="zlm-ceo__role">' + esc(leader.role) + " · " + esc(leader.credential) + "</p>" +
        '<p class="zlm-ceo__bio">' + esc(leader.bio) + "</p>" +
        '<div class="zlm-ceo__meta">' +
        '<a class="zlm-ceo__chip" href="mailto:' + leader.email + '">' + esc(leader.email) + "</a>" +
        '<a class="zlm-ceo__chip" href="tel:' + leader.phone.replace(/\s/g, "") + '">' + esc(leader.phone) + "</a>" +
        "</div></div>";
      container.appendChild(wrap);
    }

    var block = head.parentElement;                     /* heading wrapper */
    block.parentElement.insertBefore(container, block.nextElementSibling);
    var dupGrid = container.nextElementSibling;
    if (dupGrid) {
      dupGrid.style.display = "none";
      dupGrid.classList.add("zlm-dup-leadership-hidden");
    }
  }

  /* ---------------- page tints ----------------
     Alternate a very subtle warm wash across every page's neutral
     sections for readability rhythm. Runs after React has mounted. */
  var tintsTimer = 0;
  function scheduleTints() {
    clearTimeout(tintsTimer);
    tintsTimer = setTimeout(function () {
      try { applyTints(); } catch (e) { /* cosmetic only */ }
    }, 250);
  }
  function stripTone(s) {
    if (!s.classList.contains("zlm-tone")) return;
    s.classList.remove("zlm-tone", "zlm-tone--a", "zlm-tone--b");
    delete s.dataset.zlmTone;
  }
  function applyTints() {
    /* Home: the template stacks its bands inside <main> — tint those
       children alternately. Inner pages: fall back to sections + page
       wrappers. Dark/hidden bands are skipped without consuming a slot,
       so the warm/plain rhythm stays strict among visible bands. */
    var bands = [];
    var usedMain = false;
    var mains = document.querySelectorAll("main");
    Array.prototype.forEach.call(mains, function (m) {
      var big = 0;
      Array.prototype.forEach.call(m.children, function (c) {
        if (c.getBoundingClientRect().height >= 160) big++;
      });
      if (big >= 2) { bands = bands.concat(Array.prototype.slice.call(m.children)); usedMain = true; }
    });
    if (!usedMain) {
      bands = Array.prototype.slice.call(
        document.querySelectorAll("section, div[class*='min-h-screen']")
      );
    }
    /* overlay sections may sit outside <main> — weave them in by position.
       Ones NESTED inside an existing band (home: flagship/bento live inside
       main children) must NOT be added — they would shift the DOM-parity
       of every band after them and break the alternation. */
    Array.prototype.forEach.call(document.querySelectorAll(".zlm-flagship, .zlm-bento"), function (sec) {
      if (bands.indexOf(sec) >= 0) return;
      for (var bi = 0; bi < bands.length; bi++) {
        if (bands[bi].contains(sec)) return;
      }
      bands.push(sec);
    });
    bands.sort(function (a, b) {
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    /* Structural filter FIRST: parity is assigned over real bands only,
       so invisible spacers (0-height template divs) can't shift two
       visible neighbours onto the same tone. */
    bands = bands.filter(function (s) {
      var cls = String(s.className);
      if (cls.indexOf("zlm-gateways") === 0 || cls.indexOf("zlm-studio") === 0) return false;
      var r = s.getBoundingClientRect();
      if (r.height < 160 || s.style.display === "none") return false;
      return getComputedStyle(s).display !== "none";
    });

    /* Alternation keyed to DOM POSITION (every band consumes a slot),
       not to list index: eligibility can flip between passes (hero
       images loading, React re-renders), and index-based parity then
       re-shuffles already-painted bands — the drift that produced
       adjacent same-tones. DOM parity is stable, so bands never
       flicker and visible neighbours still always alternate. */
    bands.forEach(function (s, idx) {
      var cs = getComputedStyle(s);
      var m = cs.backgroundColor.match(/rgba?[(](\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?[)]/);
      var alpha = m && m[4] !== undefined ? parseFloat(m[4]) : 1;
      var neutralBg = !m || alpha === 0 || (m[1] === m[2] && m[2] === m[3] && Number(m[1]) > 235 && alpha > 0.85);
      if (!neutralBg) { stripTone(s); return; }
      if (s.parentElement && s.parentElement.closest(".zlm-tone")) { stripTone(s); return; }
      s.dataset.zlmTone = "1";
      s.classList.add("zlm-tone");
      s.classList.toggle("zlm-tone--a", idx % 2 === 0);
      s.classList.toggle("zlm-tone--b", idx % 2 !== 0);
    });
  }

  /* ---------------- liquid glass pass ----------------
     Extends the §10 tinted-glass material to the template's own
     surfaces: the white rounded column becomes a glass slab and
     rounded neutral cards/fields get .zlm-gl (warm tint + backdrop
     blur + specular hover sheen), alternating cream/amber/rose.
     Dataset-guarded and re-run from the MutationObserver like the
     tints, so React re-renders get re-tagged. */
  var glassTimer = 0;
  function scheduleGlass() {
    if (glassTimer) return;
    glassTimer = setTimeout(function () {
      glassTimer = 0;
      try { glassify(); } catch (e) { /* cosmetic only */ }
    }, 120);
  }
  function glassify() {
    /* Scope: the whole body — the template's container structure varies
       per page (some pages have no <main>, the content wrapper differs).
       Overlays, the ink footer/toast and the boot screen are excluded
       below; the dataset guard keeps repeat passes cheap. */
    var col = document.querySelector('div[class*="-mt-20"][class*="bg-white"][class*="min-h-screen"]');
    if (col) {
      /* backdrop-filter would make the column the containing block for
         fixed descendants — opt in only when it holds none */
      var hasFixed = false;
      Array.prototype.forEach.call(col.querySelectorAll("[class*='fixed']"), function (fx) {
        if (getComputedStyle(fx).position === "fixed") hasFixed = true;
      });
      col.classList.toggle("zlm-column", !hasFixed);
    }

    var k = 0;
    var nodes = document.body.querySelectorAll(
      "div, section, article, li, a, button, input, textarea, select"
    );
    Array.prototype.forEach.call(nodes, function (e) {
      if (e.dataset.zlmGl === "1") return;
      var cls = String(e.className || "");
      if (cls.indexOf("spin-cursor") >= 0 || cls.indexOf("rfm-") >= 0 || cls.indexOf("zlm-studio") >= 0 || cls.indexOf("zlm-boot") >= 0 || cls.indexOf("zlm-header") >= 0 || cls.indexOf("zlm-veil") >= 0) return;
      if (cls.indexOf("bg-[#09181D]") >= 0 || (e.closest && e.closest('div[class*="bg-[#09181D]"]'))) return;
      if (e.closest && (e.closest(".zlm-boot") || e.closest("#zlm-theme-studio"))) return;

      var tag = e.tagName;
      var isField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (isField && (e.type === "checkbox" || e.type === "radio" || e.type === "file")) return;

      var isCard = isField ||
        tag === "ARTICLE" ||
        cls.indexOf("zlm-bento__cell") >= 0 ||
        cls.indexOf("zlm-flagship__card") >= 0 ||
        cls.indexOf("zlm-usp-card") >= 0 ||
        cls.indexOf("zlm-ceo") >= 0 ||
        cls.indexOf("zlm-timeline-card") >= 0 ||
        cls.indexOf("spin-card") >= 0 ||
        /rounded-(sm|md|xl|2xl|3xl|lg|full|\[[0-9]+px\])/.test(cls) ||
        /\b(card|tile|bento|stat|box|panel|pill)\b/i.test(cls);

      if (!isCard) return;

      var r = e.getBoundingClientRect();
      if (r.width < 50 || r.height < 28) return;
      var cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") return;

      var inMarquee = !!(e.closest && e.closest(".rfm-marquee"));
      if (!isField && !inMarquee) {
        var img = e.querySelector("img");
        if (img) {
          var ir = img.getBoundingClientRect();
          var hasText = (e.textContent || "").trim().length > 20;
          if (ir.width * ir.height > 0.75 * r.width * r.height && !hasText) return;
        }
      }

      e.dataset.zlmGl = "1";
      if (isField) { e.classList.add("zlm-gl", "zlm-gl--field"); return; }
      e.classList.add("zlm-gl");
      if (inMarquee) e.classList.add("zlm-gl--flat");
      else if (k % 3 === 1) e.classList.add("zlm-gl--amber");
      else if (k % 3 === 2) e.classList.add("zlm-gl--rose");
      k++;

      if (cs.position === "static") e.style.position = "relative";
      if (cs.overflow === "visible") e.style.overflow = "hidden";

      if (!e.querySelector(":scope > .zlm-gl__sheen")) {
        var sheen = document.createElement("span");
        sheen.className = "zlm-gl__sheen";
        sheen.setAttribute("aria-hidden", "true");
        e.appendChild(sheen);
      }
    });
  }

  /* ---------------- scroll reveal ----------------
     One-shot rise for the overlay's own blocks (heads, card rows,
     bento cells, CEO card). Overlay elements only — React re-renders
     never strip the classes because the template owns none of them. */
  var revealIO = null;
  function revealPass() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var targets = document.querySelectorAll(
      ".zlm-flagship__head, .zlm-flagship__cards, .zlm-gw__head, .zlm-bento__head, .zlm-ceo, .zlm-bento__cell"
    );
    if (!targets.length) return;
    if (!revealIO) {
      revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            revealIO.unobserve(en.target);
          }
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    }
    Array.prototype.forEach.call(targets, function (t) {
      if (t.dataset.zlmReveal) return;
      t.dataset.zlmReveal = "1";
      t.classList.add("zlm-reveal");
      /* bento cells cascade softly by grid position */
      if (t.classList.contains("zlm-bento__cell")) {
        var idx = Array.prototype.indexOf.call(t.parentElement.children, t);
        t.style.setProperty("--zlm-ri", String(Math.min(idx, 7)));
      }
      revealIO.observe(t);
    });
  }

  window.addEventListener("error", function (e) {
    try {
      (window.__zlmErrors = window.__zlmErrors || []).push(String(e.message) + " @" + (e.lineno || 0));
      localStorage.setItem("zlm-last-error", JSON.stringify({
        msg: String(e.message), f: e.filename, l: e.lineno, c: e.colno, t: Date.now(),
        s: e.error && e.error.stack ? String(e.error.stack).slice(0, 900) : null,
      }));
    } catch (x) {}
  });
  window.addEventListener("unhandledrejection", function (e) {
    try {
      localStorage.setItem("zlm-last-error", JSON.stringify({
        rej: String(e.reason && (e.reason.stack || e.reason)).slice(0, 900), t: Date.now(),
      }));
    } catch (x) {}
  });
  /* ---------------- bento grid ---------------- */
  function dirFromEvent(ev, cell) {
    var r = cell.getBoundingClientRect();
    var x = ev.clientX - r.left - r.width / 2;
    var y = ev.clientY - r.top - r.height / 2;
    var angle = Math.atan2(y, x) * (180 / Math.PI);
    if (angle >= -45 && angle < 45) return "right";
    if (angle >= 45 && angle < 135) return "bottom";
    if (angle >= -135 && angle < -45) return "top";
    return "left";
  }
  var EDGE = {
    top: "translate3d(0,-102%,0)",
    bottom: "translate3d(0,102%,0)",
    left: "translate3d(-102%,0,0)",
    right: "translate3d(102%,0,0)",
  };
  var FULL = "translate3d(0,0,0)";

  function buildBento() {
    if (document.querySelector(".zlm-bento")) return;
    var anchor = null;
    var heads = document.querySelectorAll("h2");
    for (var i = 0; i < heads.length; i++) {
      var t = (heads[i].textContent || "").trim();
      if (t === "Our Pride" || t === "Our Partners") { anchor = heads[i].closest("section") || heads[i].parentElement; break; }
    }
    if (!anchor || !anchor.parentElement) return;

    var sec = el("section", "zlm-bento");
    sec.setAttribute("aria-labelledby", "zlm-bento-title");
    var head = el("div", "zlm-bento__head");
    head.appendChild(el("div", null,
      '<span class="zlm-bento__eyebrow">Life at IICE</span>' +
      '<h2 class="zlm-bento__title" id="zlm-bento-title">Inside the Incubator</h2>' +
      '<p class="zlm-bento__sub">Conclaves, RAMP ecosystem programmes, CIF lab tours and founder demos — glimpses from the incubation floor at IISER Bhopal.</p>'));
    var cta = el("a", "zlm-bento__cta", 'Explore Activities <span aria-hidden="true">\u2192</span>');
    cta.href = "/upcoming-events";
    bindSpaLink(cta, "/upcoming-events");
    head.appendChild(cta);
    sec.appendChild(head);

    var frame = el("div", "zlm-bento__frame");
    var grid = el("div", "zlm-bento__grid");
    grid.setAttribute("role", "list");

    BENTO.forEach(function (b) {
      var cell = el("a", "zlm-bento__cell");
      cell.setAttribute("role", "listitem");
      cell.setAttribute("data-span", b.span);
      cell.setAttribute("aria-label", b.tag + " — " + b.name);
      cell.href = "/upcoming-events";

      var img = el("img", "zlm-bento__img");
      img.src = b.img;
      img.alt = b.name + " — " + b.sub;
      img.loading = "lazy";
      img.decoding = "async";
      cell.appendChild(img);

      var fill = el("span", "zlm-bento__fill");
      fill.setAttribute("aria-hidden", "true");
      fill.style.transform = EDGE.top; /* parked off-cell: photo shows first */
      cell.appendChild(fill);

      cell.appendChild(el("div", "zlm-bento__cap",
        '<span class="zlm-bento__tag">' + esc(b.tag) + "</span>" +
        '<span class="zlm-bento__name">' + esc(b.name) + "</span>"));

      cell.appendChild(el("div", "zlm-bento__hover",
        '<span class="zlm-bento__hover-tag">' + esc(b.tag) + "</span>" +
        '<span class="zlm-bento__hover-name">' + esc(b.name) + "</span>" +
        '<span class="zlm-bento__hover-sub">' + esc(b.sub) + "</span>"));

      cell.addEventListener("mouseenter", function (ev) {
        var d = dirFromEvent(ev, cell);
        fill.style.transition = "none";
        fill.style.transform = EDGE[d];
        void fill.offsetWidth;
        fill.style.transition = "";
        fill.style.transform = FULL;
      });
      cell.addEventListener("mouseleave", function (ev) {
        fill.style.transform = EDGE[dirFromEvent(ev, cell)];
      });
      cell.addEventListener("click", function (ev) {
        ev.preventDefault();
        navigate("/upcoming-events");
      });
      grid.appendChild(cell);
    });

    frame.appendChild(grid);
    sec.appendChild(frame);
    anchor.parentElement.insertBefore(sec, anchor);
  }

  /* ---------------- boot watchdog ----------------
     If the React splash ever sticks (hidden-tab throttling), fade it out.
     NOTE: we only HIDE it — removing React's own nodes makes React throw
     NotFoundError on commit and unmount the entire app. */
  function bootWatchdog() {
    var t0 = Date.now();
    function hide() {
      var root = document.getElementById("root");
      var boot = root && root.firstElementChild;
      if (!(boot && String(boot.className).indexOf("z-[9998]") >= 0)) return true;
      boot.style.transition = "opacity .25s ease";
      boot.style.opacity = "0";
      boot.style.visibility = "hidden";
      boot.style.pointerEvents = "none";
      return true;
    }
    var iv = setInterval(function () {
      var root = document.getElementById("root");
      var boot = root && root.firstElementChild;
      if (!(boot && String(boot.className).indexOf("z-[9998]") >= 0)) { clearInterval(iv); return; }
      if (Date.now() - t0 > 2600) { clearInterval(iv); hide(); }
    }, 380);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && Date.now() - t0 > 3000) hide();
    });
  }

  /* ---------------- pretty boot screen ----------------
     We own the whole boot: the React splash is hidden immediately (never
     removed) and this overlay fades out once the app tree has mounted. */
  function buildBoot() {
    if (document.querySelector(".zlm-boot")) return;
    var boot = el("div", "zlm-boot");
    boot.setAttribute("aria-hidden", "true");
    boot.innerHTML =
      '<div class="zlm-boot__orbs"><span></span><span></span><span></span></div>' +
      '<div class="zlm-boot__chip">' + LOGO_SVG + "</div>" +
      '<div class="zlm-boot__bar"><span></span></div>' +
      '<p class="zlm-boot__caption">DST NIDHI\u2013TBI \u00b7 Technology Business Incubator \u00b7 IISER Bhopal</p>';
    document.body.appendChild(boot);
    var root = document.getElementById("root");
    var splash = root && root.firstElementChild;
    if (splash && String(splash.className).indexOf("z-[9998]") >= 0) {
      splash.style.opacity = "0";
      splash.style.visibility = "hidden";
      splash.style.pointerEvents = "none";
    }
    var t0 = Date.now();
    var iv = setInterval(function () {
      var r = document.getElementById("root");
      var ready = r && r.children.length >= 1;
      var elapsed = Date.now() - t0;
      if ((ready && elapsed > 1500) || elapsed > 5200) {
        clearInterval(iv);
        boot.classList.add("is-done");
        setTimeout(function () { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 700);
      }
    }, 120);
  }

  /* ---------------- crash watchdog ----------------
     Rarely, the React tree unmounts entirely and leaves a blank page. If
     the app ever rendered and then vanished, reload once per session. */
  function crashWatchdog() {
    var sawApp = false;
    setInterval(function () {
      var root = document.getElementById("root");
      if (!root) return;
      if (root.children.length > 0) {
        sawApp = true;
        try { sessionStorage.removeItem("zlm-crash-reload"); } catch (e) {}
      } else if (sawApp && document.readyState === "complete") {
        var already = false;
        try { already = !!sessionStorage.getItem("zlm-crash-reload"); sessionStorage.setItem("zlm-crash-reload", "1"); } catch (e) {}
        if (!already) location.reload();
      }
    }, 1500);
  }

  /* ---------------- takeover + lifecycle ---------------- */
  function takeover() {
    var bar = reactHeaderBar();
    if (!bar) return false;
    if (bar.style.display !== "none") bar.style.display = "none";
    if (header && header.parentElement !== bar.parentElement && bar.parentElement) {
      bar.parentElement.insertBefore(header, bar);
      fixStickyAncestors(header);
    }
    return true;
  }

  /* React mounts after DOMContentLoaded, so the first takeover usually
     finds nothing — keep retrying until the header is in position. */
  function takeoverRetry() {
    var tries = 0;
    var iv = setInterval(function () {
      if (takeover() || ++tries > 60) {
        clearInterval(iv);
        scheduleGlass();
      }
    }, 120);
  }

  /* overflow:hidden ancestors turn position:sticky into a no-op. */
  function fixStickyAncestors(node) {
    var a = node.parentElement;
    while (a && a !== document.body) {
      var cs = getComputedStyle(a);
      if ((cs.overflowX === "hidden" || cs.overflowY === "hidden") && !a.dataset.zlmClip) {
        a.dataset.zlmClip = "1";
        a.style.overflowX = "clip";
        a.style.overflowY = "clip";
      }
      a = a.parentElement;
    }
  }

  /* find the TEMPLATE's react header bar (not our own logo) */
  function reactHeaderBar() {
    var imgs = document.querySelectorAll('img[src*="logo_header"]');
    for (var i = 0; i < imgs.length; i++) {
      if (!imgs[i].closest(".zlm-header")) {
        return imgs[i].closest('div[class*="min-h-[82px]"]');
      }
    }
    return null;
  }

  function refresh() {
    takeover();
    if (location.pathname === "/") {
      buildFlagship();
      buildGateways();
      buildBento();
      if (window.mountFocusDomains) window.mountFocusDomains();
    }
    else {
      var f = document.querySelector(".zlm-flagship"); if (f) f.remove();
      var v = document.querySelector(".zlm-gateways");
      if (v) { if (v.__gwDestroy) v.__gwDestroy(); v.remove(); }
      var vc = document.querySelector(".spin-cursor"); if (vc) vc.remove();
      var vo = document.querySelector(".zlm-ventures"); if (vo) vo.remove();
      var pr = (function(){ var hs = document.querySelectorAll("h2"); for (var q = 0; q < hs.length; q++) if (hs[q].textContent.trim() === "Our Pride") return hs[q].closest("section"); })(); if (pr) pr.style.display = "";
      var b = document.querySelector(".zlm-bento"); if (b) b.remove();
      var fd = document.querySelector(".zlm-focus-domains"); if (fd) fd.remove();
      var og = document.querySelectorAll(".zlm-old-grid-hidden");
      og.forEach(function (g) { g.style.display = ""; g.classList.remove("zlm-old-grid-hidden"); });
    }
    if (location.pathname === "/our-team") buildCeoSpotlight();
    else { var cs = document.querySelectorAll(".zlm-leadership-duo, .zlm-ceo"); cs.forEach(function(el){ el.remove(); }); }
    revealPass();
    scheduleTints();
    scheduleGlass();
    buildThemeStudio();
    themeSvgPass();
    inlineThemedImages();
    syncActive();
    closeMobile();
    closeAllPopovers();
  }

  function init() {
    buildBoot();
    bootWatchdog();
    crashWatchdog();
    buildHeader();
    buildMobile();
    takeover();
    takeoverRetry();
    if (location.pathname === "/") {
      buildFlagship();
      buildGateways();
      buildBento();
      if (window.mountFocusDomains) window.mountFocusDomains();
    }
    if (location.pathname === "/our-team") buildCeoSpotlight();
    revealPass();
    scheduleGlass();
    buildThemeStudio();
    themeSvgPass();
    inlineThemedImages();

    /* Coolors-style cycling: Space / ← / → cycle palettes whenever the
       studio is on screen (and the keystroke isn't meant for a field). */
    document.addEventListener("keydown", function (ev) {
      if (ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (ev.key !== " " && ev.key !== "Spacebar" && ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
      var t = ev.target;
      if (t && t.matches && (t.matches("input, textarea, select, [contenteditable]") || (t.closest && t.closest("input, textarea, select, [contenteditable]")))) return;
      if (!studioOnScreen()) return;
      ev.preventDefault();
      cycleTheme(ev.key === "ArrowLeft" ? -1 : 1);
    });

    window.addEventListener("popstate", function () {
      setTimeout(refresh, 60);
      pageTransition.enter();
    });

    /* Route the template's own links through the veil transition too.
       Runs in capture so it lands before React Router's delegated click
       handler (which respects defaultPrevented). Overlay-owned anchors
       handle themselves and are skipped. */
    document.addEventListener("click", function (ev) {
      if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      var t = ev.target;
      var a = t && t.closest ? t.closest("a[href]") : null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) !== "/" || href.charAt(1) === "/" || href.indexOf("#") >= 0) return;
      if (a.dataset.spaBound) return;
      if (a.closest('[class*="zlm-"]')) return;
      ev.preventDefault();
      navigate(href);
    }, true);
    var mo = new MutationObserver(function () {
      takeover();
      if (location.pathname === "/") {
        var built = false;
        if (!document.querySelector(".zlm-flagship")) { buildFlagship(); built = true; }
        if (!document.querySelector(".zlm-gateways")) { buildGateways(); built = true; }
        if (!document.querySelector(".zlm-bento")) { buildBento(); built = true; }
        if (window.mountFocusDomains && !document.querySelector(".zlm-focus-domains")) {
          if (window.mountFocusDomains()) built = true;
        }
        if (built) revealPass();
      }
      if (location.pathname === "/our-team" && !document.querySelector(".zlm-ceo")) { buildCeoSpotlight(); revealPass(); }
      if (pageTransition.lastPath !== location.pathname) {
        pageTransition.lastPath = location.pathname;
        pageTransition.enter();
      }
      scheduleTints();
      scheduleGlass();
      buildThemeStudio();
      themeSvgPass();
      inlineThemedImages();
    });
    pageTransition.lastPath = location.pathname;
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* Cursor-activated scribble on hero 'Innovations' */
  document.addEventListener("pointerover", function (e) {
    var hl = e.target && e.target.closest && (e.target.closest(".zlm-hero-highlight") || e.target.closest("h1"));
    if (hl) {
      var target = hl.classList.contains("zlm-hero-highlight") ? hl : hl.querySelector(".zlm-hero-highlight");
      if (target && !target.classList.contains("zlm-active")) {
        target.classList.add("zlm-active");
      }
    }
  }, { passive: true });

  function safeInit() {
    try { init(); } catch (e) {
      try { (window.__zlmErrors = window.__zlmErrors || []).push("init: " + String(e && e.stack || e)); } catch (x) {}
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeInit);
  } else {
    safeInit();
  }
})();
