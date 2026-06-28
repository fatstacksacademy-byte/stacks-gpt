/**
 * fetch-assets — pull company LOGOS + CC-licensed CONCEPT images from the web,
 * the way a real editor grabs a brand mark or a stock shot when you name a thing.
 *
 * Our b-roll today only knows offer-page / DoC-article screenshots. For story &
 * explainer content ("a two-person team", "the GLP-1 wave", "$400M") you want a
 * real logo when a company is named and a concept image for an idea. This fetches
 * both — but deliberately from *attributable* sources so nothing creates a
 * licensing problem on a finance channel:
 *
 *   LOGOS    Clearbit Logo API (free, brand marks). A bare name is resolved to a
 *            domain via Clearbit autocomplete; "Name=domain.com" skips the lookup.
 *   CONCEPTS Openverse (Creative-Commons / public-domain only). License +
 *            attribution for every image are written into the manifest.
 *
 * Output: <out>/<slug>.<ext> files + <out>/assets-manifest.json (source, license,
 * attribution, query, dims). Review the manifest before placing — same approve-
 * before-use habit as the article finder. Feeds draft-plan / build-broll as heroes.
 *
 *   tsx scripts/video-editor/fetch-assets.ts --logos "Chase,Citi=citi.com,SoFi" --out shots/assets
 *   tsx scripts/video-editor/fetch-assets.ts --concepts "GLP-1 pen, weight loss drug" --out shots/assets --per 2
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

const outDir = arg('out') ?? 'shots/assets';
const per = Math.max(1, parseInt(arg('per') ?? '1', 10));
const logos = (arg('logos') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const concepts = (arg('concepts') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
if (!logos.length && !concepts.length) {
  console.error('need --logos "Name[,Name=domain.com]" and/or --concepts "idea, idea"');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

interface Asset {
  kind: 'logo' | 'concept';
  query: string;
  file: string;
  source: string;
  url: string;
  license: string;
  attribution: string;
}
const manifest: Asset[] = [];
const failures: string[] = [];

async function download(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'fat-stacks-video-editor/1.0' } });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 512) return false; // clearbit returns a tiny placeholder on miss
    fs.writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

const UA = { 'user-agent': 'fat-stacks-video-editor/1.0 (contact: fatstacksacademy@gmail.com)' };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s: string) => (s || '').replace(/<[^>]+>/g, '').trim();

async function resolveDomain(name: string): Promise<string | undefined> {
  try {
    const res = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(name)}`);
    if (!res.ok) return undefined;
    const j = (await res.json()) as { domain?: string }[];
    return j?.[0]?.domain;
  } catch {
    return undefined;
  }
}

/** Real brand logo from Wikidata P154 ("logo image") → Wikimedia Commons, rasterized
 *  to PNG (handles SVG) with license + attribution. Scans the top search hits since
 *  the first entity (e.g. a stadium named for the bank) often lacks a logo claim. */
async function wikidataLogo(name: string): Promise<{ url: string; license: string; artist: string; page: string } | undefined> {
  try {
    const s = (await (await fetch(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&format=json&type=item&limit=5`,
      { headers: UA })).json()) as { search?: { id: string }[] };
    for (const r of s.search ?? []) {
      const cl = (await (await fetch(
        `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${r.id}&property=P154&format=json`,
        { headers: UA })).json()) as any;
      const filename = cl?.claims?.P154?.[0]?.mainsnak?.datavalue?.value;
      if (!filename) { await sleep(120); continue; }
      const ii = (await (await fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=512&format=json`,
        { headers: UA })).json()) as any;
      const pg: any = Object.values(ii?.query?.pages ?? {})[0];
      const info = pg?.imageinfo?.[0];
      if (!info?.thumburl) { await sleep(120); continue; }
      const em = info.extmetadata ?? {};
      return { url: info.thumburl, license: em.LicenseShortName?.value ?? 'see Commons',
        artist: stripHtml(em.Artist?.value ?? '') || 'Wikimedia Commons', page: info.descriptionurl ?? '' };
    }
  } catch { /* fall through to favicon */ }
  return undefined;
}

