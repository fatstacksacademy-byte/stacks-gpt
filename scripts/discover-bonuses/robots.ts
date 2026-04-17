import { UA } from "./env"
import { log } from "./logger"

type RobotsCache = Map<string, RobotsRules>
type RobotsRules = {
  // allowed patterns for our UA (or *)
  disallow: string[]
}

const cache: RobotsCache = new Map()

export async function isAllowed(url: string): Promise<boolean> {
  try {
    const u = new URL(url)
    const host = u.host
    let rules = cache.get(host)
    if (!rules) {
      rules = await fetchRobots(host)
      cache.set(host, rules)
    }
    for (const path of rules.disallow) {
      if (!path) continue
      if (u.pathname.startsWith(path)) {
        log("info", "robots.disallow", { url, path })
        return false
      }
    }
    return true
  } catch (err) {
    log("warn", "robots.check_failed", {
      url,
      error: err instanceof Error ? err.message : String(err),
    })
    return true // fail open — don't block the run on robots fetch error
  }
}

async function fetchRobots(host: string): Promise<RobotsRules> {
  const robotsUrl = `https://${host}/robots.txt`
  try {
    const r = await fetch(robotsUrl, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) return { disallow: [] }
    const text = await r.text()
    return parseRobots(text)
  } catch {
    return { disallow: [] }
  }
}

// Minimal robots.txt parser — honors User-agent: * and User-agent: <our bot>
export function parseRobots(text: string): RobotsRules {
  const disallow: string[] = []
  const lines = text.split(/\r?\n/)
  let currentUA: string | null = null
  let appliesToUs = false
  const ourBot = UA.split("/")[0].toLowerCase() // "StackOS-BonusBot"

  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim()
    if (!line) continue
    const m = line.match(/^([A-Za-z-]+):\s*(.*)$/)
    if (!m) continue
    const key = m[1].toLowerCase()
    const val = m[2].trim()

    if (key === "user-agent") {
      currentUA = val.toLowerCase()
      appliesToUs = currentUA === "*" || currentUA === ourBot
      continue
    }
    if (!appliesToUs) continue
    if (key === "disallow" && val) {
      disallow.push(val)
    }
    // allow: lines are not strictly enforced in this minimal parser — we err on the side of politeness
  }
  return { disallow }
}
