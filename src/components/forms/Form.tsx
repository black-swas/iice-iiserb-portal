import { Mail } from "lucide-react";
import rulesFile from "@/content/form-rules.json";
import type { FormType } from "@/content/forms";
import { getKnownRoutes } from "@/content/routes";
import { getSiteSettings } from "@/content/loaders";
import { showTodoMarkers } from "@/content/todo";
import { dynamicT, t } from "@/lib/i18n";
import { isBuilt } from "@/lib/nav";
import { mailtoHref } from "@/lib/forms";
import { absoluteUrl } from "@/lib/seo";
import type { FormRules } from "@/lib/form-validate";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { buildForm, type FormOptions } from "./definitions";
import { FormEngine } from "./FormEngine";
import type { FormCopy } from "./types";

/** Where forms post. Empty means no endpoint is connected yet (TRD §10.1: forms then fall back to email). */
const ENDPOINT = process.env.NEXT_PUBLIC_FORM_ENDPOINT || null;

function copyFor(type: FormType, privacyHref: string | null): FormCopy {
  // Templates keep their {field} and {limit} placeholders; the browser fills them in.
  const template = (key: string) =>
    dynamicT(`forms.errors.${key}`, { field: "{field}", limit: "{limit}" });
  return {
    required: t("forms.common.required"),
    chooseOption: t("forms.common.chooseOption"),
    submit: dynamicT(`forms.${type}.submit`),
    sending: t("forms.common.sending"),
    next: t("forms.common.next"),
    back: t("forms.common.back"),
    stepOf: t("forms.common.stepOf", { current: "{current}", total: "{total}" }),
    stepsLabel: t("forms.common.stepsLabel"),
    errorSummaryTitle: t("forms.common.errorSummaryTitle"),
    errors: {
      required: template("required"),
      type: template("type"),
      tooShort: template("tooShort"),
      tooLong: template("tooLong"),
      tooSmall: template("tooSmall"),
      tooBig: template("tooBig"),
      number: template("number"),
      integer: template("integer"),
      email: template("email"),
      url: template("url"),
      date: template("date"),
      pattern: template("pattern"),
      choice: template("choice"),
      mustAgree: template("mustAgree"),
      tooFewItems: template("tooFewItems"),
      tooManyItems: template("tooManyItems"),
      condition: template("required"),
      phone: template("phone"),
      consent: template("consent"),
      conditions: {
        mentorRequired: template("conditions.mentorRequired"),
        ipDocsRequired: template("conditions.ipDocsRequired"),
        legalEntityRequired: template("conditions.legalEntityRequired"),
        targetRequired: template("conditions.targetRequired"),
      },
    },
    consent: {
      before: t("forms.common.consentBefore"),
      link: t("forms.common.consentLink"),
      after: t("forms.common.consentAfter"),
      privacyHref,
    },
    success: {
      title: dynamicT(`forms.${type}.successTitle`),
      reference: t("forms.common.successReference", { id: "{id}" }),
      body: dynamicT(`forms.${type}.successBody`),
    },
    failure: {
      title: t("forms.common.failureTitle"),
      body: t("forms.common.failureBody"),
      retry: t("forms.common.failureRetry"),
      mailto: t("forms.common.failureMailto"),
    },
    review: {
      title: t("forms.common.reviewTitle"),
      empty: t("forms.common.reviewEmpty"),
      edit: t("forms.common.reviewEdit"),
    },
    draft: {
      saved: t("forms.common.draftSaved"),
      clear: t("forms.common.draftClear"),
      restored: t("forms.common.draftRestored"),
    },
    honeypotLabel: t("forms.common.honeypotLabel"),
    yes: t("forms.options.yesNo.true"),
    no: t("forms.options.yesNo.false"),
  };
}

type FormProps = Omit<FormOptions, "site"> & {
  type: FormType;
  /** The page's path, for the `pageUrl` the office sees with each submission. */
  path: string;
};

/**
 * A form, ready to place on a page. Without a connected endpoint it is a plain email prompt (production); previews and
 * development still show the form so it can be reviewed, and a send there ends in the email fallback.
 */
export function Form({ type, path, ...options }: FormProps) {
  const site = getSiteSettings();
  const to = site.incubationSupport.email;
  const subject = dynamicT(`forms.${type}.subject`);

  if (!ENDPOINT && !showTodoMarkers()) {
    return (
      <div className="form-fallback">
        <p>{t("forms.fallback.body")}</p>
        <ButtonLink href={mailtoHref(to, subject)} variant="primary" hideExternalIcon>
          <Mail aria-hidden="true" className="size-4" />
          {t("forms.fallback.action", { email: to })}
        </ButtonLink>
      </div>
    );
  }

  const privacyHref = isBuilt("/privacy/", getKnownRoutes()) ? "/privacy/" : null;
  return (
    <FormEngine
      form={buildForm(type, { site, ...options })}
      rules={(rulesFile.forms as unknown as Record<FormType, FormRules>)[type]}
      copy={copyFor(type, privacyHref)}
      endpoint={ENDPOINT}
      pageUrl={absoluteUrl(path)}
      mailto={{ to, subject }}
    />
  );
}
