"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { SmartLink } from "@/components/ui/SmartLink";
import { t } from "@/lib/i18n";
import { useScrolledPast, useStoredFlag } from "@/lib/store";

/** The key the dismissal is remembered under. */
export const PITCH_PILL_KEY = "iice:pitch-pill:dismissed";

/** Pages that already carry a pitch or an application, where the pill would only repeat them. */
export const PITCH_PILL_HIDDEN_ON: ReadonlySet<string> = new Set(["/", "/apply/", "/contact/"]);

/**
 * A "Pitch to Us" pill (SPEC §3): on internal pages, once the visitor is half way down, a small amber link to the pitch form
 * on the home page. It can be dismissed and stays dismissed. It is a landmark with a name, a real link and a real button,
 * it adds no layout shift (it is fixed), and `scroll-padding-bottom` keeps a focused control from sitting behind it.
 */
export function FloatingPitch() {
  const pathname = usePathname();
  const [dismissed, dismiss] = useStoredFlag(PITCH_PILL_KEY);
  const scrolled = useScrolledPast(0.5);
  const here = pathname.endsWith("/") ? pathname : `${pathname}/`;
  if (!scrolled || dismissed || PITCH_PILL_HIDDEN_ON.has(here)) return null;
  return (
    <aside className="pitch-pill" aria-label={t("pitchPill.region")}>
      <SmartLink href="/#pitch" className="pitch-pill__link">
        {t("pitchPill.label")}
      </SmartLink>
      <button
        type="button"
        data-action="dismiss-pitch"
        className="pitch-pill__dismiss"
        aria-label={t("pitchPill.dismiss")}
        onClick={dismiss}
      >
        <X aria-hidden="true" />
      </button>
    </aside>
  );
}
