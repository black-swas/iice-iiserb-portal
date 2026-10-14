"use client";

import { useSyncExternalStore } from "react";

const EVENT = "iice:urlchange";

function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(EVENT, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(EVENT, listener);
  };
}

/**
 * The page's query string ("?view=past&q=lab"), as an external store. The server and the first client render see an empty
 * string, which is what a static page knows, so hydration matches; the real query follows at once. Filter and view state
 * lives in the URL (SPEC §4.2) and is read through this, rather than copied into component state in an effect.
 */
export function useUrlSearch(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
}

/** Replaces the query string without adding a history entry, and tells every `useUrlSearch` to re-read it. */
export function replaceUrlSearch(search: string): void {
  const query = search.replace(/^\?/, "");
  const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(EVENT));
}
