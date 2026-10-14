import { forwardRef } from "react";

export interface SummaryItem {
  /** The id of the control the error belongs to. */
  targetId: string;
  message: string;
}

/**
 * The list of problems at the top of a form after a failed submit (TRD §10.1). It takes focus so a screen reader
 * announces it, and each entry moves focus to the field, because a plain `#id` link does not focus a form control.
 */
export const ErrorSummary = forwardRef<
  HTMLDivElement,
  { title: string; items: readonly SummaryItem[] }
>(function ErrorSummary({ title, items }, ref) {
  return (
    <div ref={ref} tabIndex={-1} className="error-summary" aria-labelledby="error-summary-title">
      <h2 id="error-summary-title" className="error-summary__title">
        {title}
      </h2>
      <ul>
        {items.map((item) => (
          <li key={item.targetId}>
            <a
              href={`#${item.targetId}`}
              onClick={(event) => {
                const target = document.getElementById(item.targetId);
                if (!target) return;
                event.preventDefault();
                target.scrollIntoView({ block: "center" });
                const control = target.matches("input, select, textarea")
                  ? target
                  : target.querySelector<HTMLElement>("input, select, textarea");
                control?.focus({ preventScroll: true });
              }}
            >
              {item.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
});
