import { describe, expect, it } from "vitest";
import {
  RING_HIDE_DEG,
  activeIndex,
  deckPose,
  deckTransform,
  filterCss,
  progressFromScroll,
  ringAngle,
  ringPose,
  ringRadius,
  ringTransform,
  scrollTopForIndex,
  segmentFill,
  segmentPx,
  settleTarget,
  smoothStep,
  trackHeightCss,
} from "@/components/spinbar/geometry";

const near = (actual: number, expected: number, places = 2) =>
  expect(actual).toBeCloseTo(expected, places);

describe("ringAngle", () => {
  it("is 30° per card from the focus slot, negative to the left and positive to the right", () => {
    expect([0, 1, 2, 3, 4].map((i) => ringAngle(i, 2))).toEqual([-60, -30, 0, 30, 60]);
  });

  it("rotates the ring as progress moves, 30° per card", () => {
    expect(ringAngle(1, 0)).toBe(30);
    expect(ringAngle(1, 0.5)).toBe(15);
    expect(ringAngle(1, 1)).toBe(0);
    expect(ringAngle(1, 1.5)).toBe(-15);
  });

  it("never returns negative zero", () => {
    expect(Object.is(ringAngle(3, 3), 0)).toBe(true);
  });
});

describe("ringPose", () => {
  it("makes the active card full size, fully opaque, sharp and in colour", () => {
    expect(ringPose(2, 2)).toEqual({
      angle: 0,
      visible: true,
      scale: 1,
      opacity: 1,
      blur: 0,
      grayscale: 0,
      active: true,
      animating: true,
    });
  });

  it("dims, shrinks, blurs and greys the neighbours at ±30°", () => {
    for (const i of [1, 3]) {
      expect(ringPose(i, 2)).toMatchObject({
        scale: 0.78,
        opacity: 0.55,
        blur: 3,
        grayscale: 1,
        active: false,
        visible: true,
      });
    }
    expect(ringPose(1, 2).angle).toBe(-30);
    expect(ringPose(3, 2).angle).toBe(30);
  });

  it("keeps the corner peeks at ±60° visible, faint and small", () => {
    for (const i of [0, 4]) {
      const pose = ringPose(i, 2);
      expect(Math.abs(pose.angle)).toBe(60);
      expect(pose).toMatchObject({ visible: true, scale: 0.7, opacity: 0.4 });
    }
  });

  it("hides a card past 75°, and not before", () => {
    expect(RING_HIDE_DEG).toBe(75);
    expect(ringPose(4.5, 2).visible).toBe(true); // 75° exactly, fully transparent
    expect(ringPose(4.5, 2).opacity).toBe(0);
    expect(ringPose(4.6, 2).visible).toBe(false);
    expect(ringPose(6, 2)).toMatchObject({ visible: false, opacity: 0, blur: 0, animating: false });
  });

  it("only blurs cards within two places of the focus slot (the blur budget)", () => {
    expect(ringPose(4, 2).blur).toBe(3);
    expect(ringPose(4.1, 2).blur).toBe(0);
  });

  it("only marks nearby cards as animating, so will-change stays on a few", () => {
    const animating = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => ringPose(i, 3).animating);
    expect(animating).toEqual([1, 2, 3, 4, 5]);
  });

  it("is symmetrical about the focus slot", () => {
    for (const delta of [0.2, 0.7, 1, 1.4, 2]) {
      const left = ringPose(2 - delta, 2);
      const right = ringPose(2 + delta, 2);
      expect([left.scale, left.opacity, left.blur, left.grayscale]).toEqual([
        right.scale,
        right.opacity,
        right.blur,
        right.grayscale,
      ]);
      expect(left.angle).toBe(-right.angle);
    }
  });

  it("changes smoothly and never grows with distance", () => {
    let previous = ringPose(0, 0);
    for (let d = 0.05; d <= 3; d += 0.05) {
      const pose = ringPose(d, 0);
      expect(pose.scale).toBeLessThanOrEqual(previous.scale);
      expect(pose.opacity).toBeLessThanOrEqual(previous.opacity);
      expect(previous.scale - pose.scale).toBeLessThan(0.05);
      expect(previous.opacity - pose.opacity).toBeLessThan(0.12);
      previous = pose;
    }
  });

  it("makes the nearest card active at half-way", () => {
    expect(ringPose(1, 0.6).active).toBe(true);
    expect(ringPose(0, 0.6).active).toBe(false);
    expect(ringPose(0, 0.4).active).toBe(true);
  });
});

