import { Form } from "@/components/forms/Form";
import { getCollection, getHomePage } from "@/content/loaders";
import { downloadableDocuments } from "@/content/queries";
import { getPublicFileCheck } from "@/content/routes";
import { display } from "@/content/todo";
import { t } from "@/lib/i18n";

/**
 * Home "Pitch to Us" band (SPEC §3 #13): an amber band, with dark ink as the hard rule requires, holding the short pitch
 * form on a plain card so the form's own colours keep their contrast. The full application lives at /apply/.
 */
export function PitchBand() {
  const { pitchBand } = getHomePage();
  const template = downloadableDocuments(
    getCollection("documents").filter((d) => d.slug === "pitch-deck-template"),
    getPublicFileCheck(),
  )[0];
  return (
    <section id="pitch" aria-labelledby="pitch-title" className="pitch-band">
      <div className="pitch-band__inner wrapper-wide">
        <div className="pitch-band__text">
          <h2 id="pitch-title" className="pitch-band__title">
            {display(pitchBand.title)}
          </h2>
          <p>{display(pitchBand.body)}</p>
          {template ? (
            <p>
              <a href={`/${template.file}`} download>
                {t("home.pitchTemplate")}
              </a>
            </p>
          ) : null}
        </div>
        <div className="pitch-band__form">
          <Form type="pitch" path="/" />
        </div>
      </div>
    </section>
  );
}
