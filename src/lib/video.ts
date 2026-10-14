/**
 * The privacy-enhanced YouTube embed address for a watch link (TRD §14: nothing from a video host loads until the visitor
 * asks, and then only from youtube-nocookie.com). Returns null for any other host, which stays a plain link.
 */
export function youtubeEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^(www|m)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = parsed.pathname.slice(1).split("/")[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parsed.pathname === "/watch") id = parsed.searchParams.get("v");
    else {
      const match = /^\/(?:embed|shorts|live)\/([\w-]{6,})/.exec(parsed.pathname);
      id = match?.[1] ?? null;
    }
  }
  return id && /^[\w-]{6,}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
}
