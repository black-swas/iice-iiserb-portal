"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { ScrollRegion } from "@/components/ui/ScrollRegion";

interface ScrollRowProps {
  /** The accessible name of the row of items. */
  label: string;
  previous: string;
  next: string;
  /** The `<li>` items. */
  children: ReactNode;
  className?: string;
}

/**
 * A row of items that scrolls sideways, with previous and next buttons and scroll snapping (SPEC §3 #9 and #11). Nothing
 * moves by itself: a sliding region the visitor cannot stop would fail WCAG 2.2.2, and these sections are better for
 * being under the visitor's control. The row is a focusable scroll region, so keyboard users can scroll it too.
 */
export function ScrollRow({ label, previous, next, children, className }: ScrollRowProps) {
  const row = useRef<HTMLDivElement>(null);
  const page = (direction: 1 | -1) => {
    const el = row.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  };
  return (
    <div className={`scroll-row${className ? ` ${className}` : ""}`}>
      <ScrollRegion ref={row} className="scroll-row__viewport" label={label}>
        <ul className="scroll-row__list">{children}</ul>
      </ScrollRegion>
      <div className="scroll-row__controls">
        <button
          type="button"
          data-action="scroll-previous"
          className="scroll-row__button"
          aria-label={previous}
          onClick={() => page(-1)}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          data-action="scroll-next"
          className="scroll-row__button"
          aria-label={next}
          onClick={() => page(1)}
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
