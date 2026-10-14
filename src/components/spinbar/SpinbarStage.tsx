"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { t } from "@/lib/i18n";
import { useMediaQuery, useReducedMotion } from "@/lib/motion";
import {
  deckPose,
  deckTransform,
  filterCss,
  ringPose,
  ringTransform,
  segmentFill,
  trackHeightCss,
} from "./geometry";
import { SpinbarCard } from "./SpinbarCard";
import { SpinbarCursor } from "./SpinbarCursor";
import { SpinbarGrid } from "./SpinbarGrid";
import type { SpinbarItem } from "./types";
import { useSpinbarProgress, type FrameInfo } from "./useSpinbarProgress";

/** Desktop ring: a wide viewport and a mouse or trackpad. Everything else gets the deck. */
const RING_QUERY = "(min-width: 1024px) and (pointer: fine)";

export interface SpinbarStageProps {
  items: readonly SpinbarItem[];
}

/**
 * Loaded on demand by `Spinbar`. Picks the variant from the same media queries the CSS uses (TRD §8.2): reduced motion
 * gets the grid, a wide fine-pointer viewport the ring, anything else the deck.
 */
export default function SpinbarStage({ items }: SpinbarStageProps) {
  const ring = useMediaQuery(RING_QUERY);
  const reduced = useReducedMotion();
  if (reduced) return <SpinbarGrid items={items} />;
  return (
    <PinnedStage key={ring ? "ring" : "deck"} variant={ring ? "ring" : "deck"} items={items} />
  );
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function PinnedStage({
  variant,
  items,
}: {
  variant: "ring" | "deck";
  items: readonly SpinbarItem[];
}) {
  const n = items.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const slots = useRef<(HTMLLIElement | null)[]>([]);
  const previewRef = useRef<number | null>(null);
  const activeRef = useRef(0);
  const focusRef = useRef(-1); // the card holding keyboard focus, or -1

  const [active, setActive] = useState(0);
  const [settled, setSettled] = useState(0);
  const [preview, setPreview] = useState<number | null>(null);
  const [entered, setEntered] = useState(false);

  /** Styles only: transform, opacity, filter, visibility. Reads nothing, so there is no layout thrash. */
  const render = useCallback(
    ({ ps, radius, moving }: FrameInfo) => {
      for (let i = 0; i < n; i++) {
        const slot = slots.current[i];
        if (!slot) continue;
        const style = slot.style;
        // The browser’s Tab key skips `visibility: hidden`. The cards either side of the focused one stay reachable even
        // while the ring is still turning toward it (they are invisible, by opacity, if they are far from the front).
        const reachable = focusRef.current >= 0 && Math.abs(i - focusRef.current) <= 1;
        if (variant === "ring") {
          const pose = ringPose(i, ps);
          const previewing = previewRef.current === i && !pose.active;
          style.transform = ringTransform(pose, radius);
          style.filter = previewing ? "none" : filterCss(pose);
          style.opacity = String(previewing ? Math.max(pose.opacity, 0.9) : pose.opacity);
          style.visibility = pose.visible || reachable ? "visible" : "hidden";
          style.willChange = pose.animating && moving ? "transform" : "";
          style.zIndex = String(100 - Math.round(Math.abs(i - ps) * 10));
          style.setProperty("--gray", previewing ? "0" : String(pose.grayscale));
        } else {
          const pose = deckPose(i, ps, n);
          style.transform = deckTransform(pose);
          style.filter = filterCss(pose);
          style.opacity = String(pose.opacity);
          style.visibility = pose.visible || reachable ? "visible" : "hidden";
          style.willChange = pose.animating && moving ? "transform" : "";
        }
        style.setProperty("--fill", String(segmentFill(i, ps)));
      }
    },
    [n, variant],
  );

  const onActive = useCallback((index: number) => {
    activeRef.current = index;
    setActive(index);
  }, []);

  const { redraw, scrollToIndex } = useSpinbarProgress({
    variant,
    n,
    trackRef,
    stageRef,
    render,
    onActive,
  });

  // The live region follows the card only once it has stopped changing (SPEC §5.1: updated after the card settles).
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(active), 250);
    return () => window.clearTimeout(id);
  }, [active]);

  // The entry animation plays once, when the stage is 20% in view (a timer is the fallback).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fallback = window.setTimeout(() => setEntered(true), 4000);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(stage);
    return () => {
      window.clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);

  const setPreviewIndex = (index: number | null) => {
    previewRef.current = index;
    setPreview(index);
    redraw();
  };

  const go = (index: number) => {
    if (index < 0 || index >= n) return;
    scrollToIndex(index);
  };

  return (
    <>
      <div ref={trackRef} className="spin-track" style={{ height: trackHeightCss(variant, n) }}>
        <div ref={stageRef} className="spin-stage" data-entered={entered} data-variant={variant}>
          <ol
            className="spin-list"
            onFocus={(event) => {
              const slot = (event.target as HTMLElement).closest<HTMLElement>("[data-index]");
              if (!slot) return;
              const index = Number(slot.dataset.index);
              focusRef.current = index;
              setPreviewIndex(index);
              // Tabbing to a card brings it to the front, so the focused card is always the active one.
              if (index !== activeRef.current) scrollToIndex(index);
            }}
            onBlur={(event) => {
              // Moving from one card to the next is not leaving: the new card’s focus event takes over.
              if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
              focusRef.current = -1;
              setPreviewIndex(null);
            }}
          >
            {items.map((item, i) => (
              <li
                key={item.id}
                ref={(el) => {
                  slots.current[i] = el;
                }}
                className="spin-slot"
                data-index={i}
                style={
                  { "--i": i, ...(variant === "deck" ? { zIndex: n - i } : {}) } as CSSProperties
                }
                onPointerEnter={() => setPreviewIndex(i)}
                onPointerLeave={() => setPreviewIndex(null)}
              >
                <SpinbarCard
                  item={item}
                  index={i}
                  total={n}
                  active={i === active}
                  preview={preview === i && i !== active}
                />
              </li>
            ))}
          </ol>

          {variant === "deck" ? (
            <>
              <div className="spin-segments" aria-hidden="true">
                {items.map((item, i) => (
                  <span key={item.id} data-active={i === active} />
                ))}
              </div>
              <ol className="spin-record" aria-label={t("spinbar.record")}>
                {items.map((item, i) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      data-action="spinbar-goto"
                      {...(i === active ? { "aria-current": "true" as const } : {})}
                      onClick={() => go(i)}
                    >
                      <span aria-hidden="true">{pad2(i + 1)}</span> {item.title}
                    </button>
                  </li>
                ))}
              </ol>
            </>
          ) : null}

          <div className="spin-controls">
            <button
              type="button"
              data-action="spinbar-prev"
              aria-label={t("spinbar.previous")}
              aria-disabled={active === 0}
              onClick={() => go(active - 1)}
            >
              <ArrowLeft aria-hidden="true" />
            </button>
            <p className="spin-status" role="status" aria-live="polite">
              {t("spinbar.showing", { current: settled + 1, total: n })}
            </p>
            <button
              type="button"
              data-action="spinbar-next"
              aria-label={t("spinbar.next")}
              aria-disabled={active === n - 1}
              onClick={() => go(active + 1)}
            >
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      {variant === "ring" ? <SpinbarCursor stageRef={stageRef} /> : null}
    </>
  );
}
