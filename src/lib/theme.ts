/**
 * Colour theme (SPEC §6, TRD §7): system, light or dark, remembered in localStorage under "theme" (absent means system).
 * `THEME_SCRIPT` runs in <head> before first paint so the page never flashes the wrong theme.
 */

export type Theme = "system" | "light" | "dark";
export const THEME_KEY = "theme";

export const THEMES: readonly Theme[] = ["system", "light", "dark"];

/** system → light → dark → system. */
export function nextTheme(theme: Theme): Theme {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] as Theme;
}

/** Whether `theme` means dark right now, given the system preference. */
export function isDark(theme: Theme, systemPrefersDark: boolean): boolean {
  return theme === "dark" || (theme === "system" && systemPrefersDark);
}

export function parseTheme(stored: string | null | undefined): Theme {
  return stored === "light" || stored === "dark" ? stored : "system";
}

/**
 * The blocking script (kept under 500 bytes; its hash goes into the CSP, TRD §14). Anything unexpected, such as storage
 * being blocked, leaves the page in the light theme, which is the default.
 */
export const THEME_SCRIPT =
  '(function(){try{var t=localStorage.getItem("theme");' +
  'var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);' +
  'document.documentElement.classList.toggle("dark",d)}catch(e){}})()';

const SYSTEM_QUERY = "(prefers-color-scheme: dark)";

/** Client only. */
export function readTheme(): Theme {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return "system";
  }
}

/** Client only. Stores the choice (system is stored as nothing) and sets or clears the `dark` class. */
export function applyTheme(theme: Theme): void {
  try {
    if (theme === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  document.documentElement.classList.toggle(
    "dark",
    isDark(theme, matchMedia(SYSTEM_QUERY).matches),
  );
  window.dispatchEvent(new Event("iice-theme"));
}

export const THEME_QUERY = SYSTEM_QUERY;
