"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { liveAnnouncements } from "@/lib/announcements";
import { useNow } from "@/lib/clock";
import { t } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/motion";

export interface TickerItem {
  id: string;
  text: string;
  href?: string | undefined;
  startsAt: string;
  expiresAt: string;
  priority: number;
}

const ROTATE_MS = 6000;

function Text({ item }: { item: TickerItem }) {
  return item.href ? (
    <SmartLink href={item.href} className="ticker-link">
      {item.text}
    </SmartLink>
  ) : (
    <span>{item.text}</span>
  );
}

/**
 * Dated announcements, one at a time (SPEC §3 #1). Only live ones show, judged at build time and again on the client.
 * It rotates every 6 s, pauses on hover and focus and has a pause button (WCAG 2.2.2); under reduced motion it is a
 * plain list that never moves. With nothing live it renders nothing at all.
 */
export function AnnouncementTicker({
  items,
  buildTime,
}: {
  items: TickerItem[];
  buildTime: string;
}) {
  const now = useNow(buildTime);
  const reduced = useReducedMotion();
  const live = useMemo(() => liveAnnouncements(items, now), [items, now]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [engaged, setEngaged] = useState(false); // pointer over, or focus inside

  useEffect(() => {
    if (live.length < 2 || reduced || paused || engaged) return;
    const id = window.setInterval(() => setIndex((i) => i + 1), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [live.length, reduced, paused, engaged]);

  if (live.length === 0) return null;

  const region = {
    role: "region" as const,
    "aria-label": t("utility.announcements"),
    className: "ticker",
  };

  if (reduced) {
    return (
      <div {...region}>
        <ul className="ticker-list">
          {live.map((item) => (
            <li key={item.id}>
              <Text item={item} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const current = live[index % live.length] as TickerItem;
  return (
    <div
      {...region}
      onPointerEnter={() => setEngaged(true)}
      onPointerLeave={() => setEngaged(false)}
      onFocus={() => setEngaged(true)}
      onBlur={() => setEngaged(false)}
    >
      {/* Not a live region: a notice that changes by itself should not interrupt a screen reader. */}
      <p key={current.id} className="ticker-item" aria-live="off">
        <Text item={current} />
      </p>
      {live.length > 1 ? (
        <button
          type="button"
          data-action="ticker-pause"
          className="ticker-pause"
          aria-label={paused ? t("utility.resume") : t("utility.pause")}
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        </button>
      ) : null}
    </div>
  );
}
