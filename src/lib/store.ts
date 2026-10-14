"use client";

import { useSyncExternalStore } from "react";

/**
 * Small external stores for browser-only state, read with useSyncExternalStore: the server and the first client render see
 * the server value, so hydration matches, and the real value follows at once. This replaces "read the browser in an effect
 * and copy it into state", which renders twice and which React's lint rules discourage.
 */

const FLAG_EVENT = "iice:flag";

function subscribeFlag(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(FLAG_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(FLAG_EVENT, listener);
  };
}

/** A yes/no remembered in localStorage (a dismissed prompt). Storage being blocked reads as "not set". */
export function useStoredFlag(key: string, serverValue = true): [boolean, () => void] {
  const value = useSyncExternalStore(
    subscribeFlag,
    () => {
      try {
        return window.localStorage.getItem(key) === "1";
      } catch {
        return false;
      }
    },
    () => serverValue,
  );
  const set = () => {
    try {
      window.localStorage.setItem(key, "1");
    } catch {
      // Blocked or full: the prompt simply comes back next visit.
    }
    window.dispatchEvent(new Event(FLAG_EVENT));
  };
  return [value, set];
}

const subscribeScroll = (listener: () => void) => {
  window.addEventListener("scroll", listener, { passive: true });
  window.addEventListener("resize", listener, { passive: true });
  return () => {
    window.removeEventListener("scroll", listener);
    window.removeEventListener("resize", listener);
  };
};

/** True once the visitor has scrolled at least `fraction` of the way down a page that can scroll at all. */
export function useScrolledPast(fraction: number): boolean {
  return useSyncExternalStore(
    subscribeScroll,
    () => {
      const room = document.documentElement.scrollHeight - window.innerHeight;
      return room > 0 && window.scrollY >= room * fraction;
    },
    () => false,
  );
}

/** True once the page has scrolled more than `pixels` from the top. */
export function useScrolledBy(pixels: number): boolean {
  return useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > pixels,
    () => false,
  );
}
