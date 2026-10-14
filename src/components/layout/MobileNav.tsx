"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { useBackdropClose } from "@/lib/dialog";
import { t } from "@/lib/i18n";
import { isCurrentPage, isCurrentSection, type ResolvedNavItem } from "@/lib/nav";

/**
 * The menu under 1024 px: a hamburger that opens a full-height drawer with an accordion of the same groups. The drawer
 * is a native modal `<dialog>`, so the browser provides the focus containment, Escape, an inert page behind it and
 * focus return to the hamburger. The Apply button stays in the header bar; `children` (the intake pill) sits in the drawer.
 */
export function MobileNav({ items, children }: { items: ResolvedNavItem[]; children?: ReactNode }) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [section, setSection] = useState<number | null>(null);
  useBackdropClose(dialog);

  // Navigating to another page closes the drawer.
  useEffect(() => {
    const el = dialog.current;
    if (el?.open) el.close();
  }, [pathname]);

  const open = () => {
    dialog.current?.showModal();
    setIsOpen(true);
  };
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        data-action="open-menu"
        className="util-button mobile-nav__open"
        aria-label={t("header.menuOpen")}
        aria-expanded={isOpen}
        aria-controls="mobile-nav"
        onClick={open}
      >
        <Menu aria-hidden="true" />
      </button>

      <dialog
        ref={dialog}
        id="mobile-nav"
        className="drawer"
        aria-modal="true"
        aria-label={t("header.menuTitle")}
        onClose={() => setIsOpen(false)}
      >
        <div className="drawer__panel">
          <div className="drawer__bar">
            <p className="drawer__title">{t("header.menuTitle")}</p>
            <button
              type="button"
              data-action="close-menu"
              className="util-button"
              aria-label={t("header.menuClose")}
              onClick={close}
            >
              <X aria-hidden="true" />
            </button>
          </div>

          <nav aria-label={t("header.primaryNav")}>
            <ul className="drawer__list">
              {items.map((item, i) => {
                if (!item.groups) {
                  return (
                    <li key={item.label}>
                      <SmartLink
                        href={item.href as string}
                        className="drawer__item"
                        onClick={close}
                        {...(item.href && isCurrentPage(item.href, pathname)
                          ? { "aria-current": "page" as const }
                          : {})}
                        {...(item.unbuilt ? { "data-todo": "unbuilt-link" } : {})}
                      >
                        {item.label}
                      </SmartLink>
                    </li>
                  );
                }
                const expanded = section === i;
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      data-action="toggle-section"
                      className="drawer__item"
                      aria-expanded={expanded}
                      aria-controls={`drawer-section-${i}`}
                      {...(isCurrentSection(item, pathname)
                        ? { "aria-current": "true" as const }
                        : {})}
                      onClick={() => setSection(expanded ? null : i)}
                    >
                      {item.label}
                      <ChevronDown aria-hidden="true" className="nav-chevron" />
                    </button>
                    <div id={`drawer-section-${i}`} hidden={!expanded} className="drawer__section">
                      {item.groups.map((group) => (
                        <div key={group.title}>
                          <p className="nav-group__title">{group.title}</p>
                          <ul>
                            {group.links.map((link) => (
                              <li key={link.href + link.label}>
                                <SmartLink
                                  href={link.href}
                                  className="nav-link"
                                  onClick={close}
                                  {...(isCurrentPage(link.href, pathname)
                                    ? { "aria-current": "page" as const }
                                    : {})}
                                  {...(link.unbuilt ? { "data-todo": "unbuilt-link" } : {})}
                                >
                                  <span className="nav-link__label">{link.label}</span>
                                  {link.description ? (
                                    <span className="nav-link__description">
                                      {link.description}
                                    </span>
                                  ) : null}
                                </SmartLink>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </nav>
          {children ? <div className="drawer__extra">{children}</div> : null}
        </div>
      </dialog>
    </>
  );
}
