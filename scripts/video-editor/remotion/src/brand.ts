/**
 * brand — the Fat Stacks Academy video identity, ported into the Remotion world.
 *
 * WHY a bridge file: lib/brand.json (../../lib/brand.json) is the single source of
 * truth for colors/fonts/lockup — it already drives the Python motion-gfx renderer,
 * the thumbnail generator, and the TS card renderer. We import that SAME json here so
 * Remotion graphics are byte-for-byte the same green/gold/navy + Anton/Archivo Black as
 * everything else. Nothing about the palette is re-typed by hand; we only add the small
 * amount of glue Remotion needs (CSS color strings, font data-URIs, the gradient bg).
 *
 * FONTS: brand.ts (the headless-Chromium card renderer) learned the hard way that
 * file:// fonts are unreliable in headless browsers, so it embeds the local TTFs as
 * base64 @font-face. Remotion renders in headless Chromium too, so we copy that exact
 * trick: read ../../../../assets/fonts/*.ttf at bundle time and inline them. The
 * <BrandFonts/> component (see fonts.tsx) injects the @font-face block once per frame.
 */
import brand from "../../lib/brand.json";

export const BRAND = brand;

// ── colors (CSS hex strings, straight from brand.json) ───────────────────────
const COL = brand.color;
export const C = {
  green: COL.green,
  greenBright: COL.greenBright,
  greenDeep: COL.greenDeep,
  gold: COL.gold,
  goldBright: COL.goldBright,
  navyDeep: COL.navyDeep,
  navyMid: COL.navyMid,
  navyElev: COL.navyElev,
  line: COL.line,
  white: COL.textPrimary,
  textSecondary: COL.textSecondary,
  textMuted: COL.textMuted,
  danger: COL.danger,
} as const;

// ── geometry (the proven 1080 coordinate space motion-gfx.py renders in) ──────
export const GEO = brand.geometry; // {width:1920,height:1080,radius:22,accentBarH:10,safeX:130,safeY:90}

// ── font family stacks (mirror lib/brand.ts FONT) ────────────────────────────
// The real families are registered by <BrandFonts/> (fonts.tsx) as 'FSA Display'
// (Anton) and 'FSA Heavy' (Archivo Black). Fall back to the system body stack so a
// missing TTF degrades to a heavy sans rather than blanking the text.
export const FONT = {
  display: `'${brand.font.display.family}',${brand.font.bodyStack}`,
  heavy: `'${brand.font.heavy.family}',${brand.font.bodyStack}`,
  body: brand.font.bodyStack,
} as const;

/**
 * The full-screen brand background motion-gfx.py paints: navy base, a soft center
 * lighten toward navyMid, and a green accent bar across the bottom. Returned as a CSS
 * `background` string + a separate accent element height so a composition can render a
 * transparent variant (overlay use) OR an opaque card (full-screen explainer).
 */
export function backgroundStyle(): React.CSSProperties {
  return {
    background: `radial-gradient(ellipse 120% 80% at 50% 50%, ${C.navyMid} 0%, ${C.navyDeep} 70%)`,
  };
}
