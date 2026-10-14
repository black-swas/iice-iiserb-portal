"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  toPayload,
  validate,
  type FlatValues,
  type FormRules,
  type Violation,
} from "@/lib/form-validate";
import { buildEnvelope, fill, mailtoHref, submitForm } from "@/lib/forms";
import {
  constraintsFor,
  errorsByField,
  fieldForPath,
  isVisible,
  requiredNow,
  visibleFields,
  visibleValues,
} from "./constraints";
import { ErrorSummary } from "./ErrorSummary";
import { FieldControl, type FieldValue } from "./FieldControl";
import type { FormCopy, MailtoContext, ResolvedField, ResolvedForm, ResolvedStep } from "./types";

interface FormEngineProps {
  form: ResolvedForm;
  rules: FormRules;
  copy: FormCopy;
  /** Where to post. With none, a failed send falls back to email (previews and development only). */
  endpoint: string | null;
  /** Absolute URL of the page, sent so the office knows where a submission came from. */
  pageUrl: string;
  mailto: MailtoContext;
}

type Phase = "editing" | "sending" | "success" | "failed";
const DRAFT_VERSION = 1;

const fieldId = (form: ResolvedForm, name: string) => `${form.type}-${name.replace(/\./g, "-")}`;

/**
 * The form engine (TRD §10.1). The server renders every step and field as ordinary HTML that posts to the endpoint, so
 * the page works without script. Once it hydrates it takes over: it validates with the generated rules, shows one step at
 * a time, keeps a draft, posts JSON and replaces the form with a confirmation that takes focus.
 */
/** The values a live form starts with: the defaults, the link that led here, and a saved draft. Browser only. */
function readInitial(
  form: ResolvedForm,
  allFields: readonly ResolvedField[],
): { values: FlatValues; restored: boolean } {
  const query = new URLSearchParams(window.location.search);
  const fromQuery: FlatValues = {};
  for (const field of allFields) {
    const wanted = field.fromQuery ? query.get(field.fromQuery) : null;
    if (wanted && (!field.options || field.options.some((o) => o.value === wanted)))
      fromQuery[field.name] = wanted;
  }
  let draft: FlatValues = {};
  if (form.draftKey) {
    try {
      const stored = JSON.parse(window.localStorage.getItem(form.draftKey) ?? "null") as {
        v?: number;
        values?: FlatValues;
      } | null;
      if (stored?.v === DRAFT_VERSION && stored.values) {
        const known = new Set(allFields.map((f) => f.name));
        draft = Object.fromEntries(
          Object.entries(stored.values).filter(([name]) => known.has(name)),
        );
      }
    } catch {
      // A damaged draft is ignored; the form starts empty.
    }
  }
  // The link that led here wins over an old draft: it says what this visit is for.
  return {
    values: { ...form.defaults, ...draft, ...fromQuery },
    restored: Object.keys(draft).length > 0,
  };
}

const never = () => () => {};

/**
 * The server renders the form as plain HTML that posts to the endpoint. Hydration keeps that markup, then the live form
 * replaces it, starting from what the browser knows (the link's query, a saved draft). Splitting it in two means that
 * browser-only state is read when the live form is created, rather than copied in by an effect after the first paint.
 */
export function FormEngine(props: FormEngineProps) {
  const hydrated = useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
  return <LiveForm key={hydrated ? "live" : "static"} hydrated={hydrated} {...props} />;
}

