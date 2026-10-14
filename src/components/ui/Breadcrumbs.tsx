import { getKnownRoutes } from "@/content/routes";
import { breadcrumbJsonLd, type Crumb } from "@/lib/jsonld";
import { t } from "@/lib/i18n";
import { isBuilt } from "@/lib/nav";
import { JsonLd } from "./JsonLd";
import { SmartLink } from "./SmartLink";

/**
 * The visible trail on every internal page (FR-GLOBAL-16), matching the BreadcrumbList JSON-LD. Home comes first and the
 * last crumb is the current page. A parent whose page does not exist is shown as plain text, never as a dead link.
 */
export function Breadcrumbs({ trail }: { trail: readonly Crumb[] }) {
  const routes = getKnownRoutes();
  const all: Crumb[] = [{ label: t("common.home"), href: "/" }, ...trail];
  return (
    <>
      <nav aria-label={t("common.breadcrumb")} className="breadcrumbs">
        <ol>
          {all.map((crumb, i) => {
            const last = i === all.length - 1;
            return (
              <li key={`${crumb.label}-${i}`}>
                {!last && crumb.href && isBuilt(crumb.href, routes) ? (
                  <SmartLink href={crumb.href}>{crumb.label}</SmartLink>
                ) : (
                  <span {...(last ? { "aria-current": "page" as const } : {})}>{crumb.label}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(all)} />
    </>
  );
}
