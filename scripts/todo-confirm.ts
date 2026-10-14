/**
 * npm run todo:confirm (FR-DEV-1). Lists every TODO_CONFIRM placeholder: file, field path, note. Always exits 0;
 * the pre-launch gate that fails on them is `check:launch`.
 *   --summary   per-file counts only
 */
import { readContent } from "../src/content/loaders";
import { CONTENT_DIR } from "../src/content/root";
import { collectTodos, type TodoRef } from "../src/content/todo";

const CONTENT = CONTENT_DIR;
const summaryOnly = process.argv.includes("--summary");

const { content } = readContent({ root: CONTENT, includeDrafts: true });
const loaded = [...Object.values(content.collections).flat(), ...Object.values(content.singletons)];

const byFile = loaded
  .map((entry) => ({ file: entry!.file, todos: collectTodos(entry!.data) }))
  .filter((e) => e.todos.length > 0);

const describe = (t: TodoRef) =>
  t.kind === "entry"
    ? "(entry flagged)"
    : t.value.length > 60
      ? `${t.value.slice(0, 57)}…`
      : t.value;

if (!summaryOnly) {
  for (const { file, todos } of byFile) {
    for (const todo of todos) {
      console.log(
        `content/${file} › ${todo.path || "(entry)"}  ${describe(todo)}${todo.note ? `\n    note: ${todo.note}` : ""}`,
      );
    }
  }
  console.log("");
}

for (const { file, todos } of byFile)
  console.log(`${String(todos.length).padStart(4)}  content/${file}`);
const total = byFile.reduce((n, e) => n + e.todos.length, 0);
console.log(
  `\n${total} TODO_CONFIRM placeholders in ${byFile.length} of ${loaded.length} entries.`,
);
