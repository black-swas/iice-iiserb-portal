import { StartupsExplorer, type StartupItem } from "@/components/explorer/StartupsExplorer";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { FactList, type Fact } from "@/components/ui/FactList";
import { Monogram } from "@/components/ui/Monogram";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection } from "@/components/ui/PageSection";
import { Picture } from "@/components/ui/Picture";
import { Prose } from "@/components/ui/Prose";
import { SmartLink } from "@/components/ui/SmartLink";
import { getCollection, getEntry } from "@/content/loaders";
import { openJobs, sortNewsDescending } from "@/content/queries";
import { getKnownRoutes } from "@/content/routes";
import { display } from "@/content/todo";
import { formatDate } from "@/lib/dates";
import { enumLabel, t } from "@/lib/i18n";
import { resolvePicture } from "@/lib/images";
import { isBuilt } from "@/lib/nav";
import { crumbs } from "./crumbs";
import type { PageDef } from "./types";

const TONES: Record<string, BadgeTone> = {
  current: "success",
  graduated: "accent",
  "pre-startup": "neutral",
  inactive: "muted",
  unconfirmed: "muted",
};

/** `/startups/`: the directory. The list is complete in the HTML; the filters take over once the page loads. */
export const startupsPage: PageDef = {
  meta: () => ({ title: t("pages.startups.title"), description: t("pages.startups.description") }),
  render: () => {
    const schemes = new Map(getCollection("fundingSchemes").map((s) => [s.slug, display(s.name)]));
    const items = getCollection("startups").map((s): StartupItem => ({
      slug: s.slug,
      name: display(s.name),
      oneLiner: display(s.oneLiner),
      sectors: s.sectors,
      stage: s.stage,
      status: s.status,
      track: s.track ?? null,
      schemes: s.schemeSlugs.flatMap((slug) => {
        const name = schemes.get(slug);
        return name ? [{ slug, name }] : [];
      }),
      cohortYear: s.cohortYear,
      tags: s.tags,
      founders: s.founders.map((f) => f.name),
      logo: s.logo ? resolvePicture(s.logo) : null,
    }));
    return (
      <>
        <PageHeader
          trail={[{ label: t("pages.startups.title") }]}
          eyebrow={t("pages.crumbs.startups")}
          title={t("pages.startups.title")}
          lead={t("pages.startups.description")}
        />
        <div className="wrapper py-section">
          <StartupsExplorer items={items} />
        </div>
      </>
    );
  },
};

