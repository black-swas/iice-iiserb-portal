/**
 * Spinbar geometry (SPEC §5.1, TRD §8.2): pure functions, no DOM, no React. The component reads one rectangle per frame,
 * turns it into a progress value `p`, and writes whatever these functions return. Everything is in card units: progress
 * 0 is the first card centred, progress n − 1 the last.
 *
 *   ring  (desktop, fine pointer)  cards sit on an arc 30° apart, each turned tangent to it
 *   deck  (touch, under 1024 px)   cards stack; the active one lifts away and the next shows beneath
 */

export type SpinbarVariant = "ring" | "deck" | "grid";

export const RING_STEP_DEG = 30;
/** Past this angle a ring card is hidden (the corner peeks at 60° are the last that show). */
export const RING_HIDE_DEG = 75;
/** The ring is about 520 px in radius at a 1280 px viewport, scaled with the viewport. */
export const RING_RADIUS_AT_1280 = 520;

/** Scroll distance per card, in svh (SPEC §5.1 and §5.1 "Touch devices"). The track adds one stage of run-in. */
export const RING_SEGMENT_SVH = 70;
export const DECK_SEGMENT_SVH = 45;
export const DECK_EXTRA_SVH = 30;

/** Smoothing time constant for the scrub, in milliseconds (TRD §8.2). */
export const SCRUB_TAU_MS = 300;

const round = (n: number, places = 3) => {
  const f = 10 ** places;
  return Math.round(n * f) / f + 0; // + 0 turns -0 into 0
};
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Linear interpolation through `points` (sorted by x), flat beyond both ends. */
function piecewise(x: number, points: readonly (readonly [number, number])[]): number {
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]!;
    const [x0, y0] = points[i - 1]!;
    if (x <= x1) return lerp(y0, y1, (x - x0) / (x1 - x0));
  }
  return last[1];
}

// ── Progress ───────────────────────────────────────────────────

/**
 * Progress from the track's position. `top` is how far the track's top edge is above (negative) or below the point
 * where the stage pins; `segment` is the scroll distance per card, in px.
 */
export function progressFromScroll(top: number, segment: number, n: number): number {
  if (n <= 1 || segment <= 0) return 0;
  return clamp(-top / segment, 0, n - 1) + 0;
}

/** Exponential smoothing toward `target`: the "scrub" feel. Frame-rate independent; dt of 0 does not move. */
export function smoothStep(
  current: number,
  target: number,
  dtMs: number,
  tauMs = SCRUB_TAU_MS,
): number {
  if (dtMs <= 0) return current;
  return current + (target - current) * (1 - Math.exp(-dtMs / tauMs));
}

/** Where the spring settles when scrolling stops: the nearest card. */
export function settleTarget(p: number, n: number): number {
  return clamp(Math.round(p), 0, Math.max(0, n - 1));
}

/** The card that counts as active. */
export function activeIndex(ps: number, n: number): number {
  return clamp(Math.round(ps), 0, Math.max(0, n - 1));
}

/** Fill of the active card's accent line, 0 to 1, across the scroll segment around it. */
export function segmentFill(i: number, ps: number): number {
  return round(clamp(ps - (i - 0.5), 0, 1));
}

/** The window scroll position that brings card `i` to the front (progress exactly `i`). */
export function scrollTopForIndex(
  trackDocumentTop: number,
  pinOffset: number,
  segment: number,
  i: number,
): number {
  return Math.round(trackDocumentTop - pinOffset + i * segment);
}

/** Scroll distance per card in px. `stageHeight` is the pinned stage's height plus the pin offset, i.e. 100svh. */
export function segmentPx(
  variant: Exclude<SpinbarVariant, "grid">,
  viewportHeight: number,
): number {
  return ((variant === "ring" ? RING_SEGMENT_SVH : DECK_SEGMENT_SVH) / 100) * viewportHeight;
}

/** The CSS height of the scroll track, so layout is right before any JS runs. */
export function trackHeightCss(variant: Exclude<SpinbarVariant, "grid">, n: number): string {
  return variant === "ring"
    ? `calc(${n} * ${RING_SEGMENT_SVH}svh + 100svh)`
    : `calc(${n} * ${DECK_SEGMENT_SVH}svh + ${DECK_EXTRA_SVH}svh)`;
}

// ── Ring ───────────────────────────────────────────────────────

export function ringRadius(viewportWidth: number): number {
  return Math.round(clamp((RING_RADIUS_AT_1280 * viewportWidth) / 1280, 380, 760));
}

