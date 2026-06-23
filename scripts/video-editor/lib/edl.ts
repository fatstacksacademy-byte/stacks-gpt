/**
 * EDL parser — turns a VIDEO-EDL-*.md edit-decision list into structured beats.
 *
 * The EDL is markdown. Beat tables have a header row containing "Beat" and
 * "Layout"; everything else (legend, global passes, b-roll capture list,
 * fact-check) is ignored. Each beat row maps to: section, beat name, layout,
 * b-roll source, overlay graphics, and the anchor phrase it attaches to.
 */

import * as fs from 'node:fs';

export type Layout = 'FACE' | 'GRAPHIC' | 'SCREEN+PiP' | 'FIELD' | 'TITLE' | string;

export interface OverlayGraphic {
  /** One backtick group from the overlay cell, split into display lines on " · ". */
  lines: string[];
}

export interface Beat {
  section: string; // e.g. "CARD #1 — Chase Ink Business Cash"
  cardNumber: number | null; // parsed from "CARD #N"
  beat: string; // e.g. "Bonus stat"
  layout: Layout;
  broll: string | null; // raw b-roll description, "—" => null
  overlayRaw: string; // raw overlay cell text
  overlays: OverlayGraphic[]; // each backtick group = one timed graphic
  anchor: string | null; // the spoken phrase, surrounding quotes stripped
  fx: string[]; // optional retention-FX tokens: zoom, sfx[:name], callout, captions:off
}

const DASHES = new Set(['—', '-', '–', '']);

function clean(cell: string): string {
  return cell.trim();
}

function nullIfDash(s: string): string | null {
  const t = s.trim();
  return DASHES.has(t) ? null : t;
}

/** Pull every `backtick group` out of a cell; each becomes one overlay graphic. */
function parseOverlays(cell: string): OverlayGraphic[] {
  const groups: OverlayGraphic[] = [];
  const re = /`([^`]+)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cell)) !== null) {
    const lines = m[1]
      .split(/\s+·\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length) groups.push({ lines });
  }
  // Cell with no backticks but real content (e.g. plain "list: ..."): keep as one group.
  if (groups.length === 0) {
    const t = nullIfDash(cell);
    if (t) groups.push({ lines: t.split(/\s+·\s+/).map((s) => s.trim()).filter(Boolean) });
  }
  return groups;
}

function stripQuotes(s: string): string {
  return s.replace(/^["'“”]+/, '').replace(/["'“”]+$/, '').trim();
}

function sectionTitle(heading: string): { title: string; cardNumber: number | null } {
  // "## CARD #1 — Chase Ink Business Cash  *(the #1 pick)*"
  let t = heading.replace(/^#+\s*/, '').trim();
  t = t.replace(/\*\(.*?\)\*/g, '').trim(); // drop *(notes)*
  t = t.replace(/\s{2,}/g, ' ');
  const cardMatch = t.match(/CARD\s+#(\d+)/i);
  return { title: t, cardNumber: cardMatch ? parseInt(cardMatch[1], 10) : null };
}

export function parseEDL(md: string): Beat[] {
  const lines = md.split(/\r?\n/);
  const beats: Beat[] = [];

  let currentSection = '';
  let currentCard: number | null = null;
  let cols: string[] | null = null; // header column order for the active table

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^#{2,}\s/.test(line)) {
      const { title, cardNumber } = sectionTitle(line);
      currentSection = title;
      currentCard = cardNumber;
      cols = null;
      continue;
    }

    const isRow = line.trimStart().startsWith('|');
    if (!isRow) {
      cols = null;
      continue;
    }

    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(clean);

    // separator row: |---|---|
    if (cells.every((c) => /^:?-{2,}:?$/.test(c.replace(/\s/g, '')) || c === '')) continue;

    // header row?
    const lower = cells.map((c) => c.toLowerCase());
    if (lower.includes('beat') && lower.includes('layout')) {
      cols = lower;
      continue;
    }

    if (!cols) continue; // a table we don't care about

    const get = (name: string): string => {
      const i = cols!.indexOf(name);
      return i >= 0 && i < cells.length ? cells[i] : '';
    };

    const beatName = get('beat');
    if (!beatName) continue;

    const overlayCell = get('overlay / graphic') || get('overlay');
    const anchorCell = get('anchor phrase') || get('anchor');
    const fxCell = get('fx') || get('effects');

    beats.push({
      section: currentSection,
      cardNumber: currentCard,
      beat: beatName,
      layout: (get('layout') || 'FACE').toUpperCase(),
      broll: nullIfDash(get('b-roll source') || get('b-roll')),
      overlayRaw: overlayCell,
      overlays: parseOverlays(overlayCell),
      anchor: anchorCell ? (nullIfDash(stripQuotes(anchorCell)) ?? null) : null,
      fx: (nullIfDash(fxCell) ?? '').toLowerCase().split(/[\s,]+/).filter(Boolean),
    });
  }

  return beats;
}

// CLI: `tsx scripts/video-editor/lib/edl.ts <edl.md>`
if (process.argv[1] && process.argv[1].endsWith('lib/edl.ts')) {
  const path = process.argv[2];
  if (!path) {
    console.error('usage: tsx lib/edl.ts <edl.md>');
    process.exit(1);
  }
  const beats = parseEDL(fs.readFileSync(path, 'utf8'));
  console.log(JSON.stringify(beats, null, 2));
  console.error(`\nParsed ${beats.length} beats across ${new Set(beats.map((b) => b.section)).size} sections.`);
}
