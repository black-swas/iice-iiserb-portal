import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PictureView } from "@/components/ui/PictureView";
import { buildSrcSet, pictureData, resolvePicture, type ImageEntry } from "@/lib/images";
import { WIDTHS, processImages, variantWidths, type ImageOptions } from "../../scripts/lib/images";

// libvips keeps files open between calls, which makes Windows refuse to delete the temp folder.
sharp.cache(false);

let dir: string;
let options: ImageOptions;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "iice-images-"));
  fs.mkdirSync(path.join(dir, "media"), { recursive: true });
  options = {
    mediaDir: path.join(dir, "media"),
    outDir: path.join(dir, "out"),
    manifestPath: path.join(dir, "cache", "manifest.json"),
  };
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));

const media = (name: string) => path.join(dir, "media", name);
const png = (
  name: string,
  width: number,
  height: number,
  background = { r: 200, g: 40, b: 40 },
) => {
  fs.mkdirSync(path.dirname(media(name)), { recursive: true });
  return sharp({ create: { width, height, channels: 3, background } })
    .png()
    .toFile(media(name));
};
const outFiles = () => fs.readdirSync(options.outDir).sort();

describe("variantWidths", () => {
  it("uses the fixed widths below the source, plus the source width, and never upscales", () => {
    expect(variantWidths(3000)).toEqual([320, 640, 960, 1280, 1920]);
    expect(variantWidths(1000)).toEqual([320, 640, 960, 1000]);
    expect(variantWidths(1280)).toEqual([320, 640, 960, 1280]);
    expect(variantWidths(200)).toEqual([200]);
    expect(variantWidths(320)).toEqual([320]);
    expect(variantWidths(5000).every((w) => w <= 1920)).toBe(true);
  });

  it("uses the widths TRD §6 names", () => {
    expect([...WIDTHS]).toEqual([320, 640, 960, 1280, 1920]);
  });
});

