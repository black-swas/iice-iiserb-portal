import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "accent" | "success" | "muted";

/**
 * A small label: a status, a type, a sector. Colour is never the only signal (WCAG 1.4.1), the text always says it.
 * The accent tone is an amber fill with the fixed dark ink (CLAUDE.md rule 10).
 */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className="badge" data-tone={tone}>
      {children}
    </span>
  );
}
