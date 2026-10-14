"use client";

import { formatDate } from "@/lib/dates";
import { useNow } from "@/lib/clock";
import { t } from "@/lib/i18n";
import { intakeState, type IntakeOpportunity, type IntakeState } from "@/lib/intake";
import { SmartLink } from "@/components/ui/SmartLink";

function label(state: IntakeState): string {
  switch (state.kind) {
    case "open":
      return t("intake.open", { date: formatDate(state.closesAt) });
    case "openEnded":
      return t("intake.openEnded");
    case "rolling":
      return t("intake.rolling");
    case "upcoming":
      return t("intake.upcoming", { date: formatDate(state.opensAt) });
    case "tba":
      return t("intake.tba");
  }
}

interface StatusPillProps {
  opportunities: IntakeOpportunity[];
  preferredSlug?: string | undefined;
  /** Build time, so the first render matches the server; the real time follows. */
  buildTime: string;
  /** Where it links (the open calls page), or null while that page does not exist. */
  href: string | null;
}

/** "● Applications open · closes 30 Nov 2026" and its siblings. Re-evaluated on the client every minute. */
export function StatusPill({ opportunities, preferredSlug, buildTime, href }: StatusPillProps) {
  const now = useNow(buildTime);
  const state = intakeState(opportunities, preferredSlug, now);
  const content = (
    <>
      <span aria-hidden="true" className="status-dot" data-state={state.kind} />
      {label(state)}
    </>
  );
  const className = "status-pill";
  return href ? (
    <SmartLink href={href} className={className} data-state={state.kind}>
      {content}
    </SmartLink>
  ) : (
    <span className={className} data-state={state.kind}>
      {content}
    </span>
  );
}
