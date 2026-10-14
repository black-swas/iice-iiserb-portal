"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SmartLink } from "@/components/ui/SmartLink";
import { useNow } from "@/lib/clock";
import { formatDate } from "@/lib/dates";
import { enumLabel, t } from "@/lib/i18n";
import { isJobOpen } from "@/lib/status";

export interface JobItem {
  slug: string;
  title: string;
  employer: string;
  type: string;
  location: string;
  skills: string[];
  postedAt: string;
  closesAt: string;
  applyUrl: string | null;
  applyEmail: string | null;
  advertHref: string | null;
  /** The job description, rendered on the server. */
  description: ReactNode;
}

/**
 * Open positions, in closing order. A job stops showing the day after it closes, judged by the visitor's clock as well
 * as the build's, so an expired advert never lingers on a stale page (SPEC §4.9, TRD §4.3).
 */
export function JobsList({
  jobs,
  serverNow,
  email,
}: {
  jobs: JobItem[];
  serverNow: string;
  /** Where a CV goes when nothing is open. */
  email: string;
}) {
  const now = useNow(serverNow);
  const open = jobs
    .filter((job) => isJobOpen(job, now))
    .sort((a, b) => a.closesAt.localeCompare(b.closesAt));
  if (open.length === 0) {
    return (
      <EmptyState title={t("pages.careers.emptyTitle")}>
        <p>
          {t("pages.careers.emptyBody")} <a href={`mailto:${email}`}>{email}</a>
        </p>
      </EmptyState>
    );
  }
  return (
    <ul className="card-grid card-grid--2">
      {open.map((job) => (
        <li key={job.slug} className="card">
          <p className="card__meta">
            <Badge>{enumLabel("jobType", job.type)}</Badge>
            <Badge tone="accent">
              {t("pages.careers.closes", { date: formatDate(job.closesAt) })}
            </Badge>
          </p>
          <h3 className="card__title">{job.title}</h3>
          <p className="muted">
            {job.employer} · {job.location}
          </p>
          {job.skills.length > 0 ? (
            <ul className="tag-list">
              {job.skills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          ) : null}
          <details className="rate-card">
            <summary>{t("pages.careers.details")}</summary>
            <div className="accordion__panel">{job.description}</div>
          </details>
          <p className="button-row">
            {job.applyUrl ? (
              <SmartLink
                href={job.applyUrl}
                className="btn btn--primary"
                hideExternalIcon
                aria-label={t("pages.careers.applyFor", { title: job.title })}
              >
                {t("pages.careers.apply")}
              </SmartLink>
            ) : null}
            {job.applyEmail ? (
              <a
                href={`mailto:${job.applyEmail}?subject=${encodeURIComponent(job.title)}`}
                className="btn btn--secondary"
                aria-label={t("pages.careers.emailFor", { title: job.title })}
              >
                {t("pages.careers.email")}
              </a>
            ) : null}
            {job.advertHref ? (
              <a href={job.advertHref} download>
                {t("pages.careers.advert")}
              </a>
            ) : null}
          </p>
        </li>
      ))}
    </ul>
  );
}
