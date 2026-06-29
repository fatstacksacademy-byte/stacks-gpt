/**
 * One-time OAuth consent → prints a refresh token you paste into .env.local.
 *
 * Run once:  npm run linksync:auth
 *
 * Prereqs (see README): a Google Cloud OAuth client of type "Desktop app",
 * with YT_CLIENT_ID and YT_CLIENT_SECRET set in .env.local. Desktop clients
 * permit loopback redirects (http://127.0.0.1:PORT) without registration.
 */
import { existsSync } from "node:fs"
if (existsSync(".env.local")) process.loadEnvFile(".env.local")

import { createServer } from "node:http"
import { spawn } from "node:child_process"
import { YT_SCOPES } from "./youtube"

const PORT = 53682
const REDIRECT = `http://127.0.0.1:${PORT}`
const TOKEN_URL = "https://oauth2.googleapis.com/token"

function openBrowser(url: string) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open"
  try {
    spawn(cmd, [url], { stdio: "ignore", detached: true, shell: process.platform === "win32" }).unref()
  } catch {
    /* fall back to manual copy/paste */
  }
}

async function main() {
  const clientId = process.env.YT_CLIENT_ID
  const clientSecret = process.env.YT_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error("✗ Set YT_CLIENT_ID and YT_CLIENT_SECRET in .env.local first (see README).")
    process.exit(1)
  }

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT,
      response_type: "code",
      scope: YT_SCOPES,
      access_type: "offline",
      prompt: "consent", // force a refresh_token even on re-consent
    }).toString()

  const code: string = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const u = new URL(req.url ?? "/", REDIRECT)
      const c = u.searchParams.get("code")
      const err = u.searchParams.get("error")
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" })
      res.end(
        `<html><body style="font-family:system-ui;padding:40px"><h2>${
          c ? "✓ Authorized — you can close this tab." : "✗ Authorization failed."
        }</h2></body></html>`,
      )
      server.close()
      if (c) resolve(c)
      else reject(new Error(`OAuth error: ${err ?? "no code returned"}`))
    })
    server.listen(PORT, () => {
      console.log("\nOpening your browser to grant YouTube + Google Analytics access…")
      console.log("If it doesn't open, paste this URL:\n\n" + authUrl + "\n")
      openBrowser(authUrl)
    })
  })

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT,
      grant_type: "authorization_code",
    }),
  })
  const json = (await res.json()) as { refresh_token?: string; error?: string; error_description?: string }
  if (!res.ok || !json.refresh_token) {
    console.error(`✗ Token exchange failed: ${json.error ?? res.status} ${json.error_description ?? ""}`)
    process.exit(1)
  }

  console.log("\n✓ Success. Add this line to .env.local:\n")
  console.log(`YT_REFRESH_TOKEN=${json.refresh_token}\n`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
