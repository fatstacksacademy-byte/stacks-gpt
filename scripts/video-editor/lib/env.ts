/**
 * env — load the repo's gitignored `.env.local` (or `.env`) into process.env for
 * standalone scripts run via `npx tsx`.
 *
 * Next.js auto-loads .env.local, but a plain `tsx script.ts` does NOT — so the
 * optional `--llm` paths (correct-captions, patch-plan) couldn't see
 * ANTHROPIC_API_KEY even though it sits in .env.local. This walks up from the
 * working dir to find the nearest env file and fills any vars NOT already set
 * (an explicit shell `export` always wins). Dependency-free; never logs values.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

let loaded = false;

export function loadEnvLocal(): void {
  if (loaded) return;
  loaded = true;
  let dir = process.cwd();
  for (let i = 0; i < 12; i++) {
    for (const name of ['.env.local', '.env']) {
      const f = path.join(dir, name);
      if (!fs.existsSync(f)) continue;
      for (const raw of fs.readFileSync(f, 'utf8').split('\n')) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq < 1) continue;
        const k = line.slice(0, eq).trim().replace(/^export\s+/, '');
        let v = line.slice(eq + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (k && !(k in process.env)) process.env[k] = v;
      }
      return; // nearest env file wins
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
}
