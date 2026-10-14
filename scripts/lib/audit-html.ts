/**
 * The HTML anti-pattern audit (TRD §13.3, SRD Appendix A.6). Every rule here comes from a flaw seen on one of the five
 * reference sites: dead `#` links, buttons that do nothing, filename alt text, duplicate titles, "0 +" counters, lorem
 * ipsum, hot-linked images, zoom-blocking viewports. A finding names the page, the element and the rule, so a failure can
 * be found and fixed. Pure: the CLI (scripts/audit-html.ts) feeds it files; tests/unit/audit-html.test.ts feeds it strings.
 */
import { parse, type HTMLElement, type Node } from "node-html-parser";

export interface AuditPage {
  /** Path relative to out/ with forward slashes, e.g. "about/team/index.html". */
  file: string;
  html: string;
}

export interface Finding {
  file: string;
  selector: string;
  rule: string;
}

export interface AuditOptions {
  /** The site's own host, for the third-party check ("iice.iiserb.ac.in"). */
  siteHost: string;
  /** Does `/some/path` (or `/some/path/`) resolve to a file in the build? */
  pathExists: (urlPath: string) => boolean;
  /** Preview builds show TODO markers on purpose; the production audit does not allow the text. */
  allowTodo?: boolean;
}

const GENERIC_ALT =
  /^(logo|image|img|photo|picture|index|card|web design|banner|icon|untitled|clients|loader image|thumbnail)$/i;
const FILENAME_ALT = /\.(png|jpe?g|webp|avif|gif|svg)$/i;
const UUID_LIKE = /^[0-9a-f-]{20,}$/i;
const DIGITS_ONLY = /^\d+(\s*\(\d+\))?$/;
const GENERIC_LINK = /^(read more|click here|know more|learn more|more|here)$/i;
const FORBIDDEN_COPY = [
  /lorem/i,
  /ipsum/i,
  /coming soon/i,
  /sample page/i,
  /example\.com/i,
  /click here to edit/i,
  /insert text here/i,
  /your text here/i,
];
const PREVIEW_HOSTS = /(^|\.)(vercel\.app|netlify\.app|localhost)$|^127\.0\.0\.1$/i;
const MAILTO = /^mailto:(\?[^\s]*|[^\s@?]+@[^\s@?]+\.[^\s@?]+(\?[^\s]*)?)$/i;

/** A short CSS-like description of an element for a finding: `a.btn[href="/x/"]`. */
function describe(el: HTMLElement): string {
  const id = el.getAttribute("id");
  const cls = el.getAttribute("class")?.split(/\s+/).filter(Boolean)[0];
  const href = el.getAttribute("href");
  const src = el.getAttribute("src");
  const target =
    href !== undefined
      ? `[href="${href.slice(0, 60)}"]`
      : src !== undefined
        ? `[src="${src.slice(0, 60)}"]`
        : "";
  return `${el.tagName.toLowerCase()}${id ? `#${id}` : ""}${cls ? `.${cls}` : ""}${target}`;
}

const isElement = (node: Node): node is HTMLElement => node.nodeType === 1;

/** The text a screen reader would announce for an element: visible text, `sr-only` text, image alt; not `aria-hidden`. */
function accessibleText(el: HTMLElement): string {
  const walk = (node: Node): string => {
    if (!isElement(node)) return node.nodeType === 3 ? node.text : "";
    if (node.getAttribute("aria-hidden") === "true" || node.hasAttribute("hidden")) return "";
    if (node.tagName === "IMG") return node.getAttribute("alt") ?? "";
    if (node.tagName === "SVG" || node.tagName === "SCRIPT" || node.tagName === "STYLE") return "";
    return node.childNodes.map(walk).join(" ");
  };
  return walk(el).replace(/\s+/g, " ").trim();
}

