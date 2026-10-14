"use client";

import { useSyncExternalStore } from "react";

/**
 * "Now" for components whose content depends on the time (announcements, the intake pill). The server, and the first
 * client render, get the build time so hydration matches; the real time follows at once and refreshes every minute
 * (TRD §4.3: a stale build must never show expired content).
 */
const listeners = new Set<() => void>();
let snapshot = "";
let timer = 0;

const tick = () => {
  snapshot = new Date().toISOString();
  listeners.forEach((listener) => listener());
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) timer = window.setInterval(tick, 60_000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.clearInterval(timer);
  };
}

const getSnapshot = () => snapshot || (snapshot = new Date().toISOString());

export function useNow(serverNow: string): string {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverNow);
}
