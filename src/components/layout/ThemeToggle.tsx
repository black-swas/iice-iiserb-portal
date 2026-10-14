"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { t } from "@/lib/i18n";
import { THEME_QUERY, applyTheme, nextTheme, readTheme, type Theme } from "@/lib/theme";

function subscribe(onChange: () => void) {
  window.addEventListener("iice-theme", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("iice-theme", onChange);
    window.removeEventListener("storage", onChange);
  };
}

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

/** System, light or dark, cycled by one button, remembered in localStorage (FR-GLOBAL-8). */
export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(subscribe, readTheme, () => "system");

  useEffect(() => {
    if (theme !== "system") return;
    const query = window.matchMedia(THEME_QUERY);
    const follow = () => applyTheme("system");
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, [theme]);

  const next = nextTheme(theme);
  const Icon = ICONS[theme];
  return (
    <button
      type="button"
      data-action="toggle-theme"
      className="util-button"
      aria-label={t("theme.toggle", { current: t(`theme.${theme}`), next: t(`theme.${next}`) })}
      onClick={() => applyTheme(next)}
    >
      <Icon aria-hidden="true" />
    </button>
  );
}

/**
 * GIGW 3.0 / MeitY DBIM Accessibility Controls:
 * Font-size scaler (A-, A, A+) and Hindi / English masthead toggle.
 */
export function GigwControls() {
  const [scale, setScale] = useState<"sm" | "md" | "lg">("md");
  const [hi, setHi] = useState(false);

  const changeScale = (next: "sm" | "md" | "lg") => {
    setScale(next);
    const pct = next === "sm" ? "93.75%" : next === "lg" ? "108%" : "100%";
    document.documentElement.style.fontSize = pct;
  };

  const toggleLang = () => {
    const next = !hi;
    setHi(next);
    const titleEl = document.getElementById("iice-masthead-title");
    const hiEl = document.getElementById("iice-masthead-hi");
    if (titleEl && hiEl) {
      if (next) {
        titleEl.textContent = "नवप्रवर्तन एवं उद्यमिता इन्क्यूबेशन केंद्र (IICE) · भा.वि.शि.अ.सं. भोपाल";
        hiEl.textContent = "Innovation and Incubation Centre for Entrepreneurship (IICE) · IISER Bhopal";
      } else {
        titleEl.textContent = "Innovation and Incubation Centre for Entrepreneurship (IICE)";
        hiEl.textContent = "नवप्रवर्तन एवं उद्यमिता इन्क्यूबेशन केंद्र (IICE) · भा.वि.शि.अ.सं. भोपाल";
      }
    }
  };

  return (
    <div className="gigw-controls" role="group" aria-label="Font size and language controls">
      <div className="gigw-font-group" role="group" aria-label="Font size controls">
        <button
          type="button"
          data-action="font-decrease"
          className="gigw-btn"
          aria-pressed={scale === "sm"}
          aria-label="Decrease font size"
          onClick={() => changeScale("sm")}
        >
          A-
        </button>
        <button
          type="button"
          data-action="font-reset"
          className="gigw-btn"
          aria-pressed={scale === "md"}
          aria-label="Default font size"
          onClick={() => changeScale("md")}
        >
          A
        </button>
        <button
          type="button"
          data-action="font-increase"
          className="gigw-btn"
          aria-pressed={scale === "lg"}
          aria-label="Increase font size"
          onClick={() => changeScale("lg")}
        >
          A+
        </button>
      </div>
      <button
        type="button"
        data-action="lang-toggle"
        className="gigw-btn"
        aria-pressed={hi}
        aria-label="Toggle Hindi and English masthead title"
        onClick={toggleLang}
      >
        {hi ? "EN / हिन्दी" : "हिन्दी / EN"}
      </button>
    </div>
  );
}
