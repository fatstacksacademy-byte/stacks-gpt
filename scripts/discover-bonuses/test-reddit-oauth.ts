/* eslint-disable no-console */
/**
 * Quick check that the Reddit OAuth setup works end-to-end.
 *
 * Reads REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET from env, fetches a
 * client-credentials token from reddit.com/api/v1/access_token, and then
 * hits a single subreddit's /new.json on oauth.reddit.com with Bearer auth.
 *
 * Exit code 0 on success, 1 on any failure (with a clear hint).
 *
 *   npm run test:reddit-oauth
 */
import { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, UA } from "./env"

async function main() {
  console.log("=== Reddit OAuth setup check ===\n")

  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
    console.error("❌ Missing env vars.")
    console.error("   REDDIT_CLIENT_ID:", REDDIT_CLIENT_ID ? "set" : "MISSING")
    console.error("   REDDIT_CLIENT_SECRET:", REDDIT_CLIENT_SECRET ? "set" : "MISSING")
    console.error("\nSetup steps:")
    console.error("  1. Go to https://www.reddit.com/prefs/apps")
    console.error("  2. Click 'create another app...' at the bottom")
    console.error("  3. Pick 'script', name = anything (e.g. stacks-os-discover),")
    console.error("     redirect uri = http://localhost, click 'create app'")
    console.error("  4. Copy the 14-char string under the app name → REDDIT_CLIENT_ID")
    console.error("  5. Copy the 'secret' field → REDDIT_CLIENT_SECRET")
    console.error("  6. Add both to .env.local and re-run this check")
    process.exit(1)
  }
  console.log("✓ Env vars present.")
  console.log(`  REDDIT_CLIENT_ID: ${REDDIT_CLIENT_ID.slice(0, 4)}…${REDDIT_CLIENT_ID.slice(-2)}`)
  console.log(`  REDDIT_CLIENT_SECRET: ${REDDIT_CLIENT_SECRET.slice(0, 3)}…${REDDIT_CLIENT_SECRET.slice(-2)}`)
  console.log("")

  // Step 1: fetch token.
  const basic = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString("base64")
  console.log("→ Fetching client-credentials token...")
  let token: string
  try {
    const r = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) {
      const body = await r.text().catch(() => "")
      console.error(`❌ Token request returned ${r.status} ${r.statusText}`)
      console.error(`   Body: ${body.slice(0, 300)}`)
      console.error("\nCommon causes:")
      console.error("  - Wrong CLIENT_ID or CLIENT_SECRET (most common — re-copy from reddit.com/prefs/apps)")
      console.error("  - App type isn't 'script' (must be script, not web/installed)")
      console.error("  - Reddit account that owns the app is shadowbanned or rate-limited")
      process.exit(1)
    }
    const j = (await r.json()) as { access_token?: string; expires_in?: number; error?: string }
    if (!j.access_token) {
      console.error("❌ Token response missing access_token.")
      console.error(`   Body: ${JSON.stringify(j).slice(0, 300)}`)
      process.exit(1)
    }
    token = j.access_token
    console.log(`✓ Got token (expires in ${j.expires_in}s).`)
    console.log("")
  } catch (err) {
    console.error(`❌ Token request threw: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }

  // Step 2: sample fetch against oauth.reddit.com to confirm end-to-end.
  console.log("→ Fetching a small sample from r/churning/new via oauth.reddit.com...")
  try {
    const r = await fetch("https://oauth.reddit.com/r/churning/new.json?limit=3", {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) {
      console.error(`❌ Sample fetch returned ${r.status} ${r.statusText}`)
      console.error("   Token may be invalid or the app needs more scopes — but client-credentials should be enough for read.")
      process.exit(1)
    }
    const j = (await r.json()) as { data?: { children?: { data: { title: string } }[] } }
    const posts = j?.data?.children ?? []
    console.log(`✓ Sample fetch ok — pulled ${posts.length} post(s).`)
    if (posts.length > 0) {
      console.log("\nMost recent r/churning posts:")
      for (const p of posts.slice(0, 3)) console.log(`  • ${p.data.title}`)
    }
  } catch (err) {
    console.error(`❌ Sample fetch threw: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }

  console.log("\n✅ Reddit OAuth is working. Both subreddit sources will pull on the next discover run.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
