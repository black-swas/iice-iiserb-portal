import { ExternalLink } from "lucide-react";
import type { ComponentProps } from "react";
import { t } from "@/lib/i18n";
import { isInternal } from "@/lib/nav";

type AnchorProps = Omit<ComponentProps<"a">, "href">;
interface SmartLinkProps extends AnchorProps {
  href: string;
  /** Hide the small external-link icon on an https link (the "opens in new tab" text for screen readers stays). */
  hideExternalIcon?: boolean;
}

/**
 * Every link in the product goes through this. A site path is a plain `<a href>`, not `next/link`: the site is static
 * pages, so a click is an ordinary page load. That costs nothing the visitor would notice, and it avoids what the router
 * adds: three or four prefetch requests for every link in view, and 404s for the catch-all route's prefetch files, which
 * Next's static export names differently from the files it writes. An https link opens in a new tab with
 * `noopener noreferrer`, an icon and "(opens in new tab)" for screen readers (TRD §14, GIGW); mailto: and tel: stay plain.
 */
export function SmartLink({ href, children, hideExternalIcon = false, ...rest }: SmartLinkProps) {
  if (isInternal(href)) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  if (/^https?:/i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
        {hideExternalIcon ? null : (
          <ExternalLink aria-hidden="true" className="ml-1 inline size-[0.85em] align-baseline" />
        )}
        <span className="sr-only"> {t("a11y.opensInNewTab")}</span>
      </a>
    );
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
