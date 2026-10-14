"use client";

import { useEffect, useRef, type RefObject } from "react";
import { t } from "@/lib/i18n";
import { FINE_POINTER_HOVER, useMediaQuery, useReducedMotion } from "@/lib/motion";

/**
 * The 10 px dot that follows a mouse over the stage and grows to "Open" over the active card (SPEC §5.1). Mounted only
 * for fine pointers with motion allowed; hidden while a dialog is open; `aria-hidden` and never in the way of clicks.
 * The native cursor is hidden inside the stage and nowhere else.
 */
export function SpinbarCursor({ stageRef }: { stageRef: RefObject<HTMLElement | null> }) {
  const dot = useRef<HTMLDivElement>(null);
  const fine = useMediaQuery(FINE_POINTER_HOVER);
  const reduced = useReducedMotion();
  const enabled = fine && !reduced;

  useEffect(() => {
    const stage = stageRef.current;
    const el = dot.current;
    if (!enabled || !stage || !el) return;

    let x = 0;
    let y = 0;
    let inside = false;
    let over = false;
    let raf = 0;

    const paint = () => {
      raf = 0;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      el.dataset.state = over ? "open" : "dot";
      el.style.opacity = inside && !document.querySelector("dialog[open]") ? "1" : "0";
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      x = event.clientX;
      y = event.clientY;
      inside = true;
      over = Boolean((event.target as Element | null)?.closest('.spin-card[data-active="true"]'));
      schedule();
    };
    const leave = () => {
      inside = false;
      schedule();
    };

    stage.dataset.cursor = "on";
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerleave", leave);
    return () => {
      delete stage.dataset.cursor;
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
    };
  }, [enabled, stageRef]);

  if (!enabled) return null;
  return (
    <div ref={dot} className="spin-cursor" data-state="dot" aria-hidden="true">
      <span>{t("spinbar.open")}</span>
    </div>
  );
}
