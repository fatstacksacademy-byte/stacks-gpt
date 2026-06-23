/**
 * render-brand-sheet — showcase every template with sample data, plus a one-page
 * overview (palette + fonts + template thumbnails) you can eyeball at a glance.
 *
 * Outputs to scripts/video-editor/build/brand-kit/:
 *   <name>.png         full-res 1920x1080 of each template
 *   brand-sheet.png    single overview page
 *
 * Usage: tsx scripts/video-editor/render-brand-sheet.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { chromium } from 'playwright';
import { BRAND, C, FONT, fontFaceCSS, dataUri } from './lib/brand';
import { titleHTML, graphicHTML, lowerHTML, nameTagHTML, statChipHTML, chapterHTML, outroHTML } from './lib/templates';

const repoRoot = process.cwd();
const outDir = path.join('scripts', 'video-editor', 'build', 'brand-kit');
const csp = path.join(repoRoot, 'public/card-art/chase-sapphire-preferred.png');
const bofa = path.join(repoRoot, 'public/card-art/bofa-customized-cash-rewards.png');

const samples: { name: string; label: string; html: string; transparent: boolean }[] = [
  { name: 'title-toppick', label: 'Title card — MY TOP PICK ribbon', transparent: false,
    html: titleHTML(1, 'Chase Sapphire Preferred', '100,000 UR · $5,000 in 3 mo · $95 AF', { art: csp, topPick: true }) },
  { name: 'title-plain', label: 'Title card — standard', transparent: false,
    html: titleHTML(4, 'BofA Customized Cash', '6% first year · $200 bonus · $0 AF', { art: bofa }) },
  { name: 'chapter', label: 'Chapter / open-loop card', transparent: false,
    html: chapterHTML('0:00 · INTRO', '6 cards, 3 at all-time highs') },
  { name: 'graphic', label: 'Earning-structure graphic', transparent: false,
    html: graphicHTML('How it earns', [
      ['5% office supply + internet/cable/phone (first $25k/yr)'],
      ['2% gas + dining (first $25k/yr)'],
      ['1% everything else'],
    ], bofa) },
  { name: 'outro', label: 'Outro / CTA card', transparent: false, html: outroHTML() },
  { name: 'lower', label: 'Lower-third bug (transparent)', transparent: true,
    html: lowerHTML([['Custom Cash is dead → get your 5% back', 'Office-supply gift cards = 5% on ~anything']]) },
  { name: 'nametag', label: 'Presenter name tag (transparent)', transparent: true, html: nameTagHTML() },
  { name: 'statchip', label: 'Gold stat callout (transparent)', transparent: true, html: statChipHTML('100K', 'UR points') },
];

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

  for (const s of samples) {
    await page.setContent(s.html, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(outDir, `${s.name}.png`), omitBackground: s.transparent });
  }

  // ── overview page ────────────────────────────────────────────────────────
  const swatches = Object.entries(C)
    .filter(([k]) => !['overlayInk'].includes(k))
    .map(([k, v]) => `<div style="text-align:center"><div style="width:150px;height:90px;border-radius:12px;background:${v};border:1px solid #ffffff22"></div><div style="font:600 20px ${FONT.body};color:#cfe0f0;margin-top:8px">${k}</div><div style="font:500 17px ${FONT.body};color:#7e93a8">${v}</div></div>`)
    .join('');

  const tiles = samples
    .map((s) => {
      const uri = dataUri(path.join(outDir, `${s.name}.png`));
      const bg = s.transparent ? `background:radial-gradient(130% 130% at 82% -10%, ${C.navyElev}, ${C.navyMid} 42%, ${C.navyDeep})` : 'background:#000';
      return `<div><div style="font:700 26px ${FONT.body};color:#fff;margin:0 0 12px">${s.label}</div>
        <div style="width:860px;height:484px;border-radius:14px;overflow:hidden;border:1px solid #ffffff1a;${bg}">
          <img src="${uri}" style="width:860px;height:484px;object-fit:contain"></div></div>`;
    })
    .join('');

  const overview = `<!doctype html><html><head><meta charset="utf8"><style>
    ${fontFaceCSS()}
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:1860px;background:radial-gradient(130% 90% at 80% -10%, ${C.navyElev}, ${C.navyDeep});padding:70px;font-family:${FONT.body}}
    h1{font-family:${FONT.display};font-size:96px;color:#fff;text-transform:uppercase;letter-spacing:.01em}
    h2{font-family:${FONT.display};font-size:44px;color:${C.green};text-transform:uppercase;margin:56px 0 24px}
  </style></head><body>
    <div style="display:flex;align-items:center;gap:20px"><div style="width:24px;height:24px;border-radius:50%;background:${C.green};box-shadow:0 0 22px ${C.green}"></div><div style="font-family:${FONT.heavy};font-size:30px;letter-spacing:.22em;color:${C.textSecondary}">${BRAND.lockup}</div></div>
    <h1>Video Brand Kit<span style="color:${C.green}">.</span></h1>
    <div style="font:500 34px ${FONT.body};color:${C.textSecondary};margin-top:10px">Punchy money look — one identity across title cards, lower-thirds & thumbnails</div>
    <h2>Palette</h2>
    <div style="display:flex;flex-wrap:wrap;gap:26px">${swatches}</div>
    <h2>Type</h2>
    <div style="display:flex;gap:80px;align-items:flex-end">
      <div><div class="" style="font-family:${FONT.display};font-size:120px;color:#fff;text-transform:uppercase;line-height:.9">Anton</div><div style="font:500 24px ${FONT.body};color:#7e93a8">display — titles, chapters</div></div>
      <div><div style="font-family:${FONT.heavy};font-size:96px;color:${C.gold}">100K</div><div style="font:500 24px ${FONT.body};color:#7e93a8">Archivo Black — stats, emphasis</div></div>
    </div>
    <h2>Templates</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px 40px">${tiles}</div>
  </body></html>`;

  const big = await browser.newPage({ viewport: { width: 1860, height: 1200 }, deviceScaleFactor: 1 });
  await big.setContent(overview, { waitUntil: 'networkidle' });
  await big.screenshot({ path: path.join(outDir, 'brand-sheet.png'), fullPage: true });

  await browser.close();
  console.log(`✓ brand kit → ${outDir} (${samples.length} templates + brand-sheet.png)`);
}

main();