describe("ringTransform places the card on the arc, tangent to it", () => {
  // CSS applies `rotate(a) translateY(-r) scale(s)` right to left on the card's centre: out by r, then round by a.
  const centre = (angleDeg: number, radius: number) => {
    const a = (angleDeg * Math.PI) / 180;
    return { x: radius * Math.sin(a), y: -radius * Math.cos(a) };
  };

  it("writes the transform as one string", () => {
    expect(ringTransform({ angle: 30, scale: 0.78 }, 520)).toBe(
      "rotate(30deg) translateY(-520px) scale(0.78)",
    );
    expect(ringTransform({ angle: 0, scale: 1 }, 400)).toBe(
      "rotate(0deg) translateY(-400px) scale(1)",
    );
  });

  it("puts the focus card at the top of the arc and the neighbours to either side and a little lower", () => {
    const radius = 520;
    const focus = centre(0, radius);
    const right = centre(ringPose(3, 2).angle, radius);
    const left = centre(ringPose(1, 2).angle, radius);
    near(focus.x, 0);
    near(right.x, 260); // 520 × sin 30°
    near(left.x, -260);
    near(right.y - focus.y, 69.7, 1); // 520 × (1 − cos 30°): lower than the focus card
    expect(right.y).toBeGreaterThan(focus.y);
  });

  it("puts the ±60° corner cards low and wide: the 'peek in from the bottom corners'", () => {
    const radius = 520;
    const corner = centre(60, radius);
    near(corner.x, 450.3, 1);
    near(corner.y - centre(0, radius).y, 260, 1); // half the radius lower
  });

  it("keeps every visible card on the same circle", () => {
    for (const i of [0, 1, 2, 3, 4]) {
      const c = centre(ringPose(i, 2).angle, 520);
      near(Math.hypot(c.x, c.y), 520, 6);
    }
  });
});

describe("ringRadius", () => {
  it("is 520 px at 1280 px and scales with the viewport", () => {
    expect(ringRadius(1280)).toBe(520);
    expect(ringRadius(1024)).toBe(416);
    expect(ringRadius(1536)).toBe(624);
  });

  it("stays between 380 and 760 px", () => {
    expect(ringRadius(320)).toBe(380);
    expect(ringRadius(1920)).toBe(760);
    expect(ringRadius(4000)).toBe(760);
  });
});

describe("deckPose", () => {
  it("is upright, full size and bright when active", () => {
    expect(deckPose(1, 1, 5)).toMatchObject({
      translateY: 0,
      scale: 1,
      rotate: 0,
      opacity: 1,
      brightness: 1,
      active: true,
      visible: true,
    });
  });

  it("waits beneath at 8% down, 0.92 scale, 1.5° tilt and dimmed, one card ahead", () => {
    expect(deckPose(2, 1, 5)).toMatchObject({
      translateY: 8,
      scale: 0.92,
      rotate: 1.5,
      opacity: 1,
      brightness: 0.6,
      active: false,
    });
  });

  it("flies away to −58%, scale 1.02 and −4° as the next card takes over, fading after 0.55", () => {
    expect(deckPose(0, 0.55, 5).opacity).toBe(1);
    near(deckPose(0, 0.775, 5).opacity, 0.5);
    expect(deckPose(0, 1, 5)).toMatchObject({
      translateY: -58,
      scale: 1.02,
      rotate: -4,
      opacity: 0,
      visible: false,
    });
  });

  it("moves smoothly between the anchor values", () => {
    const half = deckPose(1, 1.5, 5);
    near(half.translateY, -29);
    near(half.rotate, -2);
    near(half.scale, 1.01, 3);
    const behind = deckPose(2, 1.5, 5);
    near(behind.translateY, 4);
    near(behind.brightness, 0.8);
  });

  it("never tilts more than 4°, whatever the progress", () => {
    for (let ps = -1; ps <= 8; ps += 0.1) {
      for (let i = 0; i < 6; i++)
        expect(Math.abs(deckPose(i, ps, 6).rotate)).toBeLessThanOrEqual(4);
    }
  });

  it("never blurs or greys: brightness and opacity only", () => {
    for (let ps = 0; ps <= 5; ps += 0.25) {
      for (let i = 0; i < 6; i++) {
        const pose = deckPose(i, ps, 6);
        expect(pose.blur).toBe(0);
        expect(pose.grayscale).toBe(0);
      }
    }
  });

  it("stacks earlier cards above later ones", () => {
    expect([0, 1, 2, 3].map((i) => deckPose(i, 0, 4).zIndex)).toEqual([4, 3, 2, 1]);
  });

  it("hides cards that are gone, and cards more than two places underneath", () => {
    expect(deckPose(0, 1, 6).visible).toBe(false);
    expect(deckPose(2, 0, 6).visible).toBe(true);
    expect(deckPose(3, 0, 6).visible).toBe(false);
    expect(deckPose(2, 0, 6).visible).toBe(true);
  });

  it("writes the transform as one string", () => {
    expect(deckTransform({ translateY: 8, rotate: 1.5, scale: 0.92 })).toBe(
      "translateY(8%) rotate(1.5deg) scale(0.92)",
    );
  });
});

