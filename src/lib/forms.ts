/**
 * Form transport (TRD §10.1, BACKEND_SCHEMA §5.1–5.6): builds the envelope, posts it as a "simple" cross-origin request
 * and reads the endpoint's reply. The endpoint is swappable: anything that accepts the same JSON works, and
 * `normaliseResponse` accepts the shapes other form services reply with. Browser-safe: no Zod, no i18n catalogue.
 */

export type FormResponse =
  { ok: true; id: string } | { ok: false; errors: Record<string, string>; message?: string };

/** What the page gets back from `submitForm`: the endpoint's answer, or a note that it could not be reached. */
export type SubmitResult =
  FormResponse | { ok: false; errors: Record<string, never>; network: true };

export interface Envelope {
  formType: string;
  schemaVersion: 1;
  submittedAt: string;
  startedAt: string;
  pageUrl: string;
  locale: "en";
  website: string;
  consent: true;
  data: Record<string, unknown>;
}

export function buildEnvelope(
  formType: string,
  data: Record<string, unknown>,
  context: { pageUrl: string; startedAt: string; website?: string; now?: Date },
): Envelope {
  return {
    formType,
    schemaVersion: 1,
    submittedAt: (context.now ?? new Date()).toISOString(),
    startedAt: context.startedAt,
    pageUrl: context.pageUrl,
    locale: "en",
    website: context.website ?? "",
    consent: true,
    data,
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Reads field errors from `{ path: message }` or from `[{ field | path, message }]` (the shape other services use). */
function readErrors(value: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!isRecord(item)) continue;
      const path = item.path ?? item.field;
      if (typeof path === "string" && typeof item.message === "string") errors[path] = item.message;
    }
  } else if (isRecord(value)) {
    for (const [path, message] of Object.entries(value))
      if (typeof message === "string") errors[path] = message;
  }
  return errors;
}

/** Turns whatever JSON the endpoint sent into a FormResponse. Anything unrecognised is a failure, never a false success. */
export function normaliseResponse(json: unknown): FormResponse {
  if (!isRecord(json)) return { ok: false, errors: {} };
  if (json.ok === true) return { ok: true, id: typeof json.id === "string" ? json.id : "" };
  const message =
    typeof json.message === "string"
      ? json.message
      : typeof json.error === "string"
        ? json.error
        : undefined;
  return { ok: false, errors: readErrors(json.errors), ...(message ? { message } : {}) };
}

/**
 * POSTs the envelope as `text/plain` so the browser sends no preflight request (Apps Script cannot answer one) and
 * reads the JSON reply. A network failure, a timeout or a reply that is not JSON all come back as `network: true`, so the
 * page keeps what was typed and offers a retry and an email fallback.
 */
export async function submitForm(
  endpoint: string,
  envelope: Envelope,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<SubmitResult> {
  const { fetchImpl = fetch, timeoutMs = 20_000 } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(envelope),
      signal: controller.signal,
    });
    return normaliseResponse(await response.json());
  } catch {
    return { ok: false, errors: {}, network: true };
  } finally {
    clearTimeout(timer);
  }
}

/** A `mailto:` link, with the body trimmed so the whole address stays within what mail programs accept. */
export function mailtoHref(to: string, subject: string, body = ""): string {
  const trimmed = body.length > 1500 ? `${body.slice(0, 1500)}…` : body;
  const query = [
    `subject=${encodeURIComponent(subject)}`,
    ...(trimmed ? [`body=${encodeURIComponent(trimmed)}`] : []),
  ];
  return `mailto:${to}?${query.join("&")}`;
}

/** Replaces `{name}` placeholders in a string the server already translated. */
export function fill(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
