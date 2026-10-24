#!/usr/bin/env python3
"""Generate the IICE sprout mark: maroon glass tile + growth sprout.
Outputs: assets/media/logo_iice.webp (512), assets/favicon.png (256),
preview scratch_logo_new.png. Pure PIL; supersampled for clean edges."""
from PIL import Image, ImageDraw
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
S = 4            # supersample factor
V = 512          # viewBox units
C = V * S        # canvas px

MAROON_A = (138, 64, 61)     # 8a403d
MAROON_B = (108, 50, 49)     # 6c3231
MAROON_C = (71, 32, 25)      # 472019
AMBER_A = (255, 194, 71)     # ffc247
AMBER_B = (255, 138, 64)     # ff8a40
CREAM_A = (255, 246, 236)    # fff6ec
CREAM_B = (255, 217, 189)    # ffd9bd
STEM = (255, 233, 216)       # ffe9d8


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def diag_gradient(size, c0, c1, c2):
    """135-degree three-stop gradient as RGBA image."""
    g = Image.new("RGB", (size, size))
    px = g.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            c = lerp(c0, c1, t / 0.55) if t < 0.55 else lerp(c1, c2, (t - 0.55) / 0.45)
            px[x, y] = c
    return g


def bezier(p0, p1, p2, p3, n=48):
    return [(
        (1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * p1[0] + 3 * (1 - t) * t ** 2 * p2[0] + t ** 3 * p3[0],
        (1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * p1[1] + 3 * (1 - t) * t ** 2 * p2[1] + t ** 3 * p3[1],
    ) for t in (i / (n - 1) for i in range(n))]


def taper_strip(pts, w0, w1):
    """Closed polygon along pts, width w0 at start tapering to w1 at end."""
    import math
    left, right = [], []
    n = len(pts)
    for i, (x, y) in enumerate(pts):
        if i == 0:
            dx, dy = pts[1][0] - x, pts[1][1] - y
        elif i == n - 1:
            dx, dy = x - pts[i - 1][0], y - pts[i - 1][1]
        else:
            dx, dy = pts[i + 1][0] - pts[i - 1][0], pts[i + 1][1] - pts[i - 1][1]
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        w = (w0 + (w1 - w0) * i / (n - 1)) / 2
        left.append((x + nx * w, y + ny * w))
        right.append((x - nx * w, y - ny * w))
    return left + right[::-1]


def s(v):
    return v * S


def build():
    img = Image.new("RGBA", (C, C), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # tile gradient clipped to rounded rect
    grad = diag_gradient(C, MAROON_A, MAROON_B, MAROON_C).convert("RGBA")
    mask = Image.new("L", (C, C), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([s(20), s(20), s(492), s(492)], radius=s(108), fill=255)
    img.paste(grad, (0, 0), mask)

    # glass top highlight (whisper-subtle)
    hl = Image.new("RGBA", (C, C), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl)
    hd.rounded_rectangle([s(36), s(34), s(476), s(262)], radius=s(104), fill=(255, 255, 255, 11))
    img = Image.alpha_composite(img, hl)

    d = ImageDraw.Draw(img)
    # hairline border
    d.rounded_rectangle([s(20), s(20), s(492), s(492)], radius=s(108),
                        outline=(255, 255, 255, 60), width=s(5))

    # stem — tapered polygon (base wider, rounds into the leaves)
    stem = bezier((256, 402), (252, 348), (254, 302), (257, 252))
    strip = taper_strip(stem, 30, 17)
    d.polygon([(s(x), s(y)) for x, y in strip], fill=STEM + (255,))
    d.ellipse([s(256 - 15), s(402 - 15), s(256 + 15), s(402 + 15)], fill=STEM + (255,))

    # left leaf (amber gradient)
    la = bezier((254, 252), (206, 244), (162, 210), (146, 152))
    lb = bezier((146, 152), (212, 160), (250, 198), (256, 250))
    poly = [(s(x), s(y)) for x, y in la + lb]
    leaf_mask = Image.new("L", (C, C), 0)
    ImageDraw.Draw(leaf_mask).polygon(poly, fill=255)
    leaf_grad = diag_gradient(C, AMBER_A, AMBER_B, AMBER_B).convert("RGBA")
    img.paste(leaf_grad, (0, 0), leaf_mask)

    # right leaf (cream gradient)
    ra = bezier((262, 244), (296, 218), (316, 180), (318, 126))
    rb = bezier((318, 126), (268, 142), (246, 188), (254, 246))
    poly = [(s(x), s(y)) for x, y in ra + rb]
    rm = Image.new("L", (C, C), 0)
    ImageDraw.Draw(rm).polygon(poly, fill=255)
    rg = diag_gradient(C, CREAM_A, CREAM_B, CREAM_B).convert("RGBA")
    img.paste(rg, (0, 0), rm)

    # spark dots
    d.ellipse([s(354 - 15), s(116 - 15), s(354 + 15), s(116 + 15)], fill=AMBER_B + (242,))
    d.ellipse([s(392 - 8), s(168 - 8), s(392 + 8), s(168 + 8)], fill=AMBER_A + (204,))

    return img.resize((V, V), Image.LANCZOS)


out = build()
out.save(os.path.join(ROOT, "scratch_logo_new.png"))
out.save(os.path.join(ROOT, "assets", "media", "logo_iice.webp"), "WEBP", quality=92)
out.resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, "assets", "favicon.png"), "PNG")
print("written: scratch_logo_new.png, assets/media/logo_iice.webp, assets/favicon.png")
