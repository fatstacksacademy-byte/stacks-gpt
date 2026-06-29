/**
 * ga:auth — mint a DEDICATED Google Analytics refresh token. [Option B]
 *
 * Use this when the GA property and the YouTube channel are owned by DIFFERENT
 * Google accounts and you'd rather not link them. Sign in as the account that
 * owns the GA property (e.g. fatstacksacademy@gmail.com) when the browser opens.
 *
 *   npm run ga:auth      # → prints GA_REFRESH_TOKEN=… to paste into .env.local
 *
 * Reuses the SAME OAuth client as YouTube (YT_CLIENT_ID/SECRET) unless you set
 * GA_CLIENT_ID/GA_CLIENT_SECRET. Note: if that OAuth client's consent screen is
 * "External / Testing", add the GA account under Audience → Test users first,
 * or Google will refuse the consent.
 */
import { existsSync } from "node:fs"
if (existsSync(".env.local")) process.loadEnvFile(".env.local")

import { createServer } from "node:http"
import { spawn } from "node:child_process"

const PORT = 53682
const REDIRECT = `http://127.0.0.1:${PORT}`
const TOKEN_URL = "https://oauth2.googleapis.com/token"
const GA_SCOPE = "https://www.googleapis.com/auth/analytics.readonly"

function openBrowser(url: string) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open"
  try {
    spawn(cmd, [url], { stdio: "ignore", detached: true, shell: process.platform === "win32" }).unref()
  } catch { /* fall back to manual copy/paste */ }
}

async function main() {
  const clientId = process.env.GA_CLIENT_ID ?? process.env.YT_CLIENT_ID
  const clientSecret = process.env.GA_CLIENT_SECRET ?? process.env.YT_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error("✗ Set GA_CLIENT_ID/GA_CLIENT_SECRET (or reuse YT_CLIENT_ID/YT_CLIENT_SECRET) in .env.local first.")
    process.exit(1)
  }

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT,
      response_type: "code",
      scope: GA_SCOPE,
      access_type: "offline",
      prompt: "consent",
    }).toString()

  const code: string = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const u = new URL(req.url ?? "/", REDIRECT)
      const c = u.searchParams.get("code")
      const err = u.searchParams.get("error")
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" })
      res.end(`<html><body style="font-family:system-ui;padding:40px"><h2>${
        c ? "✓ Authorized — you can close this tab." : "✗ Authorization failed."
      }</h2></body></html>`)
      server.close()
      if (c) resolve(c)
      else reject(new Error(`OAuth error: ${err ?? "no code returned"}`))
    })
    server.listen(PORT, () => {
      console.log("\nOpening your browser — SIGN IN AS THE GA-OWNING ACCOUNT (e.g. fatstacksacademy@gmail.com)…")
      console.log("If it doesn't open, paste this URL:\n\n" + authUrl + "\n")
      openBrowser(authUrl)
    })
  })

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: REDIRECT, grant_type: "authorization_code" }),
  })
  const json = (await res.json()) as { refresh_token?: string; error?: string; error_description?: string }
  if (!res.ok || !json.refresh_token) {
    console.error(`✗ Token exchange failed: ${json.error ?? res.status} ${json.error_description ?? ""}`)
    process.exit(1)
  }

  console.log("\n✓ Success. Add this line to .env.local:\n")
  console.log(`GA_REFRESH_TOKEN=${json.refresh_token}\n`)
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
