"use client";

import { Check, Clock, Minus } from "lucide-react";
import { useNow } from "@/lib/clock";
import type { WindowLike } from "@/lib/status";
import { windowLabel } from "@/lib/status-label";
import { Badge } from "./Badge";

const ICONS = { success: Check, accent: Clock, muted: Minus, neutral: Clock } as const;

/**
 * An application window's status as a badge. It is computed from the dates, never stored, and re-evaluated on the
 * client so a stale build cannot show a closed call as open (TRD §4.3). The icon backs up the colour.
 */
export function WindowStatus({ window, serverNow }: { window: WindowLike; serverNow: string }) {
  const now = useNow(serverNow);
  const { text, tone } = windowLabel(window, now);
  const Icon = ICONS[tone];
  return (
    <Badge tone={tone}>
      <Icon aria-hidden="true" className="size-3.5" />
      {text}
    </Badge>
  );
}
