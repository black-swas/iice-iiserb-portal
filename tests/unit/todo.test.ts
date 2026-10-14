import { describe, expect, it } from "vitest";
import {
  collectTodos,
  display,
  displayDeep,
  hasTodos,
  isFlagged,
  isTodo,
  knownNumber,
  showTodoMarkers,
  todoProps,
} from "@/content/todo";

describe("isTodo / display", () => {
  it("recognises the prefix and the bare marker, and nothing else", () => {
    expect(isTodo("TODO_CONFIRM: Coordinator of IICE")).toBe(true);
    expect(isTodo("TODO_CONFIRM")).toBe(true);
    expect(isTodo("todo_confirm: lower case")).toBe(false);
    expect(isTodo("About TODO_CONFIRM: mid-sentence")).toBe(false);
    expect(isTodo(null)).toBe(false);
    expect(isTodo(42)).toBe(false);
  });

  it("strips the marker for rendering and leaves other text alone", () => {
    expect(display("TODO_CONFIRM: Coordinator of IICE")).toBe("Coordinator of IICE");
    expect(display("TODO_CONFIRM:   spaced")).toBe("spaced");
    expect(display("TODO_CONFIRM")).toBe("");
    expect(display("Plain text")).toBe("Plain text");
  });

  it("never lets the marker survive into rendered text", () => {
    const rendered = displayDeep({
      a: "TODO_CONFIRM: one",
      b: ["TODO_CONFIRM: two", { c: "TODO_CONFIRM: three" }],
      n: 3,
    });
    expect(JSON.stringify(rendered)).not.toContain("TODO_CONFIRM");
    expect(rendered.n).toBe(3);
  });
});

describe("isFlagged / knownNumber", () => {
  it("reads the entry-level flag", () => {
    expect(isFlagged({ _status: "TODO_CONFIRM" })).toBe(true);
    expect(isFlagged({ _status: "other" })).toBe(false);
    expect(isFlagged({})).toBe(false);
    expect(isFlagged(null)).toBe(false);
    expect(isFlagged("TODO_CONFIRM")).toBe(false);
  });

  it("returns a number only when there is one, so unknowns never render as numbers", () => {
    expect(knownNumber(0)).toBe(0);
    expect(knownNumber(10_000)).toBe(10_000);
    expect(knownNumber(null)).toBeNull();
    expect(knownNumber(undefined)).toBeNull();
    expect(knownNumber(Number.NaN)).toBeNull();
    expect(knownNumber(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("collectTodos", () => {
  it("finds text placeholders with their field paths", () => {
    const refs = collectTodos({
      name: "Plain",
      bio: "TODO_CONFIRM: Coordinator of IICE",
      members: [{ role: "Member" }, { role: "TODO_CONFIRM: President" }],
    });
    expect(refs.map((r) => [r.path, r.kind])).toEqual([
      ["bio", "text"],
      ["members[1].role", "text"],
    ]);
  });

  it("reports an entry flag against the object that carries it", () => {
    const refs = collectTodos({
      slug: "x",
      _status: "TODO_CONFIRM",
      _note: "Verify roster",
      inner: { _status: "TODO_CONFIRM" },
    });
    expect(refs.map((r) => [r.path, r.kind])).toEqual([
      ["", "entry"],
      ["inner", "entry"],
    ]);
  });

  it("attaches the nearest enclosing note", () => {
    const [ref] = collectTodos({ _note: "Confirm with IICE", bio: "TODO_CONFIRM: placeholder" });
    expect(ref?.note).toBe("Confirm with IICE");
  });

  it("does not report the bookkeeping fields themselves", () => {
    expect(
      collectTodos({ _note: "TODO_CONFIRM: about this", _source: "TODO_CONFIRM: where" }),
    ).toEqual([]);
  });

  it("returns nothing for clean values", () => {
    expect(collectTodos({ a: 1, b: [null, "x"], c: { d: true } })).toEqual([]);
    expect(hasTodos({ a: "ok" })).toBe(false);
    expect(hasTodos({ a: "TODO_CONFIRM: no" })).toBe(true);
  });
});

describe("markers", () => {
  it("show in development and on previews that opt in, never in production", () => {
    expect(showTodoMarkers({ NODE_ENV: "development" })).toBe(true);
    expect(showTodoMarkers({ NODE_ENV: "production", NEXT_PUBLIC_SHOW_TODOS: "1" })).toBe(true);
    expect(showTodoMarkers({ NODE_ENV: "production" })).toBe(false);
    expect(showTodoMarkers({ NODE_ENV: "production", NEXT_PUBLIC_SHOW_TODOS: "0" })).toBe(false);
  });

  it("add data-todo only to placeholder values, only when markers show", () => {
    const dev = { NODE_ENV: "development" };
    expect(todoProps("bio", "TODO_CONFIRM: x", dev)).toEqual({ "data-todo": "bio" });
    expect(todoProps("bio", "Real text", dev)).toEqual({});
    expect(todoProps("bio", "TODO_CONFIRM: x", { NODE_ENV: "production" })).toEqual({});
  });
});
