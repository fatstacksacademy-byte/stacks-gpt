/**
 * templates — the Fat Stacks Academy graphic template library (punchy money look).
 *
 * Pure functions: data in → 1920x1080 HTML out. Rendered to PNG by render-cards.ts
 * (pipeline) and render-brand-sheet.ts (showcase). Every color/font comes from
 * brand.ts so the whole kit + thumbnails stay one identity. Templates:
 *   title     full-screen section title (+ "MY TOP PICK" ribbon variant)
 *   graphic   full-screen earning / category table
 *   lower     transparent lower-third bug
 *   nameTag   transparent presenter name tag (intro)
 *   statChip  transparent gold stat callout (e.g. 100K, $1,000) — animation-ready
 *   chapter   open-loop chapter card
 *   outro     subscribe + tools CTA card
 */
import { BRAND, C, FONT, fontFaceCSS, dataUri, esc, rich } from './brand';

export interface TitleOpts {
  art?: string;
  topPick?: boolean;
  rank?: string; // e.g. "#1" — big rank chip, overrides CARD #N badge
}

function frame(inner: string, transparent: boolean): string {
  return `<!doctype html><html><head><meta charset="utf8"><style>
    ${fontFaceCSS()}
    *{margin:0;padding:0;box-sizing:border-box;font-family:${FONT.body};-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
    html,body{width:${BRAND.geometry.width}px;height:${BRAND.geometry.height}px;${transparent ? 'background:transparent' : `background:radial-gradient(130% 130% at 82% -10%, ${C.navyElev}, ${C.navyMid} 42%, ${C.navyDeep})`}}
    .hot{color:${C.gold};font-family:${FONT.heavy};font-weight:400}
    .disp{font-family:${FONT.display};letter-spacing:.01em}
    .heavy{font-family:${FONT.heavy}}
    .glow{filter:drop-shadow(0 0 22px ${C.green}55)}
  </style></head><body>${inner}</body></html>`;
}

/** small reusable green→transparent accent bar */
const accentBar = (w = 130) =>
  `<div style="height:${BRAND.geometry.accentBarH}px;width:${w}px;background:linear-gradient(90deg,${C.greenBright},${C.green});border-radius:8px"></div>`;

/** corner brand lockup, used on full-screen cards */
const lockup = () =>
  `<div style="position:absolute;left:${BRAND.geometry.safeX}px;top:64px;display:flex;align-items:center;gap:16px">
     <div style="width:18px;height:18px;border-radius:50%;background:${C.green};box-shadow:0 0 18px ${C.green}">${''}</div>
     <div class="heavy" style="font-size:26px;letter-spacing:.22em;color:${C.textSecondary}">${esc(BRAND.lockup)}</div>
   </div>`;

const ribbon = () =>
  `<div class="heavy" style="position:absolute;left:${BRAND.geometry.safeX}px;top:296px;display:inline-flex;align-items:center;gap:16px;background:linear-gradient(90deg,${C.greenDeep},${C.green});color:${C.navyDeep};font-size:34px;padding:14px 32px;border-radius:14px;box-shadow:0 16px 40px rgba(0,0,0,.5)"><span style="font-family:${FONT.body};font-size:32px;line-height:1">★</span>MY TOP PICK</div>`;

export function titleHTML(cardNumber: number | null, title: string, sub: string, opts: TitleOpts = {}): string {
  const { art, topPick, rank } = opts;
  const badge = rank
    ? `<div class="disp" style="font-size:200px;line-height:.8;color:${C.green};-webkit-text-stroke:3px ${C.navyDeep}">${esc(rank)}</div>`
    : cardNumber
      ? `<div class="heavy" style="font-size:40px;letter-spacing:.18em;color:${C.green}">CARD #${cardNumber}</div>`
      : '';
  const uri = dataUri(art);
  const artImg = uri
    ? `<img class="glow" src="${uri}" style="position:absolute;right:130px;top:50%;transform:translateY(-50%) rotate(-4deg);width:560px;border-radius:24px;box-shadow:0 36px 90px rgba(0,0,0,.65)">`
    : '';
  return frame(
    `${lockup()}${topPick ? ribbon() : ''}
     <div style="position:absolute;left:${BRAND.geometry.safeX}px;top:50%;transform:translateY(-50%);max-width:1040px">
       ${accentBar()}
       <div style="margin:30px 0 14px">${badge}</div>
       <div class="disp" style="font-size:118px;line-height:.96;color:${C.textPrimary};text-transform:uppercase">${esc(title)}</div>
       <div style="font:500 46px ${FONT.body};color:${C.textSecondary};margin-top:26px">${rich(sub)}</div>
     </div>${artImg}`,
    false
  );
}

