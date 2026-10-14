/**
 * Counts computed from content (TRD §5.0, CLAUDE.md rule 11). Four reference sites contradicted their own numbers
 * ("600+ startups" beside ~414 listings), so a stat can be derived instead of typed, and a typed claim may never be
 * lower than the matching derived count (checked in integrity.ts).
 *
 * Only non-draft, non-TODO entries count: an entry flagged `_status: TODO_CONFIRM` is not yet a fact.
 */
import { eventStatus } from "@/lib/status";
import type { DateInput } from "@/lib/dates";
import { isFlagged } from "./todo";
import type {
  Event,
  FundingScheme,
  Instrument,
  Mentor,
  Partner,
  Stat,
  StatUnit,
  Startup,
} from "./schema";

export interface DerivedInput {
  startups: Startup[];
  events: Event[];
  fundingSchemes: FundingScheme[];
  mentors: Mentor[];
  partners: Partner[];
  instruments: Instrument[];
}

export interface Derived {
  /** Current plus graduated. Pre-startups are counted separately and inactive startups not at all. */
  startupsTotal: number;
  startupsCurrent: number;
  startupsGraduated: number;
  preStartups: number;
  /** Events whose end has passed, in IST, at `now`. */
  eventsHeld: number;
  schemeBeneficiaries: number;
  mentors: number;
  partners: number;
  instruments: number;
}

const countable = <T extends { draft: boolean }>(entry: T) => !entry.draft && !isFlagged(entry);

export function computeDerived(input: DerivedInput, now: DateInput): Derived {
  const startups = input.startups.filter(countable);
  const byStatus = (status: Startup["status"]) =>
    startups.filter((s) => s.status === status).length;
  const current = byStatus("current");
  const graduated = byStatus("graduated");

  return {
    startupsTotal: current + graduated,
    startupsCurrent: current,
    startupsGraduated: graduated,
    preStartups: byStatus("pre-startup"),
    eventsHeld: input.events.filter(countable).filter((e) => eventStatus(e, now) === "past").length,
    schemeBeneficiaries: input.fundingSchemes
      .filter(countable)
      .reduce(
        (sum, scheme) => sum + scheme.cohorts.reduce((n, c) => n + c.beneficiaries.length, 0),
        0,
      ),
    mentors: input.mentors.filter(countable).length,
    partners: input.partners.filter(countable).length,
    instruments: input.instruments.filter(countable).filter((i) => i.status !== "retired").length,
  };
}

type DeriveKey = Extract<Stat, { kind: "derived" }>["derive"];

export const DERIVE_TO_KEY: Record<DeriveKey, keyof Derived> = {
  "startups-total": "startupsTotal",
  "startups-current": "startupsCurrent",
  "startups-graduated": "startupsGraduated",
  "pre-startups": "preStartups",
  "events-held": "eventsHeld",
  "scheme-beneficiaries": "schemeBeneficiaries",
  mentors: "mentors",
  partners: "partners",
  instruments: "instruments",
};

/** Manual stat ids that make a claim a derived count can disprove. A claim below the count fails validation. */
export const CLAIM_FLOORS: Record<string, keyof Derived> = {
  "startups-incubated": "startupsTotal",
  "startups-graduated": "startupsGraduated",
  "pre-startups": "preStartups",
  "events-held": "eventsHeld",
  "scheme-beneficiaries": "schemeBeneficiaries",
  mentors: "mentors",
  partners: "partners",
  instruments: "instruments",
};

export interface ResolvedStat {
  id: string;
  label: string;
  /** null ⇒ unconfirmed or zero: do not render a number. */
  value: number | null;
  unit: StatUnit;
  plus: boolean;
  asOf: string | undefined;
  source: string | undefined;
  order: number;
  showOnHome: boolean;
  kind: Stat["kind"];
}

/**
 * Turns stored stats into displayable ones. A derived stat takes its value from `derived`; a manual stat uses its
 * typed value. Zero is treated as unknown: a "0" counter is never useful and would fail the HTML audit (TRD §13.3).
 */
export function resolveStats(stats: Stat[], derived: Derived): ResolvedStat[] {
  return stats
    .map((stat): ResolvedStat => {
      const common = {
        id: stat.id,
        label: stat.label,
        order: stat.order,
        showOnHome: stat.showOnHome,
        kind: stat.kind,
      };
      // A stat flagged TODO_CONFIRM is unconfirmed whatever number it carries.
      const confirmed = !isFlagged(stat);
      if (stat.kind === "derived") {
        const n = derived[DERIVE_TO_KEY[stat.derive]];
        return {
          ...common,
          value: confirmed && n > 0 ? n : null,
          unit: "count",
          plus: false,
          asOf: undefined,
          source: undefined,
        };
      }
      return {
        ...common,
        value: confirmed && stat.value !== null && stat.value > 0 ? stat.value : null,
        unit: stat.unit,
        plus: stat.plus,
        asOf: stat.asOf,
        source: stat.source,
      };
    })
    .sort((a, b) => a.order - b.order);
}

/** What production may render. The Home strip additionally requires at least three of these (SPEC §3). */
export function publicStats(resolved: ResolvedStat[]): (ResolvedStat & { value: number })[] {
  return resolved.filter((s): s is ResolvedStat & { value: number } => s.value !== null);
}
