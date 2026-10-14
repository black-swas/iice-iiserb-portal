"use client";

import { Command } from "cmdk";
import { ExternalLink, Search, X } from "lucide-react";
import { useMemo, useRef, useState, useEffect } from "react";
import { useNow } from "@/lib/clock";
import { formatDate } from "@/lib/dates";
import { useBackdropClose } from "@/lib/dialog";
import { t } from "@/lib/i18n";
import {
  createSearcher,
  groupResults,
  isExternalUrl,
  type SearchDoc,
  type SearchIndexFile,
  type Searcher,
  type SearchType,
} from "@/lib/search";
import { windowStatus } from "@/lib/status";
import { applyTheme, nextTheme, readTheme } from "@/lib/theme";

export interface PaletteProps {
  open: boolean;
  onClose: () => void;
  /** Where "Apply for Incubation" goes, or null while that page does not exist. */
  applyHref: string | null;
  /** The address "Copy the IICE email address" copies. */
  email: string | null;
}

type Load =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; searcher: Searcher; docs: SearchDoc[] };

const RECENT_KEY = "iice:search:recent:v1";
const RECENT_MAX = 5;

/** One fetch per page view, shared by every open. A failure is forgotten so the next open can retry. */
let indexRequest: Promise<SearchDoc[]> | undefined;
function loadDocs(): Promise<SearchDoc[]> {
  indexRequest ??= fetch("/search-index.json")
    .then((response) => {
      if (!response.ok) throw new Error(`search index: ${response.status}`);
      return response.json() as Promise<SearchIndexFile>;
    })
    .then((file) => file.docs);
  indexRequest.catch(() => {
    indexRequest = undefined;
  });
  return indexRequest;
}

function readRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((q): q is string => typeof q === "string").slice(0, RECENT_MAX)
      : [];
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* storage blocked: recent searches just are not remembered */
  }
}

function hintFor(doc: SearchDoc, now: string): string | undefined {
  if (doc.type === "opportunity" && doc.window) {
    const status = windowStatus(doc.window, now);
    if (status === "open") return t("search.hints.open");
    if (status === "rolling") return t("search.hints.rolling");
    if (status === "closed") return t("search.hints.closed");
    return t("search.hints.upcoming");
  }
  if (doc.hint) return doc.hint;
  return doc.date ? formatDate(doc.date) : undefined;
}

// Never rendered on the server, so any fixed value will do for the first render.
const CLIENT_ONLY = new Date(0).toISOString();

/**
 * The command palette (SPEC §5.2, TRD §8.3): a modal dialog with a combobox and listbox from cmdk, results from
 * MiniSearch over /search-index.json. It is its own chunk, loaded the first time the palette is asked for. The dialog
 * is a native `<dialog>`: the browser keeps focus inside, Escape closes it, the page behind is inert, and focus returns
 * to where it was. Matching is MiniSearch's, so cmdk's own filtering is switched off.
 */
