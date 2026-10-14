import type { ComponentProps } from "react";
import { SmartLink } from "./SmartLink";

type Variant = "accent" | "primary" | "secondary" | "inverse";

const BASE =
  "inline-flex min-h-11 items-center whitespace-nowrap justify-center gap-2 rounded-pill px-5 py-2 text-small font-semibold no-underline transition-colors duration-150";

const VARIANTS: Record<Variant, string> = {
  // Hard rule 10: amber always carries the fixed dark ink, never white and never the themed `ink`.
  accent: "bg-accent-400 text-on-accent hover:brightness-95",
  primary:
    "bg-primary-700 text-on-primary hover:bg-primary-600 dark:bg-primary-300 dark:text-on-accent dark:hover:brightness-95",
  secondary: "border border-border-strong text-ink hover:bg-surface",
  // For dark bands (the CTA band): the white token, as an arbitrary value because the palette is reset in tokens.css.
  inverse: "border border-on-primary text-on-primary hover:bg-on-primary/10",
};

interface ButtonLinkProps extends Omit<ComponentProps<typeof SmartLink>, "className"> {
  variant?: Variant;
  className?: string;
}

/** A call-to-action that is a real link (rule 14), styled like a button. */
export function ButtonLink({ variant = "primary", className, ...props }: ButtonLinkProps) {
  return (
    <SmartLink
      {...props}
      className={`${BASE} ${VARIANTS[variant]}${className ? ` ${className}` : ""}`}
    />
  );
}
