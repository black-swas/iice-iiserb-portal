"use client";

import { useEffect } from "react";
import type { AnalyticsConfig } from "@/lib/analytics";

/**
 * Loads the analytics script once the browser is idle, so it never competes with the page for the first paint, and not at
 * all for a visitor whose browser sends Do Not Track. Renders nothing. The provider is cookieless (see lib/analytics.ts).
 */
export function Analytics({ config }: { config: AnalyticsConfig }) {
  useEffect(() => {
    if (navigator.doNotTrack === "1") return;
    const load = () => {
      const script = document.createElement("script");
      script.src = config.script;
      script.defer = true;
      for (const [name, value] of Object.entries(config.attributes))
        script.setAttribute(name, value);
      document.head.appendChild(script);
    };
    // Safari has no requestIdleCallback; a short timer does the same job there.
    const idle = window.requestIdleCallback as typeof window.requestIdleCallback | undefined;
    if (idle) {
      const handle = idle(load, { timeout: 4000 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = window.setTimeout(load, 2000);
    return () => window.clearTimeout(timer);
  }, [config]);
  return null;
}
