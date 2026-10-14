import { Picture } from "@/components/ui/Picture";
import { SmartLink } from "@/components/ui/SmartLink";
import type { SiteSettings } from "@/content/schema";
import { t } from "@/lib/i18n";

/**
 * Official Institutional Masthead Lockup: Dual IISER Bhopal & IICE NIDHI-TBI Seals + Bilingual Title.
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
          <div className="brand__seals" aria-hidden="true">
            <svg className="brand__seal" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="38" fill="#0b2545" stroke="#d97706" strokeWidth="3" />
              <circle cx="40" cy="40" r="31" fill="none" stroke="#fcd34d" strokeWidth="1" strokeDasharray="2,2" />
              <path d="M40 14 L46 28 L60 28 L49 37 L53 51 L40 42 L27 51 L31 37 L20 28 L34 28 Z" fill="none" stroke="#fcd34d" strokeWidth="1.6" />
              <circle cx="40" cy="34" r="6" fill="#f59e0b" />
              <path d="M24 58 Q40 50 56 58" fill="none" stroke="#ffffff" strokeWidth="2" />
              <text x="40" y="68" textAnchor="middle" fill="#fcd34d" fontSize="7.5" fontFamily="sans-serif" fontWeight="800">IISER BHOPAL</text>
            </svg>
            <svg className="brand__seal" viewBox="0 0 80 80">
              <rect x="3" y="3" width="74" height="74" rx="8" fill="#061527" stroke="#d97706" strokeWidth="2.5" />
              <ellipse cx="40" cy="34" rx="22" ry="9" fill="none" stroke="#6cc5d1" strokeWidth="1.8" transform="rotate(-28 40 34)" />
              <ellipse cx="40" cy="34" rx="22" ry="9" fill="none" stroke="#fcd34d" strokeWidth="1.8" transform="rotate(28 40 34)" />
              <circle cx="40" cy="34" r="4.5" fill="#f59e0b" />
              <text x="40" y="60" textAnchor="middle" fill="#ffffff" fontSize="11" fontFamily="sans-serif" fontWeight="900" letterSpacing="1">IICE</text>
              <text x="40" y="70" textAnchor="middle" fill="#94a3b8" fontSize="6.5" fontFamily="monospace" fontWeight="700">DST NIDHI-TBI</text>
            </svg>
          </div>
          <div className="brand__titles">
            <span className="brand__hi" id="iice-masthead-hi">
              नवप्रवर्तन एवं उद्यमिता इन्क्यूबेशन केंद्र (IICE) · भा.वि.शि.अ.सं. भोपाल
            </span>
            <span className="brand__name" id="iice-masthead-title">
              Innovation and Incubation Centre for Entrepreneurship (IICE)
            </span>
            <span className="brand__host">
              DST NIDHI-TBI Technology Business Incubator · Indian Institute of Science Education and Research (IISER) Bhopal
            </span>
          </div>
        </div>
      )}
    </SmartLink>
  );
}
