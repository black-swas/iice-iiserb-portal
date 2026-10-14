import type { ReactNode } from "react";

/** A full-width call to action closing a page: a heading, one or two sentences and the buttons (SPEC §4.1). */
export function CtaBand({
  id,
  title,
  children,
  actions,
}: {
  id: string;
  title: string;
  children?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="cta-band">
      <div className="cta-band__inner wrapper">
        <div>
          <h2 id={id} className="cta-band__title">
            {title}
          </h2>
          {children ? <div className="cta-band__text">{children}</div> : null}
        </div>
        <div className="cta-band__actions">{actions}</div>
      </div>
    </section>
  );
}
