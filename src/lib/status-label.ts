/**
 * The words for an application window's status: "Open · closes 30 Nov 2026", "Rolling", "Opens 1 Dec 2026", "Closed",
 * "To be announced". Built on windowStatus(), so the build and the client always agree (CLAUDE.md rule 12).
 */
import { formatDate, type DateInput } from "./dates";
import { t } from "./i18n";
import { windowStatus, type WindowLike, type WindowStatus } from "./status";

export interface StatusLabel {
  status: WindowStatus;
  text: string;
  tone: "success" | "accent" | "muted" | "neutral";
}

export function windowLabel(window: WindowLike, now: DateInput): StatusLabel {
  const status = windowStatus(window, now);
  switch (status) {
    case "open":
      return {
        status,
        text: window.closesAt
          ? t("status.open", { date: formatDate(window.closesAt) })
          : t("status.openEnded"),
        tone: "success",
      };
    case "rolling":
      return { status, text: t("status.rolling"), tone: "success" };
    case "upcoming":
      return {
        status,
        text: window.opensAt
          ? t("status.upcoming", { date: formatDate(window.opensAt) })
          : t("status.tba"),
        tone: "accent",
      };
    case "closed":
      return { status, text: t("status.closed"), tone: "muted" };
    case "tba":
      return { status, text: t("status.tba"), tone: "neutral" };
  }
}
