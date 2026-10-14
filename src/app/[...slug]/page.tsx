import type { Metadata } from "next";
import { resolvePage } from "@/components/pages/registry";
import { getPagePaths } from "@/content/routes";
import { pageMetadata } from "@/lib/seo";

type Params = { slug: string[] };

/** Fixed pages are served from one table (src/content/page-routes.ts), so a page that has no content is simply not built. */
export const dynamicParams = false;

const pathOf = (slug: string[]) => `/${slug.join("/")}/`;

export function generateStaticParams(): Params[] {
  return getPagePaths().map((path) => ({ slug: path.split("/").filter(Boolean) }));
}

function definitionFor(path: string) {
  const def = resolvePage(path);
  if (!def) throw new Error(`No page is registered for ${path}`);
  return def;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const path = pathOf((await params).slug);
  return pageMetadata({ ...definitionFor(path).meta(), path });
}

export default async function FixedPage({ params }: { params: Promise<Params> }) {
  return definitionFor(pathOf((await params).slug)).render();
}