describe("processImages: raster", () => {
  it("writes AVIF and WebP at each width, with the manifest entry TRD §6 describes", async () => {
    await png("team/anjali.png", 1000, 600);
    const report = await processImages(options);
    expect(report.errors).toEqual([]);
    expect(report.processed).toEqual(["media/team/anjali.png"]);

    const entry = report.manifest["media/team/anjali.png"]!;
    expect(entry).toMatchObject({
      width: 1000,
      height: 600,
      dominant: expect.stringMatching(/^#[0-9a-f]{6}$/),
    });
    expect(entry.variants.avif.map((v) => v.w)).toEqual([320, 640, 960, 1000]);
    expect(entry.variants.webp.map((v) => v.w)).toEqual([320, 640, 960, 1000]);
    expect(entry.variants.webp[0]!.path).toMatch(/^\/_img\/team-anjali\.[0-9a-f]{10}-320w\.webp$/);
    expect(outFiles()).toHaveLength(8);
  });

  it("produces real images of the stated widths, in the stated formats", async () => {
    await png("a.png", 1000, 600);
    const { manifest } = await processImages(options);
    for (const format of ["avif", "webp"] as const) {
      for (const v of manifest["media/a.png"]!.variants[format]) {
        const meta = await sharp(path.join(options.outDir, path.basename(v.path))).metadata();
        expect(meta.width).toBe(v.w);
        expect(meta.format).toBe(format === "avif" ? "heif" : "webp");
      }
    }
  });

  it("never upscales a small source", async () => {
    await png("small.png", 200, 100);
    const { manifest } = await processImages(options);
    const widths = manifest["media/small.png"]!.variants.webp.map((v) => v.w);
    expect(widths).toEqual([200]);
  });

  it("reports the dominant colour of the picture", async () => {
    await png("red.png", 400, 300, { r: 255, g: 0, b: 0 });
    const { manifest } = await processImages(options);
    const hex = manifest["media/red.png"]!.dominant;
    expect(parseInt(hex.slice(1, 3), 16)).toBeGreaterThan(200);
    expect(parseInt(hex.slice(3, 5), 16)).toBeLessThan(60);
  });

  it("reads the size after EXIF rotation", async () => {
    await sharp({ create: { width: 800, height: 400, channels: 3, background: "#336699" } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toFile(media("rotated.jpg"));
    const { manifest } = await processImages(options);
    expect(manifest["media/rotated.jpg"]).toMatchObject({ width: 400, height: 800 });
  });

  it("reuses unchanged sources on the next run, without rewriting files", async () => {
    await png("a.png", 700, 400);
    await processImages(options);
    const before = outFiles().map((f) => fs.statSync(path.join(options.outDir, f)).mtimeMs);
    const second = await processImages(options);
    expect(second.cached).toEqual(["media/a.png"]);
    expect(second.processed).toEqual([]);
    expect(outFiles().map((f) => fs.statSync(path.join(options.outDir, f)).mtimeMs)).toEqual(
      before,
    );
  });

  it("re-processes a changed source under a new hash, and removes the old outputs", async () => {
    await png("a.png", 700, 400);
    const first = (await processImages(options)).manifest["media/a.png"]!;
    await png("a.png", 700, 400, { r: 10, g: 200, b: 10 });
    const second = await processImages(options);
    expect(second.processed).toEqual(["media/a.png"]);
    expect(second.manifest["media/a.png"]!.hash).not.toBe(first.hash);
    expect(second.pruned.length).toBe(first.variants.avif.length + first.variants.webp.length);
    expect(outFiles().every((f) => f.includes(second.manifest["media/a.png"]!.hash))).toBe(true);
  });

  it("repairs a cached entry whose output file has gone missing", async () => {
    await png("a.png", 700, 400);
    const { manifest } = await processImages(options);
    fs.rmSync(
      path.join(options.outDir, path.basename(manifest["media/a.png"]!.variants.avif[0]!.path)),
    );
    const again = await processImages(options);
    expect(again.processed).toEqual(["media/a.png"]);
    expect(outFiles()).toHaveLength(6); // a 700 px source: widths 320, 640 and 700, in two formats
  });

  it("removes outputs of a source that was deleted", async () => {
    await png("a.png", 700, 400);
    await png("b.png", 700, 400);
    await processImages(options);
    fs.rmSync(media("b.png"));
    const report = await processImages(options);
    expect(Object.keys(report.manifest)).toEqual(["media/a.png"]);
    expect(report.pruned.length).toBeGreaterThan(0);
    expect(outFiles().every((f) => f.startsWith("a."))).toBe(true);
  });

  it("writes the manifest sorted, as JSON, where the options say", async () => {
    await png("b.png", 400, 300);
    await png("a.png", 400, 300);
    await processImages(options);
    const manifest = JSON.parse(fs.readFileSync(options.manifestPath, "utf8")) as Record<
      string,
      unknown
    >;
    expect(Object.keys(manifest)).toEqual(["media/a.png", "media/b.png"]);
  });
});

describe("processImages: refusals", () => {
  it("rejects GIFs, with a pointer to what to use instead", async () => {
    fs.writeFileSync(media("loop.gif"), "GIF89a");
    const report = await processImages(options);
    expect(report.errors).toEqual([
      "media/loop.gif: GIFs are not allowed. Use a video, or an animated WebP or AVIF.",
    ]);
    expect(report.manifest).toEqual({});
  });

  it("rejects a file name with spaces", async () => {
    await png("my photo.png", 400, 300);
    const report = await processImages(options);
    expect(report.errors[0]).toContain("must not contain spaces");
  });

  it("reports an unreadable image and carries on with the rest", async () => {
    fs.writeFileSync(media("broken.jpg"), "not an image at all");
    await png("good.png", 400, 300);
    const report = await processImages(options);
    expect(report.errors.some((e) => e.startsWith("media/broken.jpg:"))).toBe(true);
    expect(Object.keys(report.manifest)).toEqual(["media/good.png"]);
  });

  it("skips other files with a warning, and ignores dotfiles", async () => {
    fs.writeFileSync(media("notes.txt"), "x");
    fs.writeFileSync(media(".gitkeep"), "");
    const report = await processImages(options);
    expect(report.warnings).toEqual([
      "media/notes.txt: not an image format the pipeline handles, skipped.",
    ]);
    expect(report.errors).toEqual([]);
  });

  it("copes with a missing or empty media folder", async () => {
    fs.rmSync(options.mediaDir, { recursive: true });
    const report = await processImages(options);
    expect(report.manifest).toEqual({});
    expect(report.errors).toEqual([]);
  });
});

describe("processImages: SVG", () => {
  const svg = (body: string, attrs = 'viewBox="0 0 120 40"') =>
    `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}><!-- a comment --><rect width="120" height="40" fill="#0b4f63"/>${body}</svg>`;

  it("writes the optimised SVG and reads its size from the viewBox", async () => {
    fs.mkdirSync(media("logos"), { recursive: true });
    fs.writeFileSync(media("logos/iice.svg"), svg(""));
    const report = await processImages(options);
    expect(report.errors).toEqual([]);
    const entry = report.manifest["media/logos/iice.svg"]!;
    expect(entry).toMatchObject({
      width: 120,
      height: 40,
      dominant: "transparent",
      variants: { avif: [], webp: [] },
    });
    const written = fs.readFileSync(path.join(options.outDir, path.basename(entry.svg!)), "utf8");
    expect(written).toContain("viewBox");
    expect(written).not.toContain("a comment");
  });

  it("falls back to width and height when there is no viewBox", async () => {
    fs.writeFileSync(media("a.svg"), svg("", 'width="64" height="32"'));
    expect((await processImages(options)).manifest["media/a.svg"]).toMatchObject({
      width: 64,
      height: 32,
    });
  });

  it("refuses an SVG with no size", async () => {
    fs.writeFileSync(media("a.svg"), svg("", ""));
    expect((await processImages(options)).errors[0]).toContain("needs a viewBox");
  });

  it.each([
    ["a script", "<script>alert(1)</script>"],
    ["an event handler", '<circle r="1" onload="alert(1)"/>'],
    ["a foreignObject", "<foreignObject><div/></foreignObject>"],
    ["a javascript: link", '<a href="javascript:alert(1)"><circle r="1"/></a>'],
  ])("refuses an SVG containing %s", async (_name, body) => {
    fs.writeFileSync(media("bad.svg"), svg(body));
    const report = await processImages(options);
    expect(report.errors[0]).toContain("contains a script");
    expect(report.manifest).toEqual({});
  });

  it("warns when an optimised SVG is over the 15 KB budget", async () => {
    const heavy = Array.from(
      { length: 2500 },
      (_, i) =>
        `<path d="M${i} 0 L${i + 7} ${(i * 13) % 97} L${i + 3} 40 Z" fill="#${(i * 7919).toString(16).padStart(6, "0").slice(0, 6)}"/>`,
    ).join("");
    fs.writeFileSync(media("heavy.svg"), svg(heavy));
    const report = await processImages(options);
    expect(report.warnings.some((w) => w.includes("over the 15 KB SVG budget"))).toBe(true);
  });
});

describe("budgets", () => {
  // Noise does not compress, so a modest picture is a big file.
  const noise = async (name: string, size: number) => {
    const raw = Buffer.alloc(size * size * 3);
    for (let i = 0; i < raw.length; i++) raw[i] = (i * 2654435761) >>> 24;
    await sharp(raw, { raw: { width: size, height: size, channels: 3 } })
      .png()
      .toFile(media(name));
  };

  it("warns about any variant over the warning size", async () => {
    await noise("big.png", 700);
    const report = await processImages({ ...options, warnBytes: 20_000 });
    expect(report.warnings.some((w) => w.startsWith("media/big.png:") && w.includes("KB"))).toBe(
      true,
    );
    expect(report.errors).toEqual([]);
  });

  it("fails a hero image over the hard cap at 1280 px or below, but not an ordinary one", async () => {
    await noise("hero.png", 700);
    await noise("other.png", 700);
    const report = await processImages({
      ...options,
      warnBytes: 10,
      failBytes: 20_000,
      priority: new Set(["media/hero.png"]),
    });
    expect(
      report.errors.some((e) => e.startsWith("media/hero.png:") && e.includes("hard cap")),
    ).toBe(true);
    expect(report.errors.some((e) => e.startsWith("media/other.png"))).toBe(false);
  });
});

describe("manifest to picture data", () => {
  const entry: ImageEntry = {
    hash: "abc",
    width: 1000,
    height: 600,
    dominant: "#aa0000",
    variants: {
      avif: [
        { w: 640, path: "/_img/a-640w.avif" },
        { w: 320, path: "/_img/a-320w.avif" },
        { w: 1000, path: "/_img/a-1000w.avif" },
      ],
      webp: [
        { w: 320, path: "/_img/a-320w.webp" },
        { w: 640, path: "/_img/a-640w.webp" },
        { w: 1000, path: "/_img/a-1000w.webp" },
      ],
    },
  };

  it("builds a srcset in width order", () => {
    expect(buildSrcSet(entry.variants.avif)).toBe(
      "/_img/a-320w.avif 320w, /_img/a-640w.avif 640w, /_img/a-1000w.avif 1000w",
    );
  });

  it("offers AVIF before WebP, and falls back to the largest WebP up to 960 px", () => {
    const data = pictureData(entry, { alt: "A described photo" });
    expect(data.sources.map((s) => s.type)).toEqual(["image/avif", "image/webp"]);
    expect(data.src).toBe("/_img/a-640w.webp");
    expect(data).toMatchObject({
      width: 1000,
      height: 600,
      svg: false,
      missing: false,
      decorative: false,
    });
  });

  it("falls back to the smallest WebP when every variant is bigger than 960", () => {
    const big: ImageEntry = {
      ...entry,
      variants: {
        avif: entry.variants.avif,
        webp: [
          { w: 1280, path: "/_img/b-1280w.webp" },
          { w: 1920, path: "/_img/b-1920w.webp" },
        ],
      },
    };
    expect(pictureData(big, { alt: "x" }).src).toBe("/_img/b-1280w.webp");
  });

  it("passes an SVG straight through", () => {
    const data = pictureData(
      { ...entry, svg: "/_img/logo.svg", variants: { avif: [], webp: [] } },
      { alt: "DST logo" },
    );
    expect(data).toMatchObject({ svg: true, sources: [], src: "/_img/logo.svg" });
  });

  it("fails loudly for a source the pipeline has not processed, except in development", () => {
    expect(() =>
      resolvePicture({ src: "media/nope.jpg", alt: "x" }, {}, { NODE_ENV: "production" }),
    ).toThrow(/npm run images/);
    expect(
      resolvePicture({ src: "media/nope.jpg", alt: "x" }, {}, { NODE_ENV: "development" }).missing,
    ).toBe(true);
    expect(
      resolvePicture({ src: "media/a.jpg", alt: "A photo" }, { "media/a.jpg": entry }).missing,
    ).toBe(false);
  });
});

describe("PictureView markup", () => {
  const entry: ImageEntry = {
    hash: "abc",
    width: 1000,
    height: 600,
    dominant: "#aa0000",
    variants: {
      avif: [{ w: 640, path: "/_img/a-640w.avif" }],
      webp: [{ w: 640, path: "/_img/a-640w.webp" }],
    },
  };
  const render = (
    props: Partial<Parameters<typeof PictureView>[0]> = {},
    data = pictureData(entry, { alt: "Founders at the IICE lab bench" }),
  ) => renderToStaticMarkup(createElement(PictureView, { data, ...props }));

  it("emits picture, both sources, and an img with explicit size, lazy loading and the dominant colour", () => {
    const html = render({ sizes: "(min-width: 1024px) 33vw, 100vw" });
    expect(html).toContain("<picture>");
    expect(html.indexOf('type="image/avif"')).toBeLessThan(html.indexOf('type="image/webp"'));
    expect(html).toContain('sizes="(min-width: 1024px) 33vw, 100vw"');
    expect(html).toContain('width="1000"');
    expect(html).toContain('height="600"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).toContain('alt="Founders at the IICE lab bench"');
    expect(html).toContain("aspect-ratio:1000 / 600");
    expect(html).toContain("background-color:#aa0000");
    expect(html).not.toContain("fetchPriority");
  });

  it("makes a priority image eager with high fetch priority", () => {
    const html = render({ priority: true });
    expect(html).toContain('fetchPriority="high"');
    expect(html).toContain('loading="eager"');
    expect(html).not.toContain('loading="lazy"');
  });

  it("gives a decorative image an empty alt and a presentation role", () => {
    const html = render({}, pictureData(entry, { alt: "ignored", decorative: true }));
    expect(html).toContain('alt=""');
    expect(html).toContain('role="presentation"');
    expect(html).not.toContain("ignored");
  });

  it("renders an SVG as a bare img", () => {
    const html = render(
      {},
      pictureData(
        {
          ...entry,
          svg: "/_img/logo.svg",
          variants: { avif: [], webp: [] },
          dominant: "transparent",
        },
        { alt: "DST logo" },
      ),
    );
    expect(html).not.toContain("<picture>");
    expect(html).toContain('src="/_img/logo.svg"');
  });

  it("shows a visible placeholder, not a broken image, when a source is missing in development", () => {
    const html = render(
      {},
      resolvePicture({ src: "media/nope.jpg", alt: "Team photo" }, {}, { NODE_ENV: "development" }),
    );
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Team photo"');
    expect(html).not.toContain("<img");
  });
});
