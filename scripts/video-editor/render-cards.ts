/**
 * render-cards — turns plan beats into PNG graphics via Playwright.
 *
 * Thin driver over lib/templates.ts (the branded template library). Reads/writes
 * build/<slug>/plan.json (adds an `image` path to each beat that gets a graphic)
 * and writes PNGs to build/<slug>/overlays/.
 *
 * Usage: tsx scripts/video-editor/render-cards.ts --plan build/best-cards-june-2026/plan.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { chromium } from 'playwright';
import { titleHTML, graphicHTML, lowerHTML, captionHTML, captionImpactHTML, statChipHTML } from './lib/templates';

interface PlanBeat {
  order: number;
  layout: string;
  section: string;
  beat: string;
  cardNumber: number | null;
  overlays: { lines: string[] }[];
  cardArt: string | null;
  fx?: string[];
  image?: string;
}
interface Caption { t: number; end: number; text: string; impact?: boolean; image?: string }
interface Callout { t: number; value: string; label: string; chip?: boolean; image?: string }

const TOP_PICK = /\btop pick\b|\bmy #?1\b|#1 this month|number one/i;

async function main() {
  const pi = process.argv.indexOf('--plan');
  const planPath = pi >= 0 ? process.argv[pi + 1] : '';
  if (!planPath) throw new Error('usage: render-cards.ts --plan <plan.json>');
  const skipCaptions = process.argv.includes('--skip-captions');
  const repoRoot = process.cwd();
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8')) as { beats: PlanBeat[]; captions?: Caption[]; callouts?: Callout[] };
  const outDir = path.join(path.dirname(planPath), 'overlays');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

  let rendered = 0;
  for (const b of plan.beats) {
    const groups = b.overlays.map((o) => o.lines).filter((l) => l.length);
    const art = b.cardArt ? path.join(repoRoot, b.cardArt) : undefined;
    let html: string | null = null;
    let kind = '';

    if (b.layout === 'TITLE') {
      const sub = groups[0]?.slice(1).join(' · ') ?? '';
      const topPick = TOP_PICK.test(b.overlays.flatMap((o) => o.lines).join(' ') + ' ' + b.section);
      html = titleHTML(b.cardNumber, b.section.replace(/^CARD #\d+\s*—\s*/, ''), sub, { art, topPick });
      kind = 'title';
    } else if (b.layout === 'GRAPHIC') {
      html = graphicHTML(b.beat, groups, art);
      kind = 'graphic';
    } else if (groups.length) {
      html = lowerHTML(groups);
      kind = 'lower';
    }
    if (!html) continue;

    const file = path.join(outDir, `${String(b.order).padStart(2, '0')}-${kind}.png`);
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.screenshot({ path: file, omitBackground: kind === 'lower' });
    b.image = path.relative(repoRoot, file);
    rendered++;
  }

  // Gold number callouts (transparent stat-chip pop-ins).
  let calls = 0;
  if (plan.callouts?.length) {
    const cdir = path.join(outDir, 'callouts');
    fs.mkdirSync(cdir, { recursive: true });
    for (let i = 0; i < plan.callouts.length; i++) {
      const c = plan.callouts[i];
      if (!c.chip) continue; // chips reserved for the headline bonus (see markChips)
      const file = path.join(cdir, `${String(i).padStart(3, '0')}.png`);
      await page.setContent(statChipHTML(c.value, c.label), { waitUntil: 'networkidle' });
      await page.screenshot({ path: file, omitBackground: true });
      c.image = path.relative(repoRoot, file);
      calls++;
    }
  }

  // Clean line captions (transparent burn-in; the no-plugin floor — MagicSubtitle
  // can replace these from captions.srt in the hero pass).
  let caps = 0;
  if (plan.captions?.length && !skipCaptions) {
    const cdir = path.join(outDir, 'captions');
    fs.mkdirSync(cdir, { recursive: true });
    for (let i = 0; i < plan.captions.length; i++) {
      const cap = plan.captions[i];
      const file = path.join(cdir, `${String(i).padStart(4, '0')}.png`);
      await page.setContent(cap.impact ? captionImpactHTML(cap.text) : captionHTML(cap.text), { waitUntil: 'networkidle' });
      await page.screenshot({ path: file, omitBackground: true });
      cap.image = path.relative(repoRoot, file);
      caps++;
    }
  }

  await browser.close();
  fs.writeFileSync(planPath, JSON.stringify({ ...JSON.parse(fs.readFileSync(planPath, 'utf8')), beats: plan.beats, captions: plan.captions, callouts: plan.callouts }, null, 2));
  console.log(`✓ rendered ${rendered} graphics${calls ? ` · ${calls} callouts` : ''}${caps ? ` · ${caps} captions` : ''} → ${outDir}`);
}

main();
