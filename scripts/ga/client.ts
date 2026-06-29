/**
 * Minimal, dependency-free Google Analytics 4 Data API client.
 *
 * Auth piggybacks on the SAME Google OAuth client you already use for YouTube
 * (YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN). The only requirement is
 * that the refresh token carries the analytics.readonly scope — see README.
 *
 * We hit the REST endpoint directly with native fetch — no googleapis dep, same
 * as scripts/link-sync/youtube.ts.
 *
 * Env (in .env.local):
 *   GA_PROPERTY_ID      — the NUMERIC GA4 property id (e.g. 123456789), NOT the
 *                         "G-…" measurement id. Find it in GA Admin → Property
 *                         Settings → "PROPERTY ID" (top-right).
 *   GA_SITE_HOSTNAME    — optional, comma-separated list of "real" hostnames.
 *                         Defaults to fatstacksacademy.com,www.fatstacksacademy.com.
 *                         Used to fence localhost / preview traffic out of the
 *                         headline numbers.
 */
import { getAccessToken } from "../link-sync/youtube"

const BASE = "https://analyticsdata.googleapis.com/v1beta"
const TOKEN_URL = "https://oauth2.googleapis.com/token"

/**
 * Mint a GA access token.
 *
 * The GA property and the YouTube channel may belong to DIFFERENT Google
 * accounts (e.g. GA = fatstacksacademy@, YouTube = booth.nathaniel@). A refresh
 * token can only read what its consenting account can access, so:
 *
 *   • Set GA_REFRESH_TOKEN (minted via `npm run ga:auth`, signing in as the GA
 *     account) → GA uses its OWN identity, fully separate from YouTube. [Option B]
 *   • Leave it unset → reuse the shared YouTube token. That ONLY works if the
 *     YouTube account is also a Viewer on the GA property. [Option A]
 *
 * The OAuth *client* (project) is shared either way: GA_CLIENT_ID/SECRET default
 * to YT_CLIENT_ID/SECRET.
 */
export async function gaAccessToken(): Promise<string> {
  const refresh = process.env.GA_REFRESH_TOKEN
  if (!refresh) return getAccessToken() // Option A: reuse the YouTube OAuth identity
  const clientId = process.env.GA_CLIENT_ID ?? process.env.YT_CLIENT_ID
  const clientSecret = process.env.GA_CLIENT_SECRET ?? process.env.YT_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("GA_REFRESH_TOKEN is set but no OAuth client — set GA_CLIENT_ID/GA_CLIENT_SECRET (or YT_CLIENT_ID/YT_CLIENT_SECRET).")
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refresh, grant_type: "refresh_token" }),
  })
  const json = (await res.json()) as { access_token?: string; error?: string; error_description?: string }
  if (!res.ok || !json.access_token) {
    throw new Error(`GA token refresh failed: ${json.error ?? res.status} ${json.error_description ?? ""}`.trim())
  }
  return json.access_token
}

export function propertyId(): string {
  const v = process.env.GA_PROPERTY_ID
  if (!v) {
    throw new Error(
      "Missing GA_PROPERTY_ID — set the NUMERIC GA4 property id in .env.local.\n" +
        "  GA Admin → Property Settings → 'PROPERTY ID' (a number like 123456789,\n" +
        "  NOT the G-2FD6TC1TWH measurement id). See scripts/ga/README.md.",
    )
  }
  return v.replace(/^properties\//, "").trim()
}

/** Hostnames that count as the live site. Everything else = dev/preview/other. */
export function productionHostnames(): string[] {
  const raw = process.env.GA_SITE_HOSTNAME ?? "fatstacksacademy.com,www.fatstacksacademy.com"
  return raw.split(",").map((s) => s.trim()).filter(Boolean)
}

// ── GA4 Data API request/response shapes (only the bits we use) ───────────────
export type DateRange = { startDate: string; endDate: string; name?: string }
type Dimension = { name: string }
type Metric = { name: string }
type OrderBy =
  | { metric: { metricName: string }; desc?: boolean }
  | { dimension: { dimensionName: string }; desc?: boolean }
export type Filter =
  | { fieldName: string; inListFilter: { values: string[] } }
  | { fieldName: string; stringFilter: { matchType: string; value: string; caseSensitive?: boolean } }

export type ReportSpec = {
  dateRanges: DateRange[]
  dimensions?: Dimension[]
  metrics: Metric[]
  dimensionFilter?: { filter?: Filter; notExpression?: { filter: Filter } }
  orderBys?: OrderBy[]
  limit?: number
  keepEmptyRows?: boolean
}

export type Row = {
  dimensionValues?: Array<{ value: string }>
  metricValues?: Array<{ value: string }>
}
export type Report = {
  dimensionHeaders?: Array<{ name: string }>
  metricHeaders?: Array<{ name: string; type: string }>
  rows?: Row[]
  rowCount?: number
}

/** Run a single GA4 report. Throws a friendly error if the scope is missing. */
export async function runReport(spec: ReportSpec): Promise<Report> {
  const token = await gaAccessToken()
  const res = await fetch(`${BASE}/properties/${propertyId()}:runReport`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(spec),
  })
  if (!res.ok) {
    const body = await res.text()
    if (res.status === 403 && /(insufficient|scope|permission|analytics)/i.test(body)) {
      throw new Error(
        "GA4 ACCESS DENIED (403). Two common causes:\n" +
          "  1) Your refresh token predates the analytics.readonly scope.\n" +
          "     Fix: `npm run linksync:auth`, approve the Analytics permission,\n" +
          "     then replace YT_REFRESH_TOKEN in .env.local.\n" +
          "  2) Your Google account isn't a Viewer on the GA4 property, or the\n" +
          "     'Google Analytics Data API' isn't enabled in your Cloud project.\n" +
          "  See scripts/ga/README.md.\n\n  Raw: " + body.slice(0, 300),
      )
    }
    if (res.status === 400 && /property/i.test(body)) {
      throw new Error(`Bad GA_PROPERTY_ID (${propertyId()}). Use the numeric property id, not G-…\n  Raw: ${body.slice(0, 200)}`)
    }
    throw new Error(`GA4 runReport ${res.status}: ${body.slice(0, 400)}`)
  }
  return (await res.json()) as Report
}

/** A dimensionFilter that keeps ONLY rows whose hostName is a production host. */
export function productionOnly(): ReportSpec["dimensionFilter"] {
  return { filter: { fieldName: "hostName", inListFilter: { values: productionHostnames() } } }
}

// ── tiny helpers ──────────────────────────────────────────────────────────────
export const num = (r: Row | undefined, i: number): number => Number(r?.metricValues?.[i]?.value ?? 0)
export const dim = (r: Row, i: number): string => r.dimensionValues?.[i]?.value ?? ""

export function fmt(n: number): string {
  if (!isFinite(n)) return "—"
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M"
  if (n >= 10_000) return (n / 1_000).toFixed(0) + "k"
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k"
  return String(Math.round(n))
}

export function dur(seconds: number): string {
  const s = Math.round(seconds)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`
}

export function pctChange(now: number, prev: number): string {
  if (prev === 0) return now > 0 ? "▲ new" : "—"
  const d = ((now - prev) / prev) * 100
  const arrow = d > 0.5 ? "▲" : d < -0.5 ? "▼" : "▬"
  return `${arrow} ${d > 0 ? "+" : ""}${d.toFixed(0)}%`
}
