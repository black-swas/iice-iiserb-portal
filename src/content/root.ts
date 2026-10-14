import path from "node:path";

/**
 * Where the content lives: /content, unless IICE_CONTENT_DIR points somewhere else. Only the end-to-end tests set it, to
 * build the site from richer content than the seed has (tests/fixtures/full-content.ts). Node-only.
 */
export const CONTENT_DIR = process.env.IICE_CONTENT_DIR
  ? path.resolve(process.env.IICE_CONTENT_DIR)
  : path.join(process.cwd(), "content");