describe("progressFromScroll", () => {
  it("is 0 while the track has not reached the pin, and counts cards as it scrolls past", () => {
    expect(progressFromScroll(300, 560, 6)).toBe(0);
    expect(progressFromScroll(0, 560, 6)).toBe(0);
    expect(progressFromScroll(-280, 560, 6)).toBe(0.5);
    expect(progressFromScroll(-560, 560, 6)).toBe(1);
    expect(progressFromScroll(-1400, 560, 6)).toBe(2.5);
  });

  it("stops at the last card", () => {
    expect(progressFromScroll(-99999, 560, 6)).toBe(5);
  });

  it("is 0 for a single card or a zero segment, and never negative zero", () => {
    expect(progressFromScroll(-500, 560, 1)).toBe(0);
    expect(progressFromScroll(-500, 0, 6)).toBe(0);
    expect(Object.is(progressFromScroll(0, 560, 6), 0)).toBe(true);
  });
});

describe("smoothStep", () => {
  it("does not move when no time has passed", () => {
    expect(smoothStep(1, 5, 0)).toBe(1);
  });

  it("covers 1 − 1/e of the gap in one time constant", () => {
    near(smoothStep(0, 1, 300, 300), 1 - 1 / Math.E, 6);
  });

  it("is frame-rate independent: two 8 ms steps equal one 16 ms step", () => {
    const twice = smoothStep(smoothStep(0, 10, 8), 10, 8);
    near(twice, smoothStep(0, 10, 16), 9);
  });

  it("approaches the target from either side without overshooting", () => {
    let up = 0;
    let down = 10;
    for (let k = 0; k < 200; k++) {
      up = smoothStep(up, 5, 16);
      down = smoothStep(down, 5, 16);
      expect(up).toBeLessThanOrEqual(5);
      expect(down).toBeGreaterThanOrEqual(5);
    }
    near(up, 5, 3);
    near(down, 5, 3);
  });
});

describe("settling and active card", () => {
  it("settles on the nearest card, within range", () => {
    expect(settleTarget(1.4, 6)).toBe(1);
    expect(settleTarget(1.6, 6)).toBe(2);
    expect(settleTarget(-0.4, 6)).toBe(0);
    expect(settleTarget(9, 6)).toBe(5);
    expect(settleTarget(0.3, 0)).toBe(0);
  });

  it("names the active card the same way", () => {
    expect([0.49, 0.5, 2.51, 99, -3].map((p) => activeIndex(p, 4))).toEqual([0, 1, 3, 3, 0]);
  });
});

describe("segmentFill", () => {
  it("fills the active card's line across the segment around it", () => {
    expect([1, 1.5, 2, 2.25, 2.5, 3].map((ps) => segmentFill(2, ps))).toEqual([
      0, 0, 0.5, 0.75, 1, 1,
    ]);
  });
});

describe("scroll targets and track size", () => {
  it("scrolls so that progress equals the card index exactly", () => {
    const trackTop = 1000;
    const pin = 64;
    const segment = 700;
    for (const i of [0, 1, 3]) {
      const scrollY = scrollTopForIndex(trackTop, pin, segment, i);
      const top = trackTop - scrollY - pin; // the track's top relative to the pin, at that scroll position
      expect(progressFromScroll(top, segment, 6)).toBe(i);
    }
    expect(scrollTopForIndex(1000, 64, 700, 3)).toBe(3036);
  });

  it("takes 70% of the viewport per card on the ring and 45% on the deck", () => {
    expect(segmentPx("ring", 800)).toBe(560);
    expect(segmentPx("deck", 800)).toBe(360);
  });

  it("gives the CSS track heights from SPEC §5.1 and TRD §8.2", () => {
    expect(trackHeightCss("ring", 6)).toBe("calc(6 * 70svh + 100svh)");
    expect(trackHeightCss("deck", 6)).toBe("calc(6 * 45svh + 30svh)");
  });
});

describe("filterCss", () => {
  it("writes only what applies", () => {
    expect(filterCss({ blur: 0 })).toBe("none");
    expect(filterCss({ blur: 3 })).toBe("blur(3px)");
    expect(filterCss({ blur: 0, brightness: 0.6 })).toBe("brightness(0.6)");
    expect(filterCss({ blur: 0, brightness: 1 })).toBe("none");
    expect(filterCss({ blur: 3, brightness: 0.8 })).toBe("blur(3px) brightness(0.8)");
  });
});
