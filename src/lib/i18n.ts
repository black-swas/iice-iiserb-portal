import en from "../../messages/en.json";

export const LOCALES = ["en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

type Messages = typeof en;

/** Dotted paths to every string leaf of the catalogue, e.g. "site.name" | "a11y.skipToContent". */
type LeafPaths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends Record<string, unknown>
      ? LeafPaths<T[K], `${Prefix}${K}.`>
      : never;
}[keyof T & string];

export type MessageKey = LeafPaths<Messages>;
export type MessageParams = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: MessageParams) => string;

const catalogues: Record<Locale, Messages> = { en };

const PLACEHOLDER = /\{(\w+)\}/g;

export function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/** Replaces `{name}` placeholders. A missing param throws so the build fails instead of shipping "{count}". */
export function interpolate(message: string, params: MessageParams = {}, key = "message"): string {
  return message.replace(PLACEHOLDER, (_match, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`i18n: "${key}" needs a value for {${name}}`);
    return String(value);
  });
}

export function createT(locale: Locale): Translate {
  const messages = catalogues[locale];
  return (key, params) => {
    const message = lookup(messages, key);
    if (message === undefined) throw new Error(`i18n: no "${key}" message for locale "${locale}"`);
    return interpolate(message, params, key);
  };
}

export const t: Translate = createT(DEFAULT_LOCALE);

export type EnumName = keyof Messages["enums"];

/**
 * The display label of a closed-enum value ("iot-ai" → "Internet of Things & Artificial Intelligence"). A value with no
 * label throws, so a facet or badge can never show a raw slug (BACKEND_SCHEMA §2.2).
 */
export function enumLabel(name: EnumName, value: string, locale: Locale = DEFAULT_LOCALE): string {
  const label = (catalogues[locale].enums[name] as Record<string, string> | undefined)?.[value];
  if (label === undefined) throw new Error(`i18n: no label for enums.${name}.${value}`);
  return label;
}

/** A message by a key built at run time (form field text is keyed by the field's path), or undefined if there is none. */
export function messageIfPresent(
  key: string,
  params?: MessageParams,
  locale: Locale = DEFAULT_LOCALE,
): string | undefined {
  const message = lookup(catalogues[locale], key);
  return message === undefined ? undefined : interpolate(message, params, key);
}

/** Like `t`, for a key assembled from data (`forms.options.legalEntity.pvt-ltd`). A missing key throws, as `t` does. */
export function dynamicT(
  key: string,
  params?: MessageParams,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const message = messageIfPresent(key, params, locale);
  if (message === undefined) throw new Error(`i18n: no "${key}" message for locale "${locale}"`);
  return message;
}
