import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    // eslint-config-next already registers the jsx-a11y plugin but enables only a handful of its rules.
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  {
    // CLAUDE.md hard rule 3: static export only, images go through <Picture>.
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/image",
              message:
                "Static export has no image optimiser. Use the <Picture> component (TRD §6).",
            },
            {
              name: "next/headers",
              message: "cookies() and headers() are unavailable with output: 'export' (TRD §4.1).",
            },
          ],
        },
      ],
    },
  },
  {
    // CLAUDE.md rule 11 / TRD §5.0: amounts reach the UI only through formatINR() in src/lib/money.ts.
    files: ["src/components/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...[
          "Literal[value=/₹|\\bLakhs?\\b|\\bLacs?\\b/i]",
          "JSXText[value=/₹|\\bLakhs?\\b|\\bLacs?\\b/i]",
          "TemplateElement[value.raw=/₹|\\bLakhs?\\b|\\bLacs?\\b/i]",
        ].map((selector) => ({
          selector,
          message:
            "Do not write amounts by hand. Use formatINR() or formatMoney() from @/lib/money.",
        })),
      ],
    },
  },
  globalIgnores([
    ".next/**",
    ".cache/**", // generated: the image manifest and the end-to-end site builds
    "out/**",
    "build/**",
    "coverage/**",
    "legacy/**",
    "next-env.d.ts",
  ]),
]);
