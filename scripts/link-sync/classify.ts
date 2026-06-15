/**
 * Pure (network-free) link extraction + classification.
 *
 * Given a video description and the registry, find every URL, decide what each
 * one is (current / stale / review / orphan / …), and compute the rewritten
 * description that applies only the *safe* fixes. All deterministic — unit
 * tested in classify.test.ts. Live destination checks live in livecheck.ts and
 * are layered on top by core.ts.
 */
import type { FoundLink, LinkProgram, LinkVerdict, VideoVerdict } from "./types"
import { looksAffiliate } from "./registry"

// URLs as they appear in descriptions. We trim trailing punctuation after.
const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi

/** Strip trailing punctuation a URL regex tends to grab from prose. */
function cleanUrl(raw: string): string {
  return raw.replace(/[.,;:!?)\]}'"]+$/, "")
}

/** Normalize for equality compares: drop a single trailing slash + trailing dot. */
function norm(url: string): string {
  return url.trim().replace(/\/+$/, "")
}

function urlsEqual(a: string, b: string): boolean {
  return norm(a) === norm(b)
}

/** Extract every URL with the line it sat on as context (lowercased). */
export function extractLinks(description: string): FoundLink[] {
  const out: FoundLink[] = []
  for (const line of description.split(/\r?\n/)) {
    const matches = line.match(URL_RE)
    if (!matches) continue
    const context = line.toLowerCase()
    for (const m of matches) out.push({ url: cleanUrl(m), context })
  }
  return out
}

/** Programs whose domain pattern matches this URL. */
function domainCandidates(url: string, registry: LinkProgram[]): LinkProgram[] {
  return registry.filter((p) => p.domainMatch?.test(url))
}

/** Among domain candidates, pick the one whose contextKeywords match the line. */
function disambiguate(candidates: LinkProgram[], context: string): LinkProgram | "ambiguous" | null {
  if (candidates.length === 0) return null
  if (candidates.length === 1 && !candidates[0].contextKeywords) return candidates[0]

  const byContext = candidates.filter((p) =>
    p.contextKeywords?.some((k) => context.includes(k.toLowerCase())),
  )
  if (byContext.length === 1) return byContext[0]
  if (byContext.length > 1) return "ambiguous"
  // No keyword hit: if exactly one candidate has no keyword gate, use it;
  // otherwise we can't safely tell them apart.
  const ungated = candidates.filter((p) => !p.contextKeywords)
  if (ungated.length === 1) return ungated[0]
  return "ambiguous"
}

/** Classify one found link against the registry (no network). */
export function classifyLink(link: FoundLink, registry: LinkProgram[]): LinkVerdict {
  const { url } = link

  // 1) Exact current link for some program → already correct.
  for (const p of registry) {
    if (p.currentUrl && urlsEqual(url, p.currentUrl)) {
      return { link, status: "current", programKey: p.key, autoFixable: false, reason: `Current ${p.label} link.` }
    }
  }

  // 2) Exact known alias → unambiguously stale, safe to rewrite.
  for (const p of registry) {
    if (p.aliases?.some((a) => urlsEqual(url, a))) {
      if (!p.currentUrl) {
        return {
          link,
          status: "needs-current",
          programKey: p.key,
          autoFixable: false,
          reason: `Retired ${p.label} link, and no current link is set${p.rotates ? " (rotates — paste a fresh one)" : ""}.`,
        }
      }
      return {
        link,
        status: "stale",
        programKey: p.key,
        target: p.currentUrl,
        autoFixable: true,
        reason: `Old ${p.label} link → update to current.`,
      }
    }
  }

  // 3) Same domain as a known program but an unrecognized specific URL.
  const picked = disambiguate(domainCandidates(url, registry), link.context)
  if (picked === "ambiguous") {
    return { link, status: "review", autoFixable: false, reason: "Matches a known domain but can't tell which product — review." }
  }
  if (picked) {
    if (!picked.currentUrl) {
      return {
        link,
        status: "needs-current",
        programKey: picked.key,
        autoFixable: false,
        reason: `Looks like ${picked.label} but no current link is set.`,
      }
    }
    return {
      link,
      status: "review",
      programKey: picked.key,
      target: picked.currentUrl,
      autoFixable: false,
      reason: `Unrecognized ${picked.label} link — confirm before rewriting to current.`,
    }
  }

  // 4) Affiliate-shaped but matches nothing we track → forgotten/orphan.
  if (looksAffiliate(url)) {
    return { link, status: "orphan", autoFixable: false, reason: "Affiliate-shaped link not in the registry — add it or retire it." }
  }

  // 5) Ordinary content link.
  return { link, status: "ignore", autoFixable: false, reason: "" }
}

/**
 * Analyze a whole description: classify every link and compute the rewritten
 * description applying only autoFixable rewrites. Dedupes repeated URLs in the
 * report but rewrites every occurrence in the text.
 */
export function analyzeDescription(
  video: { videoId: string; title: string; description: string },
  registry: LinkProgram[],
): VideoVerdict {
  const verdicts = extractLinks(video.description).map((l) => classifyLink(l, registry))

  let proposed = video.description
  for (const v of verdicts) {
    if (v.autoFixable && v.target) {
      proposed = proposed.split(v.link.url).join(v.target)
    }
  }

  // Dedupe verdicts by url+status for a clean report.
  const seen = new Set<string>()
  const deduped = verdicts.filter((v) => {
    const k = `${v.link.url}|${v.status}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  return {
    videoId: video.videoId,
    title: video.title,
    url: `https://youtu.be/${video.videoId}`,
    verdicts: deduped,
    proposedDescription: proposed,
    changed: proposed !== video.description,
  }
}
