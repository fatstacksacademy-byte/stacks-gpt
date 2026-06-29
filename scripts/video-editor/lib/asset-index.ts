#!/usr/bin/env tsx
/**
 * asset-index — a standing, searchable LIBRARY of reusable b-roll assets so the planner
 * reuses proven art instead of re-sourcing every video.
 *
 * WHY: every video today re-fetches the same Chase logo, the same Sapphire card art, the
 * same Stacks OS screenshot, the same whoosh. That's wasted time (and, when a fetch hits a
 * bot-wall, a hole in the cut). A real editor keeps a *bin* of assets they've cleared and
 * trust, and reaches for one by name. This builds that bin: walk an `assets/library/` tree,
 * caption + tag every image ZERO-TOKEN (path/filename heuristics + a tesseract OCR pass for
 * text-bearing art — same tesseract page-roi.py already shells out to), record its dims, and
 * keep one sidecar `asset-index.json`. `lookup(query)` then returns ranked matches by token
 * overlap so draft-plan can prefer a library hit over a fresh screenshot.
 *
 * It also INGESTS any `assets-manifest.json` written by fetch-assets.ts (logos / CC concepts),
 * carrying their license + attribution straight into the index — so the fetched-and-cleared
 * assets become part of the same searchable bin, license intact, no licensing surprise later.
 *
 * ZERO-TOKEN by design: no LLM. Captions come from the path, the filename, the ingested
 * manifest query, and OCR'd on-image text. Dims come from a tiny stdlib PNG/JPEG/GIF/WEBP
 * header read so it never hard-depends on a native module.
 *
 * CLI:
 *   tsx scripts/video-editor/lib/asset-index.ts build [root]      # (re)index assets/library
 *   tsx scripts/video-editor/lib/asset-index.ts find "chase sapphire" [--root R] [--n 5]
 *
 * Library layout (root defaults to assets/library, relative to video-editor/):
 *   assets/library/cards/chase-sapphire-preferred.png
 *   assets/library/logos/citi.png
 *   assets/library/sfx/whoosh.wav            (non-image: indexed by name/path/tags only)
 *   assets/library/asset-index.json          (the sidecar this writes)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
// video-editor/ is the parent of lib/. assets/ lives under it (matches assets/sfx, assets/luts, …).
const VED_ROOT = path.resolve(HERE, '..');
export const DEFAULT_ROOT = path.join(VED_ROOT, 'assets', 'library');

// ── the record we keep per asset ─────────────────────────────────────────────
export interface AssetRecord {
  file: string;          // absolute path to the asset
  caption: string;       // human-readable, zero-token (path + filename + OCR)
  tags: string[];        // searchable tokens (deduped, lowercased)
  w: number;             // pixel width  (0 if unknown / non-image)
  h: number;             // pixel height (0 if unknown / non-image)
  source: string;        // 'library' | a fetch-assets source ('Wikimedia Commons', 'Openverse', …)
  kind?: string;         // 'image' | 'audio' | 'logo' | 'concept' | …
  license?: string;      // carried from an ingested manifest (attribution discipline)
  attribution?: string;
  ocr?: boolean;         // whether the caption used OCR text
}

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff']);
const AUDIO_EXT = new Set(['.wav', '.mp3', '.aif', '.aiff', '.m4a', '.flac', '.ogg']);
const VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv']);

// ── normalization (mirrors the planner's norm so tokens line up) ──────────────
const norm = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Filler tokens that carry no search signal — drop them from tags/queries so a
// "the chase card logo" query still ranks the chase logo first (mirrors draft-plan's GENERIC).
const STOP = new Set(
  ('the a an of and or to for with card credit bank logo image img png jpg jpeg webp icon ico ' +
   'screenshot screen shot photo pic full viewport offer page asset assets library lib copy final ' +
   'v1 v2 v3 hero shot shots').split(' ')
);

const tokenize = (s: string): string[] =>
  [...new Set(norm(s).split(' ').filter((t) => t.length >= 2 && !STOP.has(t)))];

// ── image dimensions: a tiny stdlib header read (no native dep) ───────────────
// WHY no sharp: sharp is a native module and may not be installed everywhere this pipeline runs,
// and its sync metadata isn't exposed. A header read covers every format fetch-assets writes
// (png/jpg/webp/gif) with zero dependency, so `build` never hard-fails on dims.
function dimsFromHeader(buf: Buffer): { w: number; h: number } {
  // PNG: 8-byte sig, then IHDR with width/height as big-endian uint32 at offset 16/20.
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  // GIF: 'GIF8', then width/height little-endian uint16 at 6/8.
  if (buf.length >= 10 && buf.toString('ascii', 0, 4) === 'GIF8') {
    return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  }
  // WEBP (VP8X): 'RIFF'…'WEBP', VP8X chunk → 24-bit (val+1) canvas dims at 24/27.
  if (buf.length >= 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    if (buf.toString('ascii', 12, 16) === 'VP8X') {
      const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      return { w, h };
    }
    if (buf.toString('ascii', 12, 16) === 'VP8 ' && buf.length >= 30) {
      const w = buf.readUInt16LE(26) & 0x3fff;
      const h = buf.readUInt16LE(28) & 0x3fff;
      if (w && h) return { w, h };
    }
  }
  // JPEG: scan SOF0..SOF15 markers for the 16-bit height/width.
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off + 9 < buf.length) {
      if (buf[off] !== 0xff) { off++; continue; }
      const marker = buf[off + 1];
      const len = buf.readUInt16BE(off + 2);
      // SOF0–SOF3, SOF5–SOF7, SOF9–SOF11, SOF13–SOF15 carry dimensions.
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        return { h: buf.readUInt16BE(off + 5), w: buf.readUInt16BE(off + 7) };
      }
      off += 2 + len;
    }
  }
  return { w: 0, h: 0 };
}

function imageDims(file: string): { w: number; h: number } {
  // Read the whole header region: PNG/GIF/WEBP dims sit in the first ~30 bytes, but a JPEG's SOF
  // marker (which carries the dims) can be many KB deep past the EXIF/ICC blocks — so hand the full
  // buffer to the scanner, which bounds its own walk. Dependency-free and exact for every format
  // fetch-assets writes.
  try {
    const buf = fs.readFileSync(file);
    return dimsFromHeader(buf);
  } catch { return { w: 0, h: 0 }; }
}

// ── OCR pass (text-bearing images only) ───────────────────────────────────────
// WHY: a card-art / logo PNG often bakes the brand name into the pixels ("CHASE",
// "SAPPHIRE PREFERRED"). That text is the strongest caption signal we have and it costs
// zero tokens. Shell out to the tesseract CLI (same as page-roi.py). Best-effort: if
// tesseract is missing or the image is photographic (no text), we just skip it.
let _tessOk: boolean | undefined;
function tesseractAvailable(): boolean {
  if (_tessOk !== undefined) return _tessOk;
  try { execFileSync('tesseract', ['--version'], { stdio: 'ignore' }); _tessOk = true; }
  catch { _tessOk = false; }
  return _tessOk;
}

function ocrText(file: string): string {
  if (!tesseractAvailable()) return '';
  try {
    // 'stdout' as the output base → tesseract writes plain text to stdout. --psm 11 = "sparse text"
    // (good for logos/cards where words are scattered, not a paragraph).
    // WHY cwd+basename: leptonica's path opener fails on some absolute paths (notably macOS's
    // /tmp → /private/tmp symlink — it appends the file's signature bytes to the path and 404s).
    // Running from the file's directory with a bare basename sidesteps it on any path. Same trick
    // keeps it robust for the real assets/library tree too.
    const out = execFileSync('tesseract', [path.basename(file), 'stdout', '--psm', '11'], {
      cwd: path.dirname(file),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 4 * 1024 * 1024,
    });
    // Keep only confident-looking words; collapse whitespace; cap length so a noisy OCR of a busy
    // screenshot doesn't bloat the caption (the first words carry the signal).
    const words = out.replace(/[^A-Za-z0-9$%\s]+/g, ' ').split(/\s+/).filter((w) => w.length >= 2);
    return words.slice(0, 40).join(' ').trim();
  } catch { return ''; }
}

// ── caption + tags for one file (zero-token) ──────────────────────────────────
function describe(file: string, root: string): { caption: string; tags: string[]; ocr: boolean; kind: string } {
  const ext = path.extname(file).toLowerCase();
  const isImage = IMAGE_EXT.has(ext);
  const kind = isImage ? 'image' : AUDIO_EXT.has(ext) ? 'audio' : VIDEO_EXT.has(ext) ? 'video' : 'file';

  // path-relative folders become tags ("cards/chase-…png" → ["cards"]); filename words too.
  const rel = path.relative(root, file);
  const dirParts = path.dirname(rel).split(path.sep).filter((p) => p && p !== '.');
  const base = path.basename(file, ext);
  const nameWords = base.replace(/[-_]+/g, ' ');

  let ocr = '';
  if (isImage) ocr = ocrText(file);

  const captionBits = [
    dirParts.length ? dirParts.join(' / ') : '',
    nameWords,
    ocr ? `“${ocr}”` : '',
  ].filter(Boolean);
  const caption = captionBits.join(' — ') || base;

  const tags = tokenize([dirParts.join(' '), nameWords, ocr, kind].join(' '));
  return { caption, tags, ocr: !!ocr, kind };
}

// ── walk the tree ─────────────────────────────────────────────────────────────
function walk(dir: string, acc: string[] = []): string[] {
  let ents: fs.Dirent[];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of ents) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

// ── ingest a fetch-assets.ts assets-manifest.json (carry license/attribution) ──
// fetch-assets writes { kind:'logo'|'concept', query, file, source, url, license, attribution }.
// We turn each entry into a library record so the cleared, attributed downloads join the bin.
function ingestManifest(manifestPath: string, records: Map<string, AssetRecord>): number {
  let arr: any[] = [];
  try { arr = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { return 0; }
  if (!Array.isArray(arr)) return 0;
  let n = 0;
  for (const a of arr) {
    if (!a?.file) continue;
    const file = path.isAbsolute(a.file) ? a.file : path.resolve(path.dirname(manifestPath), a.file);
    if (!fs.existsSync(file)) continue;
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file, ext).replace(/[-_]+/g, ' ');
    // The manifest's query ("Chase", "GLP-1 pen") is a high-quality caption — better than the slug.
    const captionBits = [a.kind ?? '', a.query ?? base, base].filter(Boolean);
    const caption = [...new Set(captionBits)].join(' — ');
    const tags = tokenize([a.kind ?? '', a.query ?? '', base].join(' '));
    records.set(file, {
      file, caption, tags,
      ...imageDims(file),
      source: a.source ?? 'fetch-assets',
      kind: a.kind ?? (IMAGE_EXT.has(ext) ? 'image' : 'file'),
      license: a.license,
      attribution: a.attribution,
      ocr: false,
    });
    n++;
  }
  return n;
}

// ── build the index ───────────────────────────────────────────────────────────
export interface BuildResult { root: string; indexPath: string; records: AssetRecord[]; manifests: number; }

export function build(root: string = DEFAULT_ROOT): BuildResult {
  fs.mkdirSync(root, { recursive: true });
  const records = new Map<string, AssetRecord>();

  const files = walk(root);
  const manifests: string[] = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (path.basename(file) === 'asset-index.json') continue;      // never index our own sidecar
    if (path.basename(file) === 'assets-manifest.json' || path.basename(file) === 'manifest.json') {
      manifests.push(file); continue;                              // handled below (carry license)
    }
    // Index images + audio/video/other-named-assets. Non-images get name/path tags only.
    const { caption, tags, ocr, kind } = describe(file, root);
    records.set(file, { file, caption, tags, ...imageDims(file), source: 'library', kind, ocr });
  }

  // Layer in fetched-asset manifests (their entries win — they carry license/attribution).
  let manifestCount = 0;
  for (const m of manifests) manifestCount += ingestManifest(m, records);

  const out = [...records.values()].sort((a, b) => a.file.localeCompare(b.file));
  const indexPath = path.join(root, 'asset-index.json');
  fs.writeFileSync(indexPath, JSON.stringify(out, null, 2));
  return { root, indexPath, records: out, manifests: manifestCount };
}

// ── lookup ────────────────────────────────────────────────────────────────────
export interface Match { record: AssetRecord; score: number; }
export interface LookupOpts { n?: number; root?: string; index?: AssetRecord[]; kind?: string; minScore?: number; }

/** Load the on-disk index for a root (empty array if none built yet — callers treat empty as "no library"). */
export function loadIndex(root: string = DEFAULT_ROOT): AssetRecord[] {
  const p = path.join(root, 'asset-index.json');
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
}

