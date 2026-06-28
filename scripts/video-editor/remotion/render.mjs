#!/usr/bin/env node
/**
 * render.mjs — headless, ZERO-TOKEN render of a brand motion-graphic to an ALPHA .mov.
 *
 * Takes a spec JSON ({comp, props}) and renders that composition to a transparent
 * ProRes 4444 .mov (or qtrle) you drop on Resolve V2-V5 or composite with ffmpeg. This
 * is the documented GUI-only gap (animated zoom/reveal/transition) closed in code: true
 * keyframed/spring animation, rendered locally with no API calls.
 *
 * WHY a Node entry (not just `npx remotion render`): we (1) copy the repo-local brand
 * TTFs into public/fonts/ so headless Chromium can load them (the FontFace trick in
 * src/fonts.tsx), (2) compute durationInFrames from --duration seconds so the overlay is
 * exactly as long as the beat, and (3) merge the spec's props over the composition
 * defaults. All via the @remotion/renderer programmatic API.
 *
 * Usage:
 *   node render.mjs --spec '{"comp":"Callout","props":{"value":"$1,500","label":"bonus"}}' \
 *                   --duration 2 --out out/callout.mov
 *   node render.mjs --spec @spec.json --out out/value.mov          # spec from a file
 *   node render.mjs --spec '{"comp":"Bars","props":{...}}' --codec vp9 --out b.webm
 *
 * Flags:
 *   --spec     inline JSON or @path/to/spec.json   {comp:'Callout'|'Value'|'Bars', props:{...}}
 *   --out      output path (default out/<comp>.<ext>); ext should match the codec
 *   --duration overlay length in seconds (default: the composition's own duration)
 *   --fps      override fps (default: the composition's fps, 30)
 *   --codec    'prores' → alpha ProRes 4444 .mov (default; the Resolve/ffmpeg overlay)
 *              'vp9' / 'vp8' → alpha .webm (smaller; use ffmpeg to remux/convert if you need .mov)
 *   --scale    render scale multiplier (1 = 1080 proven path; 2 = native 4K, like RENDER_SCALE)
 *
 * NOTE on codecs: Remotion's alpha-capable codecs are ProRes 4444 (.mov) and VP8/VP9
 * (.webm). QuickTime RLE (qtrle) is NOT a Remotion codec — for a .mov overlay, prores
 * 4444 IS the alpha format (and exactly what Resolve V2-V5 wants).
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");

// ── tiny argv parser (house style: manual process.argv, like correct-captions.ts) ──
function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const specArg = arg("spec");
if (!specArg) {
  console.error(
    "need --spec '{\"comp\":\"Callout\",\"props\":{...}}' (or --spec @spec.json). " +
      "comp ∈ Callout | Value | Bars."
  );
  process.exit(1);
}
const specRaw = specArg.startsWith("@") ? fs.readFileSync(specArg.slice(1), "utf8") : specArg;
let spec;
try {
  spec = JSON.parse(specRaw);
} catch (e) {
  console.error(`--spec is not valid JSON: ${e.message}`);
  process.exit(1);
}
const comp = spec.comp;
if (!comp) {
  console.error("--spec needs a `comp` key (Callout | Value | Bars).");
  process.exit(1);
}
const props = spec.props ?? {};

const durationSec = arg("duration") ? parseFloat(arg("duration")) : undefined;
const fpsOverride = arg("fps") ? parseInt(arg("fps"), 10) : undefined;
const scale = arg("scale") ? parseFloat(arg("scale")) : 1;
const codecArg = (arg("codec") ?? "prores").toLowerCase();

// Remotion's alpha-capable codecs: ProRes 4444 (.mov) and VP8/VP9 (.webm). Reject the rest.
const CODECS = {
  prores: { codec: "prores", proResProfile: "4444", pixelFormat: "yuva444p10le", ext: ".mov" },
  vp9: { codec: "vp9", pixelFormat: "yuva420p", ext: ".webm" },
  vp8: { codec: "vp8", pixelFormat: "yuva420p", ext: ".webm" },
};
const codecCfg = CODECS[codecArg];
if (!codecCfg) {
  console.error(`--codec must be 'prores' (.mov, default) | 'vp9' | 'vp8' (.webm). All carry alpha. got: ${codecArg}`);
  process.exit(1);
}

const out = arg("out") ?? path.join(HERE, "out", `${comp}${codecCfg.ext}`);

/**
 * Copy the repo-local brand TTFs into public/fonts/ so src/fonts.tsx can staticFile()
 * them into headless Chromium. We read from the SAME assets/fonts the Python renderer
 * uses (paths declared in lib/brand.json), so the typeface is identical everywhere.
 */
function ensureFonts() {
  const brand = JSON.parse(fs.readFileSync(path.join(HERE, "..", "lib", "brand.json"), "utf8"));
  const dest = path.join(HERE, "public", "fonts");
  fs.mkdirSync(dest, { recursive: true });
  for (const f of [brand.font.display, brand.font.heavy]) {
    const src = path.join(REPO_ROOT, f.file);
    const to = path.join(dest, path.basename(f.file));
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, to);
    } else {
      console.warn(`⚠ brand font missing: ${src} → text will fall back to the body stack.`);
    }
  }
}

async function main() {
  ensureFonts();
  fs.mkdirSync(path.dirname(out), { recursive: true });

  console.log(`• bundling Remotion project…`);
  const serveUrl = await bundle({
    entryPoint: path.join(HERE, "src", "index.ts"),
    // public/ (with the copied fonts) is auto-served by Remotion.
  });

  console.log(`• selecting composition "${comp}"…`);
  const composition = await selectComposition({
    serveUrl,
    id: comp,
    inputProps: props,
  });

  // Override duration/fps from flags; default to the composition's own values.
  const fps = fpsOverride ?? composition.fps;
  const durationInFrames = durationSec ? Math.max(1, Math.round(durationSec * fps)) : composition.durationInFrames;

  console.log(
    `• rendering ${comp} → ${out}  (${(durationInFrames / fps).toFixed(2)}s @ ${fps}fps, ` +
      `${composition.width * scale}×${composition.height * scale}, codec=${codecArg} [alpha])`
  );

  await renderMedia({
    composition: { ...composition, durationInFrames, fps },
    serveUrl,
    codec: codecCfg.codec,
    proResProfile: codecCfg.proResProfile,
    pixelFormat: codecCfg.pixelFormat,
    imageFormat: "png", // PNG frames preserve the transparent background (jpeg flattens to black)
    // Alpha REQUIRES transparency on; this is what makes the .mov composite-ready.
    everyNthFrame: 1,
    scale,
    outputLocation: out,
    inputProps: props,
    chromiumOptions: { gl: "angle" }, // stable headless GL backend on macOS
  });

  const bytes = fs.existsSync(out) ? fs.statSync(out).size : 0;
  if (bytes < 2000) {
    console.error(`✗ output looks empty (${bytes} bytes): ${out}`);
    process.exit(1);
  }
  console.log(`✓ ${out}  (${(bytes / 1e6).toFixed(2)} MB)`);
}

main().catch((e) => {
  console.error("render failed:", e);
  process.exit(1);
});