async function fetchLogo(spec: string): Promise<void> {
  const [name, domainRaw] = spec.split('=').map((s) => s.trim());
  const file = path.join(outDir, `logo-${slug(name)}.png`);

  // 1) real brand logo (Wikimedia Commons via Wikidata P154)
  const wl = await wikidataLogo(name);
  if (wl && (await download(wl.url, file))) {
    manifest.push({ kind: 'logo', query: name, file, source: 'Wikimedia Commons', url: wl.page || wl.url,
      license: wl.license, attribution: wl.artist });
    console.log(`✓ logo   ${name.padEnd(18)} [${wl.license}] → ${path.relative(process.cwd(), file)}`);
    await sleep(150);
    return;
  }

  // 2) fallback: always-on favicon (DuckDuckGo) — small mark, no high-res
  const domain = domainRaw || (await resolveDomain(name));
  if (domain && (await download(`https://icons.duckduckgo.com/ip3/${domain}.ico`, file.replace(/\.png$/, '.ico')))) {
    manifest.push({ kind: 'logo', query: name, file: file.replace(/\.png$/, '.ico'), source: 'DuckDuckGo icons',
      url: `https://${domain}`, license: 'favicon (brand mark — editorial use)', attribution: domain });
    console.log(`✓ logo   ${name.padEnd(18)} (favicon fallback, low-res) → ${domain}`);
    return;
  }
  failures.push(`logo "${name}" — no Wikidata logo and no favicon (try "${name}=domain.com")`);
}

async function fetchConcept(q: string): Promise<void> {
  try {
    const api = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=${per * 3}&license_type=all-cc&mature=false`;
    const res = await fetch(api, { headers: { 'user-agent': 'fat-stacks-video-editor/1.0' } });
    if (!res.ok) {
      failures.push(`concept "${q}" — Openverse HTTP ${res.status}`);
      return;
    }
    const j = (await res.json()) as { results?: any[] };
    const results = (j.results ?? []).filter((r) => r.url);
    let got = 0;
    for (const r of results) {
      if (got >= per) break;
      const ext = (String(r.url).match(/\.(jpe?g|png|webp)(?:\?|$)/i)?.[1] ?? 'jpg').toLowerCase();
      const file = path.join(outDir, `concept-${slug(q)}-${got + 1}.${ext}`);
      if (await download(r.url, file)) {
        got++;
        manifest.push({ kind: 'concept', query: q, file, source: 'Openverse', url: r.foreign_landing_url ?? r.url,
          license: `${(r.license ?? '').toUpperCase()} ${r.license_version ?? ''}`.trim(),
          attribution: r.creator ? `${r.creator}${r.source ? ` / ${r.source}` : ''}` : (r.source ?? 'Openverse') });
        console.log(`✓ concept ${q.padEnd(18)} [${(r.license ?? '?').toUpperCase()}] → ${path.relative(process.cwd(), file)}`);
      }
    }
    if (!got) failures.push(`concept "${q}" — no usable CC image found`);
  } catch (e) {
    failures.push(`concept "${q}" — ${(e as Error).message}`);
  }
}

(async () => {
  for (const l of logos) await fetchLogo(l);
  for (const c of concepts) await fetchConcept(c);

  const manifestPath = path.join(outDir, 'assets-manifest.json');
  // merge with any prior manifest so repeated runs accumulate the library
  let prior: Asset[] = [];
  if (fs.existsSync(manifestPath)) {
    try { prior = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { /* ignore */ }
  }
  const byFile = new Map(prior.map((a) => [a.file, a]));
  for (const a of manifest) byFile.set(a.file, a);
  fs.writeFileSync(manifestPath, JSON.stringify([...byFile.values()], null, 2));

  console.log(`\n${manifest.length} fetched → ${path.relative(process.cwd(), manifestPath)}`);
  if (failures.length) {
    console.log(`⚠ ${failures.length} not fetched (resolve by hand):`);
    for (const f of failures) console.log(`   · ${f}`);
  }
})();
