/**
 * brand — typed access to the Fat Stacks Academy video brand + render helpers.
 *
 * The raw tokens live in brand.json (single source of truth, also read by the
 * Python thumbnail generator). This module adds typing, a base64 @font-face
 * builder (file:// fonts are unreliable in headless Chromium), and the shared
 * number-emphasis helper so every template pops $ / % / 100K identically.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import brandJson from './brand.json';

export const BRAND = brandJson;
export const C = brandJson.color;
export const G = brandJson.geometry;

const repoRoot = (): string => path.resolve(__dirname, '..', '..', '..');

/** Read a repo-relative font file and return it as a base64 data URI. */
function fontDataUri(rel: string): string | null {
  const abs = path.join(repoRoot(), rel);
  if (!fs.existsSync(abs)) return null;
  return `data:font/ttf;base64,${fs.readFileSync(abs).toString('base64')}`;
}

/** @font-face block embedding the local display + heavy fonts (call once per page). */
export function fontFaceCSS(): string {
  const faces: string[] = [];
  for (const f of [brandJson.font.display, brandJson.font.heavy]) {
    const uri = fontDataUri(f.file);
    if (uri) faces.push(`@font-face{font-family:'${f.family}';src:url('${uri}') format('truetype');font-weight:400;font-display:block}`);
  }
  return faces.join('\n');
}

/** CSS font-family stacks. Display/heavy fall back to the body stack if a font is missing. */
export const FONT = {
  display: `'${brandJson.font.display.family}',${brandJson.font.bodyStack}`,
  heavy: `'${brandJson.font.heavy.family}',${brandJson.font.bodyStack}`,
  body: brandJson.font.bodyStack,
};

/** Inline an image as a base64 data URI (file:// is unreliable in headless). */
export function dataUri(file?: string): string | null {
  if (!file || !fs.existsSync(file)) return null;
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  return `data:image/${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Emphasize $amounts / %s / Nx / NNk / "points" so numbers pop in gold. */
export function rich(s: string): string {
  return esc(s).replace(
    /(\$[\d,]+|\d+%|\b\d+x\b|\b\d{2,3}k\b|100,000|[\d,]+\s*(?:UR|points))/gi,
    '<span class="hot">$1</span>'
  );
}
