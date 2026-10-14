/**
 * Analytics (TRD §11, §14, SRD Q7): off unless a build sets NEXT_PUBLIC_ANALYTICS_PROVIDER. Only cookieless providers are
 * supported (Plausible, Umami). GA4 needs a consent banner, which the site does not have, so choosing it enables nothing
 * rather than tracking without consent. Pure, so the CSP step and the tests can read the same configuration.
 */
import { originOf } from "./origins";

export type Provider = "none" | "plausible" | "umami" | "ga4";

export interface AnalyticsEnv {
  provider?: string | undefined;
  id?: string | undefined;
  /** Where the provider's script is served from: needed for a self-hosted Plausible or Umami. */
  host?: string | undefined;
}

export interface AnalyticsConfig {
  provider: "plausible" | "umami";
  /** The script to load, after the page is idle. */
  script: string;
  /** Attributes the script needs, e.g. `data-domain`. */
  attributes: Record<string, string>;
  /** The provider's origin, which the page's CSP must allow for the script and for its events. */
  origin: string;
}

const DEFAULT_HOSTS = {
  plausible: "https://plausible.io",
  umami: "https://cloud.umami.is",
} as const;

/** The configuration to run, or null when analytics is off, incomplete, or a provider the site does not support. */
export function analyticsConfig(env: AnalyticsEnv): AnalyticsConfig | null {
  const provider = (env.provider ?? "none").trim().toLowerCase();
  const id = env.id?.trim();
  if ((provider !== "plausible" && provider !== "umami") || !id) return null;
  const host = (env.host?.trim() || DEFAULT_HOSTS[provider]).replace(/\/+$/, "");
  const origin = originOf(host);
  if (!origin) return null;
  return provider === "plausible"
    ? { provider, script: `${host}/js/script.js`, attributes: { "data-domain": id }, origin }
    : { provider, script: `${host}/script.js`, attributes: { "data-website-id": id }, origin };
}

/** The configuration for this build, from the public environment variables. */
export const buildAnalytics = (): AnalyticsConfig | null =>
  analyticsConfig({
    provider: process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER,
    id: process.env.NEXT_PUBLIC_ANALYTICS_ID,
    host: process.env.NEXT_PUBLIC_ANALYTICS_HOST,
  });
