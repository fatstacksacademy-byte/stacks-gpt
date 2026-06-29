/**
 * fonts — register the local brand TTFs (Anton = 'FSA Display', Archivo Black =
 * 'FSA Heavy') inside Remotion's headless Chromium.
 *
 * WHY this dance: the brand fonts are repo-local TTFs at ../../../../assets/fonts/.
 * Remotion components run in a browser bundle, so they can't `fs.readFile` the TTF at
 * render time. The Remotion-idiomatic fix is `staticFile()` + the FontFace web API:
 * we serve the TTFs from this project's public/ dir and load them with delayRender so
 * a frame never paints before the font is ready (otherwise the very first frames fall
 * back to the system stack and the count-up flickers between typefaces).
 *
 * The TTFs are copied into public/fonts/ by render.mjs (Node side, which CAN read the
 * repo) before bundling — see ensureFonts() there. If they're missing we continue()
 * anyway so text still renders in the fallback body stack (graceful, like brand.ts).
 */
import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { BRAND } from "./brand";

const FACES = [
  { family: BRAND.font.display.family, file: "fonts/Anton-Regular.ttf" },
  { family: BRAND.font.heavy.family, file: "fonts/ArchivoBlack-Regular.ttf" },
];

/**
 * Loads the brand fonts and blocks the frame until they're ready. Render it once near
 * the top of every composition. Returns nothing visible.
 */
export const BrandFonts: React.FC = () => {
  const [handle] = useState(() => delayRender("loading FSA brand fonts"));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all(
          FACES.map(async ({ family, file }) => {
            // `as any` — FontFace isn't in the default React DOM lib typings.
            const face = new (window as any).FontFace(family, `url(${staticFile(file)})`);
            await face.load();
            (document as any).fonts.add(face);
          })
        );
      } catch (e) {
        // Missing/bad TTF → fall back to the body stack rather than blanking text.
        // (Same forgiving posture as lib/brand.ts when a font file is absent.)
        // eslint-disable-next-line no-console
        console.warn("BrandFonts: falling back to body stack —", (e as Error).message);
      } finally {
        if (!cancelled) continueRender(handle);
      }
    })().catch((e) => cancelRender(e));
    return () => {
      cancelled = true;
    };
  }, [handle]);

  return null;
};
