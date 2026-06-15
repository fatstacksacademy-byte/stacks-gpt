/**
 * Orchestration: pull the whole channel, classify every description link,
 * optionally live-check destinations, and (for `apply`) push safe rewrites.
 *
 * Shared by the `scan` and `apply` commands in run.ts so apply always acts on
 * a fresh analysis, never a stale report file.
 */
import pLimit from "p-limit"
import { linkRegistry } from "./registry"
import { analyzeDescription } from "./classify"
import { checkUrl, type LiveResult } from "./livecheck"
import { getAccessToken, listAllVideos, updateDescription } from "./youtube"
import type { LinkProgram, VideoVerdict, YouTubeVideo } from "./types"

export interface ScanResult {
  token: string
  rawVideos: YouTubeVideo[]
  videos: VideoVerdict[]
  registryHealth: { key: string; label: string; currentUrl: string; result: LiveResult }[]
  live: boolean
}

/** All registry programs whose domain pattern matches a URL (for fingerprints). */
function matchingPrograms(url: string): LinkProgram[] {
  return linkRegistry.filter((p) => p.domainMatch?.test(url))
}

/** Statuses worth live-checking — skip ordinary content links. */
const CHECKABLE = new Set(["current", "stale", "review", "needs-current", "orphan", "dead"])

export async function scanChannel(opts: { live: boolean }): Promise<ScanResult> {
  const token = await getAccessToken()
  const rawVideos = await listAllVideos(token)
  const videos = rawVideos.map((v) => analyzeDescription(v, linkRegistry))

  let registryHealth: ScanResult["registryHealth"] = []

  if (opts.live) {
    const limit = pLimit(6)

    // 1) Health-check each program's *current* link once — catches the case
    //    where the canonical link you set is itself already dead.
    registryHealth = await Promise.all(
      linkRegistry
        .filter((p) => p.currentUrl)
        .map((p) =>
          limit(async () => ({
            key: p.key,
            label: p.label,
            currentUrl: p.currentUrl,
            result: await checkUrl(p.currentUrl, p.expiredFingerprints ?? []),
          })),
        ),
    )

    // 2) Live-check the distinct URLs actually present in descriptions.
    const urls = new Set<string>()
    for (const v of videos)
      for (const verdict of v.verdicts) if (CHECKABLE.has(verdict.status)) urls.add(verdict.link.url)

    const results = new Map<string, LiveResult>()
    await Promise.all(
      [...urls].map((url) =>
        limit(async () => {
          const fingerprints = matchingPrograms(url).flatMap((p) => p.expiredFingerprints ?? [])
          results.set(url, await checkUrl(url, fingerprints))
        }),
      ),
    )

    // 3) Fold live results into the verdicts. We only *downgrade* to "dead";
    //    a link already slated for a safe auto-fix stays auto-fixable.
    for (const v of videos) {
      for (const verdict of v.verdicts) {
        const r = results.get(verdict.link.url)
        if (r?.status === "dead" && !verdict.autoFixable) {
          verdict.status = "dead"
          verdict.reason = `Dead link (${r.reason}).` + (verdict.programKey ? ` Program: ${verdict.programKey}.` : "")
        }
      }
    }
  }

  return { token, rawVideos, videos, registryHealth, live: opts.live }
}

/** Push the safe rewrites for the given videos. Returns count updated. */
export async function applyRewrites(
  token: string,
  rawVideos: YouTubeVideo[],
  videos: VideoVerdict[],
): Promise<number> {
  const byId = new Map(rawVideos.map((v) => [v.videoId, v]))
  let updated = 0
  for (const v of videos) {
    if (!v.changed || !v.proposedDescription) continue
    const raw = byId.get(v.videoId)
    if (!raw) continue
    await updateDescription(token, raw, v.proposedDescription)
    updated++
  }
  return updated
}
