import { SpinbarGrid } from "./SpinbarGrid";
import type { SpinbarItem } from "./types";

/**
 * Institutional Portfolio Grid (replaces the 30-degree tilted card ring and custom dot cursor).
 * Renders a clean, accessible 3-column government portfolio showcase grid across all devices.
 */
export function Spinbar({ items }: { items: readonly SpinbarItem[] }) {
  return (
    <div className="spinbar" data-testid="spinbar">
      <SpinbarGrid items={items} />
    </div>
  );
}
