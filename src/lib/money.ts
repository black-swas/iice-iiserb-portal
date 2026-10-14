/**
 * The only way amounts and numbers reach the UI (CLAUDE.md rule 11, TRD §5.0): Indian units, one format everywhere.
 * "₹10 lakh", "₹1.5 crore", "₹5–10 lakh", "Up to ₹25 lakh". Never "Lacs", "Lakhs" or "10L".
 * A lakh/crore form is used only when it is exact, so a formatted amount always round-trips to the stored one.
 */
import type { StatUnit } from "@/content/schema";

const LAKH = 100_000;
const CRORE = 10_000_000;

export interface MoneyRange {
  min: number | null;
  max: number | null;
}

interface Parts {
  /** Digits (and grouping) only, without the rupee sign. */
  text: string;
  unit: "lakh" | "crore" | null;
}

/** Indian digit grouping: 1,23,45,678. Keeps up to two decimals and drops trailing zeros. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value))
    throw new RangeError(`money: ${String(value)} is not a finite number`);
  const negative = value < 0;
  const [whole = "0", fraction] = Math.abs(value).toFixed(2).split(".");
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
  const decimals = fraction && fraction !== "00" ? `.${fraction.replace(/0$/, "")}` : "";
  return `${negative ? "-" : ""}${grouped}${decimals}`;
}

/** Trims to at most two decimals, or returns null when that would change the value. */
function exactScaled(amount: number, divisor: number): string | null {
  const scaled = amount / divisor;
  const rounded = Math.round(scaled * 100) / 100;
  if (Math.abs(rounded * divisor - amount) > 1e-6) return null;
  return String(rounded);
}

function parts(amount: number): Parts {
  if (!Number.isFinite(amount) || amount < 0)
    throw new RangeError(`money: invalid amount ${String(amount)}`);
  if (amount >= CRORE) {
    const crore = exactScaled(amount, CRORE);
    if (crore !== null) return { text: crore, unit: "crore" };
  }
  if (amount >= LAKH) {
    const lakh = exactScaled(amount, LAKH);
    if (lakh !== null) return { text: lakh, unit: "lakh" };
  }
  return { text: formatNumber(amount), unit: null };
}

/** "₹75,000", "₹10 lakh", "₹1.5 crore" */
export function formatINR(amount: number): string {
  const p = parts(amount);
  return p.unit ? `₹${p.text} ${p.unit}` : `₹${p.text}`;
}

/**
 * A support amount or band. Returns null when both ends are unknown, so the caller shows "To be announced"
 * instead of a number (CLAUDE.md rule 1).
 */
export function formatMoney(range: MoneyRange): string | null {
  const { min, max } = range;
  if (min === null && max === null) return null;
  if (min === null) return `Up to ${formatINR(max as number)}`;
  if (max === null) return `From ${formatINR(min)}`;
  if (min === max) return formatINR(min);
  const a = parts(min);
  const b = parts(max);
  if (a.unit !== null && a.unit === b.unit) return `₹${a.text}–${b.text} ${a.unit}`;
  return `${formatINR(min)}–${formatINR(max)}`;
}

export interface StatFormat {
  value: number;
  unit: StatUnit;
  plus?: boolean;
}

/** The text of a stat, with its unit and a single "+" when the figure is a floor ("600+", never "600++"). */
export function formatStat({ value, unit, plus = false }: StatFormat): string {
  const mark = plus ? "+" : "";
  switch (unit) {
    case "inr":
      return `${formatINR(value)}${mark}`;
    case "sqft":
      return `${formatNumber(value)}${mark} sq ft`;
    case "hours":
      return `${formatNumber(value)}${mark} hours`;
    case "percent":
      return `${formatNumber(value)}%${mark}`;
    case "count":
      return `${formatNumber(value)}${mark}`;
  }
}
