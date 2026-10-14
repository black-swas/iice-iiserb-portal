/**
 * The intake pill beside the Apply button (SPEC §3 #2, FR-GLOBAL-15): "Applications open · closes 30 Nov 2026",
 * "Rolling applications", or "Next intake: to be announced". The state is computed from the opportunities' windows,
 * at build time and on the client, so it can never say "open" after the closing date.
 */
import type { DateInput } from "./dates";
import { toMs } from "./dates";
import { windowStatus, type WindowLike } from "./status";

export interface IntakeOpportunity {
  slug: string;
  window: WindowLike;
  headline: boolean;
}

export type IntakeState =
  | { kind: "open"; closesAt: string }
  | { kind: "openEnded" }
  | { kind: "rolling" }
  | { kind: "upcoming"; opensAt: string }
  | { kind: "tba" };

const RANK = { open: 0, openEnded: 1, rolling: 2, upcoming: 3, tba: 4 } as const;

function stateOf(opportunity: IntakeOpportunity, now: DateInput): IntakeState {
  const { window } = opportunity;
  switch (windowStatus(window, now)) {
    case "open":
      return window.closesAt ? { kind: "open", closesAt: window.closesAt } : { kind: "openEnded" };
    case "rolling":
      return { kind: "rolling" };
    case "upcoming":
      return window.opensAt ? { kind: "upcoming", opensAt: window.opensAt } : { kind: "tba" };
    default:
      return { kind: "tba" }; // closed or unknown: never claim an intake that has ended
  }
}

/**
 * The state to show. With `preferredSlug` (site setting) only that opportunity counts; otherwise every opportunity
 * flagged `headline` does, and the best one wins: open before rolling before upcoming, soonest deadline first.
 */
export function intakeState(
  opportunities: readonly IntakeOpportunity[],
  preferredSlug: string | undefined,
  now: DateInput,
): IntakeState {
  const pool = preferredSlug
    ? opportunities.filter((o) => o.slug === preferredSlug)
    : opportunities.filter((o) => o.headline);
  const states = pool.map((o) => stateOf(o, now));
  const key = (s: IntakeState) =>
    s.kind === "open" ? toMs(s.closesAt) : s.kind === "upcoming" ? toMs(s.opensAt) : 0;
  states.sort((a, b) => RANK[a.kind] - RANK[b.kind] || key(a) - key(b));
  return states[0] ?? { kind: "tba" };
}
