/* eslint-disable @next/next/no-img-element -- this IS the image component: static export has no optimiser (TRD §6) */
import type { CSSProperties } from "react";
import type { PictureData } from "@/lib/images";
import { t } from "@/lib/i18n";

export interface PictureViewProps {
  data: PictureData;
  /** The `sizes` attribute: how wide the image renders at each viewport width. */
  sizes?: string;
  /** The likely LCP image: eager, high fetch priority, never lazy. */
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Pure markup for a processed image, so a client component (the spinbar) can render one that a server component
 * resolved. AVIF first, WebP next, then an `<img>` with explicit width and height so nothing shifts.
 */
export function PictureView({
  data,
  sizes = "100vw",
  priority = false,
  className,
  style,
}: PictureViewProps) {
  if (data.missing) {
    // Development only (resolvePicture throws in production).
    return (
      <div
        role="img"
        aria-label={data.alt}
        className={className}
        style={{ aspectRatio: "4 / 3", outline: "2px dashed var(--color-accent-400)", ...style }}
        data-todo="image"
      >
        <span className="p-2 text-small">{t("images.missing")}</span>
      </div>
    );
  }

  const img = (
    <img
      src={data.src}
      width={data.width}
      height={data.height}
      alt={data.decorative ? "" : data.alt}
      {...(data.decorative ? { role: "presentation" } : {})}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      {...(priority ? { fetchPriority: "high" as const } : {})}
      className={className}
      style={{
        aspectRatio: `${data.width} / ${data.height}`,
        backgroundColor: data.dominant,
        ...style,
      }}
    />
  );
  if (data.svg || data.sources.length === 0) return img;

  return (
    <picture>
      {data.sources.map((source) => (
        <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={sizes} />
      ))}
      {img}
    </picture>
  );
}
