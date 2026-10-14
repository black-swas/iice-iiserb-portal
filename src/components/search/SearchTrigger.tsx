"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { t } from "@/lib/i18n";
import type { PaletteProps } from "./CommandPalette";

type Palette = ComponentType<PaletteProps>;

const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const noSubscribe = () => () => undefined;

/** True when the key press is going into a field, where "/" and Ctrl+K must not be taken over. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(
    el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)),
  );
}

/**
 * The visible "Search" button and the shortcuts. The button is plain HTML; the palette (cmdk, MiniSearch and the search
 * index) is a separate chunk fetched the first time it is wanted: a click, Ctrl or Cmd+K, or "/". Hovering or focusing
 * the button fetches the chunk early, so the first open is instant.
 */
export function SearchTrigger({ applyHref, email }: Pick<PaletteProps, "applyHref" | "email">) {
  const [Palette, setPalette] = useState<Palette | null>(null);
  const [open, setOpen] = useState(false);
  const mac = useSyncExternalStore(noSubscribe, isMac, () => false);

  const load = useCallback(async () => {
    const loaded = await import("./CommandPalette");
    setPalette(() => loaded.CommandPalette);
  }, []);

  const show = useCallback(() => {
    setOpen(true);
    void load();
  }, [load]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const combo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      const slash =
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isTyping(event.target);
      if (!combo && !slash) return;
      event.preventDefault();
      show();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [show]);

  return (
    <>
      <button
        type="button"
        data-action="open-search"
        className="util-button util-button--text"
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        aria-label={t("utility.searchLabel")}
        onClick={show}
        onPointerEnter={() => void load()}
        onFocus={() => void load()}
      >
        <Search aria-hidden="true" />
        <span className="util-button__text">{t("utility.search")}</span>
        <kbd className="util-kbd" aria-hidden="true">
          {mac ? t("utility.shortcutMac") : t("utility.shortcutOther")}
        </kbd>
      </button>
      {Palette ? (
        <Palette open={open} onClose={() => setOpen(false)} applyHref={applyHref} email={email} />
      ) : null}
    </>
  );
}
