import { PageHeader } from "@/components/ui/PageHeader";
import { Prose } from "@/components/ui/Prose";
import { getPage } from "@/content/loaders";
import { display } from "@/content/todo";
import type { Crumb } from "@/lib/jsonld";
import type { PageDef } from "./types";

function load(slug: string) {
  const page = getPage(slug);
  if (!page) throw new Error(`content: page "${slug}" is missing`);
  return page;
}

/**
 * A page whose text is an editor-written MDX file in content/pages (about, ecosystem, GIGW pages…). `parent` is the
 * breadcrumb above it; with none the trail is Home › title.
 */
export function mdxPage(slug: string, parent?: Crumb): PageDef {
  return {
    meta: () => {
      const page = load(slug);
      return { title: display(page.title), description: display(page.description) };
    },
    render: () => {
      const page = load(slug);
      return (
        <>
          <PageHeader
            trail={[...(parent ? [parent] : []), { label: display(page.title) }]}
            eyebrow={page.eyebrow}
            title={display(page.title)}
            lead={display(page.description)}
          />
          <div className="wrapper py-section">
            <Prose source={page.body} format="mdx" />
          </div>
        </>
      );
    },
  };
}
