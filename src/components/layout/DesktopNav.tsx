"use client";

import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { t } from "@/lib/i18n";
import { isCurrentPage, isCurrentSection, type ResolvedNavItem } from "@/lib/nav";

/**
 * The desktop menu (SPEC §2.1, FR-GLOBAL-4). Parents with groups are disclosure buttons, not `role="menu"`: they open on
 * click, Enter or Space; Escape closes and returns focus to the button; clicking elsewhere or tabbing out closes. Nothing
 * is hover-only and nothing traps focus. The open panel belongs to the page it was opened on, so navigating closes it.
 */
export function DesktopNav({ items }: { items: ResolvedNavItem[] }) {
  const pathname = usePathname();
  const root = useRef<HTMLElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [opened, setOpened] = useState<{ index: number; path: string } | null>(null);
  const open = opened && opened.path === pathname ? opened.index : null;

  useEffect(() => {
    if (open === null) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpened(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpened(null);
      buttons.current[open]?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <nav
      ref={root}
      aria-label={t("header.primaryNav")}
      className="desktop-nav"
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) setOpened(null);
      }}
    >
      <ul className="desktop-nav__list">
        {items.map((item, i) => {
          const section = isCurrentSection(item, pathname);
          if (!item.groups) {
            const here = item.href ? isCurrentPage(item.href, pathname) : false;
            return (
              <li key={item.label}>
                <SmartLink
                  href={item.href as string}
                  className="nav-trigger"
                  data-current={section}
                  {...(here ? { "aria-current": "page" as const } : {})}
                  {...(item.unbuilt ? { "data-todo": "unbuilt-link" } : {})}
                >
                  {item.label}
                </SmartLink>
              </li>
            );
          }
          const expanded = open === i;
          return (
            <li key={item.label}>
              <button
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                data-action="toggle-menu"
                className="nav-trigger"
                data-current={section}
                aria-expanded={expanded}
                aria-controls={`nav-panel-${i}`}
                {...(section ? { "aria-current": "true" as const } : {})}
                onClick={() => setOpened(expanded ? null : { index: i, path: pathname })}
              >
                {item.label}
                <ChevronDown aria-hidden="true" className="nav-chevron" />
              </button>
              <div
                id={`nav-panel-${i}`}
                role="region"
                aria-label={t("header.sectionMenu", { section: item.label })}
                className="nav-panel"
                hidden={!expanded}
              >
                <div className="nav-panel__inner">
                  {item.groups.map((group) => (
                    <div key={group.title} className="nav-group">
                      <p className="nav-group__title">{group.title}</p>
                      <ul>
                        {group.links.map((link) => (
                          <li key={link.href + link.label}>
                            <SmartLink
                              href={link.href}
                              className="nav-link"
                              {...(isCurrentPage(link.href, pathname)
                                ? { "aria-current": "page" as const }
                                : {})}
                              {...(link.unbuilt ? { "data-todo": "unbuilt-link" } : {})}
                            >
                              <span className="nav-link__label">{link.label}</span>
                              {link.description ? (
                                <span className="nav-link__description">{link.description}</span>
                              ) : null}
                            </SmartLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
