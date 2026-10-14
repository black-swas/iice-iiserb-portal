import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // The image and fixture tests do real work with sharp; on a busy laptop or a small CI runner the default 5 s is too tight.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
