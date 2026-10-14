"use client";

import { CalendarPlus, Download, Play } from "lucide-react";
import { useState } from "react";
import { useNow } from "@/lib/clock";
import { eventStatus, registrationOpen } from "@/lib/status";
import { t } from "@/lib/i18n";
import { youtubeEmbedUrl } from "@/lib/video";
import { SmartLink } from "./SmartLink";

export interface EventActionsProps {
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  registration: { url: string; closesAt: string | null } | null;
  recordingUrl: string | null;
  /** The `.ics` file, when the build produced one. */
  icsHref: string | null;
  googleHref: string;
  serverNow: string;
}

function Recording({ url, title }: { url: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  const embed = youtubeEmbedUrl(url);
  return (
    <div className="recording">
      {embed ? (
        loaded ? (
          <iframe
            src={embed}
            title={t("pages.events.recordingTitle", { title })}
            className="recording__frame"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            data-action="load-video"
            className="btn btn--secondary"
            onClick={() => setLoaded(true)}
          >
            <Play aria-hidden="true" className="size-4" />
            {t("pages.events.loadRecording")}
          </button>
        )
      ) : null}
      <p className="muted">
        {embed && !loaded ? `${t("pages.events.recordingNote")} ` : ""}
        <SmartLink href={url}>{t("pages.events.watchRecording")}</SmartLink>
      </p>
    </div>
  );
}

/**
 * The parts of an event page that depend on the time: Register while registration is open, the calendar links before the
 * event, "This event has ended" and the recording after it. Worked out from the visitor's clock as well as the build's
 * (TRD §4.3), so a stale page cannot offer registration for an event that has started.
 */
export function EventActions(props: EventActionsProps) {
  const now = useNow(props.serverNow);
  const event = {
    startsAt: props.startsAt,
    endsAt: props.endsAt ?? undefined,
    allDay: props.allDay,
  };
  const past = eventStatus(event, now) === "past";
  const canRegister =
    props.registration !== null &&
    registrationOpen(
      { ...event, registration: { closesAt: props.registration.closesAt ?? undefined } },
      now,
    );

  if (past) {
    return (
      <div className="event-actions">
        <p className="callout" role="note">
          {t("pages.events.ended")}
        </p>
        {props.recordingUrl ? <Recording url={props.recordingUrl} title={props.title} /> : null}
      </div>
    );
  }
  return (
    <div className="event-actions">
      {canRegister && props.registration ? (
        <SmartLink href={props.registration.url} className="btn btn--accent" hideExternalIcon>
          {t("pages.events.register")}
        </SmartLink>
      ) : null}
      <span className="event-actions__calendar">
        {props.icsHref ? (
          <a href={props.icsHref} download className="btn btn--secondary">
            <Download aria-hidden="true" className="size-4" />
            {t("pages.events.addIcs")}
          </a>
        ) : null}
        <SmartLink href={props.googleHref} className="btn btn--secondary" hideExternalIcon>
          <CalendarPlus aria-hidden="true" className="size-4" />
          {t("pages.events.addGoogle")}
        </SmartLink>
      </span>
    </div>
  );
}
