import { MDXRemote } from "next-mdx-remote-client/rsc";
import type { ComponentPropsWithoutRef } from "react";
import { display } from "@/content/todo";
import { SmartLink } from "./SmartLink";

const components = {
  // The page header owns the h1, so a stray "# Heading" in editor-written text becomes an h2 rather than a second h1.
  h1: ({ children, ...props }: ComponentPropsWithoutRef<"h2">) => <h2 {...props}>{children}</h2>,
  a: ({ href, children, ...rest }: ComponentPropsWithoutRef<"a">) =>
    href ? (
      <SmartLink href={href} {...rest}>
        {children}
      </SmartLink>
    ) : (
      <span>{children}</span>
    ),
};

/**
 * Renders content text. Event, news, startup and job bodies are plain Markdown (`md`), so a `{` or `<` typed by an editor
 * is just text; the developer-owned pages and stages are MDX. A TODO_CONFIRM marker at the start is stripped (rule 1).
 * Links go through SmartLink, so external ones open safely in a new tab.
 */
export async function Prose({
  source,
  format = "md",
  className,
}: {
  source: string;
  format?: "md" | "mdx";
  className?: string;
}) {
  return (
    <div className={`prose${className ? ` ${className}` : ""}`}>
      <MDXRemote
        source={display(source)}
        options={{ mdxOptions: { format } }}
        components={components}
      />
    </div>
  );
}
