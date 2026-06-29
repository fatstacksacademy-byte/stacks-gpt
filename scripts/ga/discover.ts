/**
 * ga:props — list every GA4 account/property your Google account can read, and
 * auto-match your site's measurement id (G-…) to its NUMERIC property id so you
 * know exactly what to paste into GA_PROPERTY_ID. No GUI hunting.
 *
 *   npm run ga:props
 *
 * Uses the GA Admin API, covered by the same analytics.readonly scope as ga:report.
 * Run `npm run linksync:auth` first if you haven't re-consented with that scope.
 */
import { existsSync } from "node:fs"
if (existsSync(".env.local")) process.loadEnvFile(".env.local")
import { gaAccessToken } from "./client"

const ADMIN = "https://analyticsadmin.googleapis.com/v1beta"

async function adminGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${ADMIN}/${path}`, { headers: { authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.text()
    if (res.status === 403) {
      throw new Error(
        "GA Admin API denied (403). Either the analytics.readonly scope is missing\n" +
          "  (run `npm run linksync:auth`, approve Analytics, update YT_REFRESH_TOKEN) or\n" +
          "  the 'Google Analytics Admin API' isn't enabled in your Cloud project.\n  Raw: " + body.slice(0, 200),
      )
    }
    throw new Error(`Admin GET ${path} ${res.status}: ${body.slice(0, 300)}`)
  }
  return (await res.json()) as T
}

type PropSummary = { property: string; displayName: string }
type AccountSummary = { account: string; displayName: string; propertySummaries?: PropSummary[] }

async function main() {
  const target = process.env.NEXT_PUBLIC_GA_ID // the G-… we want to match
  const token = await gaAccessToken()
  const summaries = await adminGet<{ accountSummaries?: AccountSummary[] }>("accountSummaries", token)
  const accounts = summaries.accountSummaries ?? []
  if (!accounts.length) {
    console.log("No GA accounts visible to this Google account. Is it a Viewer on the property?")
    return
  }

  console.log(`\nGA4 properties you can read${target ? `  (★ = matches ${target})` : ""}:\n`)
  let matchedId = ""
  for (const acc of accounts) {
    console.log(`▸ ${acc.displayName}  [${acc.account}]`)
    for (const p of acc.propertySummaries ?? []) {
      const id = p.property.replace("properties/", "")
      // Look up this property's web data streams to read the measurement id.
      let measurement = ""
      try {
        const streams = await adminGet<{ dataStreams?: Array<{ webStreamData?: { measurementId?: string } }> }>(
          `properties/${id}/dataStreams`, token)
        measurement = (streams.dataStreams ?? []).map((s) => s.webStreamData?.measurementId).filter(Boolean).join(", ")
      } catch { /* some properties may not expose streams; skip quietly */ }
      const hit = target && measurement.split(", ").includes(target)
      if (hit) matchedId = id
      console.log(`    ${hit ? "★" : " "} ${p.displayName.padEnd(30)} id=${id.padEnd(12)} ${measurement ? `(${measurement})` : ""}`)
    }
  }

  if (matchedId) {
    console.log(`\n✓ Matched ${target} → property ${matchedId}. Add this to .env.local:\n`)
    console.log(`GA_PROPERTY_ID=${matchedId}\n`)
  } else if (target) {
    console.log(`\n⚠ Couldn't auto-match ${target} to a property above — pick the right id by name and set GA_PROPERTY_ID.\n`)
  }
}

main().catch((e) => { console.error("\n✗ " + (e instanceof Error ? e.message : String(e))); process.exit(1) })
