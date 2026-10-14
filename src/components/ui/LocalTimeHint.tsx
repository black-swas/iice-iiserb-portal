"use client";

import { useSyncExternalStore } from "react";
import { formatLocalDateTime, isOutsideIST } from "@/lib/dates";
import { t } from "@/lib/i18n";

const subscribe = () => () => {};

/**
 * "In your time zone: 12 Nov 2026, 10:30 am" for an online or hybrid event, shown only when the visitor is outside India
 * (SPEC §4.4). The server and the first client render show nothing, so there is no hydration mismatch.
 */
export function LocalTimeHint({ startsAt }: { startsAt: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => (isOutsideIST(startsAt) ? formatLocalDateTime(startsAt) : ""),
    () => "",
  );
  return text ? <p className="muted">{t("pages.events.localTime", { time: text })}</p> : null;
}
