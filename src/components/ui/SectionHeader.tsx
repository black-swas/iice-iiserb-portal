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
 * Institutional Section Header (GIGW 3.0 & iiserb.ac.in aligned):
 * Structured left accent rule, numbered eyebrow, and clear typographic hierarchy.
 */
export function SectionHeader({
  id,
  eyebrow,
  number,
  title,
  subline,
  rightLabel,
}: SectionHeaderProps) {
  const prefix = typeof number === "number" ? `${String(number).padStart(2, "0")} / ` : "";
  return (
    <header className="section-header wrapper-wide">
      <div className="section-header__main">
        <p className="section-header__eyebrow">
          {prefix}
          {eyebrow}
        </p>
        <h2 id={id} className="section-header__title">
          {title}
        </h2>
        {subline ? <p className="section-header__subline">{subline}</p> : null}
      </div>
      {rightLabel ? <p className="section-header__right">{rightLabel}</p> : null}
    </header>
  );
}
