import { SearchTrigger } from "@/components/search/SearchTrigger";
import { SmartLink } from "@/components/ui/SmartLink";
import { t } from "@/lib/i18n";
import { AnnouncementTicker } from "./AnnouncementTicker";
import { getChrome } from "./chrome";
import { SocialLinks } from "./SocialLinks";
import { GigwControls, ThemeToggle } from "./ThemeToggle";

/**
 * GIGW 3.0 / MeitY DBIM Top Attribution & Accessibility Utility Bar + Tricolour Rule.
 */
export function UtilityBar() {
  const { site, announcements, buildTime, applyHref, email } = getChrome();
  return (
    <>
      <div className="tricolour-bar" aria-hidden="true" />
      <div className="utility-bar" role="region" aria-label="Government of India attribution and accessibility controls">
        <div className="utility-bar__inner wrapper-wide">
          <div className="gov-attribution">
            <span>भारत सरकार | <strong>GOVERNMENT OF INDIA</strong></span>
            <span className="gov-attribution__sep" aria-hidden="true">|</span>
            <span>विज्ञान और प्रौद्योगिकी विभाग | <strong>DEPT. OF SCIENCE &amp; TECHNOLOGY (DST)</strong></span>
            <span className="gov-attribution__sep" aria-hidden="true">|</span>
            <span className="gov-attribution__inst">भा.वि.शि.अ.सं. भोपाल (IISER BHOPAL)</span>
          </div>
          <div className="utility-bar__tools">
            <SmartLink href="/screen-reader-access/" className="gigw-btn">
              Screen Reader
            </SmartLink>
            <GigwControls />
            <SocialLinks socials={site.socials} className="social-links social-links--bar" />
            {site.startupPortalUrl ? (
              <SmartLink href={site.startupPortalUrl} className="utility-link">
                {t("utility.startupPortal")}
              </SmartLink>
            ) : null}
            <ThemeToggle />
            <SearchTrigger applyHref={applyHref} email={email} />
          </div>
        </div>
      </div>
      {announcements.length > 0 ? (
        <div className="notice-strip" role="region" aria-label={t("utility.announcements")}>
          <div className="notice-strip__inner wrapper-wide">
            <span className="notice-strip__badge">Notifications</span>
            <AnnouncementTicker items={announcements} buildTime={buildTime} />
          </div>
        </div>
      ) : null}
    </>
  );
}
