/**
 * The one table of what lives in /content: the loaders, scripts/validate-content.ts, scripts/todo-confirm.ts and the
 * CMS-drift test all read it, so a collection is added in exactly one place (plus its schema and Decap entry).
 */
import type { z } from "zod";
import * as S from "./schema";

export type Format = "json" | "md" | "mdx";

interface CollectionDef {
  /** Directory under content/ holding one file per entry; the filename (without extension) is the slug. */
  dir: string;
  format: Format;
  schema: z.ZodType;
}

interface SingletonDef {
  /** Path under content/. */
  file: string;
  schema: z.ZodType;
}

export const collections = {
  pages: { dir: "pages", format: "mdx", schema: S.Page },
  announcements: { dir: "announcements", format: "json", schema: S.Announcement },
  stages: { dir: "stages", format: "mdx", schema: S.Stage },
  tracks: { dir: "tracks", format: "json", schema: S.Track },
  fundingSchemes: { dir: "funding-schemes", format: "json", schema: S.FundingScheme },
  opportunities: { dir: "opportunities", format: "json", schema: S.Opportunity },
  startups: { dir: "startups", format: "md", schema: S.Startup },
  events: { dir: "events", format: "md", schema: S.Event },
  eventSeries: { dir: "event-series", format: "json", schema: S.EventSeries },
  news: { dir: "news", format: "md", schema: S.NewsPost },
  press: { dir: "press", format: "json", schema: S.PressItem },
  documents: { dir: "documents", format: "json", schema: S.Document },
  people: { dir: "people", format: "json", schema: S.Person },
  committees: { dir: "committees", format: "json", schema: S.Committee },
  mentors: { dir: "mentors", format: "json", schema: S.Mentor },
  testimonials: { dir: "testimonials", format: "json", schema: S.Testimonial },
  partners: { dir: "partners", format: "json", schema: S.Partner },
  facilities: { dir: "facilities", format: "json", schema: S.Facility },
  instruments: { dir: "instruments", format: "json", schema: S.Instrument },
  services: { dir: "services", format: "json", schema: S.Service },
  jobs: { dir: "jobs", format: "md", schema: S.Job },
  faqs: { dir: "faqs", format: "json", schema: S.FaqGroup },
} as const satisfies Record<string, CollectionDef>;

export const singletons = {
  site: { file: "settings/site.json", schema: S.SiteSettings },
  navigation: { file: "settings/navigation.json", schema: S.Navigation },
  home: { file: "pages/home.json", schema: S.HomePage },
  stats: { file: "stats.json", schema: S.Stats },
  ecosystemTiles: { file: "ecosystem-tiles.json", schema: S.EcosystemTiles },
  paths: { file: "paths.json", schema: S.Paths },
  spotlight: { file: "spotlight.json", schema: S.Spotlight },
  milestones: { file: "milestones.json", schema: S.Milestones },
  innovationClub: { file: "innovation-club.json", schema: S.InnovationClub },
} as const satisfies Record<string, SingletonDef>;

export type CollectionKey = keyof typeof collections;
export type SingletonKey = keyof typeof singletons;

type WithBody<K extends CollectionKey> = (typeof collections)[K] extends { format: "md" | "mdx" }
  ? { body: string }
  : unknown;

/** A validated entry. Markdown and MDX collections carry their body text alongside the front matter. */
export type CollectionEntry<K extends CollectionKey> = z.output<(typeof collections)[K]["schema"]> &
  WithBody<K>;
export type SingletonValue<K extends SingletonKey> = z.output<(typeof singletons)[K]["schema"]>;

export const collectionKeys = Object.keys(collections) as CollectionKey[];
export const singletonKeys = Object.keys(singletons) as SingletonKey[];

/** Top-level names in content/ that are not collections or singletons but are expected. */
export const NON_CONTENT_ENTRIES = new Set(["media"]);
