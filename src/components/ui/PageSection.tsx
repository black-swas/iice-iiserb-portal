import type { ReactNode } from "react";

interface PageSectionProps {
  /** Becomes the heading id and the anchor (`/page/#id`), so keep it stable: redirects and nav links use it. */
  id: string;
  title: string;
  lead?: string | undefined;
  /** A surface-coloured band, to separate it from the section above. */
  tone?: "plain" | "surface";
  children: ReactNode;
}

/** A titled block of an internal page. The id is the in-page anchor and the section's accessible name. */
export function PageSection({ id, title, lead, tone = "plain", children }: PageSectionProps) {
  return (
    <section aria-labelledby={`${id}-title`} id={id} className="page-section" data-tone={tone}>
      <div className="wrapper">
        <h2 id={`${id}-title`} className="page-section__title">
          {title}
        </h2>
        {lead ? <p className="page-section__lead">{lead}</p> : null}
        {children}
      </div>
    </section>
  );
}
