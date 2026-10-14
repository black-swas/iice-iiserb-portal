/** Initials in a circle, for a startup or a person with no logo or photo. Decorative: the name is beside it. */
export function Monogram({ name, className }: { name: string; className?: string }) {
  const initials = name
    .replace(/\b(Prof|Dr|Mr|Ms|Mx)\.?\s/gi, "")
    .split(/\s+/)
    .filter((word) => /^[\p{L}\p{N}]/u.test(word))
    .slice(0, 2)
    .map((word) => (word[0] ?? "").toUpperCase())
    .join("");
  return (
    <span className={`monogram${className ? ` ${className}` : ""}`} aria-hidden="true">
      {initials || "·"}
    </span>
  );
}