export function CommandPalette({ open, onClose, applyHref, email }: PaletteProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const now = useNow(CLIENT_ONLY);
  const [query, setQuery] = useState("");
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [notice, setNotice] = useState("");
  const [recent, setRecent] = useState<string[]>(readRecent);
  useBackdropClose(dialog);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      // showModal() focuses the first focusable element, which is cmdk's tabindex="-1" root, not the input.
      el.querySelector<HTMLInputElement>("input[cmdk-input]")?.focus();
    }
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (!open || load.status === "ready") return;
    let live = true;
    loadDocs().then(
      (docs) => live && setLoad({ status: "ready", searcher: createSearcher(docs), docs }),
      () => live && setLoad({ status: "error" }),
    );
    return () => {
      live = false;
    };
  }, [open, load.status]);

  const text = query.trim();
  const results = useMemo(
    () => (load.status === "ready" && text ? groupResults(load.searcher.search(text)) : []),
    [load, text],
  );
  const pages = useMemo(
    () => (load.status === "ready" ? load.docs.filter((d) => d.type === "page").slice(0, 8) : []),
    [load],
  );

  const actions = useMemo(() => {
    const all: { id: string; label: string; run: () => void }[] = [];
    if (applyHref)
      all.push({
        id: "apply",
        label: t("search.actions.apply"),
        run: () => window.location.assign(applyHref),
      });
    all.push({
      id: "theme",
      label: t("search.actions.theme"),
      run: () => applyTheme(nextTheme(readTheme())),
    });
    if (email) {
      all.push({
        id: "copy-email",
        label: t("search.actions.copyEmail"),
        run: () => {
          void navigator.clipboard
            ?.writeText(email)
            .then(() => setNotice(t("search.actions.copied")));
        },
      });
    }
    const q = text.toLowerCase();
    return q ? all.filter((a) => a.label.toLowerCase().includes(q)) : all;
  }, [applyHref, email, text]);

  const closeDialog = () => dialog.current?.close();

  const remember = () => {
    if (text.length < 2) return;
    const next = [text, ...recent.filter((q) => q.toLowerCase() !== text.toLowerCase())].slice(
      0,
      RECENT_MAX,
    );
    setRecent(next);
    writeRecent(next);
  };

  const pick = (doc: SearchDoc) => {
    remember();
    closeDialog();
    if (isExternalUrl(doc.url)) window.open(doc.url, "_blank", "noopener,noreferrer");
    else window.location.assign(doc.url); // a plain page load, like every other link on the site
  };

  const renderDoc = (doc: SearchDoc) => {
    const hint = hintFor(doc, now);
    return (
      <Command.Item key={doc.id} value={doc.id} className="palette-item" onSelect={() => pick(doc)}>
        <span className="palette-item__main">
          <span className="palette-item__title">{doc.title}</span>
          {doc.summary ? <span className="palette-item__summary">{doc.summary}</span> : null}
        </span>
        {hint ? <span className="palette-item__hint">{hint}</span> : null}
        {isExternalUrl(doc.url) ? (
          <>
            <ExternalLink aria-hidden="true" className="palette-item__icon" />
            <span className="sr-only">{t("a11y.opensInNewTab")}</span>
          </>
        ) : null}
      </Command.Item>
    );
  };

  return (
    <dialog
      ref={dialog}
      className="palette"
      aria-modal="true"
      aria-label={t("search.dialogLabel")}
      onClose={() => {
        setQuery("");
        setNotice("");
        onClose();
      }}
    >
      <div className="palette__panel">
        <Command label={t("search.dialogLabel")} shouldFilter={false} loop>
          <div className="palette__bar">
            <Search aria-hidden="true" className="palette__search-icon" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={t("search.placeholder")}
              className="palette__input"
            />
            <button
              type="button"
              data-action="close-search"
              className="util-button"
              aria-label={t("search.close")}
              onClick={closeDialog}
            >
              <X aria-hidden="true" />
            </button>
          </div>

          <Command.List className="palette__list">
            {load.status === "loading" ? (
              <Command.Loading>{t("search.loading")}</Command.Loading>
            ) : null}
            {load.status === "error" ? (
              <div className="palette__message" role="alert">
                {t("search.error")}{" "}
                <button
                  type="button"
                  data-action="retry-search"
                  onClick={() => setLoad({ status: "loading" })}
                >
                  {t("search.retry")}
                </button>
              </div>
            ) : null}

            {load.status === "ready" && text ? (
              <Command.Empty className="palette__message">
                {t("search.empty", { query: text })}
              </Command.Empty>
            ) : null}

            {text === "" && recent.length > 0 ? (
              <Command.Group heading={t("search.recent")}>
                {recent.map((q) => (
                  <Command.Item
                    key={q}
                    value={`recent:${q}`}
                    className="palette-item"
                    onSelect={() => setQuery(q)}
                  >
                    <span className="palette-item__title">{q}</span>
                  </Command.Item>
                ))}
                <Command.Item
                  value="recent:clear"
                  className="palette-item palette-item--quiet"
                  onSelect={() => {
                    setRecent([]);
                    writeRecent([]);
                  }}
                >
                  {t("search.clearRecent")}
                </Command.Item>
              </Command.Group>
            ) : null}

            {text === ""
              ? pages.length > 0 && (
                  <Command.Group heading={t("search.groups.page")}>
                    {pages.map(renderDoc)}
                  </Command.Group>
                )
              : results.map((group) => (
                  <Command.Group
                    key={group.type}
                    heading={t(`search.groups.${group.type as SearchType}`)}
                  >
                    {group.docs.map(renderDoc)}
                  </Command.Group>
                ))}

            {actions.length > 0 ? (
              <Command.Group heading={t("search.groups.action")}>
                {actions.map((action) => (
                  <Command.Item
                    key={action.id}
                    value={`action:${action.id}`}
                    className="palette-item"
                    onSelect={action.run}
                  >
                    <span className="palette-item__title">{action.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
          </Command.List>
        </Command>
        <p className="palette__help">{t("search.help")}</p>
        <p className="sr-only" role="status">
          {notice}
        </p>
      </div>
    </dialog>
  );
}