export function graphicHTML(heading: string, groups: string[][], art?: string): string {
  const blocks = groups
    .map(
      (lines) =>
        `<div style="margin:0 0 18px">
           ${lines
             .map(
               (l, i) =>
                 `<div style="display:flex;align-items:flex-start;gap:24px;margin:16px 0">
                    <div style="flex:0 0 auto;width:20px;height:20px;border-radius:6px;background:${i === 0 ? C.green : C.line};margin-top:16px;${i === 0 ? `box-shadow:0 0 16px ${C.green}` : ''}"></div>
                    <div style="font:${i === 0 ? 700 : 500} ${i === 0 ? 54 : 44}px ${FONT.body};color:${i === 0 ? C.textPrimary : '#cfe0f0'}">${rich(l)}</div>
                  </div>`
             )
             .join('')}
         </div>`
    )
    .join('');
  const uri = dataUri(art);
  const artImg = uri
    ? `<img class="glow" src="${uri}" style="position:absolute;right:120px;bottom:120px;width:420px;border-radius:20px;box-shadow:0 28px 70px rgba(0,0,0,.6)">`
    : '';
  return frame(
    `${lockup()}
     <div style="position:absolute;left:${BRAND.geometry.safeX}px;top:150px;right:120px">
       <div class="disp" style="font-size:80px;color:${C.textPrimary};text-transform:uppercase;margin-bottom:40px">${esc(heading)}<span style="color:${C.green}">.</span></div>
       ${blocks}
     </div>${artImg}`,
    false
  );
}

export function lowerHTML(groups: string[][]): string {
  const lines = groups.flat();
  const head = lines[0] ?? '';
  const rest = lines.slice(1);
  return frame(
    `<div style="position:absolute;left:${BRAND.geometry.safeX - 40}px;bottom:96px;max-width:1420px">
       <div style="display:inline-block;background:${C.overlayInk};border-left:10px solid ${C.green};border-radius:18px;padding:30px 46px;box-shadow:0 26px 64px rgba(0,0,0,.55);backdrop-filter:blur(2px)">
         <div style="font:800 56px ${FONT.body};color:${C.textPrimary}">${rich(head)}</div>
         ${rest.map((l) => `<div style="font:500 40px ${FONT.body};color:#bcd0e4;margin-top:12px">${rich(l)}</div>`).join('')}
       </div>
     </div>`,
    true
  );
}

export function nameTagHTML(name = BRAND.presenter, role = `${BRAND.name} · bank & card bonuses`): string {
  return frame(
    `<div style="position:absolute;left:${BRAND.geometry.safeX - 40}px;bottom:110px;display:flex;align-items:stretch;border-radius:16px;overflow:hidden;box-shadow:0 26px 64px rgba(0,0,0,.55)">
       <div style="width:14px;background:linear-gradient(180deg,${C.greenBright},${C.greenDeep})"></div>
       <div style="background:${C.overlayInk};padding:26px 40px">
         <div class="heavy" style="font-size:58px;color:${C.textPrimary}">${esc(name)}</div>
         <div style="font:600 32px ${FONT.body};color:${C.green};letter-spacing:.02em;margin-top:6px">${esc(role)}</div>
       </div>
     </div>`,
    true
  );
}

/** Transparent gold stat callout — the pipeline pops this in when a number is spoken.
 *  Anchored lower-right (same band as the captions) for eye-line continuity — the
 *  viewer's gaze stays in the lower third instead of jumping to a far corner. */
