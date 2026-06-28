/**
 * Minimal, dependency-free YouTube Data API v3 client.
 *
 * Auth is OAuth2 with a long-lived refresh token (minted once via auth.ts).
 * We hit the REST endpoints directly with native fetch — no googleapis dep.
 *
 * Env (in .env.local):
 *   YT_CLIENT_ID, YT_CLIENT_SECRET   — from your Google Cloud OAuth client
 *   YT_REFRESH_TOKEN                 — printed by `npm run linksync:auth`
 *
 * Quota notes: listing the whole channel is cheap (~1 unit per 50 videos);
 * each description update costs ~50 units (10k/day default ≈ 200 edits/day).
 */
import type { YouTubeVideo } from "./types"

const TOKEN_URL = "https://oauth2.googleapis.com/token"
const API = "https://www.googleapis.com/youtube/v3"

export const YT_SCOPE = "https://www.googleapis.com/auth/youtube.force-ssl"
/** Read-only channel analytics (retention, traffic sources). Needed for yt:analytics. */
export const YT_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/yt-analytics.readonly"
/** Read-only website Google Analytics 4 (GA4 Data API). Needed for ga:report. */
export const GA_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly"
/** All scopes the refresh token should carry, space-separated for the consent URL. */
export const YT_SCOPES = [YT_SCOPE, YT_ANALYTICS_SCOPE, GA_ANALYTICS_SCOPE].join(" ")

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing ${name} — see scripts/link-sync/README.md for setup.`)
  return v
}

/** Exchange the refresh token for a short-lived access token. */
export async function getAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: requireEnv("YT_CLIENT_ID"),
    client_secret: requireEnv("YT_CLIENT_SECRET"),
    refresh_token: requireEnv("YT_REFRESH_TOKEN"),
    grant_type: "refresh_token",
  })
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  })
  const json = (await res.json()) as { access_token?: string; error?: string; error_description?: string }
  if (!res.ok || !json.access_token) {
    throw new Error(`Token refresh failed: ${json.error ?? res.status} ${json.error_description ?? ""}`.trim())
  }
  return json.access_token
}

async function apiGet<T>(token: string, path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${API}/${path}?${qs}`, { headers: { authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`YouTube GET ${path} failed: ${res.status} ${await res.text()}`)
  return (await res.json()) as T
}

/** The channel's "uploads" playlist id holds every public+private upload. */
async function uploadsPlaylistId(token: string): Promise<string> {
  const data = await apiGet<{
    items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }>
  }>(token, "channels", { part: "contentDetails", mine: "true" })
  const id = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!id) throw new Error("Could not resolve the channel's uploads playlist (is the token for the right account?).")
  return id
}

/** Page through the uploads playlist to collect every video id. */
async function allUploadIds(token: string, playlistId: string): Promise<string[]> {
  const ids: string[] = []
  let pageToken: string | undefined
  do {
    const page = await apiGet<{
      items?: Array<{ contentDetails?: { videoId?: string } }>
      nextPageToken?: string
    }>(token, "playlistItems", {
      part: "contentDetails",
      playlistId,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    })
    for (const it of page.items ?? []) if (it.contentDetails?.videoId) ids.push(it.contentDetails.videoId)
    pageToken = page.nextPageToken
  } while (pageToken)
  return ids
}

/** Fetch authoritative snippets (title/description/categoryId) in batches of 50. */
async function videosByIds(token: string, ids: string[]): Promise<YouTubeVideo[]> {
  const out: YouTubeVideo[] = []
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50)
    const data = await apiGet<{
      items?: Array<{ id: string; snippet?: { title?: string; description?: string; categoryId?: string } }>
    }>(token, "videos", { part: "snippet", id: chunk.join(","), maxResults: "50" })
    for (const v of data.items ?? []) {
      out.push({
        videoId: v.id,
        title: v.snippet?.title ?? "",
        description: v.snippet?.description ?? "",
        categoryId: v.snippet?.categoryId ?? "22",
      })
    }
  }
  return out
}

/** Every video on the authenticated channel, with full descriptions. */
export async function listAllVideos(token: string): Promise<YouTubeVideo[]> {
  const playlist = await uploadsPlaylistId(token)
  const ids = await allUploadIds(token, playlist)
  return videosByIds(token, ids)
}

/**
 * Push a new description. videos.update with part=snippet REQUIRES title +
 * categoryId, so we resend the existing ones unchanged alongside the new text.
 */
export async function updateDescription(
  token: string,
  video: YouTubeVideo,
  newDescription: string,
): Promise<void> {
  const res = await fetch(`${API}/videos?part=snippet`, {
    method: "PUT",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      id: video.videoId,
      snippet: { title: video.title, categoryId: video.categoryId, description: newDescription },
    }),
  })
  if (!res.ok) throw new Error(`videos.update ${video.videoId} failed: ${res.status} ${await res.text()}`)
}
