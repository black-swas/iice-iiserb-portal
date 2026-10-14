"use client";

/**
 * Motion helpers (TRD §8.1). Reveals, count-up, ticker and marquee use these plus CSS; the Motion library is loaded only
 * inside the spinbar and the testimonial slider.
 */
import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
export const FINE_POINTER_HOVER = "(hover: hover) and (pointer: fine)";

/**
 * A media query as React state. The server (and the first client render, so hydration matches) gets `serverValue`;
 * the real answer follows straight away and the component updates if it changes later.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** True when the user asks for less motion. Defaults to true on the server: motion is opt-in. */
export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION, true);
}

/** True while the element is within `rootMargin` of the viewport. Stays false where IntersectionObserver is missing. */
export function useInView(
  ref: RefObject<Element | null>,
  {
    rootMargin = "0px",
    threshold = 0,
    once = false,
  }: { rootMargin?: string; threshold?: number; once?: boolean } = {},
): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) observer.disconnect();
      },
      { rootMargin, threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, threshold, once]);
  return inView;
}
