import type { ReactNode } from "react";

interface SectionHeaderProps {
  id: string;
  eyebrow: string;
  number?: number;
  title: string;
  subline?: string | undefined;
  rightLabel?: ReactNode;
}

/**
 * Institutional Section Header (GIGW 3.0 aligned):
 * Uses a structured left accent bar and uppercase departmental category eyebrow instead of portfolio-style "01 /" numbering.
 */
export function SectionHeader({
  id,
  eyebrow,
  title,
  subline,
  rightLabel,
}: SectionHeaderProps) {
  return (
    <header className="wrapper-wide flex flex-wrap items-end justify-between gap-x-8 gap-y-3 pb-6 mb-6 border-b border-border">
      <div className="max-w-measure border-l-4 border-primary-700 pl-4">
        <p className="font-mono text-eyebrow font-semibold tracking-[0.08em] text-accent-700 uppercase">
          {eyebrow}
        </p>
        <h2 id={id} className="mt-1 font-display text-h2 font-bold text-ink">
          {title}
        </h2>
        {subline ? <p className="mt-1.5 text-muted">{subline}</p> : null}
      </div>
      {rightLabel ? (
        <p className="font-mono text-eyebrow font-semibold tracking-[0.08em] text-muted uppercase">
          {rightLabel}
        </p>
      ) : null}
    </header>
  );
}
