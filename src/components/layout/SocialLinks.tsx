import { SmartLink } from "@/components/ui/SmartLink";
import type { SiteSettings } from "@/content/schema";
import { t } from "@/lib/i18n";

const NETWORKS = [
  ["linkedin", "LinkedIn"],
  ["x", "X"],
  ["instagram", "Instagram"],
  ["youtube", "YouTube"],
  ["facebook", "Facebook"],
] as const;

/**
 * Only the profiles IICE has actually supplied (FR-GLOBAL-7); a missing URL hides its link. They are text links named
 * "IICE on LinkedIn", not brand icons, so there are no logos to copy and nothing is conveyed by an image alone.
 */
export function SocialLinks({
  socials,
  className,
}: {
  socials: SiteSettings["socials"];
  className?: string;
}) {
  const present = NETWORKS.flatMap(([key, name]) =>
    socials[key] ? [{ key, name, url: socials[key] as string }] : [],
  );
  if (present.length === 0) return null;
  return (
    <ul className={className ?? "social-links"}>
      {present.map(({ key, name, url }) => (
        <li key={key}>
          <SmartLink href={url} hideExternalIcon>
            <span className="sr-only">{t("footer.socialLabel", { network: name })}</span>
            <span aria-hidden="true">{name}</span>
          </SmartLink>
        </li>
      ))}
    </ul>
  );
}
