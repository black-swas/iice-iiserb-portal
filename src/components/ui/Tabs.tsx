"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export interface TabItem {
  /** The tab's anchor: `/page/#id` opens it. Also the id of its panel. */
  id: string;
  label: string;
  /** Older anchors that should open this tab (legacy links, SRD §7). */
  aliases?: readonly string[];
  panel: ReactNode;
}

/**
 * ARIA tabs for pages whose sections are peers (the team and its four committees, careers). Every panel is in the
 * server-rendered HTML. Without script, CSS (`@media (scripting: none)`) hides the tab list and stacks the panels under
 * their headings; with it, one panel shows at a time, the URL hash selects a tab and arrow keys move between them.
 */
export function Tabs({ label, tabs }: { label: string; tabs: readonly TabItem[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const root = useRef<HTMLDivElement>(null);

  const fromHash = useCallback(
    (hash: string): string | undefined => {
      const id = decodeURIComponent(hash.replace(/^#/, ""));
      return tabs.find((tab) => tab.id === id || tab.aliases?.includes(id))?.id;
    },
    [tabs],
  );

  useEffect(() => {
    const apply = () => {
      const id = fromHash(window.location.hash);
      if (!id) return;
      setActive(id);
      requestAnimationFrame(() => root.current?.scrollIntoView({ block: "start" }));
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [fromHash]);

  const select = (id: string, focus = false) => {
    setActive(id);
    window.history.replaceState(null, "", `#${id}`);
    if (focus) buttons.current[id]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    const target =
      event.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    const next = tabs[target];
    if (next) select(next.id, true);
  };

  return (
    <div className="tabs" ref={root}>
      <div role="tablist" aria-label={label} className="tabs__list">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => {
              buttons.current[tab.id] = el;
            }}
            type="button"
            data-action="select-tab"
            role="tab"
            id={`${tab.id}-tab`}
            aria-selected={tab.id === active}
            aria-controls={tab.id}
            tabIndex={tab.id === active ? 0 : -1}
            className="tabs__tab"
            onClick={() => select(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <section
          key={tab.id}
          role="tabpanel"
          id={tab.id}
          aria-labelledby={`${tab.id}-tab`}
          tabIndex={0}
          data-state={tab.id === active ? "active" : "inactive"}
          className="tabs__panel"
        >
          <h2 className="tabs__panel-title">{tab.label}</h2>
          {tab.panel}
        </section>
      ))}
    </div>
  );
}
