"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { SmartLink } from "@/components/ui/SmartLink";
import { t } from "@/lib/i18n";

export interface Tile {
  id: string;
  icon: string;
  title: string;
  short: string;
  long: string;
  /** Present only when the page exists. */
  href: string | null;
}

/**
 * "Why IICE" tiles (SPEC §3 #5). Each tile is a button: tap or Enter expands it to its longer text, and a visitor with a
 * mouse also sees it expand on hover. Nothing important is hover-only, because the button does the same.
 */
export function WhyTiles({ tiles }: { tiles: Tile[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="tiles">
      {tiles.map((tile) => {
        const expanded = open === tile.id;
        return (
          <li key={tile.id} className="tile" data-open={expanded}>
            <button
              type="button"
              data-action="toggle-tile"
              className="tile__button"
              aria-expanded={expanded}
              aria-controls={`tile-${tile.id}`}
              onClick={() => setOpen(expanded ? null : tile.id)}
            >
              <Icon name={tile.icon} className="tile__icon" />
              <span className="tile__title">{tile.title}</span>
              <span className="tile__short">{tile.short}</span>
            </button>
            <div id={`tile-${tile.id}`} className="tile__more">
              <p>{tile.long}</p>
              {tile.href ? (
                <SmartLink href={tile.href}>{t("home.tileMore", { title: tile.title })}</SmartLink>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
