import type { ReactNode } from "react";

/** What a fixed page supplies to `src/app/[...slug]`: its metadata and its content. Both run on the server at build. */
export interface PageDef {
  meta: () => { title: string; description: string };
  render: () => ReactNode | Promise<ReactNode>;
}
