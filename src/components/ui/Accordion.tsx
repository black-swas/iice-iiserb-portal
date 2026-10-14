import type { ReactNode } from "react";

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
  /** Open when the page loads. */
  open?: boolean;
}

/**
 * Native `<details>`: keyboard and screen-reader accessible with no script, and the answers stay in the page for
 * search engines and for people who print it. Titles are text; the summary is the control.
 */
export function Accordion({ items }: { items: readonly AccordionItem[] }) {
  return (
    <div className="accordion">
      {items.map((item) => (
        <details key={item.id} id={item.id} className="accordion__item" open={item.open}>
          <summary className="accordion__summary">{item.title}</summary>
          <div className="accordion__panel">{item.content}</div>
        </details>
      ))}
    </div>
  );
}
