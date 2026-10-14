/**
 * The consumer side of the build-time image pipeline (TRD §6): the manifest scripts/images.ts writes, and the helpers
 * that turn one entry into `<picture>` data. Node-only for `loadManifest`; everything else is pure.
 */
import fs from "node:fs";
import path from "node:path";

export interface Variant {
  /** Width in pixels. */
  w: number;
  /** Public URL, e.g. "/_img/team-anjali.3fa9c2b1de-640w.avif". */
  path: string;
}

export interface ImageEntry {
  /** Hash of the source bytes and the pipeline settings; changes whenever the output would. */
  hash: string;
  /** Intrinsic size of the source after EXIF rotation. */
  width: number;
  height: number;
  /** Dominant colour as #rrggbb, shown behind the image while it loads. "transparent" for SVG. */
  dominant: string;
  variants: { avif: Variant[]; webp: Variant[] };
  /** Set for an SVG, which is optimised and passed through rather than resized. */
  svg?: string;
}

/** Keyed by the content-relative source path, e.g. "media/team/anjali.jpg". */
export type Manifest = Record<string, ImageEntry>;

export const IMG_PUBLIC_PREFIX = "/_img";
export const MANIFEST_FILE = path.join(".cache", "images", "manifest.json");

export function buildSrcSet(variants: readonly Variant[]): string {
  return [...variants]
    .sort((a, b) => a.w - b.w)
    .map((v) => `${v.path} ${v.w}w`)
    .join(", ");
}

export interface PictureData {
  alt: string;
  decorative: boolean;
  width: number;
  height: number;
  dominant: string;
  /** Best format first. Empty for an SVG. */
  sources: { type: string; srcSet: string }[];
  /** The fallback `<img src>`. */
  src: string;
  svg: boolean;
  /** Development only: the pipeline has not processed this source yet. */
  missing: boolean;
}

/** The fallback is the largest WebP up to 960 px: sharp enough for most screens, light for old browsers. */
function fallbackSrc(entry: ImageEntry): string {
  if (entry.svg) return entry.svg;
  const webp = [...entry.variants.webp].sort((a, b) => a.w - b.w);
  const pick = [...webp].reverse().find((v) => v.w <= 960) ?? webp[0];
  if (!pick) throw new Error("images: manifest entry has no WebP variant");
  return pick.path;
}

export function pictureData(
  entry: ImageEntry,
  image: { alt: string; decorative?: boolean },
): PictureData {
  return {
    alt: image.alt,
    decorative: image.decorative ?? false,
    width: entry.width,
    height: entry.height,
    dominant: entry.dominant,
    sources: entry.svg
      ? []
      : [
          { type: "image/avif", srcSet: buildSrcSet(entry.variants.avif) },
          { type: "image/webp", srcSet: buildSrcSet(entry.variants.webp) },
        ],
    src: fallbackSrc(entry),
    svg: entry.svg !== undefined,
    missing: false,
  };
}

let cached: { file: string; mtime: number; manifest: Manifest } | undefined;

/** Reads the manifest, re-reading when the file changes. An absent manifest is an empty one. */
export function loadManifest(root = process.cwd()): Manifest {
  const file = path.join(root, MANIFEST_FILE);
  if (!fs.existsSync(file)) return {};
  const mtime = fs.statSync(file).mtimeMs;
  if (cached?.file === file && cached.mtime === mtime) return cached.manifest;
  const manifest = JSON.parse(fs.readFileSync(file, "utf8")) as Manifest;
  cached = { file, mtime, manifest };
  return manifest;
}

/**
 * Picture data for a content image. A source the pipeline has not processed fails the production build, so a missing
 * or misspelt image can never ship as a broken `<img>`. In development it comes back flagged as missing instead.
 */
export function resolvePicture(
  image: { src: string; alt: string; decorative?: boolean },
  manifest: Manifest = loadManifest(),
  env: { NODE_ENV?: string | undefined } = { NODE_ENV: process.env.NODE_ENV },
): PictureData {
  const entry = manifest[image.src];
  if (entry) return pictureData(entry, image);
  if (env.NODE_ENV === "development") {
    return {
      alt: image.alt,
      decorative: image.decorative ?? false,
      width: 4,
      height: 3,
      dominant: "transparent",
      sources: [],
      src: "",
      svg: false,
      missing: true,
    };
  }
  throw new Error(
    `images: no processed image for "${image.src}". Run \`npm run images\` (is the file in content/media?).`,
  );
}
