import { SmartLink } from "@/components/ui/SmartLink";
import { telHref } from "@/lib/contact";
import { formatDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { getChrome } from "./chrome";
import { MapEmbed } from "./MapEmbed";
import { SocialLinks } from "./SocialLinks";

/**
 * The footer (SPEC §2.2): link groups by audience, the address and contacts, socials, the click-to-load map, and the
 * "Last updated" date and copyright, both taken from the build date so they never go stale.
 */
export function SiteFooter() {
  const { site, footerGroups, buildTime } = getChrome();
  const year = formatDate(buildTime).slice(-4);

  return (
    <footer className="site-footer" aria-label={t("footer.label")}>
      <div className="site-footer__inner wrapper-wide">
        <div className="site-footer__groups">
          {footerGroups.map((group) => (
            <section key={group.title} className="footer-group">
              <h2 className="footer-group__title">{group.title}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href + link.label}>
                    <SmartLink
                      href={link.href}
                      {...(link.unbuilt ? { "data-todo": "unbuilt-link" } : {})}
                    >
                      {link.label}
                    </SmartLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="site-footer__contact">
          <section>
            <h2 className="footer-group__title">{t("footer.visit")}</h2>
            <address>
              <p>{t("site.fullName")}</p>
              {site.address.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p>
                {site.address.city} {site.address.postalCode}, {site.address.region}
              </p>
            </address>
            {site.officeHours ? (
              <p className="footer-note">
                <span>{t("footer.officeHours")}:</span> {site.officeHours}
              </p>
            ) : null}
            {site.directionsUrl ? (
              <p>
                <SmartLink href={site.directionsUrl}>{t("footer.directions")}</SmartLink>
              </p>
            ) : null}
          </section>

          <section>
            <h2 className="footer-group__title">{t("footer.contact")}</h2>
            <ul>
              {site.phones.map((phone) => (
                <li key={phone.number}>
                  <span className="sr-only">{t("footer.phone")}: </span>
                  <a href={telHref(phone.number)}>{phone.number}</a>
                </li>
              ))}
              {site.emails.map((email) => (
                <li key={email.address}>
                  <span className="sr-only">{t("footer.email")}: </span>
                  <a href={`mailto:${email.address}`}>{email.address}</a>
                </li>
              ))}
            </ul>
            <SocialLinks socials={site.socials} />
          </section>

          {site.mapEmbedUrl ? (
            <section className="site-footer__map">
              <MapEmbed url={site.mapEmbedUrl} />
            </section>
          ) : null}
        </div>

        <div className="site-footer__legal">
          <p>{t("footer.lastUpdated", { date: formatDate(buildTime) })}</p>
          <p>{t("footer.copyright", { year })}</p>
        </div>
      </div>
    </footer>
  );
}