/**
 * Rank library assets against a free-text query by token overlap over caption + tags +
 * filename. Score is the fraction of query tokens matched, with a small bonus for tags that
 * match exactly (a tag hit is a stronger signal than a substring of the caption). Returns the
 * top N matches with their scores; callers gate on `minScore` (draft-plan uses a high bar so it
 * only reuses a library asset when it's confident).
 */
export function lookup(query: string, opts: LookupOpts = {}): Match[] {
  const n = opts.n ?? 5;
  const index = opts.index ?? loadIndex(opts.root ?? DEFAULT_ROOT);
  const qTokens = tokenize(query);
  if (!qTokens.length || !index.length) return [];

  const matches: Match[] = [];
  for (const rec of index) {
    if (opts.kind && rec.kind !== opts.kind) continue;
    const tagSet = new Set(rec.tags);
    const capTokens = new Set(tokenize(rec.caption));
    const fileTokens = new Set(tokenize(path.basename(rec.file)));

    let hits = 0;
    let tagHits = 0;
    for (const q of qTokens) {
      const inTag = tagSet.has(q);
      const inCap = capTokens.has(q);
      const inFile = fileTokens.has(q);
      // also count a query token that appears as a substring of a longer tag ("sapphire" within
      // a tag set that has "sapphirepreferred" is unlikely, but "double" within "doublecash" is).
      const inTagSub = !inTag && rec.tags.some((t) => t.includes(q) || q.includes(t));
      if (inTag || inCap || inFile || inTagSub) {
        hits++;
        if (inTag) tagHits++;
      }
    }
    if (!hits) continue;
    // base = matched fraction of the query; bonus rewards exact tag matches (max +0.25).
    const base = hits / qTokens.length;
    const bonus = Math.min(0.25, 0.08 * tagHits);
    const score = +(base + bonus).toFixed(3);
    matches.push({ record: rec, score });
  }
  matches.sort((a, b) => b.score - a.score || a.record.file.localeCompare(b.record.file));
  const filtered = opts.minScore != null ? matches.filter((m) => m.score >= opts.minScore!) : matches;
  return filtered.slice(0, n);
}

