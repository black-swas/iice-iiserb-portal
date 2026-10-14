/**
 * Build-time image pipeline (TRD §6): AVIF and WebP at fixed widths (never upscaled), SVG optimised and passed
 * through, a manifest of intrinsic sizes and dominant colours, content-hashed output names, and budget checks.
 * Directories are options so tests can run it on a temp folder.
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { optimize } from "svgo";
import {
  IMG_PUBLIC_PREFIX,
  type ImageEntry,
  type Manifest,
  type Variant,
} from "../../src/lib/images";

export const WIDTHS = [320, 640, 960, 1280, 1920] as const;
const MAX_WIDTH = WIDTHS[WIDTHS.length - 1] as number;
export const QUALITY = { avif: 50, webp: 72 } as const;
/** Bump to invalidate every cached output after changing how images are produced. */
const PIPELINE_VERSION = 1;

const RASTER = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".tif", ".tiff"]);
const SVG_BUDGET_BYTES = 15 * 1024;

export interface ImageOptions {
  /** content/media */
  mediaDir: string;
  /** public/_img */
  outDir: string;
  manifestPath: string;
  /** Content-relative sources with the hard size cap (the hero poster). */
  priority?: ReadonlySet<string>;
  warnBytes?: number;
  failBytes?: number;
}

export interface ImageReport {
  processed: string[];
  cached: string[];
  pruned: string[];
  warnings: string[];
  errors: string[];
  manifest: Manifest;
}

/** Fixed widths below the source width, plus the source width itself (capped at 1920), so nothing is upscaled. */
export function variantWidths(sourceWidth: number): number[] {
  const top = Math.min(sourceWidth, MAX_WIDTH);
  return [...new Set([...WIDTHS.filter((w) => w < top), top])].sort((a, b) => a - b);
}

const toHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`;

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const exists = (file: string) =>
  fs.access(file).then(
    () => true,
    () => false,
  );

function outputBase(rel: string): string {
  return rel
    .replace(/^media\//, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[\\/]+/g, "-")
    .toLowerCase();
}

function sourceHash(bytes: Buffer): string {
  return crypto
    .createHash("sha256")
    .update(bytes)
    .update(JSON.stringify({ PIPELINE_VERSION, WIDTHS, QUALITY }))
    .digest("hex")
    .slice(0, 10);
}

async function readManifest(file: string): Promise<Manifest> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as Manifest;
  } catch {
    return {};
  }
}

const publicPath = (name: string) => `${IMG_PUBLIC_PREFIX}/${name}`;
const fileOf = (outDir: string, url: string) => path.join(outDir, path.basename(url));

async function entryFilesExist(outDir: string, entry: ImageEntry): Promise<boolean> {
  const urls = entry.svg
    ? [entry.svg]
    : [...entry.variants.avif, ...entry.variants.webp].map((v) => v.path);
  return (await Promise.all(urls.map((u) => exists(fileOf(outDir, u))))).every(Boolean);
}

async function processRaster(
  abs: string,
  rel: string,
  hash: string,
  outDir: string,
): Promise<ImageEntry> {
  const meta = await sharp(abs).metadata();
  if (!meta.width || !meta.height) throw new Error("cannot read the image size");
  // EXIF orientations 5 to 8 turn the picture on its side.
  const sideways = (meta.orientation ?? 1) >= 5;
  const width = sideways ? meta.height : meta.width;
  const height = sideways ? meta.width : meta.height;
  const { dominant } = await sharp(abs).stats();

  const base = outputBase(rel);
  const variants = { avif: [] as Variant[], webp: [] as Variant[] };
  for (const w of variantWidths(width)) {
    for (const format of ["avif", "webp"] as const) {
      const name = `${base}.${hash}-${w}w.${format}`;
      const target = path.join(outDir, name);
      if (!(await exists(target))) {
        const pipeline = sharp(abs).rotate().resize({ width: w, withoutEnlargement: true });
        await (
          format === "avif"
            ? pipeline.avif({ quality: QUALITY.avif })
            : pipeline.webp({ quality: QUALITY.webp })
        ).toFile(target);
      }
      variants[format].push({ w, path: publicPath(name) });
    }
  }
  return { hash, width, height, dominant: toHex(dominant), variants };
}

const DANGEROUS_SVG = /<script|<foreignObject|\son[a-z]+\s*=|javascript:|data:text\/html/i;

function svgSize(svg: string): { width: number; height: number } {
  const viewBox =
    /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i.exec(svg);
  if (viewBox) return { width: Number(viewBox[1]), height: Number(viewBox[2]) };
  const w = /<svg[^>]*\swidth\s*=\s*["']([\d.]+)(?:px)?["']/i.exec(svg);
  const h = /<svg[^>]*\sheight\s*=\s*["']([\d.]+)(?:px)?["']/i.exec(svg);
  if (w && h) return { width: Number(w[1]), height: Number(h[1]) };
  throw new Error("an SVG needs a viewBox, or both width and height");
}

async function processSvg(
  abs: string,
  rel: string,
  hash: string,
  outDir: string,
  warnings: string[],
): Promise<ImageEntry> {
  const source = await fs.readFile(abs, "utf8");
  if (DANGEROUS_SVG.test(source))
    throw new Error("the SVG contains a script, event handler or foreignObject");
  const { data } = optimize(source, {
    multipass: true,
    plugins: ["preset-default"], // SVGO 4 keeps the viewBox, which the size and scaling depend on
  });
  const { width, height } = svgSize(data);
  const name = `${outputBase(rel)}.${hash}.svg`;
  await fs.writeFile(path.join(outDir, name), data, "utf8");
  const bytes = Buffer.byteLength(data);
  if (bytes > SVG_BUDGET_BYTES) {
    warnings.push(
      `${rel}: ${(bytes / 1024).toFixed(1)} KB after optimising, over the 15 KB SVG budget`,
    );
  }
  return {
    hash,
    width,
    height,
    dominant: "transparent",
    variants: { avif: [], webp: [] },
    svg: publicPath(name),
  };
}

/** Processes every image under `mediaDir`. Unchanged sources are reused; outputs nobody references are removed. */
export async function processImages(options: ImageOptions): Promise<ImageReport> {
  const {
    mediaDir,
    outDir,
    manifestPath,
    priority = new Set<string>(),
    warnBytes = 300_000,
    failBytes = 500_000,
  } = options;
  const report: ImageReport = {
    processed: [],
    cached: [],
    pruned: [],
    warnings: [],
    errors: [],
    manifest: {},
  };
  await fs.mkdir(outDir, { recursive: true });
  const previous = await readManifest(manifestPath);

  for (const abs of await walk(mediaDir)) {
    const rel = `media/${path.relative(mediaDir, abs).split(path.sep).join("/")}`;
    const ext = path.extname(abs).toLowerCase();

    if (ext === ".gif") {
      report.errors.push(`${rel}: GIFs are not allowed. Use a video, or an animated WebP or AVIF.`);
      continue;
    }
    if (/\s/.test(path.basename(abs))) {
      report.errors.push(`${rel}: asset file names must not contain spaces.`);
      continue;
    }
    if (ext !== ".svg" && !RASTER.has(ext)) {
      report.warnings.push(`${rel}: not an image format the pipeline handles, skipped.`);
      continue;
    }

    try {
      const hash = sourceHash(await fs.readFile(abs));
      const old = previous[rel];
      let entry: ImageEntry;
      if (old && old.hash === hash && (await entryFilesExist(outDir, old))) {
        entry = old;
        report.cached.push(rel);
      } else {
        entry =
          ext === ".svg"
            ? await processSvg(abs, rel, hash, outDir, report.warnings)
            : await processRaster(abs, rel, hash, outDir);
        report.processed.push(rel);
      }
      report.manifest[rel] = entry;
    } catch (error) {
      report.errors.push(`${rel}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Budgets (TRD §12): warn above 300 KB; the hero poster fails above 500 KB at its 1280 px size.
  for (const [rel, entry] of Object.entries(report.manifest)) {
    for (const v of [...entry.variants.avif, ...entry.variants.webp]) {
      const size = (await fs.stat(fileOf(outDir, v.path))).size;
      if (size > warnBytes)
        report.warnings.push(
          `${rel}: ${path.basename(v.path)} is ${(size / 1024).toFixed(0)} KB (over ${(warnBytes / 1024).toFixed(0)} KB)`,
        );
      if (priority.has(rel) && v.w <= 1280 && size > failBytes) {
        report.errors.push(
          `${rel}: hero image ${path.basename(v.path)} is ${(size / 1024).toFixed(0)} KB, over the ${(failBytes / 1024).toFixed(0)} KB hard cap`,
        );
      }
    }
  }

  // Remove outputs that no manifest entry points at (renamed or deleted sources, older hashes).
  const keep = new Set(
    Object.values(report.manifest)
      .flatMap((e) =>
        e.svg ? [e.svg] : [...e.variants.avif, ...e.variants.webp].map((v) => v.path),
      )
      .map((u) => path.basename(u)),
  );
  for (const file of await fs.readdir(outDir)) {
    if (!keep.has(file) && !file.startsWith(".")) {
      await fs.rm(path.join(outDir, file), { force: true });
      report.pruned.push(file);
    }
  }

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  const sorted = Object.fromEntries(
    Object.entries(report.manifest).sort(([a], [b]) => (a < b ? -1 : 1)),
  );
  await fs.writeFile(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  return report;
}
