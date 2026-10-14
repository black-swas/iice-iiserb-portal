import { SectionHeader } from "@/components/ui/SectionHeader";
import { t } from "@/lib/i18n";
import { Spinbar } from "./Spinbar";
import type { SpinbarItem } from "./types";

interface SpinbarSectionProps {
  /** Section id; the heading is `${id}-heading`. */
  id: string;
  eyebrow: string;
  number?: number;
  title: string;
  subline?: string | undefined;
  /** 3 to 8 cards (validated in the content schema). */
  items: readonly SpinbarItem[];
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * A titled spinbar. The count in the mono label ("STARTUP SPOTLIGHT (06)") is `items.length`: derived, never typed
 * (CLAUDE.md rule 11). Reused for the Spotlight on Home and, later, for Milestones on About.
 */
export function SpinbarSection({
  id,
  eyebrow,
  number,
  title,
  subline,
  items,
}: SpinbarSectionProps) {
  return (
    <section aria-labelledby={`${id}-heading`} className="py-section">
      <SectionHeader
        id={`${id}-heading`}
        eyebrow={eyebrow}
        {...(number === undefined ? {} : { number })}
        title={title}
        subline={subline}
        rightLabel={t("spinbar.countLabel", {
          title: title.toUpperCase(),
          count: pad(items.length),
        })}
      />
      <Spinbar items={items} />
    </section>
  );
}
