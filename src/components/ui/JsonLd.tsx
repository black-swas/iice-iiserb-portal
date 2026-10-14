import { jsonLdScript } from "@/lib/jsonld";

/** Structured data for crawlers. Not visible, not interactive. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />
  );
}
