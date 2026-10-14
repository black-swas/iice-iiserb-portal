"use client";

import { useEffect, useRef, useState } from "react";
import { REDUCED_MOTION, useInView } from "@/lib/motion";
import { formatStat } from "@/lib/money";
import type { StatUnit } from "@/content/schema";

interface CountUpProps {
  value: number;
  unit: StatUnit;
  plus: boolean;
  /** Stable key for tests and the HTML audit (`[data-stat]` must never be empty or 0). */
  id: string;
  durationMs?: number;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * A figure that counts up once when it scrolls into view (SPEC §3 #4). The final value is in the server-rendered HTML
 * and is what the first client render shows: the animation only re-plays it, and does nothing under reduced motion.
 * Digits are tabular and the width is reserved, so the counting does not move the text around it.
 */
export function CountUp({ value, unit, plus, id, durationMs = 1200 }: CountUpProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { rootMargin: "-10% 0px", once: true });
  const final = formatStat({ value, unit, plus });
  const [shown, setShown] = useState(final);

  useEffect(() => {
    if (!inView || window.matchMedia(REDUCED_MOTION).matches) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setShown(
        progress >= 1
          ? final
          : formatStat({ value: Math.round(value * easeOut(progress)), unit, plus }),
      );
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, unit, plus, final, durationMs]);

  return (
    <p ref={ref} className="impact__value" data-stat={id} style={{ minWidth: `${final.length}ch` }}>
      {shown}
    </p>
  );
}