function LiveForm({
  form,
  rules,
  copy,
  endpoint,
  pageUrl,
  mailto,
  hydrated: enhanced,
}: FormEngineProps & { hydrated: boolean }) {
  const allFields = useMemo(() => form.steps.flatMap((s) => s.fields), [form]);
  const [initial] = useState(() =>
    enhanced
      ? readInitial(form, allFields)
      : { values: { ...form.defaults } as FlatValues, restored: false },
  );
  const [values, setValues] = useState<FlatValues>(initial.values);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("editing");
  const [reference, setReference] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState<"" | "restored" | "saved">(
    initial.restored ? "restored" : "",
  );

  const startedAt = useRef("");
  const honeypot = useRef<HTMLInputElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const success = useRef<HTMLDivElement>(null);
  const stepHeadings = useRef<Record<string, HTMLHeadingElement | null>>({});
  const saveTimer = useRef(0);

  const multiStep = form.steps.length > 1;
  const step = form.steps[stepIndex] as ResolvedStep;
  const lastStep = stepIndex === form.steps.length - 1;

  // Fill-time check (TRD §10.1): the moment the live form appeared, not the moment the page was built.
  useEffect(() => {
    startedAt.current = new Date().toISOString();
  }, []);

  // Auto-save the application draft, debounced. Declarations are never saved: a box is ticked afresh each time.
  useEffect(() => {
    if (!enhanced || !form.draftKey || phase === "success") return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const entries = Object.entries(values).filter(
        ([name, value]) =>
          !name.startsWith("declarations.") &&
          name !== "consent" &&
          value !== undefined &&
          value !== "",
      );
      if (entries.length === 0) return;
      try {
        window.localStorage.setItem(
          form.draftKey as string,
          JSON.stringify({ v: DRAFT_VERSION, values: Object.fromEntries(entries) }),
        );
        setDraftNote("saved");
      } catch {
        // Storage can be full or blocked; the draft is a convenience, not a promise.
      }
    }, 500);
    return () => window.clearTimeout(saveTimer.current);
  }, [values, enhanced, form.draftKey, phase]);

  const clearDraft = useCallback(() => {
    if (form.draftKey) {
      try {
        window.localStorage.removeItem(form.draftKey);
      } catch {
        // Nothing to clear.
      }
    }
    setValues({ ...form.defaults });
    setErrors({});
    setStepIndex(0);
    setDraftNote("");
  }, [form]);

  useEffect(() => {
    if (phase === "success") success.current?.focus();
  }, [phase]);

  const violationsFor = useCallback(
    (current: FlatValues): Violation[] =>
      validate(rules, toPayload(rules.schema, visibleValues(form, current)), {
        expandObjects: true,
      }),
    [rules, form],
  );

  const fieldsOf = (current: FlatValues, names?: ReadonlySet<string>) =>
    visibleFields(form, current).filter((f) => !names || names.has(f.name));

  const withConsent = (found: Record<string, string>, current: FlatValues) =>
    current.consent === true ? found : { ...found, consent: copy.errors.consent };

  const recheck = (name: string, current: FlatValues) => {
    const field = allFields.find((f) => f.name === name);
    const message = field
      ? errorsByField(
          violationsFor(current).filter((v) => fieldForPath(allFields, v.path)?.name === name),
          [field],
          copy,
        )[name]
      : undefined;
    setErrors((old) => {
      const next = { ...old };
      delete next[name];
      return message ? { ...next, [name]: message } : next;
    });
  };

  const onChange = (name: string, value: FieldValue) => {
    const next = { ...values, [name]: value };
    setValues(next);
    // A field already marked wrong is re-checked as it is fixed, so the message goes away when it should.
    if (errors[name]) recheck(name, next);
  };

  const onBlur = (name: string) => {
    const field = allFields.find((f) => f.name === name);
    if (field && isVisible(field, values)) recheck(name, values);
  };

  const showErrors = (found: Record<string, string>) => {
    setErrors(found);
    requestAnimationFrame(() => summary.current?.focus());
  };

  const checkStep = (target: ResolvedStep): Record<string, string> => {
    const names = new Set(target.fields.map((f) => f.name));
    return errorsByField(
      violationsFor(values).filter((v) => names.has(fieldForPath(allFields, v.path)?.name ?? "")),
      fieldsOf(values, names),
      copy,
    );
  };

  const goToStep = (index: number) => {
    const target = form.steps[index];
    if (!target) return;
    setStepIndex(index);
    setErrors({});
    requestAnimationFrame(() => stepHeadings.current[target.id]?.focus());
  };

  const next = () => {
    const found = checkStep(step);
    if (Object.keys(found).length > 0) return showErrors(found);
    goToStep(stepIndex + 1);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    if (!enhanced) return; // without script the browser posts the form itself
    event.preventDefault();
    if (phase === "sending") return;

    const visible = visibleValues(form, values);
    const payload = toPayload(rules.schema, visible);
    const violations = validate(rules, payload, { expandObjects: true });
    const found = withConsent(errorsByField(violations, fieldsOf(values), copy), values);
    if (Object.keys(found).length > 0) {
      const firstBad = form.steps.findIndex((s) => s.fields.some((f) => f.name in found));
      if (firstBad >= 0 && firstBad !== stepIndex) setStepIndex(firstBad);
      return showErrors(found);
    }

    setErrors({});
    setFailure(null);
    setPhase("sending");
    if (!endpoint) {
      setFailure(copy.failure.body);
      return setPhase("failed");
    }
    const result = await submitForm(
      endpoint,
      buildEnvelope(form.type, payload, {
        pageUrl,
        startedAt: startedAt.current,
        website: honeypot.current?.value ?? "",
      }),
    );
    if (result.ok) {
      setReference(result.id === "SPAM" ? "" : result.id);
      if (form.draftKey) window.localStorage.removeItem(form.draftKey);
      return setPhase("success");
    }
    if ("network" in result) {
      setFailure(copy.failure.body);
      return setPhase("failed");
    }
    // The endpoint refused the data: show its field messages where they belong, or its general message.
    const server: Record<string, string> = {};
    for (const [path, message] of Object.entries(result.errors)) {
      const key = fieldForPath(allFields, path)?.name ?? path;
      if (!(key in server)) server[key] = message;
    }
    setPhase("editing");
    if (Object.keys(server).length > 0) {
      const firstBad = form.steps.findIndex((s) => s.fields.some((f) => f.name in server));
      if (firstBad >= 0) setStepIndex(firstBad);
      return showErrors(server);
    }
    setFailure(result.message ?? copy.failure.body);
    setPhase("failed");
  };

  const mailtoLink = () => {
    const lines = visibleFields(form, values).flatMap((field) => {
      const raw = values[field.name];
      const text = Array.isArray(raw) ? raw.join(", ") : typeof raw === "string" ? raw : "";
      return text.trim() ? [`${field.label}: ${displayValue(field, text)}`] : [];
    });
    return mailtoHref(mailto.to, mailto.subject, lines.join("\n"));
  };

  if (phase === "success") {
    return (
      <div ref={success} tabIndex={-1} className="form-success">
        <h2 className="form-success__title">{copy.success.title}</h2>
        {reference ? (
          <p className="form-success__reference">
            {fill(copy.success.reference, { id: reference })}
          </p>
        ) : null}
        <p>{copy.success.body}</p>
      </div>
    );
  }

  const summaryItems = Object.entries(errors).map(([name, message]) => ({
    targetId: name === "consent" ? `${form.type}-consent` : fieldId(form, name),
    message,
  }));
  const sending = phase === "sending";

  return (
    <form
      method="post"
      {...(endpoint ? { action: endpoint } : {})}
      noValidate={enhanced}
      onSubmit={submit}
      className="form"
      data-form={form.type}
    >
      <input type="hidden" name="formType" value={form.type} />
      <input type="hidden" name="schemaVersion" value="1" />
      <input type="hidden" name="pageUrl" value={pageUrl} />
      <input type="hidden" name="locale" value="en" />

      {summaryItems.length > 0 ? (
        <ErrorSummary ref={summary} title={copy.errorSummaryTitle} items={summaryItems} />
      ) : null}

      {multiStep && enhanced ? (
        <nav aria-label={copy.stepsLabel} className="form-steps">
          <p className="form-steps__count">
            {fill(copy.stepOf, { current: stepIndex + 1, total: form.steps.length })}
          </p>
          <ol className="form-steps__list">
            {form.steps.map((s, i) => (
              <li
                key={s.id}
                aria-current={i === stepIndex ? "step" : undefined}
                data-state={i < stepIndex ? "done" : i === stepIndex ? "current" : "todo"}
              >
                {s.title}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {draftNote && form.draftKey ? (
        <p className="form-draft" aria-live="polite">
          {draftNote === "restored" ? copy.draft.restored : copy.draft.saved}{" "}
          <button
            type="button"
            data-action="clear-draft"
            className="link-button"
            onClick={clearDraft}
          >
            {copy.draft.clear}
          </button>
        </p>
      ) : null}

      {form.steps.map((s, i) => {
        const here = i === stepIndex;
        return (
          <section
            key={s.id}
            className="form-step"
            hidden={enhanced && multiStep && !here}
            aria-labelledby={s.title ? `${form.type}-${s.id}-title` : undefined}
          >
            {s.title ? (
              <h2
                id={`${form.type}-${s.id}-title`}
                tabIndex={-1}
                ref={(el) => {
                  stepHeadings.current[s.id] = el;
                }}
                className="form-step__title"
              >
                {s.title}
              </h2>
            ) : null}
            {s.description ? <p className="form-step__lead">{s.description}</p> : null}
            {s.review ? <Review form={form} values={values} copy={copy} onEdit={goToStep} /> : null}
            {s.fields.map((field) => {
              const visible = isVisible(field, values);
              return (
                <FieldControl
                  key={field.name}
                  field={field}
                  id={fieldId(form, field.name)}
                  value={values[field.name]}
                  error={errors[field.name]}
                  required={visible && requiredNow(rules, field, visibleValues(form, values))}
                  constraints={constraintsFor(rules.schema, field.name)}
                  copy={copy}
                  hidden={enhanced && !visible}
                  onChange={onChange}
                  onBlur={onBlur}
                />
              );
            })}
          </section>
        );
      })}

      {/* Consent sits with the submit button: on the last step of a multi-step form, always visible without script. */}
      <div className="form-consent" hidden={enhanced && multiStep && !lastStep}>
        <div className="field" data-invalid={errors.consent ? "true" : undefined}>
          <label className="choice">
            <input
              id={`${form.type}-consent`}
              type="checkbox"
              name="consent"
              value="true"
              required
              checked={values.consent === true}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? `${form.type}-consent-error` : undefined}
              onChange={(event) => setValues((v) => ({ ...v, consent: event.target.checked }))}
            />
            <span>
              {copy.consent.before}
              {copy.consent.privacyHref ? (
                <a href={copy.consent.privacyHref}>{copy.consent.link}</a>
              ) : (
                copy.consent.link
              )}
              {copy.consent.after} <span className="field__flag">{copy.required}</span>
            </span>
          </label>
          {errors.consent ? (
            <p id={`${form.type}-consent-error`} className="field__error">
              <span>{errors.consent}</span>
            </p>
          ) : null}
        </div>
      </div>

      {/* The honeypot: a person never sees or reaches it, a bot fills it (TRD §10.1). Checked again at the endpoint. */}
      <div className="hp" aria-hidden="true">
        <label>
          {copy.honeypotLabel}
          <input
            ref={honeypot}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </label>
      </div>

      {phase === "failed" ? (
        <div role="alert" className="form-alert">
          <h2 className="form-alert__title">{copy.failure.title}</h2>
          <p>{failure ?? copy.failure.body}</p>
          <p>
            <a href={mailtoLink()}>{copy.failure.mailto}</a>
          </p>
        </div>
      ) : null}

      <div className="form-actions">
        {multiStep && enhanced && stepIndex > 0 ? (
          <button
            type="button"
            data-action="previous-step"
            className="btn btn--secondary"
            onClick={() => goToStep(stepIndex - 1)}
          >
            {copy.back}
          </button>
        ) : null}
        {multiStep && enhanced && !lastStep ? (
          <button type="button" data-action="next-step" className="btn btn--primary" onClick={next}>
            {copy.next}
          </button>
        ) : (
          <button
            type="submit"
            className="btn btn--accent"
            aria-busy={sending}
            aria-disabled={sending}
          >
            {sending ? copy.sending : phase === "failed" ? copy.failure.retry : copy.submit}
          </button>
        )}
      </div>
    </form>
  );
}

/** The text of a value for the review list and the email fallback: option labels, not raw values. */
function displayValue(field: ResolvedField, text: string): string {
  if (!field.options) return text;
  return text
    .split(", ")
    .map((part) => field.options?.find((o) => o.value === part)?.label ?? part)
    .join(", ");
}

function Review({
  form,
  values,
  copy,
  onEdit,
}: {
  form: ResolvedForm;
  values: FlatValues;
  copy: FormCopy;
  onEdit: (index: number) => void;
}) {
  const sections = form.steps
    .map((s, index) => ({ step: s, index }))
    .filter(({ step }) => !step.review)
    .map(({ step, index }) => ({
      step,
      index,
      rows: step.fields
        .filter((f) => isVisible(f, values) && f.kind !== "checkbox")
        .flatMap((f) => {
          const raw = values[f.name];
          const text = Array.isArray(raw) ? raw.join(", ") : typeof raw === "string" ? raw : "";
          return text.trim() ? [{ field: f, text: displayValue(f, text) }] : [];
        }),
    }));
  return (
    <div className="review">
      <h3 className="review__title">{copy.review.title}</h3>
      {sections.map(({ step, index, rows }) => (
        <section key={step.id} className="review__section" aria-labelledby={`review-${step.id}`}>
          <div className="review__head">
            <h4 id={`review-${step.id}`}>{step.title}</h4>
            <button
              type="button"
              data-action="edit-step"
              className="link-button"
              onClick={() => onEdit(index)}
            >
              {copy.review.edit}
              <span className="sr-only"> {step.title}</span>
            </button>
          </div>
          {rows.length > 0 ? (
            <dl className="review__list">
              {rows.map(({ field, text }) => (
                <div key={field.name}>
                  <dt>{field.label}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="review__empty">{copy.review.empty}</p>
          )}
        </section>
      ))}
    </div>
  );
}
