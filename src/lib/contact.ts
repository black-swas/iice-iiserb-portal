/** "+91 755 269 2384" → "tel:+917552692384". */
export const telHref = (number: string) => `tel:${number.replace(/\s+/g, "")}`;
