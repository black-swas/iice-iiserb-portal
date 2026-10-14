import { ArrowUpRight } from "lucide-react";
import { PictureView } from "@/components/ui/PictureView";
import { SmartLink } from "@/components/ui/SmartLink";
import type { SpinbarItem } from "./types";

interface SpinbarCardProps {
  item: SpinbarItem;
  /** Zero-based position. The "01/06" label is derived from it and `total`. */
  index: number;
  total: number;
  /** The nearest card: description shown, arrow raised. */
  active?: boolean;
  /** Hovered or focused while not active: lifts 8 px without moving the ring. */
  preview?: boolean;
  /** Photo sizes hint. */
  sizes?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * One card, the same markup in the grid, the ring and the deck. It is a real link (CLAUDE.md rule 14): the accessible
 * name is the title, the description is the accessible description, and the decorative bits are hidden from assistive
 * technology. The whole card is the one tab stop.
 */
export function SpinbarCard({
  item,
  index,
  total,
  active = false,
  preview = false,
  sizes = "(min-width: 1024px) 380px, 80vw",
}: SpinbarCardProps) {
  const titleId = `${item.id}-title`;
  const descriptionId = `${item.id}-description`;
  const badgeId = `${item.id}-badge`;
  return (
    <SmartLink
      href={item.href}
      className="spin-card"
      data-active={active}
      data-preview={preview}
      {...(item.unbuilt ? { "data-todo": "unbuilt-link" } : {})}
      aria-labelledby={titleId}
      aria-describedby={`${badgeId} ${descriptionId}`}
      hideExternalIcon
    >
      <span className="spin-card__media" aria-hidden="true">
        {item.picture ? (
          <PictureView
            data={{ ...item.picture, decorative: true }}
            sizes={sizes}
            className="spin-card__photo"
          />
        ) : (
          <span className="spin-card__text">
            <span className="spin-card__mark">{item.badge}</span>
          </span>
        )}
      </span>
      {/* Read as part of the description, so the pill itself is decorative. */}
      <span id={badgeId} className="spin-card__badge" aria-hidden="true">
        {item.badge}
      </span>
      <span className="spin-card__index" aria-hidden="true">
        {pad(index + 1)}/{pad(total)}
      </span>
      <span className="spin-card__arrow" aria-hidden="true">
        <ArrowUpRight />
      </span>
      <span className="spin-card__body">
        <span id={titleId} className="spin-card__title">
          {item.title}
        </span>
        <span id={descriptionId} className="spin-card__desc">
          {item.description}
        </span>
      </span>
      <span className="spin-card__line" aria-hidden="true">
        <span className="spin-card__fill" />
      </span>
    </SmartLink>
  );
}
