"use client";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { WindowStatus } from "@/components/ui/WindowStatus";
import { useNow } from "@/lib/clock";
import { enumLabel, t } from "@/lib/i18n";
import { isAcceptingApplications, windowStatus, type WindowLike } from "@/lib/status";
import { toMs } from "@/lib/dates";

export interface OpenCallItem {
  slug: string;
  title: string;
  sponsor: string;
  kind: string;
  summary: string;
  window: WindowLike;
  applyHref: string;
}

/**
 * The full-width open-call card that leads "What's happening" (SPEC §3 #10). Which call is open is decided from the
 * visitor's clock, so a call that closed after the last build never appears as open; with none open, nothing renders.
 */
export function OpenCall({ items, serverNow }: { items: OpenCallItem[]; serverNow: string }) {
  const now = useNow(serverNow);
  const open = items
    .filter((item) => isAcceptingApplications(windowStatus(item.window, now)))
    .sort(
      (a, b) => toMs(a.window.closesAt ?? "9999-12-31") - toMs(b.window.closesAt ?? "9999-12-31"),
    )[0];
  if (!open) return null;
  return (
    <article className="open-call" aria-labelledby="open-call-title">
      <div>
        <p className="eyebrow">{enumLabel("opportunityKind", open.kind)}</p>
        <h3 id="open-call-title" className="open-call__title">
          {open.title}
        </h3>
        <p className="open-call__sponsor">{open.sponsor}</p>
        <p>{open.summary}</p>
      </div>
      <div className="open-call__side">
        <WindowStatus window={open.window} serverNow={serverNow} />
        <ButtonLink
          href={open.applyHref}
          variant="accent"
          aria-label={t("home.applyFor", { title: open.title })}
        >
          {t("home.apply")}
        </ButtonLink>
      </div>
    </article>
  );
}
