import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@/components/layout/Analytics";
import { FloatingPitch } from "@/components/layout/FloatingPitch";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { UtilityBar } from "@/components/layout/UtilityBar";
import { JsonLd } from "@/components/ui/JsonLd";
import { getSiteSettings } from "@/content/loaders";
import { showTodoMarkers } from "@/content/todo";
import { buildAnalytics } from "@/lib/analytics";
import { DEFAULT_LOCALE, t } from "@/lib/i18n";
import { organizationJsonLd } from "@/lib/jsonld";
import { SITE_URL, feedAlternates } from "@/lib/seo";
import { THEME_SCRIPT } from "@/lib/theme";
import "@/styles/globals.css";

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("site.defaultTitle"), template: t("site.titleTemplate") },
    description: t("site.description"),
    alternates: feedAlternates(),
    // A preview with placeholders must never be indexed (TRD §11.1).
    ...(showTodoMarkers() && process.env.NODE_ENV === "production"
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const analytics = buildAnalytics();
  return (
    // The theme script sets the `dark` class before first paint, so the server markup and the client can differ here.
    <html lang={DEFAULT_LOCALE} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-pill focus:bg-primary-700 focus:px-4 focus:py-2 focus:text-on-primary"
        >
          {t("a11y.skipToContent")}
        </a>
        <JsonLd data={organizationJsonLd(getSiteSettings())} />
        <UtilityBar />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <FloatingPitch />
        {analytics ? <Analytics config={analytics} /> : null}
      </body>
    </html>
  );
}
