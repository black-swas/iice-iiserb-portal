/**
 * Turns content into search documents (TRD §8.3, BACKEND_SCHEMA §7). Pure: the caller supplies the route table, the
 * navigation links and file sizes. A document whose page does not exist yet is left out (CLAUDE.md rule 4) unless
 * `showUnbuilt` is on. Placeholder text is stripped of its TODO_CONFIRM marker, so a marker can never be searched.
 */
import { formatDate, istDate, type DateInput } from "@/lib/dates";
import { enumLabel } from "@/lib/i18n";
import { isBuilt, type RouteSet } from "@/lib/nav";
import type { SearchDoc } from "@/lib/search";
import type { ContentSet } from "./loaders";
import { display } from "./todo";

export interface PageLink {
  label: string;
  href: string;
  description?: string | undefined;
}

export interface SearchDocOptions {
  now: DateInput;
  routes: RouteSet;
  showUnbuilt: boolean;
  /** Every link on the site's menus and footer, for the "Pages" group (including in-page anchors). */
  pageLinks: readonly PageLink[];
  /** Size in KB of `public/<file>`, if it exists. */
  fileSizeKB?: (file: string) => number | undefined;
}

const clean = (text: string | undefined) =>
  text === undefined ? "" : display(text).replace(/\s+/g, " ").trim();
const words = (...parts: (string | undefined)[]) =>
  parts.flatMap((p) => (p ? [clean(p)] : [])).filter(Boolean);

export function buildSearchDocs(content: ContentSet, options: SearchDocOptions): SearchDoc[] {
  const { routes, showUnbuilt, pageLinks, fileSizeKB } = options;
  const c = content.collections;
  const keep = (url: string) => showUnbuilt || isBuilt(url, routes);
  const docs: SearchDoc[] = [];
  const add = (doc: SearchDoc) => {
    if (keep(doc.url)) docs.push(doc);
  };

  const seen = new Set<string>();
  for (const link of pageLinks) {
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    add({
      id: `page:${link.href}`,
      type: "page",
      title: link.label,
      url: link.href,
      summary: clean(link.description),
      keywords: [],
    });
  }

  for (const { data: s } of c.startups) {
    if (s.draft) continue;
    add({
      id: `startup:${s.slug}`,
      type: "startup",
      title: clean(s.name),
      url: `/startups/${s.slug}/`,
      summary: clean(s.oneLiner),
      keywords: [
        ...words(s.legalName, ...s.tags),
        ...s.sectors.map((sector) => enumLabel("sector", sector)),
        ...s.founders.map((f) => f.name),
      ],
    });
  }

  for (const { data: e } of c.events) {
    if (e.draft) continue;
    add({
      id: `event:${e.slug}`,
      type: "event",
      title: clean(e.title),
      url: `/events/${e.slug}/`,
      summary: clean(e.summary),
      keywords: [
        enumLabel("eventType", e.type),
        ...words(e.edition),
        ...e.people.map((p) => p.name),
      ],
      date: istDate(e.startsAt),
      hint: formatDate(e.startsAt),
    });
  }

  for (const { data: o } of c.opportunities) {
    if (o.draft) continue;
    add({
      id: `opportunity:${o.slug}`,
      type: "opportunity",
      title: clean(o.title),
      url: `/opportunities/#${o.slug}`,
      summary: clean(o.summary),
      keywords: [enumLabel("opportunityKind", o.kind), ...words(o.sponsor)],
      window: {
        ...(o.window.opensAt ? { opensAt: o.window.opensAt } : {}),
        ...(o.window.closesAt ? { closesAt: o.window.closesAt } : {}),
        rolling: o.window.rolling,
      },
    });
  }

  for (const { data: n } of c.news) {
    if (n.draft) continue;
    add({
      id: `news:${n.slug}`,
      type: "news",
      title: clean(n.title),
      url: `/news/${n.slug}/`,
      summary: clean(n.summary),
      keywords: n.tags,
      date: n.date,
      hint: formatDate(n.date),
    });
  }

  for (const { data: d } of c.documents) {
    if (d.draft) continue;
    const size = fileSizeKB?.(d.file);
    add({
      id: `document:${d.slug}`,
      type: "document",
      title: clean(d.title),
      url: `/${d.file}`,
      summary: clean(d.summary),
      keywords: [enumLabel("documentCategory", d.category)],
      hint: size === undefined ? "PDF" : `PDF · ${size} KB`,
    });
  }

  for (const { data: i } of c.instruments) {
    if (i.draft || i.status === "retired") continue;
    add({
      id: `instrument:${i.slug}`,
      type: "instrument",
      title: clean(i.name),
      url: `/incubation/facilities/instruments/#${i.slug}`,
      summary: clean(i.useCases.join(", ")),
      keywords: [enumLabel("instrumentCategory", i.category), ...words(i.make, i.model)],
      hint: enumLabel("instrumentCategory", i.category),
    });
  }

  // People: the team listed on the Team page, and mentors.
  for (const { data: p } of c.people) {
    if (p.draft || !p.team) continue;
    add({
      id: `person:${p.slug}`,
      type: "person",
      title: [p.honorific, p.name].filter(Boolean).join(" "),
      url: "/about/team/",
      summary: clean(p.team.role),
      keywords: words(p.designation),
    });
  }
  const person = new Map(c.people.map((p) => [p.data.slug, p.data]));
  for (const { data: m } of c.mentors) {
    const p = person.get(m.personSlug);
    if (m.draft || !p) continue;
    add({
      id: `person:mentor:${m.slug}`,
      type: "person",
      title: p.name,
      url: "/about/mentors/",
      summary: `${clean(m.title)}, ${clean(m.organisation)}`,
      keywords: m.expertise,
    });
  }

  return docs;
}
