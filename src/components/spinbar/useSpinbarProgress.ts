"use client";

/**
 * The spinbar's scroll loop (TRD §8.2). One passive scroll listener schedules a single animation frame; each frame reads
 * the track's rectangle once, turns it into progress `p`, smooths toward it, and hands the result to `render`, which only
 * writes styles (no read after a write, so no layout thrash). The listeners detach while the section is off-screen.
 * When scrolling stops for 150 ms a Motion spring settles the ring on the nearest card.
 */
import { animate } from "motion";
import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import {
  activeIndex,
  progressFromScroll,
  ringRadius,
  scrollTopForIndex,
  segmentPx,
  settleTarget,
  smoothStep,
} from "./geometry";

const SETTLE_IDLE_MS = 150;
/** Critically damped for a spring with stiffness 170 and mass 1: damping = 2 √(k m). */
const SPRING = { type: "spring", stiffness: 170, damping: 26 } as const;
const CONVERGED = 0.001;

export interface FrameInfo {
  /** Smoothed progress in card units. */
  ps: number;
  /** Ring radius in px (unused by the deck). */
  radius: number;
  /** True while scrolling or settling: keep `will-change` on. */
  moving: boolean;
}

interface Options {
  variant: "ring" | "deck";
  n: number;
  trackRef: RefObject<HTMLElement | null>;
  stageRef: RefObject<HTMLElement | null>;
  /** Write styles for this frame. Must not read layout. */
  render: (frame: FrameInfo) => void;
  /** Called only when the active card changes. */
  onActive: (index: number) => void;
}

interface State {
  p: number;
  ps: number;
  last: number;
  raf: number;
  settleTimer: number;
  spring: { stop: () => void } | undefined;
  pin: number;
  segment: number;
  radius: number;
  moving: boolean;
  active: number;
}

export function useSpinbarProgress({ variant, n, trackRef, stageRef, render, onActive }: Options) {
  const state = useRef<State>({
    p: 0,
    ps: 0,
    last: 0,
    raf: 0,
    settleTimer: 0,
    spring: undefined,
    pin: 0,
    segment: 1,
    radius: 520,
    moving: false,
    active: -1,
  });

  // The latest callbacks, readable from effects and handlers without re-running the effect.
  const latest = useRef({ render, onActive });
  useLayoutEffect(() => {
    latest.current = { render, onActive };
  });

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return;
    const s = state.current;
    let attached = false;

    /** Layout reads: on mount and when the stage resizes, never per frame. */
    const measure = () => {
      s.pin = parseFloat(getComputedStyle(stage).top) || 0;
      s.segment = segmentPx(variant, stage.offsetHeight + s.pin);
      s.radius = ringRadius(stage.clientWidth);
      stage.style.setProperty("--ring-r", `${s.radius}px`);
    };
    const readProgress = () =>
      progressFromScroll(track.getBoundingClientRect().top - s.pin, s.segment, n);

    const draw = () => {
      latest.current.render({ ps: s.ps, radius: s.radius, moving: s.moving });
      const a = activeIndex(s.ps, n);
      if (a !== s.active) {
        s.active = a;
        latest.current.onActive(a);
      }
    };

    const schedule = () => {
      if (!s.raf) s.raf = requestAnimationFrame(frame);
    };

    function frame(now: number) {
      s.raf = 0;
      const dt = s.last ? Math.min(now - s.last, 100) : 16;
      s.last = now;
      s.p = readProgress();
      s.ps = smoothStep(s.ps, s.p, dt);
      if (Math.abs(s.p - s.ps) > CONVERGED) {
        draw();
        schedule();
      } else {
        s.ps = s.p;
        s.last = 0;
        draw();
      }
    }

    const settle = () => {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      s.last = 0;
      const target = settleTarget(readProgress(), n);
      const finish = () => {
        s.ps = target;
        s.moving = false;
        s.spring = undefined;
        draw();
      };
      if (Math.abs(s.ps - target) < CONVERGED) return finish();
      s.spring = animate(s.ps, target, {
        ...SPRING,
        onUpdate: (value: number) => {
          s.ps = value;
          draw();
        },
        onComplete: finish,
      });
    };

    const onScroll = () => {
      s.moving = true;
      s.spring?.stop();
      s.spring = undefined;
      window.clearTimeout(s.settleTimer);
      s.settleTimer = window.setTimeout(settle, SETTLE_IDLE_MS);
      schedule();
    };

    const attach = () => {
      if (attached) return;
      attached = true;
      measure();
      s.p = s.ps = readProgress();
      draw();
      window.addEventListener("scroll", onScroll, { passive: true });
    };
    const detach = () => {
      if (!attached) return;
      attached = false;
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      window.clearTimeout(s.settleTimer);
      s.spring?.stop();
      s.spring = undefined;
      s.moving = false;
      s.last = 0;
    };

    // Position the cards before the first paint, wherever the page is scrolled to.
    measure();
    s.p = s.ps = readProgress();
    draw();

    const resize = new ResizeObserver(() => {
      measure();
      s.p = readProgress();
      if (!attached) s.ps = s.p;
      schedule();
    });
    resize.observe(stage);

    const visibility = new IntersectionObserver(([entry]) =>
      entry?.isIntersecting ? attach() : detach(),
    );
    visibility.observe(track);

    return () => {
      visibility.disconnect();
      resize.disconnect();
      detach();
    };
  }, [variant, n, trackRef, stageRef]);

  /** Re-run `render` for the current progress, e.g. after a hover preview changes. */
  const redraw = useCallback(() => {
    const s = state.current;
    latest.current.render({ ps: s.ps, radius: s.radius, moving: s.moving });
  }, []);

  /** Scroll the page so card `i` is at the front. Focus and the Prev/Next buttons use this. */
  const scrollToIndex = useCallback(
    (i: number, behavior: ScrollBehavior = "smooth") => {
      const track = trackRef.current;
      if (!track) return;
      const s = state.current;
      const trackTop = track.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: scrollTopForIndex(trackTop, s.pin, s.segment, Math.min(Math.max(i, 0), n - 1)),
        behavior,
      });
    },
    [n, trackRef],
  );

  return { redraw, scrollToIndex };
}
