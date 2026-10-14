import { AlertCircle } from "lucide-react";
import type { ChangeEvent } from "react";
import type { Constraints } from "./constraints";
import type { FormCopy, ResolvedField } from "./types";

export type FieldValue = string | string[] | boolean;

interface FieldControlProps {
  field: ResolvedField;
  id: string;
  value: FieldValue | undefined;
  error: string | undefined;
  required: boolean;
  constraints: Constraints;
  copy: FormCopy;
  /** Taken out of the page while a condition is not met; the markup stays so plain HTML posts still carry it. */
  hidden: boolean;
  onChange: (name: string, value: FieldValue) => void;
  onBlur: (name: string) => void;
}

const asText = (value: FieldValue | undefined) => (typeof value === "string" ? value : "");
const asList = (value: FieldValue | undefined) => (Array.isArray(value) ? value : []);

/**
 * One field: a visible label (with "(required)" in the text, never colour alone), a hint, the control and its error,
 * all linked with aria-describedby. Groups of choices are a fieldset with a legend. Placeholders are not used for
 * meaning (TRD §10.1).
 */
export function FieldControl({
  field,
  id,
  value,
  error,
  required,
  constraints,
  copy,
  hidden,
  onChange,
  onBlur,
}: FieldControlProps) {
  const hintId = field.hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const valueHint =
    field.valueHints && typeof value === "string" ? field.valueHints[value] : undefined;
  const valueHintId = valueHint ? `${id}-value-hint` : undefined;
  const describedBy = [hintId, valueHintId, errorId].filter(Boolean).join(" ") || undefined;
  const flag = required ? <span className="field__flag"> {copy.required}</span> : null;

  const errorNode = error ? (
    <p id={errorId} className="field__error">
      <AlertCircle aria-hidden="true" />
      <span>{error}</span>
    </p>
  ) : null;
  const hintNode = field.hint ? (
    <p id={hintId} className="field__hint">
      {field.hint}
    </p>
  ) : null;
  const valueHintNode = valueHint ? (
    <p id={valueHintId} className="field__hint field__hint--value" aria-live="polite">
      {valueHint}
    </p>
  ) : null;

  const wrapper = {
    className: "field",
    "data-invalid": error ? "true" : undefined,
    hidden,
  } as const;

  if (field.kind === "radio" || field.kind === "checkboxes") {
    const multiple = field.kind === "checkboxes";
    const chosen = multiple ? asList(value) : asText(value);
    return (
      <fieldset {...wrapper} id={id} aria-describedby={describedBy}>
        <legend className="field__label">
          {field.label}
          {flag}
        </legend>
        {hintNode}
        <div className="field__choices">
          {(field.options ?? []).map((option) => {
            const checked = multiple
              ? (chosen as string[]).includes(option.value)
              : chosen === option.value;
            return (
              <label key={option.value} className="choice">
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name={field.name}
                  value={option.value}
                  checked={checked}
                  required={!multiple && required}
                  aria-invalid={error ? true : undefined}
                  onChange={() =>
                    onChange(
                      field.name,
                      multiple
                        ? checked
                          ? (chosen as string[]).filter((v) => v !== option.value)
                          : [...(chosen as string[]), option.value]
                        : option.value,
                    )
                  }
                  onBlur={() => onBlur(field.name)}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
        {errorNode}
      </fieldset>
    );
  }

  if (field.kind === "checkbox") {
    return (
      <div {...wrapper}>
        <label className="choice">
          <input
            id={id}
            type="checkbox"
            name={field.name}
            value="true"
            checked={value === true}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            onChange={(event) => onChange(field.name, event.target.checked)}
            onBlur={() => onBlur(field.name)}
          />
          <span>{field.label}</span>
        </label>
        {hintNode}
        {errorNode}
      </div>
    );
  }

  const common = {
    id,
    name: field.name,
    required,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": describedBy,
    onBlur: () => onBlur(field.name),
  };

  let control;
  if (field.kind === "select") {
    control = (
      <select
        {...common}
        className="input"
        value={asText(value)}
        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
          onChange(field.name, event.target.value)
        }
      >
        <option value="">{copy.chooseOption}</option>
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else if (field.kind === "textarea" || field.kind === "list") {
    control = (
      <textarea
        {...common}
        className="input"
        rows={field.rows ?? (field.kind === "list" ? 3 : 5)}
        value={asText(value)}
        {...(constraints.maxLength ? { maxLength: constraints.maxLength } : {})}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
          onChange(field.name, event.target.value)
        }
      />
    );
  } else {
    control = (
      <input
        {...common}
        className="input"
        type={field.kind === "number" ? "number" : field.kind}
        value={asText(value)}
        {...(field.autoComplete ? { autoComplete: field.autoComplete } : {})}
        {...(field.inputMode ? { inputMode: field.inputMode } : {})}
        {...(constraints.maxLength ? { maxLength: constraints.maxLength } : {})}
        {...(field.kind === "number" && constraints.min !== undefined
          ? { min: constraints.min }
          : {})}
        {...(field.kind === "number" && constraints.max !== undefined
          ? { max: constraints.max }
          : {})}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(field.name, event.target.value)
        }
      />
    );
  }

  return (
    <div {...wrapper}>
      <label className="field__label" htmlFor={id}>
        {field.label}
        {flag}
      </label>
      {hintNode}
      {control}
      {valueHintNode}
      {errorNode}
    </div>
  );
}
