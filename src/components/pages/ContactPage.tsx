import { MapPin } from "lucide-react";
import { Form } from "@/components/forms/Form";
import { MapEmbed } from "@/components/layout/MapEmbed";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection } from "@/components/ui/PageSection";
import { SmartLink } from "@/components/ui/SmartLink";
import { getSiteSettings } from "@/content/loaders";
import { display } from "@/content/todo";
import { telHref } from "@/lib/contact";
import { t } from "@/lib/i18n";
import type { PageDef } from "./types";

/**
 * `/contact/` (SPEC §4.10): the contact form beside the address card, the direct channels IICE has confirmed, and the
 * click-to-load map. Office hours and a response time appear only when IICE has supplied them.
 */
export const contactPage: PageDef = {
  meta: () => ({ title: t("pages.contact.title"), description: t("pages.contact.description") }),
  render: () => {
    const site = getSiteSettings();
    return (
      <>
        <PageHeader
          trail={[{ label: t("pages.contact.title") }]}
          eyebrow={t("pages.contact.eyebrow")}
          title={t("pages.contact.title")}
          lead={t("pages.contact.description")}
        />
        <div className="contact-layout wrapper py-section">
          <section aria-labelledby="contact-form-title" className="contact-layout__form">
            <h2 id="contact-form-title">{t("pages.contact.formTitle")}</h2>
            {site.responseTime ? <p className="muted">{display(site.responseTime)}</p> : null}
            <Form type="contact" path="/contact/" />
          </section>
          <aside aria-labelledby="contact-address-title" className="card contact-layout__address">
            <h2 id="contact-address-title" className="card__title">
              {t("pages.contact.addressTitle")}
            </h2>
            <address>
              {site.address.lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              <span className="block">
                {site.address.city}, {site.address.region} {site.address.postalCode}
              </span>
            </address>
            {site.officeHours ? (
              <p>
                <strong>{t("footer.officeHours")}:</strong> {display(site.officeHours)}
              </p>
            ) : null}
            {site.directionsUrl ? (
              <p>
                <SmartLink href={site.directionsUrl}>
                  <MapPin aria-hidden="true" className="inline size-4" /> {t("footer.directions")}
                </SmartLink>
              </p>
            ) : null}
            <ul className="plain-list">
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
          </aside>
        </div>

        <PageSection id="channels" title={t("pages.contact.channelsTitle")} tone="surface">
          <ul className="card-grid card-grid--3">
            {site.contactChannels.map((channel) => (
              <li key={channel.intent} className="card">
                <h3 className="card__title">{display(channel.label)}</h3>
                {channel.person ? <p>{display(channel.person)}</p> : null}
                <ul className="plain-list">
                  {channel.email ? (
                    <li>
                      <a href={`mailto:${channel.email}`}>{channel.email}</a>
                    </li>
                  ) : null}
                  {channel.phone ? (
                    <li>
                      <a href={telHref(channel.phone)}>{channel.phone}</a>
                    </li>
                  ) : null}
                </ul>
              </li>
            ))}
          </ul>
        </PageSection>

        {site.mapEmbedUrl ? (
          <PageSection id="map" title={t("pages.contact.mapTitle")}>
            <MapEmbed url={site.mapEmbedUrl} />
          </PageSection>
        ) : null}
      </>
    );
  },
};
