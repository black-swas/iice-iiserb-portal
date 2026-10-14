import type { CSSProperties } from "react";
import { resolvePicture } from "@/lib/images";
import { PictureView } from "./PictureView";

interface PictureProps {
  /** A validated content image: `src` is relative to content/ and starts with "media/". */
  image: { src: string; alt: string; decorative?: boolean | undefined };
  sizes?: string;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Server component. Looks the image up in the manifest scripts/images.ts wrote and renders AVIF and WebP with
 * `srcset`, explicit dimensions and lazy loading. Never use `next/image`: static export has no optimiser.
 */
export function Picture({ image, sizes, priority, className, style }: PictureProps) {
  return (
    <PictureView
      data={resolvePicture(image)}
      {...(sizes ? { sizes } : {})}
      {...(priority ? { priority } : {})}
      {...(className ? { className } : {})}
      {...(style ? { style } : {})}
    />
  );
}