/** Angle of card `i` around the ring: 0 at the focus slot, negative to its left, positive to its right. */
export function ringAngle(i: number, ps: number): number {
  return round((i - ps) * RING_STEP_DEG);
}

export interface CardPose {
  /** `visibility: hidden` when false: out of sight and out of the tab order. */
  visible: boolean;
  opacity: number;
  scale: number;
  /** Gaussian blur radius in px. Zero means no filter at all. */
  blur: number;
  /** 0 to 1, applied to photos only (through a CSS variable). */
  grayscale: number;
  /** True for the nearest card. */
  active: boolean;
  /** Keep `will-change: transform` only on cards close enough to move visibly. */
  animating: boolean;
}

export interface RingPose extends CardPose {
  angle: number;
}

/**
 * Pose of ring card `i`. `d` is the card's distance from the focus slot in cards:
 * the active card is full size and sharp, its neighbours (d = 1) are 0.78 scale, 55% opaque and blurred,
 * the corner peeks (d = 2) are fainter still, and past 75° nothing shows.
 */
export function ringPose(i: number, ps: number): RingPose {
  const d = Math.abs(i - ps);
  const angle = ringAngle(i, ps);
  return {
    angle,
    visible: Math.abs(angle) <= RING_HIDE_DEG,
    scale: round(
      piecewise(d, [
        [0, 1],
        [1, 0.78],
        [2, 0.7],
      ]),
    ),
    opacity: round(
      piecewise(d, [
        [0, 1],
        [1, 0.55],
        [2, 0.4],
        [2.5, 0],
      ]),
    ),
    // Blur only for the two nearest on each side: further cards fade instead (TRD §8.2 blur budget).
    blur: d <= 2 ? round(3 * Math.min(d, 1), 2) : 0,
    grayscale: round(Math.min(d, 1)),
    active: Math.round(ps) === i,
    animating: d <= 2,
  };
}

/** One composited transform: turn to the angle, move out along the radius, then scale about the centre. */
export function ringTransform(pose: Pick<RingPose, "angle" | "scale">, radius: number): string {
  return `rotate(${pose.angle}deg) translateY(${-radius}px) scale(${pose.scale})`;
}

// ── Deck ───────────────────────────────────────────────────────

export interface DeckPose extends CardPose {
  /** Percent of the card's own height. */
  translateY: number;
  /** Degrees; never more than 4. */
  rotate: number;
  /** 0 to 1; dims cards still waiting underneath (brightness, not blur). */
  brightness: number;
  zIndex: number;
}

/**
 * Pose of deck card `i`. `o = ps − i` is its offset: negative while it waits beneath, 0 when active, positive as it
 * flies away. translateY runs 8% → 0 → −58%, scale 0.92 → 1 → 1.02, rotate 1.5° → 0° → −4°, and opacity fades after 0.55.
 */
export function deckPose(i: number, ps: number, n: number): DeckPose {
  const o = ps - i;
  return {
    translateY: round(
      piecewise(o, [
        [-1, 8],
        [0, 0],
        [1, -58],
      ]),
      2,
    ),
    scale: round(
      piecewise(o, [
        [-1, 0.92],
        [0, 1],
        [1, 1.02],
      ]),
    ),
    rotate: round(
      piecewise(o, [
        [-1, 1.5],
        [0, 0],
        [1, -4],
      ]),
      2,
    ),
    opacity: round(
      piecewise(o, [
        [0.55, 1],
        [1, 0],
      ]),
    ),
    brightness: round(
      piecewise(o, [
        [-1, 0.6],
        [0, 1],
      ]),
    ),
    // The deck never blurs and never goes grey: brightness and opacity only.
    blur: 0,
    grayscale: 0,
    visible: o > -2.5 && o < 1,
    zIndex: n - i,
    active: Math.round(ps) === i,
    animating: Math.abs(o) <= 2,
  };
}

export function deckTransform(pose: Pick<DeckPose, "translateY" | "rotate" | "scale">): string {
  return `translateY(${pose.translateY}%) rotate(${pose.rotate}deg) scale(${pose.scale})`;
}

/** A CSS filter value for a pose, or "none" when there is nothing to apply. */
export function filterCss(pose: Pick<CardPose, "blur"> & { brightness?: number }): string {
  const parts: string[] = [];
  if (pose.blur > 0) parts.push(`blur(${pose.blur}px)`);
  if (pose.brightness !== undefined && pose.brightness < 1)
    parts.push(`brightness(${pose.brightness})`);
  return parts.length > 0 ? parts.join(" ") : "none";
}