function nameOf(el: HTMLElement, root: HTMLElement): string {
  const label = el.getAttribute("aria-label")?.trim();
  if (label) return label;
  const labelledby = el.getAttribute("aria-labelledby");
  if (labelledby) {
    const text = labelledby
      .split(/\s+/)
      .map((id) => root.querySelector(`[id="${id}"]`))
      .map((target) => (target ? accessibleText(target) : ""))
      .join(" ")
      .trim();
    if (text) return text;
  }
  return accessibleText(el) || el.getAttribute("title")?.trim() || "";
}

/** The `id`s of a page, for checking that `#anchor` links point at something. */
export function idsOf(html: string): Set<string> {
  const ids = new Set<string>();
  for (const el of parse(html).querySelectorAll("[id]")) ids.add(el.getAttribute("id") as string);
  return ids;
}

function inPageTarget(href: string): string | null {
  return href.startsWith("#") && href.length > 1 ? decodeURIComponent(href.slice(1)) : null;
}

function audit(
  page: AuditPage,
  options: AuditOptions,
  idsByRoute: Map<string, Set<string>>,
): Finding[] {
  const findings: Finding[] = [];
  const add = (selector: string, rule: string) =>
    findings.push({ file: page.file, selector, rule });
  const root = parse(page.html);
  const route = "/" + page.file.replace(/index\.html$/, "").replace(/\.html$/, "");
  const ownIds = idsByRoute.get(route) ?? idsOf(page.html);

  // ── Document ──────────────────────────────────────────────
  if (!root.querySelector("html")?.getAttribute("lang")) add("html", "missing lang attribute");
  const viewport = root.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? "";
  if (/maximum-scale|user-scalable/i.test(viewport))
    add('meta[name="viewport"]', "viewport blocks zoom");
  if (root.querySelectorAll("main").length !== 1) add("main", "page needs exactly one <main>");

  // ── Headings ──────────────────────────────────────────────
  const headings = root.querySelectorAll("h1,h2,h3,h4,h5,h6");
  const h1s = headings.filter((h) => h.tagName === "H1");
  if (h1s.length !== 1) add("h1", `expected 1 h1, found ${h1s.length}`);
  let previous = 0;
  for (const h of headings) {
    const level = Number(h.tagName[1]);
    if (previous > 0 && level > previous + 1)
      add(describe(h), `heading level skips from h${previous} to h${level}`);
    previous = level;
    if (!accessibleText(h)) add(describe(h), "empty heading");
  }

  // ── Duplicate ids ─────────────────────────────────────────
  const seen = new Set<string>();
  for (const el of root.querySelectorAll("[id]")) {
    const id = el.getAttribute("id") as string;
    if (seen.has(id)) add(describe(el), `duplicate id "${id}"`);
    seen.add(id);
  }

  // ── Links ─────────────────────────────────────────────────
  for (const a of root.querySelectorAll("a")) {
    const href = a.getAttribute("href");
    if (href === undefined) {
      add(describe(a), "anchor without href");
      continue;
    }
    if (href === "#" || href.trim() === "") add(describe(a), `anchor with href="${href}"`);
    else if (href.startsWith("#")) {
      const target = inPageTarget(href);
      if (target && !ownIds.has(target))
        add(describe(a), `anchor points at missing id "${target}"`);
    } else if (href.startsWith("mailto:")) {
      if (!MAILTO.test(href)) add(describe(a), "malformed mailto: link");
    } else if (href.startsWith("tel:")) {
      if (!/^tel:\+?[\d-]{6,20}$/.test(href)) add(describe(a), "malformed tel: link");
    } else if (/^https?:\/\//i.test(href)) {
      const host = new URL(href).hostname;
      if (PREVIEW_HOSTS.test(host)) add(describe(a), `link to a preview or local host (${host})`);
      if (a.getAttribute("target") === "_blank" && !/noopener/.test(a.getAttribute("rel") ?? ""))
        add(describe(a), 'target="_blank" without rel="noopener"');
    } else if (href.startsWith("/")) {
      const [pathPart = "", hash = ""] = href.split("#") as [string, string?];
      const urlPath = pathPart.split("?")[0] as string;
      if (/%20|\s/.test(urlPath)) add(describe(a), "space in a path");
      if (urlPath !== "/" && !options.pathExists(urlPath))
        add(describe(a), "link to a page or file that is not in the build");
      else if (hash) {
        const ids = idsByRoute.get(urlPath.endsWith("/") ? urlPath : `${urlPath}/`);
        if (ids && !ids.has(decodeURIComponent(hash)))
          add(describe(a), `link to missing anchor "#${hash}" on ${urlPath}`);
      }
    }
    const name = nameOf(a, root);
    if (!name) add(describe(a), "link has no accessible name");
    else if (GENERIC_LINK.test(name)) add(describe(a), `generic link text "${name}"`);
  }

  // ── Buttons ───────────────────────────────────────────────
  for (const b of root.querySelectorAll("button")) {
    if (b.getAttribute("type") !== "submit" && !b.hasAttribute("data-action"))
      add(describe(b), "button without type=submit or a data-action marker (it may do nothing)");
    if (!nameOf(b, root)) add(describe(b), "button has no accessible name");
  }

  // ── Images, frames ────────────────────────────────────────
  for (const img of root.querySelectorAll("img")) {
    const alt = img.getAttribute("alt");
    const src = img.getAttribute("src") ?? "";
    if (alt === undefined) add(describe(img), "image without alt");
    else if (alt === "") {
      if (
        !["presentation", "none"].includes(img.getAttribute("role") ?? "") &&
        img.getAttribute("aria-hidden") !== "true"
      )
        add(describe(img), 'alt="" without role="presentation"');
    } else {
      const text = alt.trim();
      if (
        GENERIC_ALT.test(text) ||
        FILENAME_ALT.test(text) ||
        UUID_LIKE.test(text) ||
        DIGITS_ONLY.test(text)
      )
        add(describe(img), `alt text "${text}" does not describe the image`);
    }
    if (/^https?:\/\//i.test(src) && new URL(src).hostname !== options.siteHost)
      add(describe(img), "image hosted on another site");
    if (/%20|\s/.test(src)) add(describe(img), "space in an image path");
  }
  for (const f of root.querySelectorAll("iframe"))
    if (!f.getAttribute("title")?.trim()) add(describe(f), "iframe without title");
  for (const l of root.querySelectorAll("link[href]")) {
    const href = l.getAttribute("href") as string;
    const rel = l.getAttribute("rel") ?? "";
    if (
      /^https?:\/\//i.test(href) &&
      /stylesheet|preload|icon|preconnect/.test(rel) &&
      new URL(href).hostname !== options.siteHost
    )
      add(describe(l), "first-load request to another site");
    if (/%20|\s/.test(href)) add(describe(l), "space in a path");
  }

  // ── Form controls ─────────────────────────────────────────
  for (const control of root.querySelectorAll("input,select,textarea")) {
    const type = control.getAttribute("type") ?? "text";
    if (
      control.tagName === "INPUT" &&
      ["hidden", "submit", "button", "image", "reset"].includes(type)
    )
      continue;
    const id = control.getAttribute("id");
    const labelled =
      control.getAttribute("aria-label")?.trim() ||
      control.getAttribute("aria-labelledby") ||
      (id && root.querySelector(`label[for="${id}"]`)) ||
      isInsideLabel(control);
    if (!labelled) add(describe(control), "form control without a label");
  }

  // ── Stats, head, copy ─────────────────────────────────────
  for (const stat of root.querySelectorAll("[data-stat]")) {
    const text = stat.text.trim();
    if (text === "" || /^0+(\.0+)?\s*\+?$/.test(text))
      add(describe(stat), `counter shows "${text}"`);
  }
  const description = root
    .querySelector('meta[name="description"]')
    ?.getAttribute("content")
    ?.trim();
  if (!description) add('meta[name="description"]', "missing meta description");
  if (!root.querySelector("title")?.text.trim()) add("title", "missing title");

  // Search and sharing (TRD §11.1). The 404 page is deliberately not indexed or shared.
  if (page.file !== "404.html") {
    if (!root.querySelector('link[rel="canonical"]')?.getAttribute("href"))
      add('link[rel="canonical"]', "missing canonical link");
    const image = root.querySelector('meta[property="og:image"]')?.getAttribute("content");
    if (!image) add('meta[property="og:image"]', "missing Open Graph image");
    else {
      const url = new URL(image, `https://${options.siteHost}`);
      if (url.hostname === options.siteHost && !options.pathExists(url.pathname))
        add('meta[property="og:image"]', `Open Graph image ${url.pathname} is not in the build`);
    }
  }

  const visible = [...root.querySelectorAll("body *")]
    .filter((el) => !["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName))
    .flatMap((el) => el.childNodes.filter((n) => n.nodeType === 3).map((n) => n.text));
  const copy = [...visible, root.querySelector("title")?.text ?? "", description ?? ""].join("\n");
  for (const pattern of FORBIDDEN_COPY)
    if (pattern.test(copy)) add("text", `forbidden copy matching ${pattern}`);
  // Anywhere in the delivered page, not only in visible text: structured data and the page payload count too.
  if (!options.allowTodo && /TODO_CONFIRM/.test(page.html))
    add(
      "source",
      "TODO_CONFIRM marker in the page (a placeholder that display() should have stripped)",
    );

  return findings;
}

function isInsideLabel(el: HTMLElement): boolean {
  for (
    let node: HTMLElement | null = el.parentNode as HTMLElement | null;
    node;
    node = node.parentNode as HTMLElement | null
  )
    if (node.tagName === "LABEL") return true;
  return false;
}

/** Pages that only redirect (the legacy stubs) are not pages to audit. */
const isStub = (html: string) => /<meta[^>]+http-equiv=["']refresh["']/i.test(html);

export function auditHtml(pages: readonly AuditPage[], options: AuditOptions): Finding[] {
  const real = pages.filter((p) => !isStub(p.html));
  const idsByRoute = new Map<string, Set<string>>();
  for (const page of real) {
    idsByRoute.set(
      "/" + page.file.replace(/index\.html$/, "").replace(/\.html$/, ""),
      idsOf(page.html),
    );
  }
  const findings = real.flatMap((page) => audit(page, options, idsByRoute));

  // Cross-page: every title and description must be unique (the template never repeats the brand).
  const titles = new Map<string, string[]>();
  const descriptions = new Map<string, string[]>();
  for (const page of real) {
    const root = parse(page.html);
    const title = root.querySelector("title")?.text.trim();
    const description = root
      .querySelector('meta[name="description"]')
      ?.getAttribute("content")
      ?.trim();
    if (title) titles.set(title, [...(titles.get(title) ?? []), page.file]);
    if (description)
      descriptions.set(description, [...(descriptions.get(description) ?? []), page.file]);
  }
  for (const [title, files] of titles)
    if (files.length > 1)
      for (const file of files)
        findings.push({
          file,
          selector: "title",
          rule: `duplicate title "${title}" also on ${files.filter((f) => f !== file).join(", ")}`,
        });
  for (const [text, files] of descriptions)
    if (files.length > 1)
      for (const file of files)
        findings.push({
          file,
          selector: 'meta[name="description"]',
          rule: `duplicate description also on ${files.filter((f) => f !== file).join(", ")}: "${text.slice(0, 50)}…"`,
        });
  return findings;
}

/** Rules for the built CSS (TRD §13.3 item 10): scrollbars may not be hidden (CLAUDE.md rule 14). */
export function auditCss(file: string, css: string): Finding[] {
  const findings: Finding[] = [];
  if (/scrollbar-width\s*:\s*none/i.test(css))
    findings.push({ file, selector: "css", rule: "scrollbar-width: none hides scrollbars" });
  if (/::-webkit-scrollbar\s*\{[^}]*display\s*:\s*none/i.test(css))
    findings.push({
      file,
      selector: "css",
      rule: "::-webkit-scrollbar { display: none } hides scrollbars",
    });
  return findings;
}