export function statChipHTML(value: string, label?: string): string {
  return frame(
    `<div style="position:absolute;right:120px;bottom:250px;text-align:center">
       <div style="display:inline-block;background:linear-gradient(160deg,${C.goldBright},${C.gold});border-radius:26px;padding:26px 46px;box-shadow:0 24px 60px rgba(0,0,0,.5),0 0 0 6px ${C.gold}33">
         <div class="disp" style="font-size:132px;line-height:.82;color:${C.navyDeep}">${esc(value)}</div>
       </div>
       ${label ? `<div class="heavy" style="font-size:34px;color:${C.gold};margin-top:16px;letter-spacing:.04em;text-transform:uppercase">${esc(label)}</div>` : ''}
     </div>`,
    true
  );
}

/** Impact caption — big ALL-CAPS verbatim emphasis, centered, heavy stroke (no pill). */
export function captionImpactHTML(text: string): string {
  return frame(
    `<div style="position:absolute;left:50%;bottom:170px;transform:translateX(-50%);width:1640px;text-align:center">
       <div class="heavy" style="display:inline-block;font-size:92px;line-height:1.04;color:${C.textPrimary};text-transform:uppercase;-webkit-text-stroke:6px ${C.navyDeep};paint-order:stroke fill;text-shadow:0 6px 22px rgba(0,0,0,.7)">${esc(text)}</div>
     </div>`,
    true
  );
}

/** Clean line caption — bottom-center, white with gold numbers, strong legibility. */
export function captionHTML(text: string): string {
  return frame(
    `<div style="position:absolute;left:50%;bottom:120px;transform:translateX(-50%);width:1500px;text-align:center">
       <div style="display:inline-block;background:rgba(11,18,32,0.55);border-radius:14px;padding:14px 34px;font:800 62px ${FONT.body};color:${C.textPrimary};line-height:1.18;text-shadow:0 3px 14px rgba(0,0,0,.85),0 0 2px rgba(0,0,0,.9)">${rich(text)}</div>
     </div>`,
    true
  );
}

export function chapterHTML(num: string, title: string): string {
  return frame(
    `${lockup()}
     <div style="position:absolute;left:${BRAND.geometry.safeX}px;top:50%;transform:translateY(-50%);max-width:1500px">
       <div class="heavy" style="font-size:44px;color:${C.green};letter-spacing:.1em">${esc(num)}</div>
       ${accentBar(180)}
       <div class="disp" style="font-size:140px;line-height:.94;color:${C.textPrimary};text-transform:uppercase;margin-top:24px">${esc(title)}</div>
     </div>`,
    false
  );
}

export interface OutroOpts {
  headline?: string;
  tools?: string[];
}

export function outroHTML(opts: OutroOpts = {}): string {
  const headline = opts.headline ?? 'GRAB THE CARDS BELOW';
  const tools = opts.tools ?? [
    'Free bonus tracker → Stacks OS',
    'Card value calculator',
    'Search 1,000+ cards by state',
  ];
  return frame(
    `${lockup()}
     <div style="position:absolute;left:${BRAND.geometry.safeX}px;top:50%;transform:translateY(-50%);max-width:1200px">
       ${accentBar(180)}
       <div class="disp" style="font-size:120px;line-height:.96;color:${C.textPrimary};text-transform:uppercase;margin:28px 0 22px">${esc(headline)}</div>
       <div class="heavy" style="display:inline-flex;align-items:center;gap:16px;background:linear-gradient(90deg,${C.greenDeep},${C.green});color:${C.navyDeep};font-size:40px;padding:18px 36px;border-radius:16px;box-shadow:0 16px 40px rgba(0,0,0,.5)">▶ SUBSCRIBE — best bonuses monthly</div>
       <div style="margin-top:42px">
         ${tools.map((t) => `<div style="display:flex;align-items:center;gap:20px;margin:18px 0;font:600 46px ${FONT.body};color:#cfe0f0"><span style="color:${C.green};font-size:40px">✔</span>${rich(t)}</div>`).join('')}
       </div>
     </div>
     <div style="position:absolute;right:120px;bottom:90px;font:600 34px ${FONT.body};color:${C.textMuted}">${esc(BRAND.handle)}</div>`,
    false
  );
}
