/* eslint-disable no-console */
/**
 * pretriage — first-pass review of the discovery queue, for the weekly nudge.
 *
 * The human gate only works if checking is fast. This scans the pending leads
 * in Supabase (discovery_leads, status='new'), proposes a disposition for each
 * with a one-line reason, and prints a tight digest. The scheduled Claude
 * routine runs this, then relays the digest + a link to /admin/review so the
 * actual approve/reject is two clicks, not an archaeology dig.
 *
 * Advisory only — it never changes status. Nothing reaches the catalog without
 * a human approving it in /admin/review.
 */
import { existsSync, writeFileSync, mkdirSync } from "node:fs"
if (existsSync(".env.local")) process.loadEnvFile(".env.local")
import { join } from "node:path"
import { loadPendingLeads, type DiscoveryLeadRow } from "../_shared/discovery-leads"

const REVIEW_URL = "https://fatstacksacademy.com/admin/review"

type Suggestion = { action: "approve" | "review" | "dismiss"; reason: string }

function suggest(l: DiscoveryLeadRow): Suggestion {
  const flags = l.flags ?? []
  const hard = flags.filter((f) => f === "card_name_not_on_page" || f.startsWith("issuer_fetch_failed"))
  if (hard.length) return { action: "review", reason: `extraction shaky (${hard.join(", ")})` }

  if (l.kind === "card") {
    if (flags.length === 0 && l.bonus_amount != null) {
      return { action: "approve", reason: "clean extraction + bonus found" }
    }
    return { action: "review", reason: flags.length ? `flags: ${flags.join(", ")}` : "no bonus extracted" }
  }

  // bonus leads (discover already filtered ones already in the catalog)
  if ((l.confidence ?? 0) >= 0.7 && l.canonical_url) {
    return { action: "approve", reason: "high confidence + bank offer page found" }
  }
  if (!l.canonical_url) return { action: "review", reason: "no canonical bank page — verify the source" }
  return { action: "review", reason: `confidence ${Math.round((l.confidence ?? 0) * 100)}%` }
}

function line(l: DiscoveryLeadRow, s: Suggestion): string {
  const amt = l.bonus_amount != null ? (l.kind === "card" ? `${l.bonus_amount.toLocaleString()}` : `$${l.bonus_amount.toLocaleString()}`) : "—"
  const inst = l.institution ?? "—"
  const url = l.canonical_url ? ` <${l.canonical_url}>` : ""
  return `- **${inst}** — ${l.name} · ${amt} · _${s.reason}_${url}`
}

async function main() {
  const [bonus, card] = await Promise.all([loadPendingLeads("bonus"), loadPendingLeads("card")])
  const all = [...bonus, ...card].map((l) => ({ l, s: suggest(l) }))

  const byAction = {
    approve: all.filter((x) => x.s.action === "approve"),
    review: all.filter((x) => x.s.action === "review"),
    dismiss: all.filter((x) => x.s.action === "dismiss"),
  }

  const date = new Date().toISOString().slice(0, 10)
  const out: string[] = []
  out.push(`# Discovery pre-triage — ${date}`)
  out.push("")
  if (all.length === 0) {
    out.push("No new leads in the queue. Nothing to review. 🎉")
  } else {
    out.push(
      `**${all.length} new lead(s)** — ${bonus.length} bonus, ${card.length} card. ` +
        `Suggested: ✅ ${byAction.approve.length} approve · 👀 ${byAction.review.length} review · 🗑 ${byAction.dismiss.length} dismiss.`,
    )
    out.push("")
    out.push(`Review + decide: ${REVIEW_URL}`)
    if (byAction.approve.length) {
      out.push("")
      out.push(`## ✅ Looks good — approve (${byAction.approve.length})`)
      for (const { l, s } of byAction.approve) out.push(line(l, s))
    }
    if (byAction.review.length) {
      out.push("")
      out.push(`## 👀 Your eyes needed (${byAction.review.length})`)
      for (const { l, s } of byAction.review) out.push(line(l, s))
    }
    if (byAction.dismiss.length) {
      out.push("")
      out.push(`## 🗑 Probably dismiss (${byAction.dismiss.length})`)
      for (const { l, s } of byAction.dismiss) out.push(line(l, s))
    }
  }

  const digest = out.join("\n")
  const OUT_DIR = join(process.cwd(), "verification-output")
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, "pretriage-digest.md"), digest)

  // Print to stdout so the scheduled routine can relay it verbatim.
  console.log(digest)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
