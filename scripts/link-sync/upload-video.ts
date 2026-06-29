/**
 * upload-video.ts — upload a local video to YouTube using the existing link-sync OAuth
 * refresh token. The token's youtube.force-ssl scope authorizes videos.insert, so no
 * re-consent is needed. Defaults to UNLISTED. Prints the new video id + URL.
 *
 *   npx tsx scripts/link-sync/upload-video.ts \
 *     --file ~/Movies/clip.mp4 --title "My title" \
 *     --description-file desc.txt [--privacy unlisted|private|public] [--category 27]
 *
 * Run from the repo root (reads .env.local for YT_CLIENT_ID/SECRET/REFRESH_TOKEN).
 */
import { existsSync, readFileSync, statSync } from "node:fs"
if (existsSync(".env.local")) process.loadEnvFile(".env.local")

function arg(name: string, def?: string): string {
  const i = process.argv.indexOf(`--${name}`)
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1]
  if (def !== undefined) return def
  throw new Error(`missing --${name}`)
}

async function accessToken(): Promise<string> {
  const id = process.env.YT_CLIENT_ID, secret = process.env.YT_CLIENT_SECRET, refresh = process.env.YT_REFRESH_TOKEN
  if (!id || !secret || !refresh) throw new Error("YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN must be set in .env.local")
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: "refresh_token" }),
  })
  const j = (await r.json()) as { access_token?: string; error?: string; error_description?: string }
  if (!r.ok || !j.access_token) throw new Error(`token refresh failed: ${j.error ?? r.status} ${j.error_description ?? ""}`)
  return j.access_token
}

async function main() {
  const file = arg("file"), title = arg("title")
  const descFile = arg("description-file", "")
  const description = descFile ? readFileSync(descFile, "utf8") : arg("description", "")
  const privacy = arg("privacy", "unlisted"), category = arg("category", "27")
  if (!existsSync(file)) throw new Error(`file not found: ${file}`)
  const size = statSync(file).size
  const token = await accessToken()

  const meta = {
    snippet: { title, description, categoryId: category },
    status: { privacyStatus: privacy, selfDeclaredMadeForKids: false, embeddable: true },
  }
  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
      "X-Upload-Content-Type": "video/*",
      "X-Upload-Content-Length": String(size),
    },
    body: JSON.stringify(meta),
  })
  if (!init.ok) throw new Error(`resumable init failed: ${init.status} ${await init.text()}`)
  const loc = init.headers.get("location")
  if (!loc) throw new Error("no resumable upload URL in response")

  console.log(`uploading ${(size / 1048576).toFixed(0)} MB as "${title}" (privacy=${privacy})…`)
  const bytes = readFileSync(file)
  const put = await fetch(loc, { method: "PUT", headers: { "content-type": "video/*" }, body: bytes })
  if (!put.ok) throw new Error(`upload failed: ${put.status} ${await put.text()}`)
  const v = (await put.json()) as { id: string; status?: { privacyStatus?: string } }
  console.log(`\n✓ uploaded — privacy=${v.status?.privacyStatus}`)
  console.log(`   watch:  https://youtu.be/${v.id}`)
  console.log(`   studio: https://studio.youtube.com/video/${v.id}/edit`)
  console.log(`VIDEO_ID=${v.id}`)
}

main().catch((e) => { console.error("✗", e instanceof Error ? e.message : e); process.exit(1) })
