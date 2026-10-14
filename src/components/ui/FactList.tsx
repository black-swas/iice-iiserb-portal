import type { ReactNode } from "react";

export interface Fact {
  label: string;
  value: ReactNode;
}

/** A description list of label and value pairs (startup facts, scheme at-a-glance, event details). */
export function FactList({ facts, className }: { facts: readonly Fact[]; className?: string }) {
  return (
    <dl className={`fact-list${className ? ` ${className}` : ""}`}>
      {facts.map((fact) => (
        <div key={fact.label} className="fact-list__row">
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
