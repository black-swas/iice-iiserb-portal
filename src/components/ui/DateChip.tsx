import { formatDayMonth, type DateInput } from "@/lib/dates";

/**
 * "12 NOV" date chip for event and news cards. It repeats the full date that the card prints as text (in a `<time>`
 * element), so it is hidden from assistive technology rather than read twice.
 */
export function DateChip({ date, now }: { date: string; now: DateInput }) {
  const { day, month, year } = formatDayMonth(date, now);
  return (
    <span className="date-chip" aria-hidden="true">
      <span className="date-chip__day">{day}</span>
      <span className="date-chip__month">{month}</span>
      {year ? <span className="date-chip__year">{year}</span> : null}
    </span>
  );
}
