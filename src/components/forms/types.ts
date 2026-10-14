/**
 * What the server hands the form engine: field definitions with their text already translated, so the browser bundle
 * carries no message catalogue and no Zod. Constraints (required, lengths, ranges) are not stored here: the engine reads
 * them from the generated form rules, so a field can never disagree with the endpoint.
 */
import type { FormType } from "@/content/forms";
import type { ViolationCode } from "@/lib/form-validate";

export type FieldKind =
  | "text"
  | "email"
  | "tel"
  | "url"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "radio"
  | "checkboxes"
  | "checkbox"
  | "list";

export interface Option {
  value: string;
  label: string;
}

export interface ResolvedField {
  /** Dotted path in the payload, also the input's `name`, so a plain HTML post carries the same keys. */
  name: string;
  kind: FieldKind;
  label: string;
  hint?: string;
  options?: Option[];
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "url";
  rows?: number;
  /** Show only while another field holds one of these values. */
  showWhen?: { name: string; in: string[] };
  /** Text shown under the field once a given option is chosen (e.g. the direct channel for a contact topic). */
  valueHints?: Record<string, string>;
  /** Fill the field from a URL query parameter, e.g. `?track=virtual` for `context.track`. */
  fromQuery?: string;
}

export interface ResolvedStep {
  id: string;
  title: string;
  description?: string;
  /** The last step of a multi-step form lists everything entered before the declarations. */
  review?: boolean;
  fields: ResolvedField[];
}

export interface ResolvedForm {
  type: FormType;
  steps: ResolvedStep[];
  /** Initial values, e.g. a contact topic chosen by the link that led here. */
  defaults: Record<string, string | string[]>;
  /** Auto-save drafts under this key (the application form). */
  draftKey?: string;
}

/** Everything the engine says, translated. `errors` holds templates with `{field}` and `{limit}`. */
export interface FormCopy {
  required: string;
  chooseOption: string;
  submit: string;
  sending: string;
  next: string;
  back: string;
  stepOf: string;
  stepsLabel: string;
  errorSummaryTitle: string;
  errors: Record<ViolationCode | "phone" | "consent", string> & {
    conditions: Record<string, string>;
  };
  consent: { before: string; link: string; after: string; privacyHref: string | null };
  success: { title: string; reference: string; body: string };
  failure: { title: string; body: string; retry: string; mailto: string };
  review: { title: string; empty: string; edit: string };
  draft: { saved: string; clear: string; restored: string };
  honeypotLabel: string;
  yes: string;
  no: string;
}

export interface MailtoContext {
  to: string;
  subject: string;
}
