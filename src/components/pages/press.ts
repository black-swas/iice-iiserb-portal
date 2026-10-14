import { toMs } from "@/lib/dates";
import type { PressItem } from "@/content/schema";

/** Newest first. */
export const sortPress = (items: readonly PressItem[]): PressItem[] =>
  [...items].sort((a, b) => toMs(b.date) - toMs(a.date));
