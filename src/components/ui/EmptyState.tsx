import type { ReactNode } from "react";

/** What a list shows when there is nothing to list: a plain sentence and, where it helps, one next step. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      {children ? <div className="empty-state__body">{children}</div> : null}
    </div>
  );
}
