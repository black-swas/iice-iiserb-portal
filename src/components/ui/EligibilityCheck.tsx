"use client";

import { useId, useState } from "react";
import { dynamicT, t } from "@/lib/i18n";

type Who = "iiserb-staff" | "iiserb-student" | "partner" | "outside";
type YesNo = "yes" | "no" | "unsure";

const WHO: Who[] = ["iiserb-staff", "iiserb-student", "partner", "outside"];
const YES_NO: YesNo[] = ["yes", "no", "unsure"];

type Outcome = "incomplete" | "eligible" | "mentor" | "fit";

/** The rules from the legacy site (SPEC §8.4): outsiders need a faculty mentor, and the venture must be technology-based. */
export function outcomeOf(who: Who | "", mentor: YesNo | "", thrust: YesNo | ""): Outcome {
  if (!who || !mentor || !thrust) return "incomplete";
  if (thrust === "no") return "fit";
  if ((who === "partner" || who === "outside") && mentor !== "yes") return "mentor";
  return "eligible";
}

function Question<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  labelOf,
}: {
  legend: string;
  name: string;
  options: readonly T[];
  value: T | "";
  onChange: (value: T) => void;
  labelOf: (option: T) => string;
}) {
  return (
    <fieldset className="field">
      <legend className="field__label">{legend}</legend>
      <div className="field__choices">
        {options.map((option) => (
          <label key={option} className="choice">
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span>{labelOf(option)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Three questions and an outcome (SPEC §4.7). The check only informs: it never blocks the form, and its outcome always
 * leaves the way to apply open. Without script the questions do nothing, so the section is hidden by CSS.
 */
export function EligibilityCheck() {
  const id = useId();
  const [who, setWho] = useState<Who | "">("");
  const [mentor, setMentor] = useState<YesNo | "">("");
  const [thrust, setThrust] = useState<YesNo | "">("");
  const outcome = outcomeOf(who, mentor, thrust);
  const yesNoLabel = (option: YesNo) => dynamicT(`pages.apply.check.${option}`);

  return (
    <div className="eligibility-check">
      <Question
        legend={t("pages.apply.check.whoQuestion")}
        name={`${id}-who`}
        options={WHO}
        value={who}
        onChange={setWho}
        labelOf={(option) => dynamicT(`pages.apply.check.who.${option}`)}
      />
      <Question
        legend={t("pages.apply.check.mentorQuestion")}
        name={`${id}-mentor`}
        options={YES_NO}
        value={mentor}
        onChange={setMentor}
        labelOf={yesNoLabel}
      />
      <Question
        legend={t("pages.apply.check.thrustQuestion")}
        name={`${id}-thrust`}
        options={YES_NO}
        value={thrust}
        onChange={setThrust}
        labelOf={yesNoLabel}
      />
      <div className="callout" role="status" aria-live="polite" data-outcome={outcome}>
        <p className="callout__title">{dynamicT(`pages.apply.check.outcome.${outcome}.title`)}</p>
        <p>{dynamicT(`pages.apply.check.outcome.${outcome}.body`)}</p>
      </div>
    </div>
  );
}
