import type { Crumb } from "@/lib/jsonld";
import { t } from "@/lib/i18n";

/** The parent links of the breadcrumb trails. A parent whose page does not exist shows as plain text (Breadcrumbs). */
export const crumbs = {
  about: (): Crumb => ({ label: t("pages.crumbs.about"), href: "/about/" }),
  incubation: (): Crumb => ({ label: t("pages.crumbs.incubation"), href: "/incubation/" }),
  funding: (): Crumb => ({ label: t("pages.crumbs.funding"), href: "/incubation/funding/" }),
  facilities: (): Crumb => ({
    label: t("pages.crumbs.facilities"),
    href: "/incubation/facilities/",
  }),
  startups: (): Crumb => ({ label: t("pages.crumbs.startups"), href: "/startups/" }),
  events: (): Crumb => ({ label: t("pages.crumbs.events"), href: "/events/" }),
  news: (): Crumb => ({ label: t("pages.crumbs.news"), href: "/news/" }),
};
