import { SmartLink } from "@/components/ui/SmartLink";
import { t } from "@/lib/i18n";
import { AnnouncementTicker } from "./AnnouncementTicker";
import { getChrome } from "./chrome";
import { SocialLinks } from "./SocialLinks";
import { GigwControls } from "./ThemeToggle";

/**
 * GIGW 3.0 / MeitY DBIM Top Attribution & Accessibility Bar + Official Notification Strip.
 * Note: ThemeToggle and SearchTrigger live in SiteHeader so each control exists once in the DOM.
 */
export function UtilityBar() {
  const { site, announcements, buildTime } = getChrome();
  return (
    <>
      <div className="tricolour-bar" aria-hidden="true" />
      <div
        className="utility-bar"
        role="region"
        aria-label="Government of India attribution and accessibility controls"
      >
        <div className="utility-bar__inner wrapper-wide">
          <div className="gov-attribution">
            <span>
              भारत सरकार | <strong>GOVERNMENT OF INDIA</strong>
            </span>
            <span className="gov-attribution__sep" aria-hidden="true">
              ·
            </span>
            <span>
              शिक्षा मंत्रालय | <strong>MINISTRY OF EDUCATION</strong>
            </span>
            <span className="gov-attribution__sep" aria-hidden="true">
              ·
            </span>
            <span className="gov-attribution__inst">
              विज्ञान एवं प्रौद्योगिकी विभाग (DST NIDHI-TBI) · <strong>IISER BHOPAL</strong>
            </span>
          </div>
          <div className="utility-bar__tools">
            <SmartLink href="/screen-reader-access/" className="gigw-btn">
              Screen Reader Access
            </SmartLink>
            <SmartLink href="/accessibility/" className="gigw-btn">
              Accessibility
            </SmartLink>
            <SmartLink href="/sitemap/" className="gigw-btn">
              Sitemap
            </SmartLink>
            <GigwControls />
            <SocialLinks socials={site.socials} className="social-links social-links--bar" />
            {site.startupPortalUrl ? (
              <SmartLink href={site.startupPortalUrl} className="utility-link">
                {t("utility.startupPortal")}
              </SmartLink>
            ) : null}
          </div>
        </div>
      </div>
      {announcements.length > 0 ? (
        <div className="notice-strip" role="region" aria-label={t("utility.announcements")}>
          <div className="notice-strip__inner wrapper-wide">
            <span className="notice-strip__badge">Official Notices</span>
            <AnnouncementTicker items={announcements} buildTime={buildTime} />
          </div>
        </div>
      ) : null}
    </>
  );
}
