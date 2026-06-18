import { NextResponse } from "next/server"

/**
 * Resolves a YouTube video's channel via the public oEmbed endpoint and reports
 * whether it belongs to our own channel. Used by the admin blog editor to block
 * accidentally embedding a competitor's video on a monthly-picks post.
 *
 * GET /api/validate-youtube?videoId=XXXXXXXXXXX
 *   -> { found: boolean, isMine: boolean, author_name?, author_url?, title?, handle? }
 *
 * To allow another channel (e.g. a brand handle or a collab account), add its
 * lowercased @handle to OWN_HANDLES or its lowercased name to OWN_NAMES.
 */

const OWN_HANDLES = ["nathanielbooth", "fatstacksacademy"]
const OWN_NAMES = ["nathaniel booth", "fat stacks academy"]

function handleFromAuthorUrl(url: string | undefined): string | null {
  if (!url) return null
  const m = url.match(/\/@([^/?#]+)/)
  return m ? m[1].toLowerCase() : null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const videoId = (searchParams.get("videoId") || "").trim()

  if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
    return NextResponse.json({ found: false, isMine: false, error: "invalid videoId" }, { status: 400 })
  }

  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`
  )}&format=json`

  try {
    const res = await fetch(oembedUrl, { cache: "no-store" })
    if (!res.ok) {
      // 401 = private, 404 = deleted/wrong id, etc. — can't verify, so not "mine".
      return NextResponse.json({
        found: false,
        isMine: false,
        error: `video not retrievable (oembed ${res.status})`,
      })
    }
    const data = (await res.json()) as { author_name?: string; author_url?: string; title?: string }
    const handle = handleFromAuthorUrl(data.author_url)
    const name = (data.author_name || "").toLowerCase()
    const isMine =
      (handle != null && OWN_HANDLES.includes(handle)) || OWN_NAMES.includes(name)

    return NextResponse.json({
      found: true,
      isMine,
      author_name: data.author_name,
      author_url: data.author_url,
      title: data.title,
      handle,
    })
  } catch (e) {
    return NextResponse.json({
      found: false,
      isMine: false,
      error: e instanceof Error ? e.message : "fetch failed",
    })
  }
}