// ── CLI ───────────────────────────────────────────────────────────────────────
function flagVal(name: string, def = ''): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def;
}

// Only run the CLI when invoked directly (so importing lookup/build from draft-plan is side-effect free).
if (process.argv[1] && /asset-index\.ts$/.test(process.argv[1])) {
  const cmd = process.argv[2];
  if (cmd === 'build') {
    // `build [root]` — positional root, or --root R
    const posRoot = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : '';
    const root = path.resolve(flagVal('root', posRoot || DEFAULT_ROOT));
    const r = build(root);
    const img = r.records.filter((x) => x.kind === 'image').length;
    const ocr = r.records.filter((x) => x.ocr).length;
    console.log(`indexed ${r.records.length} asset(s) (${img} image, ${ocr} via OCR, ${r.manifests} from manifest) → ${path.relative(process.cwd(), r.indexPath)}`);
    for (const rec of r.records.slice(0, 12)) {
      const dim = rec.w ? `${rec.w}×${rec.h}` : '—';
      console.log(`  · ${path.basename(rec.file).padEnd(34)} ${dim.padEnd(11)} [${rec.tags.slice(0, 6).join(', ')}]`);
    }
    if (r.records.length > 12) console.log(`  … +${r.records.length - 12} more`);
  } else if (cmd === 'find') {
    const query = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : '';
    if (!query) { console.error('usage: asset-index.ts find "<query>" [root] [--root R] [--n 5] [--kind image]'); process.exit(1); }
    const posRoot = process.argv[4] && !process.argv[4].startsWith('--') ? process.argv[4] : '';  // `find "<q>" [root]`, mirror build
    const root = path.resolve(flagVal('root', posRoot || DEFAULT_ROOT));
    const n = parseInt(flagVal('n', '5'), 10);
    const kind = flagVal('kind') || undefined;
    const hits = lookup(query, { root, n, kind });
    if (!hits.length) { console.log(`no library match for "${query}" (root: ${path.relative(process.cwd(), root)} — build it first?)`); }
    for (const m of hits) {
      console.log(`  ${m.score.toFixed(3)}  ${path.relative(process.cwd(), m.record.file)}`);
      console.log(`         ${m.record.caption}`);
    }
  } else {
    console.error('usage:\n  asset-index.ts build [root]\n  asset-index.ts find "<query>" [--root R] [--n 5] [--kind image]');
    process.exit(1);
  }
}
