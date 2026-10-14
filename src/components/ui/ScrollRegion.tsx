import type { ReactNode, Ref } from "react";

/**
 * A sideways-scrolling area (a wide table, a row of cards) that a keyboard user can scroll: it is a labelled region and
 * takes focus (WCAG 2.1.1, and axe's scrollable-region-focusable rule). Without this, content that overflows on a phone
 * could only be reached with a touch or a mouse.
 */
export function ScrollRegion({
  label,
  className,
  children,
  ref,
}: {
  label: string;
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    // A scroll container has no widget role, but it must be focusable to be scrollable by keyboard.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div ref={ref} role="region" aria-label={label} tabIndex={0} className={className}>
      {children}
    </div>
  );
}
