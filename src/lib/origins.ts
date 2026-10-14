/** Origins of URLs, for the Content-Security-Policy and for analytics. Pure and browser-safe (security.ts needs Node). */

/** The origin of a URL ("https://script.google.com"), or undefined for anything that is not an http(s) URL. */
export function originOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.origin : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Google Apps Script answers a POST with a redirect to script.googleusercontent.com, and a policy is checked against the
 * address a request ends up at, so both hosts are needed for the form endpoint TRD §10 names as the reference.
 */
export function endpointOrigins(endpoint: string | undefined): string[] {
  const origin = originOf(endpoint);
  if (!origin) return [];
  return origin === "https://script.google.com"
    ? [origin, "https://script.googleusercontent.com"]
    : [origin];
}
