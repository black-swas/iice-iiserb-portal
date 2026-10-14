/**
 * The pure half of the launch gate (`npm run check:launch`, TRD §16, CLAUDE.md rule 1). The site must not go live while a
 * placeholder is still presented as fact, so the gate looks for two things:
 *  - placeholder text that a production page would show. The build runs once with NEXT_PUBLIC_KEEP_TODO=1, which leaves the
 *    `TODO_CONFIRM` marker in the text, so a marker in a built page is exactly a placeholder a visitor would read;
 *  - entries flagged `_status: TODO_CONFIRM` that are published (not drafts), whatever their text says: a startup whose
 *    status nobody has confirmed, a facility with no figures yet.
 */
import { parse, type Node, type HTMLElement } from "node-html-parser";
import { collectTodos, TODO, TODO_PREFIX } from "../../src/content/todo";
import type { ContentSet } from "../../src/content/loaders";

export interface Placeholder {
  /** The page's route, e.g. "/about/ecosystem/". */
  page: string;
  /** The text, without the marker, shortened. */
  text: string;
  /** Where it was found: visible text, or somewhere only the source shows (structured data, an attribute). */
  where: "page text" | "page source";
}

export interface FlaggedEntry {
  /** content/ path. */
  file: string;
  /** Field path inside the entry; empty for the entry itself. */
  path: string;
  note: string | undefined;
}

const isElement = (node: Node): node is HTMLElement => node.nodeType === 1;
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);

const snippet = (text: string) => {
  const clean = text.replaceAll(TODO_PREFIX, "").replaceAll(TODO, "").replace(/\s+/g, " ").trim();
  return clean.length > 110 ? `${clean.slice(0, 107)}…` : clean;
};

/** Every placeholder in a built page, once each. `page` is its route. */
export function placeholdersIn(page: string, html: string): Placeholder[] {
  if (!html.includes(TODO)) return [];
  const found = new Map<string, Placeholder>();
  const add = (text: string, where: Placeholder["where"]) => {
    const shown = snippet(text) || "(marker alone)";
    if (!found.has(shown)) found.set(shown, { page, text: shown, where });
  };

  const walk = (node: Node) => {
    if (isElement(node)) {
      const isData = node.tagName === "SCRIPT" && /ld\+json/i.test(node.getAttribute("type") ?? "");
      if (SKIP.has(node.tagName) && !isData) return;
      if (isData && node.text.includes(TODO)) {
        // Structured data is read by search engines even though a visitor never sees it.
        for (const m of node.text.matchAll(/"([^"]*TODO_CONFIRM[^"]*)"/g))
          add(m[1] as string, "page source");
        return;
      }
      for (const attr of ["alt", "title", "aria-label", "content", "placeholder"]) {
        const value = node.getAttribute(attr);
        if (value?.includes(TODO)) add(value, "page text");
      }
    } else if (node.text.includes(TODO)) {
      add(node.text, "page text");
    }
    node.childNodes.forEach(walk);
  };
  walk(parse(html));

  // The marker is in the page but not in anything above: it travels in the page's data, so say that.
  if (found.size === 0)
    found.set("", { page, text: "(only in the page's data)", where: "page source" });
  return [...found.values()];
}

/**
 * Published entries flagged as unconfirmed, with the note that says what to confirm. Drafts never publish, so they are not
 * listed. The figures file is left out: a flagged figure is never shown, so it cannot mislead anyone.
 */
export function flaggedEntries(content: ContentSet): FlaggedEntry[] {
  const loaded = [
    ...Object.values(content.collections).flat(),
    ...Object.entries(content.singletons)
      .filter(([key]) => key !== "stats")
      .map(([, entry]) => entry),
  ];
  return loaded.flatMap((entry) => {
    if (!entry || (entry.data as { draft?: boolean }).draft === true) return [];
    return collectTodos(entry.data)
      .filter((todo) => todo.kind === "entry")
      .map((todo): FlaggedEntry => ({ file: entry.file, path: todo.path, note: todo.note }));
  });
}
