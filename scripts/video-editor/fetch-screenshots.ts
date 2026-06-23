#!/usr/bin/env tsx
/**
 * fetch-screenshots.ts — auto-pull high-quality offer-page / article screenshots for video editing.
 *
 * Reads the outline/script/transcript (or an explicit card/url list), figures out which offer pages
 * and articles you talk about, and captures crisp 2x-DPI screenshots (viewport + full-page) so they
 * can feed the B-roll heroes / panels / blur-callouts. Playwright (chromium) — already installed.
 *
 * Usage:
 *   tsx scripts/video-editor/fetch-screenshots.ts --transcript /tmp/facetx/face_audio.json --out shots/june-2026
 *   tsx scripts/video-editor/fetch-screenshots.ts --cards chase-sapphire-preferred-75k,usb-cash-plus-200 --out shots/x
 *   tsx scripts/video-editor/fetch-screenshots.ts --urls "calculator=https://fatstacksacademy.com/credit-card-calculator" --out shots/x
 * Flags: --transcript <file>  --cards <ids|names csv>  --urls "label=url;..."  --site (add fatstacksacademy pages)
 *        --out <dir>  --width 1920  --dpr 2  --no-full (skip full-page)  --timeout 45000
 */
import { chromium, type Page } from 'playwright'
import { creditCardBonuses } from '../../lib/data/creditCardBonuses'
import * as fs from 'fs'
import * as path from 'path'

type Target = { label: string; url: string; note?: string }

const STOP = new Set(['the', 'card', 'credit', 'bank', 'visa', 'mastercard', 'amex', 'rewards', 'cash', 'business', 'a', 'of'])
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const tokens = (s: string) => norm(s).split(' ').filter(w => w.length > 2 && !STOP.has(w))

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def
}
const flag = (name: string) => process.argv.includes(`--${name}`)

function readTranscript(file: string): string {
  const raw = fs.readFileSync(file, 'utf8')
  if (file.endsWith('.json')) {
    try {
      const d = JSON.parse(raw)
      if (Array.isArray(d?.segments)) return d.segments.map((s: any) => s.text || '').join(' ')
      if (typeof d?.text === 'string') return d.text
    } catch { /* fall through */ }
  }
  return raw
}

// fatstacksacademy site pages commonly referenced
const SITE_PAGES: Target[] = [
  { label: 'site-blog-writeup', url: 'https://fatstacksacademy.com/blog/best-credit-cards-june-2026', note: 'video write-up' },
  { label: 'site-calculator', url: 'https://fatstacksacademy.com/credit-card-calculator', note: 'value calculator' },
  { label: 'site-cards-by-state', url: 'https://fatstacksacademy.com/cards', note: '1000+ cards by state' },
  { label: 'site-stacksos', url: 'https://fatstacksacademy.com/stacksos', note: 'tracker landing' },
]

function resolveTargets(): Target[] {
  const out: Target[] = []
  const byId = new Map(creditCardBonuses.map(c => [c.id, c]))

  const cardsArg = arg('cards')
  if (cardsArg) {
    for (const key of cardsArg.split(',').map(s => s.trim()).filter(Boolean)) {
      const c = byId.get(key) || creditCardBonuses.find(c => norm(c.card_name) === norm(key) || c.id.includes(key))
      if (c?.offer_link) out.push({ label: c.id, url: c.offer_link, note: c.card_name })
      else console.warn(`  ⚠ no card/offer_link for "${key}"`)
    }
  }

  const tFile = arg('transcript')
  if (tFile) {
    const text = ' ' + norm(readTranscript(tFile)) + ' '
    const seen = new Set(out.map(t => t.label))
    for (const c of creditCardBonuses) {
      if (!c.offer_link || seen.has(c.id)) continue
      const name = norm(c.card_name)
      const ks = tokens(c.card_name)
      const hit = text.includes(' ' + name + ' ') || (ks.length >= 2 && ks.every(k => text.includes(' ' + k + ' ')) )
      if (hit) { out.push({ label: c.id, url: c.offer_link, note: c.card_name }); seen.add(c.id) }
    }
    // detect site mentions
    if (/fatstacksacademy|in the description|my (site|website)|calculator|stacks ?os/.test(text)) {
      for (const p of SITE_PAGES) if (!out.some(t => t.url === p.url)) out.push(p)
    }
  }

  const urlsArg = arg('urls')
  if (urlsArg) for (const pair of urlsArg.split(';').map(s => s.trim()).filter(Boolean)) {
    const eq = pair.indexOf('=')
    if (eq > 0) out.push({ label: pair.slice(0, eq).trim(), url: pair.slice(eq + 1).trim() })
  }

  if (flag('site')) for (const p of SITE_PAGES) if (!out.some(t => t.url === p.url)) out.push(p)
  return out
}

async function dismissBanners(page: Page) {
  const sels = ['#onetrust-accept-btn-handler', 'button:has-text("Accept all")', 'button:has-text("Accept All")',
    'button:has-text("Accept")', 'button:has-text("I Accept")', 'button:has-text("Got it")',
    'button:has-text("Continue")', '[aria-label="Close"]']
  for (const s of sels) {
    try { const el = page.locator(s).first(); if (await el.isVisible({ timeout: 600 })) { await el.click({ timeout: 1000 }); await page.waitForTimeout(300) } } catch { }
  }
}

async function main() {
  const targets = resolveTargets()
  if (!targets.length) { console.error('No targets. Pass --cards, --transcript, --urls, or --site.'); process.exit(1) }
  const outDir = path.resolve(arg('out', 'scripts/video-editor/shots')!)
  fs.mkdirSync(outDir, { recursive: true })
  const width = parseInt(arg('width', '1920')!), dpr = parseInt(arg('dpr', '2')!)
  const timeout = parseInt(arg('timeout', '45000')!), doFull = !flag('no-full')

  console.log(`\n📸 ${targets.length} targets → ${outDir}  (${width}px @ ${dpr}x = ${width * dpr}px wide)\n`)
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width, height: 1080 }, deviceScaleFactor: dpr,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  })
  const manifest: any[] = []
  for (const t of targets) {
    const page = await ctx.newPage()
    const rec: any = { ...t, files: [] as string[] }
    try {
      await page.goto(t.url, { waitUntil: 'networkidle', timeout }).catch(async () =>
        page.goto(t.url, { waitUntil: 'domcontentloaded', timeout }))
      await dismissBanners(page)
      await page.waitForTimeout(1200)
      const vp = path.join(outDir, `${t.label}--viewport.png`)
      await page.screenshot({ path: vp })
      rec.files.push(vp)
      if (doFull) {
        // nudge lazy-loaded content, then full-page
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {})
        await page.waitForTimeout(900)
        await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {})
        await page.waitForTimeout(400)
        const fp = path.join(outDir, `${t.label}--full.png`)
        await page.screenshot({ path: fp, fullPage: true })
        rec.files.push(fp)
      }
      rec.ok = true
      console.log(`  ✅ ${t.label}  ${t.note ? '(' + t.note + ')' : ''}  → ${rec.files.length} shot(s)`)
    } catch (e: any) {
      rec.ok = false; rec.error = String(e?.message || e)
      console.log(`  ❌ ${t.label}  ${t.url}  — ${rec.error.split('\n')[0]}`)
    } finally { await page.close(); manifest.push(rec) }
  }
  await browser.close()
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  const ok = manifest.filter(m => m.ok).length
  console.log(`\n✅ ${ok}/${manifest.length} captured → ${outDir}\n   (manifest.json written; failures usually = bank bot-walls, screen-record those by hand)`)
}
main()
