import { Picture } from "@/components/ui/Picture";
import { SmartLink } from "@/components/ui/SmartLink";
import type { SiteSettings } from "@/content/schema";
import { t } from "@/lib/i18n";

/**
 * Official Institutional Masthead Lockup (GIGW 3.0 & iiserb.ac.in inspired):
 * Architectural Monogram Crest + Bilingual Hindi/English Title + Host Institute & DST NIDHI-TBI Subtitle.
 */
export function BrandMark({ logo }: { logo: SiteSettings["logo"] }) {
  return (
    <SmartLink href="/" className="brand" aria-label={t("header.home")}>
      {logo ? (
        <>
          <Picture image={logo.light} priority className="brand__logo dark:hidden" sizes="160px" />
          <Picture
            image={logo.dark}
            priority
            className="brand__logo hidden dark:block"
            sizes="160px"
          />
        </>
      ) : (
        <div className="brand__lockup">
          <div className="brand__emblem" aria-hidden="true">
            <span className="brand__emblem-top">IISER BHOPAL</span>
            <span className="brand__emblem-main">IICE</span>
            <span className="brand__emblem-sub">NIDHI-TBI</span>
          </div>
          <div className="brand__titles">
            <span className="brand__hi" id="iice-masthead-hi">
              नवप्रवर्तन एवं उद्यमिता इन्क्यूबेशन केंद्र (IICE) · भा.वि.शि.अ.सं. भोपाल
            </span>
            <span className="brand__name" id="iice-masthead-title">
              Innovation and Incubation Centre for Entrepreneurship (IICE)
            </span>
            <span className="brand__host">
              Indian Institute of Science Education and Research (IISER) Bhopal · Supported by DST (NIDHI-TBI), Govt. of India
            </span>
          </div>
        </div>
      )}
    </SmartLink>
  );
}
