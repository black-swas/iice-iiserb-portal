/**
 * The default social-sharing image (TRD §11.1): the card that WhatsApp, LinkedIn and X show when a page is shared. It is drawn
 * from the site's own names, in the interim colours, so there is no logo or photo in it to supply or to get wrong; when the
 * IISER Bhopal logo arrives it is replaced by changing this one function. Pure, so a test can check the drawing;
 * scripts/og.ts turns it into `public/og/default.png`.
 */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export interface OgText {
  /** "IICE" */
  name: string;
  /** The full name, which is drawn on two lines. */
  fullName: string;
  /** "IISER Bhopal" */
  host: string;
}

const escapeXml = (text: string) =>
  text.replace(
    /[<>&"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c] as string,
  );

/** Splits a long name into two lines at the space nearest the middle, so neither line runs off the card. */
export function splitName(text: string): [string, string] {
  const words = text.split(" ");
  if (words.length < 2) return [text, ""];
  let best = 1;
  let gap = Infinity;
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(" ").length;
    const right = words.slice(i).join(" ").length;
    if (Math.abs(left - right) < gap) {
      gap = Math.abs(left - right);
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

export function ogSvg({ name, fullName, host }: OgText): string {
  const [first, second] = splitName(fullName);
  const font = "'Segoe UI', 'Helvetica Neue', Arial, 'DejaVu Sans', sans-serif";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#082f3b"/><stop offset="1" stop-color="#0b4f63"/></linearGradient>
<pattern id="dots" width="48" height="48" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="2" fill="#ffffff" fill-opacity="0.16"/></pattern></defs>
<rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#g)"/>
<rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#dots)"/>
<rect x="80" y="92" width="104" height="10" rx="5" fill="#f2a541"/>
<text x="76" y="268" font-family="${font}" font-size="176" font-weight="700" fill="#ffffff">${escapeXml(name)}</text>
<text x="80" y="354" font-family="${font}" font-size="44" fill="#ffffff">${escapeXml(first)}</text>
<text x="80" y="410" font-family="${font}" font-size="44" fill="#ffffff">${escapeXml(second)}</text>
<text x="80" y="548" font-family="${font}" font-size="38" font-weight="600" fill="#f2a541">${escapeXml(host)}</text>
</svg>
`;
}
