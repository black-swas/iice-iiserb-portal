import { defineConfig, devices } from "@playwright/test";

const PREVIEW_PORT = 4173;
const FULL_PORT = 4174;

const serve = (directory: string, port: number) => ({
  command: `node node_modules/serve/build/main.js ${directory} -l ${port} --no-clipboard`,
  // A port check, not a URL: a missing build would answer 404, and the other server must still start.
  port,
  reuseExistingServer: !process.env.CI,
  timeout: 60_000,
});

const DESKTOP = { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } };
const MOBILE = { ...devices["Pixel 7"], viewport: { width: 360, height: 740 } };

/**
 * Browser tests run against static exports served the way a host would (TRD §13.1). `npm run test:e2e` builds two:
 * the preview of the real content in out/ (NEXT_PUBLIC_SHOW_TODOS=1, so the menus, footer and spotlight show every planned
 * page), and a build from tests/fixtures/full-content.ts in .cache/e2e/full, where nothing is empty and every page exists.
 * "desktop" is a 1280 px window with a mouse; "mobile" is a 360 px touch phone. Specs in tests/e2e/full/ run against the
 * full build only.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: { trace: "retain-on-failure" },
  webServer: [serve("out", PREVIEW_PORT), serve(".cache/e2e/full", FULL_PORT)],
  projects: [
    {
      name: "desktop",
      testIgnore: "**/full/**",
      use: { ...DESKTOP, baseURL: `http://localhost:${PREVIEW_PORT}` },
    },
    {
      name: "mobile",
      testIgnore: "**/full/**",
      use: { ...MOBILE, baseURL: `http://localhost:${PREVIEW_PORT}` },
    },
    {
      name: "full-desktop",
      testMatch: "**/full/**/*.spec.ts",
      use: { ...DESKTOP, baseURL: `http://localhost:${FULL_PORT}` },
    },
    {
      name: "full-mobile",
      testMatch: "**/full/**/*.spec.ts",
      use: { ...MOBILE, baseURL: `http://localhost:${FULL_PORT}` },
    },
  ],
});
