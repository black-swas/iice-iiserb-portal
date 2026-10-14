import { SmartLink } from "@/components/ui/SmartLink";
import { WindowStatus } from "@/components/ui/WindowStatus";
import type { FundingScheme } from "@/content/schema";
import { display, knownNumber } from "@/content/todo";
import { t } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";

/** A funding scheme as a card: name, provider, one line, the largest support (when confirmed) and a live status badge. */
export function SchemeCard({ scheme, serverNow }: { scheme: FundingScheme; serverNow: string }) {
  const max = scheme.atAGlance.maxSupport
    ? formatMoney({
        min: knownNumber(scheme.atAGlance.maxSupport.min),
        max: knownNumber(scheme.atAGlance.maxSupport.max),
      })
    : null;
  return (
    <article className="card card--link">
      <p className="eyebrow">{display(scheme.provider)}</p>
      <h3 className="card__title">
        <SmartLink href={`/incubation/funding/${scheme.slug}/`} className="card__link">
          {display(scheme.name)}
        </SmartLink>
      </h3>
      <p>{display(scheme.oneLiner)}</p>
      <p className="card__meta">
        <WindowStatus window={scheme.window} serverNow={serverNow} />
        {max ? <span>{t("pages.funding.support", { amount: max })}</span> : null}
      </p>
    </article>
  );
}
