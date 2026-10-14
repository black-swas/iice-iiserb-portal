"use client";

import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SmartLink } from "@/components/ui/SmartLink";
import { WindowStatus } from "@/components/ui/WindowStatus";
import { useNow } from "@/lib/clock";
import { enumLabel, t } from "@/lib/i18n";
import { closingHint, sortCalls, tabOf, type Tab } from "@/lib/opportunities";
import type { WindowLike } from "@/lib/status";
import { replaceUrlSearch, useUrlSearch } from "@/lib/url-state";

export interface CallItem {
  slug: string;
  title: string;
  kind: string;
  sponsor: string;
  summary: string;
  eligibilityLine: string | null;
  window: WindowLike;
  applyHref: string;
  /** The scheme or event page the call belongs to, when it exists. */
  detailsHref: string | null;
}

const VIEW_PARAM = "view";

/**
 * `/opportunities/`: Open and Past tabs (SPEC §4.1c). Which tab a call is on is worked out from the visitor's clock as well
 * as the build's, so a stale build never lists a call that has closed as open (TRD §4.3). The tab is the `?view=` query.
 */
export function OpportunitiesList({ items, serverNow }: { items: CallItem[]; serverNow: string }) {
  const now = useNow(serverNow);
  const open = sortCalls(
    items.filter((i) => tabOf(i, now) === "open"),
    now,
  );
  const past = sortCalls(
    items.filter((i) => tabOf(i, now) === "past"),
    now,
  );

  const param = new URLSearchParams(useUrlSearch()).get(VIEW_PARAM);
  const chosen: Tab | null = param === "past" || param === "open" ? param : null;
  const view: Tab = chosen ?? (open.length > 0 || past.length === 0 ? "open" : "past");
  const shown = view === "open" ? open : past;

  const choose = (next: Tab) => {
    const params = new URLSearchParams(window.location.search);
    params.set(VIEW_PARAM, next);
    replaceUrlSearch(params.toString());
  };

  return (
    <div className="explorer">
      <div role="group" aria-label={t("pages.opportunities.viewLabel")} className="choice-bar">
        {(["open", "past"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            data-action="choose-view"
            className="choice-bar__button"
            aria-pressed={view === tab}
            onClick={() => choose(tab)}
          >
            {t(tab === "open" ? "pages.opportunities.open" : "pages.opportunities.past")}
            <span className="chip__count"> ({tab === "open" ? open.length : past.length})</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title={t(
            view === "open" ? "pages.opportunities.noneOpen" : "pages.opportunities.nonePast",
          )}
        >
          <p>
            {t(
              view === "open"
                ? "pages.opportunities.noneOpenBody"
                : "pages.opportunities.nonePastBody",
            )}
          </p>
        </EmptyState>
      ) : (
        <ul className="card-grid card-grid--2" aria-live="polite">
          {shown.map((call) => {
            const hint = closingHint(call.window, now);
            return (
              <li key={call.slug} className="card">
                <p className="card__meta">
                  <Badge>{enumLabel("opportunityKind", call.kind)}</Badge>
                  <WindowStatus window={call.window} serverNow={serverNow} />
                  {hint.kind === "today" ? (
                    <span>{t("pages.opportunities.closesToday")}</span>
                  ) : null}
                  {hint.kind === "days" ? (
                    <span>{t("pages.opportunities.closesIn", { days: hint.days })}</span>
                  ) : null}
                </p>
                <h2 className="card__title">{call.title}</h2>
                <p className="muted">{call.sponsor}</p>
                <p>{call.summary}</p>
                {call.eligibilityLine ? (
                  <p>
                    <strong>{t("pages.opportunities.eligibility")}</strong> {call.eligibilityLine}
                  </p>
                ) : null}
                <p className="button-row">
                  {view === "open" ? (
                    <SmartLink
                      href={call.applyHref}
                      className="btn btn--accent"
                      hideExternalIcon
                      aria-label={t("pages.opportunities.applyFor", { title: call.title })}
                    >
                      {t("pages.opportunities.apply")}
                    </SmartLink>
                  ) : null}
                  {call.detailsHref ? (
                    <SmartLink
                      href={call.detailsHref}
                      aria-label={t("pages.opportunities.detailsFor", { title: call.title })}
                    >
                      {t("pages.opportunities.details")}
                    </SmartLink>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
