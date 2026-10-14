import { SpinbarCard } from "./SpinbarCard";
import type { SpinbarItem } from "./types";

/**
 * The static grid: what server rendering produces, what no-JS and `prefers-reduced-motion` users get, and what the page
 * shows until the spinbar chunk loads. No tilt, no pin, no blur, colour photos; every description visible.
 */
export function SpinbarGrid({ items }: { items: readonly SpinbarItem[] }) {
  return (
    <ol className="spin-grid">
      {items.map((item, i) => (
        <li key={item.id} className="spin-grid__item">
          <SpinbarCard item={item} index={i} total={items.length} />
        </li>
      ))}
    </ol>
  );
}
