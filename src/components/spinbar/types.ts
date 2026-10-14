import type { PictureData } from "@/lib/images";

/** What one card needs. Plain data, so a server component can build it and a client component can render it. */
export interface SpinbarItem {
  id: string;
  /** The pill at the top left ("Incubated", or a year for milestones), already a display label. */
  badge: string;
  title: string;
  /** Up to 140 characters; always visible on the active card, never hover-only. */
  description: string;
  href: string;
  /** A resolved photo. Absent means the text-card treatment. */
  picture?: PictureData;
  /** Development only: the link target is a page that does not exist yet. */
  unbuilt?: boolean;
}
