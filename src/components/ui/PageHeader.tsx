import type { ReactNode } from "react";
import type { Crumb } from "@/lib/jsonld";
import { Breadcrumbs } from "./Breadcrumbs";

interface PageHeaderProps {
  trail: readonly Crumb[];
  eyebrow?: string | undefined;
  /** The page's one h1. */
  title: string;
  lead?: string | undefined;
  /** Actions or facts shown under the lead. */
  children?: ReactNode;
}

/** Breadcrumbs, an optional eyebrow, the page's single h1 and a lead paragraph. Every internal page starts with one. */
export function PageHeader({ trail, eyebrow, title, lead, children }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="wrapper">
        <Breadcrumbs trail={trail} />
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="page-header__title">{title}</h1>
        {lead ? <p className="page-header__lead">{lead}</p> : null}
        {children}
      </div>
    </header>
  );
}
