"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useScrolledBy } from "@/lib/store";

/** How far the page scrolls before the header gets its shadow (SPEC §3 #2). */
export const HEADER_SCROLL_PX = 24;

/**
 * The `<header>` element, with two states the CSS reads. At the top of the home page it wears the hero's colour
 * (`data-tone="hero"`), so it looks transparent over the hero without being laid over it, which would put text on an
 * unpredictable background; as soon as the page scrolls it turns into the solid surface and gains a shadow
 * (`data-scrolled="true"`). The children are server-rendered and pass straight through.
 */
export function ScrollHeader({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const scrolled = useScrolledBy(HEADER_SCROLL_PX);
  const overHero = pathname === "/" && !scrolled;
  return (
    <header
      className="site-header"
      data-scrolled={scrolled}
      {...(overHero ? { "data-tone": "hero" } : {})}
    >
      {children}
    </header>
  );
}
