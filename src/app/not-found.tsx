import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t("notFound.title"),
  description: t("notFound.description"),
  robots: { index: false, follow: true },
};

/** The 404 page (`out/404.html`): says what happened, and offers the ways back that always exist. */
export default function NotFound() {
  return (
    <div className="wrapper py-section">
      <p className="eyebrow">{t("notFound.eyebrow")}</p>
      <h1 className="mt-3 font-display text-h1">{t("notFound.title")}</h1>
      <p className="mt-4 max-w-measure text-muted">{t("notFound.body")}</p>
      <p className="button-row">
        <ButtonLink href="/" variant="primary">
          {t("notFound.home")}
        </ButtonLink>
        <ButtonLink href="/contact/" variant="secondary">
          {t("notFound.contact")}
        </ButtonLink>
      </p>
    </div>
  );
}
