/**
 * TODO_CONFIRM handling (CLAUDE.md rule 1, BACKEND_SCHEMA §2.3, TRD §5.1).
 *
 *   placeholder copy      "TODO_CONFIRM: Coordinator of IICE…"   prefix stripped, text rendered
 *   unknown number/amount null + "_status": "TODO_CONFIRM"       never rendered as a number in production
 *   unknown date          optional date omitted + "_status"      date not shown
 *   whole entry           "_status": "TODO_CONFIRM" + "_note"     rendered, listed in reports
 */

export const TODO = "TODO_CONFIRM" as const;
export const TODO_PREFIX = `${TODO}:` as const;

/** True for a placeholder string: "TODO_CONFIRM: copy" or the bare marker. */
export function isTodo(value: unknown): value is string {
  return typeof value === "string" && (value === TODO || value.startsWith(TODO_PREFIX));
}

/**
 * The launch check (`npm run check:launch`) builds the site once with NEXT_PUBLIC_KEEP_TODO=1, which makes `display` leave
 * the marker in place. A marker found in that build's pages is a placeholder that a real production page would show as if it
 * were fact. No other build sets it.
 */
const KEEP_MARKERS = process.env.NEXT_PUBLIC_KEEP_TODO === "1";

/** The text to render: the placeholder copy without its marker. Non-placeholder text is returned unchanged. */
export function display(value: string): string {
  if (KEEP_MARKERS) return value;
  if (value === TODO) return "";
  return value.startsWith(TODO_PREFIX) ? value.slice(TODO_PREFIX.length).trimStart() : value;
}

/** `display` applied to every string in a value, so a whole entry can be handed to a component at once. */
export function displayDeep<T>(value: T): T {
  if (typeof value === "string") return display(value) as T;
  if (Array.isArray(value)) return value.map(displayDeep) as T;
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, displayDeep(v)])) as T;
  }
  return value;
}

/** True when an entry carries the entry-level flag. */
export function isFlagged(entry: unknown): boolean {
  return (
    typeof entry === "object" && entry !== null && (entry as { _status?: unknown })._status === TODO
  );
}

/**
 * The only way a possibly-unknown number may be read for display. `null` means "do not render a number":
 * show "To be announced" or hide the item. A flagged entry never turns a known number into a guess.
 */
export function knownNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export interface TodoRef {
  /** Field path in the same style as validation errors, e.g. `members[1].committeeRole`. "" is the entry itself. */
  path: string;
  kind: "text" | "entry";
  /** The placeholder text (kind "text") or the marker (kind "entry"). */
  value: string;
  /** What to confirm. For text refs this is the entry's `_note`, if any. */
  note?: string;
}

const joinPath = (base: string, key: string | number) =>
  typeof key === "number" ? `${base}[${key}]` : base ? `${base}.${key}` : key;

/**
 * Finds every placeholder in an entry: `TODO_CONFIRM:` strings and `_status: "TODO_CONFIRM"` flags.
 * The note in effect is the nearest enclosing object's `_note`.
 */
export function collectTodos(entry: unknown, base = "", inheritedNote?: string): TodoRef[] {
  if (isTodo(entry)) {
    return [
      { path: base, kind: "text", value: entry, ...(inheritedNote ? { note: inheritedNote } : {}) },
    ];
  }
  if (Array.isArray(entry)) {
    return entry.flatMap((item, i) => collectTodos(item, joinPath(base, i), inheritedNote));
  }
  if (typeof entry !== "object" || entry === null) return [];

  const record = entry as Record<string, unknown>;
  const note = typeof record._note === "string" ? record._note : inheritedNote;
  const refs: TodoRef[] = [];
  if (record._status === TODO) {
    refs.push({ path: base, kind: "entry", value: TODO, ...(note ? { note } : {}) });
  }
  for (const [key, value] of Object.entries(record)) {
    if (key === "_status" || key === "_note" || key === "_source") continue;
    refs.push(...collectTodos(value, joinPath(base, key), note));
  }
  return refs;
}

export function hasTodos(entry: unknown): boolean {
  return collectTodos(entry).length > 0;
}

type Env = { NODE_ENV?: string | undefined; NEXT_PUBLIC_SHOW_TODOS?: string | undefined };

// Literal references, so Next inlines them in client bundles too.
const currentEnv = (): Env => ({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_SHOW_TODOS: process.env.NEXT_PUBLIC_SHOW_TODOS,
});

/** Placeholders are outlined in development, and on previews that set NEXT_PUBLIC_SHOW_TODOS=1. Never in production. */
export function showTodoMarkers(env: Env = currentEnv()): boolean {
  return env.NODE_ENV === "development" || env.NEXT_PUBLIC_SHOW_TODOS === "1";
}

/** Spread onto an element rendered from a TODO value: `<p {...todoProps("bio", person.bio)}>`. */
export function todoProps(path: string, value: unknown, env?: Env) {
  return showTodoMarkers(env) && isTodo(value) ? { "data-todo": path } : {};
}
