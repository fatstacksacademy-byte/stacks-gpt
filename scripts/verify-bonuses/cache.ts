import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"

const CACHE_DIR = join(process.cwd(), ".cache", "verify-bonuses")

export type CacheEntry = {
  url: string
  htmlHash: string
  textContent: string
  fetchedAt: string
}

function ensureDir() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
}

function keyFor(id: string): string {
  return join(CACHE_DIR, `${id.replace(/[^a-z0-9-_]/gi, "_")}.json`)
}

export function loadCache(id: string): CacheEntry | null {
  ensureDir()
  const p = keyFor(id)
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, "utf8")) as CacheEntry
  } catch {
    return null
  }
}

export function saveCache(id: string, entry: CacheEntry) {
  ensureDir()
  writeFileSync(keyFor(id), JSON.stringify(entry, null, 2))
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000
export function isFresh(entry: CacheEntry, maxAgeMs = ONE_DAY_MS): boolean {
  const age = Date.now() - new Date(entry.fetchedAt).getTime()
  return age < maxAgeMs
}
