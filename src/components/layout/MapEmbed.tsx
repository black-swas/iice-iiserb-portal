"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import { t } from "@/lib/i18n";

/**
 * Click-to-load map (FR-GLOBAL-6, NFR-SEC-3). Nothing is requested from the map provider until the visitor asks:
 * the facade is plain markup, and the iframe, which must have a title, only appears after the click.
 */
export function MapEmbed({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  if (loaded) {
    return (
      <iframe
        src={url}
        title={t("map.title")}
        className="map-frame"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    );
  }
  return (
    <div className="map-facade">
      <button
        type="button"
        data-action="load-map"
        className="map-facade__button"
        onClick={() => setLoaded(true)}
      >
        <MapPin aria-hidden="true" />
        {t("map.load")}
      </button>
      <p className="map-facade__note">{t("map.note")}</p>
    </div>
  );
}