/** `/startups/{slug}/` (SPEC §4.3): everything known about one startup, and only that. */
export function startupPage(slug: string): PageDef {
  const load = () => {
    const startup = getEntry("startups", slug);
    if (!startup) throw new Error(`content: startup "${slug}" is missing`);
    return startup;
  };
  return {
    meta: () => {
      const s = load();
      return { title: display(s.name), description: display(s.oneLiner) };
    },
    render: () => {
      const s = load();
      const routes = getKnownRoutes();
      const now = new Date();
      const all = getCollection("startups").sort((a, b) => a.name.localeCompare(b.name));
      const next = all[(all.findIndex((x) => x.slug === s.slug) + 1) % all.length];
      const schemes = getCollection("fundingSchemes").filter((x) => s.schemeSlugs.includes(x.slug));
      const jobs = openJobs(
        getCollection("jobs").filter((j) => j.employerStartupSlug === s.slug),
        now,
      );
      const news = sortNewsDescending(
        getCollection("news").filter((n) => n.relatedStartupSlugs.includes(s.slug)),
      ).slice(0, 3);

      const facts: Fact[] = [
        {
          label: t("pages.startups.facetSector"),
          value: s.sectors.map((x) => enumLabel("sector", x)).join(", "),
        },
        ...(s.stage
          ? [{ label: t("pages.startups.facetStage"), value: enumLabel("stage", s.stage) }]
          : []),
        ...(s.track
          ? [{ label: t("pages.startups.facetTrack"), value: enumLabel("track", s.track) }]
          : []),
        ...(s.cohortYear
          ? [{ label: t("pages.startups.facetYear"), value: String(s.cohortYear) }]
          : []),
        ...(s.location
          ? [
              {
                label: t("pages.startups.location"),
                value: `${s.location.city}, ${s.location.state}`,
              },
            ]
          : []),
        ...(s.affiliation
          ? [
              {
                label: t("pages.startups.affiliation"),
                value: enumLabel("affiliation", s.affiliation),
              },
            ]
          : []),
        ...(s.foundedYear
          ? [{ label: t("pages.startups.founded"), value: String(s.foundedYear) }]
          : []),
        ...(schemes.length > 0
          ? [
              {
                label: t("pages.startups.fundedBy"),
                value: schemes.map((x) => display(x.name)).join(", "),
              },
            ]
          : []),
      ];

      return (
        <>
          <PageHeader
            trail={[crumbs.startups(), { label: display(s.name) }]}
            title={display(s.name)}
            lead={display(s.oneLiner)}
          >
            <div className="startup-head">
              {s.logo ? (
                <Picture
                  image={{ ...s.logo, decorative: true }}
                  sizes="6rem"
                  className="startup-head__logo"
                />
              ) : (
                <Monogram name={s.name} className="startup-head__logo" />
              )}
              <p className="card__meta">
                <Badge tone={TONES[s.status] ?? "neutral"}>
                  {enumLabel("startupStatus", s.status)}
                </Badge>
                {s.website ? (
                  <SmartLink href={s.website}>{t("pages.startups.website")}</SmartLink>
                ) : null}
                {s.socials?.linkedin ? (
                  <SmartLink
                    href={s.socials.linkedin}
                    aria-label={t("pages.startups.linkedinOf", { name: display(s.name) })}
                  >
                    {t("pages.mentors.linkedinText")}
                  </SmartLink>
                ) : null}
              </p>
            </div>
          </PageHeader>

          <PageSection id="facts" title={t("pages.startups.facts")}>
            <FactList facts={facts} />
          </PageSection>

          <PageSection id="about" title={t("pages.startups.about")} tone="surface">
            <Prose source={s.body} />
          </PageSection>

          {s.story ? (
            <PageSection id="story" title={t("pages.startups.story")}>
              <ol className="story">
                {(
                  [
                    ["problem", s.story.problem],
                    ["approach", s.story.approach],
                    ["outcome", s.story.outcome],
                  ] as const
                ).map(([key, text], index) => (
                  <li key={key} className="story__block">
                    <p className="eyebrow">{String(index + 1).padStart(2, "0")}</p>
                    <h3>{t(`pages.startups.${key}`)}</h3>
                    <p>{display(text)}</p>
                  </li>
                ))}
              </ol>
            </PageSection>
          ) : null}

          {s.founders.length > 0 ? (
            <PageSection id="founders" title={t("pages.startups.founders")} tone="surface">
              <ul className="plain-list">
                {s.founders.map((f) => (
                  <li key={f.name}>
                    {f.linkedin ? <SmartLink href={f.linkedin}>{f.name}</SmartLink> : f.name}
                    {f.role ? <span className="muted">, {display(f.role)}</span> : null}
                  </li>
                ))}
              </ul>
            </PageSection>
          ) : null}

          {s.recognitions.length > 0 ? (
            <PageSection id="recognitions" title={t("pages.startups.recognitions")}>
              <ul className="plain-list">
                {s.recognitions.map((r) => (
                  <li key={`${r.type}-${r.title}`}>
                    <Badge>{enumLabel("recognitionType", r.type)}</Badge>{" "}
                    {r.url ? (
                      <SmartLink href={r.url}>{display(r.title)}</SmartLink>
                    ) : (
                      display(r.title)
                    )}
                    {r.year ? <span className="muted"> ({r.year})</span> : null}
                  </li>
                ))}
              </ul>
            </PageSection>
          ) : null}

          {jobs.length > 0 && isBuilt("/careers/", routes) ? (
            <PageSection id="roles" title={t("pages.startups.roles")} tone="surface">
              <ul className="plain-list">
                {jobs.map((job) => (
                  <li key={job.slug}>
                    {display(job.title)}
                    <span className="muted">
                      {" "}
                      · {t("pages.careers.closes", { date: formatDate(job.closesAt) })}
                    </span>
                  </li>
                ))}
              </ul>
              <p>
                <SmartLink href="/careers/#work-with-startups">
                  {t("pages.startups.allRoles")}
                </SmartLink>
              </p>
            </PageSection>
          ) : null}

          {news.length > 0 ? (
            <PageSection id="related" title={t("pages.startups.related")}>
              <ul className="plain-list">
                {news.map((post) => (
                  <li key={post.slug}>
                    <SmartLink href={`/news/${post.slug}/`}>{display(post.title)}</SmartLink>
                    <span className="muted"> · {formatDate(post.date)}</span>
                  </li>
                ))}
              </ul>
            </PageSection>
          ) : null}

          <nav aria-label={t("pages.startups.moreNav")} className="stage-nav wrapper">
            <SmartLink href="/startups/">{t("pages.startups.back")}</SmartLink>
            {next && next.slug !== s.slug ? (
              <SmartLink href={`/startups/${next.slug}/`} rel="next">
                {t("pages.startups.next", { name: display(next.name) })}
              </SmartLink>
            ) : null}
          </nav>
        </>
      );
    },
  };
}
