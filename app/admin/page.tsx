"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

const money = (n: number) => `$${n.toLocaleString()}`

type UserSummary = {
  user_id: string
  email: string
  pay_frequency: string
  paycheck_amount: number
  created_at: string
  subscription: { status: string; plan: string } | null
  completed_bonuses: { bonus_id: string; bonus_amount: number; started_date: string; closed_date: string | null }[]
  custom_bonuses: { bank_name: string; bonus_amount: number; current_step: string }[]
}

type UserDetail = {
  profile: any
  completed_bonuses: any[]
  custom_bonuses: any[]
  deposits: any[]
  notes: any[]
  spending_profile: any
  owned_cards: any[]
}

type CustomInsight = {
  total_custom_bonuses: number
  unique_banks: number
  top_banks: { name: string; count: number; avg_bonus: number; statuses: Record<string, number> }[]
  raw: any[]
}

type CardVerification = {
  id: string
  run_id: string
  run_at: string
  card_id: string
  card_name: string
  issuer: string | null
  url: string | null
  final_url: string | null
  status: number | null
  page_signal: string
  field_mismatches: { field: string; stored: unknown; extracted: unknown; status: string }[]
  proposed_edits: { id: string; path: string; from: unknown; to: unknown; reason: string }[]
  error_message: string | null
}

type BonusVerification = {
  id: string
  run_id: string
  run_at: string
  bonus_id: string
  bank_name: string
  bonus_kind: "checking" | "savings"
  url: string | null
  final_url: string | null
  status: number | null
  page_signal: string
  field_mismatches: { field: string; stored: unknown; extracted: unknown; status: string }[]
  proposed_edits: { id: string; path: string; from: unknown; to: unknown; reason: string }[]
  error_message: string | null
}

export default function AdminPage() {
  const supabase = createClient()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<"users" | "insights" | "verifications">("users")
  const [users, setUsers] = useState<UserSummary[]>([])
  const [insights, setInsights] = useState<CustomInsight | null>(null)
  const [verifications, setVerifications] = useState<CardVerification[]>([])
  const [verificationsLastRun, setVerificationsLastRun] = useState<string | null>(null)
  const [bonusVerifications, setBonusVerifications] = useState<BonusVerification[]>([])
  const [bonusVerificationsLastRun, setBonusVerificationsLastRun] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(data.user?.email === "booth.nathaniel@gmail.com")
    })
  }, [])

  useEffect(() => {
    if (!authed) return
    if (tab === "users") loadUsers()
    if (tab === "insights") loadInsights()
    if (tab === "verifications") loadVerifications()
  }, [authed, tab])

  async function loadUsers() {
    setLoading(true)
    const res = await fetch("/api/admin?action=users")
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users)
    }
    setLoading(false)
  }

  async function loadInsights() {
    setLoading(true)
    const res = await fetch("/api/admin?action=custom-insights")
    if (res.ok) setInsights(await res.json())
    setLoading(false)
  }

  async function loadVerifications() {
    setLoading(true)
    const [cardRes, bonusRes] = await Promise.all([
      fetch("/api/admin?action=card-verifications"),
      fetch("/api/admin?action=bonus-verifications"),
    ])
    if (cardRes.ok) {
      const data = await cardRes.json()
      setVerifications(data.verifications ?? [])
      setVerificationsLastRun(data.last_run_at ?? null)
    }
    if (bonusRes.ok) {
      const data = await bonusRes.json()
      setBonusVerifications(data.verifications ?? [])
      setBonusVerificationsLastRun(data.last_run_at ?? null)
    }
    setLoading(false)
  }

  async function reviewBonusVerification(id: string, notes?: string) {
    const res = await fetch("/api/admin?action=review-bonus-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, notes }),
    })
    if (res.ok) await loadVerifications()
  }

  async function reviewVerification(id: string, notes?: string) {
    const res = await fetch("/api/admin?action=review-card-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, notes }),
    })
    if (res.ok) await loadVerifications()
  }

  async function loadUserDetail(userId: string) {
    setSelectedUser(userId)
    setUserDetail(null)
    const res = await fetch(`/api/admin?action=user-detail&userId=${userId}`)
    if (res.ok) setUserDetail(await res.json())
  }

  if (authed === null) return <div style={{ padding: 40, color: "#999" }}>Checking access...</div>
  if (!authed) return <div style={{ padding: 40, color: "#ef4444", fontWeight: 600 }}>Unauthorized. Admin access only.</div>

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #e8e8e8", background: "#fff", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/stacksos" style={{ fontSize: 18, fontWeight: 700, color: "#111", textDecoration: "none" }}>Stacks OS</a>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", background: "#ede9fe", padding: "2px 8px", borderRadius: 99 }}>ADMIN</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["users", "insights", "verifications"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setSelectedUser(null); setUserDetail(null) }}
              style={{ padding: "6px 16px", fontSize: 13, fontWeight: tab === t ? 700 : 400, color: tab === t ? "#111" : "#999", background: tab === t ? "#f0f0f0" : "transparent", border: "none", borderRadius: 6, cursor: "pointer" }}>
              {t === "users" ? "Users" : t === "insights" ? "Custom Bonus Insights" : "Verifications"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 32px" }}>

        {/* ── Users Tab ── */}
        {tab === "users" && !selectedUser && (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 16 }}>All Users ({users.length})</div>
            {loading ? <div style={{ color: "#999" }}>Loading...</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {users.map(u => (
                  <button key={u.user_id} onClick={() => loadUserDetail(u.user_id)}
                    style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "12px 16px", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{u.email}</div>
                      <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                        {u.pay_frequency} · {money(u.paycheck_amount)} paycheck · joined {new Date(u.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                      {u.subscription ? (
                        <span style={{ fontSize: 11, fontWeight: 600, color: u.subscription.status === "active" ? "#0d7c5f" : "#d97706", background: u.subscription.status === "active" ? "#e6f5f0" : "#fffbeb", padding: "2px 8px", borderRadius: 99 }}>
                          {u.subscription.status} ({u.subscription.plan})
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "#bbb" }}>No sub</span>
                      )}
                      <span style={{ fontSize: 12, color: "#555" }}>
                        {u.completed_bonuses.length} bonus{u.completed_bonuses.length !== 1 ? "es" : ""}
                      </span>
                      {u.custom_bonuses.length > 0 && (
                        <span style={{ fontSize: 11, color: "#7c3aed" }}>{u.custom_bonuses.length} custom</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── User Detail (Read-Only Impersonation) ── */}
        {tab === "users" && selectedUser && (
          <>
            <button onClick={() => { setSelectedUser(null); setUserDetail(null) }}
              style={{ fontSize: 13, color: "#0d7c5f", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 16 }}>
              &larr; Back to all users
            </button>

            {!userDetail ? <div style={{ color: "#999" }}>Loading user data...</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Profile */}
                <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 24px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12 }}>Profile</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, fontSize: 13 }}>
                    <div><span style={{ color: "#bbb" }}>Pay: </span><span style={{ color: "#555" }}>{userDetail.profile?.pay_frequency} · {money(userDetail.profile?.paycheck_amount ?? 0)}</span></div>
                    <div><span style={{ color: "#bbb" }}>User ID: </span><span style={{ color: "#555", fontSize: 11 }}>{selectedUser.slice(0, 12)}...</span></div>
                  </div>
                </div>

                {/* Completed Bonuses */}
                <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 24px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12 }}>
                    Bonuses ({userDetail.completed_bonuses.length})
                  </div>
                  {userDetail.completed_bonuses.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#bbb" }}>No bonuses started yet</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {userDetail.completed_bonuses.map((b: any) => (
                        <div key={b.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
                          <div>
                            <span style={{ color: "#111", fontWeight: 600 }}>{b.bonus_id}</span>
                            <span style={{ color: "#999", marginLeft: 8 }}>started {b.started_date}</span>
                            {b.closed_date && <span style={{ color: "#0d7c5f", marginLeft: 8 }}>closed {b.closed_date}</span>}
                          </div>
                          <span style={{ fontWeight: 600, color: "#0d7c5f" }}>{money(b.bonus_amount ?? 0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Bonuses */}
                <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 24px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#7c3aed", marginBottom: 12 }}>
                    Custom Bonuses ({userDetail.custom_bonuses.length})
                  </div>
                  {userDetail.custom_bonuses.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#bbb" }}>None</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {userDetail.custom_bonuses.map((c: any) => (
                        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
                          <div>
                            <span style={{ color: "#111", fontWeight: 600 }}>{c.bank_name}</span>
                            <span style={{ fontSize: 11, color: "#7c3aed", marginLeft: 8 }}>{c.current_step}</span>
                            {c.notes && <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{c.notes}</div>}
                          </div>
                          <span style={{ fontWeight: 600, color: "#555" }}>{money(c.bonus_amount ?? 0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Deposits */}
                {userDetail.deposits.length > 0 && (
                  <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 24px" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12 }}>Deposit Log ({userDetail.deposits.length})</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {userDetail.deposits.slice(0, 20).map((d: any) => (
                        <div key={d.id} style={{ fontSize: 12, color: "#555", display: "flex", justifyContent: "space-between" }}>
                          <span>{d.bonus_id} · {d.deposit_date}</span>
                          <span style={{ fontWeight: 600 }}>{money(d.amount)}</span>
                        </div>
                      ))}
                      {userDetail.deposits.length > 20 && <div style={{ fontSize: 11, color: "#bbb" }}>+ {userDetail.deposits.length - 20} more</div>}
                    </div>
                  </div>
                )}

                {/* Spending Cards */}
                {userDetail.owned_cards.length > 0 && (
                  <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 24px" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#2563eb", marginBottom: 12 }}>Spending Cards ({userDetail.owned_cards.length})</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {userDetail.owned_cards.map((c: any) => (
                        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
                          <div>
                            <span style={{ color: "#111", fontWeight: 600 }}>{c.card_name}</span>
                            <span style={{ fontSize: 11, marginLeft: 8, color: c.status === "active" ? "#2563eb" : c.status === "completed" ? "#0d7c5f" : "#999" }}>{c.status}</span>
                          </div>
                          <span style={{ fontWeight: 600, color: "#555" }}>{c.signup_bonus_value != null ? money(c.signup_bonus_value) : ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Spending Profile */}
                {userDetail.spending_profile && (
                  <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 24px" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12 }}>Spending Profile</div>
                    <div style={{ fontSize: 13, color: "#555" }}>
                      Monthly spend: {money(userDetail.spending_profile.monthly_spend ?? 0)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Custom Bonus Insights Tab ── */}
        {tab === "insights" && (
          <>
            {loading || !insights ? <div style={{ color: "#999" }}>Loading insights...</div> : (
              <>
                {/* Summary */}
                <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
                  <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "16px 20px", minWidth: 140 }}>
                    <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase" }}>Total Custom</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#111" }}>{insights.total_custom_bonuses}</div>
                  </div>
                  <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "16px 20px", minWidth: 140 }}>
                    <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase" }}>Unique Banks</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#7c3aed" }}>{insights.unique_banks}</div>
                  </div>
                </div>

                {/* Top Banks */}
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12 }}>Most Added Banks</div>
                <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, overflow: "hidden" }}>
                  {insights.top_banks.map((bank, i) => (
                    <div key={bank.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i < insights.top_banks.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{bank.name}</span>
                        <span style={{ fontSize: 12, color: "#999", marginLeft: 8 }}>avg {money(bank.avg_bonus)}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {Object.entries(bank.statuses).map(([status, count]) => (
                          <span key={status} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: "#f5f5f5", color: "#666" }}>
                            {status}: {count}
                          </span>
                        ))}
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#7c3aed", minWidth: 24, textAlign: "right" }}>{bank.count}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Lead gen hint */}
                <div style={{ marginTop: 24, fontSize: 13, color: "#888", background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 10, padding: "14px 16px" }}>
                  Banks that users add frequently as custom bonuses are strong candidates for official system bonuses. Consider adding the top entries above to <code style={{ fontSize: 12 }}>bonuses.ts</code>.
                </div>
              </>
            )}
          </>
        )}

        {/* ── Verifications Tab — cards + bonuses, two stacked sections ── */}
        {tab === "verifications" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>
                  Verification queue ({verifications.length + bonusVerifications.length})
                </div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                  Cards last verified {verificationsLastRun ? new Date(verificationsLastRun).toLocaleString() : "never"}.
                  {" · "}
                  Bonuses last verified {bonusVerificationsLastRun ? new Date(bonusVerificationsLastRun).toLocaleString() : "never"}.
                  {" · "}Cron: Sundays 14:00 UTC.
                </div>
              </div>
              <button
                onClick={loadVerifications}
                style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#0d7c5f", background: "#e6f5f0", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div style={{ color: "#999" }}>Loading verifications...</div>
            ) : (
              <>
                {/* Cards section */}
                <SectionHeading label="Credit cards" count={verifications.length} />
                {verifications.length === 0 ? (
                  <EmptyState text="No open card issues. All offers verified clean as of last run." />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                    {verifications.map(v => (
                      <IssueRow
                        key={v.id}
                        title={v.card_name}
                        subtitle={v.issuer}
                        signal={v.page_signal}
                        status={v.status}
                        url={v.url}
                        fieldMismatches={v.field_mismatches}
                        errorMessage={v.error_message}
                        ref_id={v.card_id}
                        runAt={v.run_at}
                        kind="card"
                        onReview={() => reviewVerification(v.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Bonuses section */}
                <SectionHeading label="Bank + savings bonuses" count={bonusVerifications.length} />
                {bonusVerifications.length === 0 ? (
                  <EmptyState text="No open bonus issues. Run npm run verify:bonuses -- --persist to populate (or wait for the cron)." />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {bonusVerifications.map(v => (
                      <IssueRow
                        key={v.id}
                        title={v.bank_name}
                        subtitle={v.bonus_kind}
                        signal={v.page_signal}
                        status={v.status}
                        url={v.url}
                        fieldMismatches={v.field_mismatches}
                        errorMessage={v.error_message}
                        ref_id={v.bonus_id}
                        runAt={v.run_at}
                        kind={v.bonus_kind}
                        onReview={() => reviewBonusVerification(v.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SectionHeading({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8, marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#111", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 12, color: count > 0 ? "#b91c1c" : "#999", fontWeight: 600 }}>
        {count} open
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#0d7c5f", marginBottom: 24 }}>
      {text}
    </div>
  )
}

function signalColor(signal: string): { bg: string; fg: string } {
  if (signal === "offer_dead" || signal === "fetch_error") return { bg: "#fee2e2", fg: "#b91c1c" }
  if (signal === "promo_removed" || signal === "expired_text_on_page") return { bg: "#fef3c7", fg: "#92400e" }
  if (signal === "no_fields_extracted") return { bg: "#fef3c7", fg: "#92400e" }
  if (signal === "ok") return { bg: "#e6f5f0", fg: "#0d7c5f" }
  return { bg: "#f5f5f5", fg: "#555" }
}

function kindBadge(kind: string): { bg: string; fg: string; label: string } {
  if (kind === "card") return { bg: "#dbeafe", fg: "#1d4ed8", label: "card" }
  if (kind === "checking") return { bg: "#ede9fe", fg: "#6d28d9", label: "checking" }
  if (kind === "savings") return { bg: "#dcfce7", fg: "#15803d", label: "savings" }
  return { bg: "#f5f5f5", fg: "#555", label: kind }
}

function IssueRow({
  title,
  subtitle,
  signal,
  status,
  url,
  fieldMismatches,
  errorMessage,
  ref_id,
  runAt,
  kind,
  onReview,
}: {
  title: string
  subtitle: string | null
  signal: string
  status: number | null
  url: string | null
  fieldMismatches: { field: string; stored: unknown; extracted: unknown; status: string }[]
  errorMessage: string | null
  ref_id: string
  runAt: string
  kind: string
  onReview: () => void
}) {
  const sig = signalColor(signal)
  const kb = kindBadge(kind)
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: kb.fg, background: kb.bg, padding: "1px 6px", borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>{kb.label}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{title}</span>
            {subtitle && <span style={{ fontSize: 12, color: "#999" }}>{subtitle}</span>}
            <span style={{ fontSize: 11, fontWeight: 600, color: sig.fg, background: sig.bg, padding: "1px 6px", borderRadius: 4 }}>
              {signal}{status ? ` · ${status}` : ""}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>
            id: {ref_id} · run {new Date(runAt).toLocaleString()}
          </div>
          {url && (
            <div style={{ marginTop: 6 }}>
              <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#2563eb", wordBreak: "break-all" }}>{url}</a>
            </div>
          )}
          {errorMessage && (
            <div style={{ marginTop: 6, fontSize: 12, color: "#b91c1c", fontFamily: "monospace" }}>{errorMessage}</div>
          )}
          {fieldMismatches.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
              {fieldMismatches.map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: "#555" }}>
                  <span style={{ fontWeight: 600, color: "#111" }}>{f.field}</span>
                  <span style={{ color: "#999" }}> · stored </span>
                  <span style={{ color: "#b91c1c" }}>{JSON.stringify(f.stored)}</span>
                  <span style={{ color: "#999" }}> → page </span>
                  <span style={{ color: "#0d7c5f" }}>{JSON.stringify(f.extracted)}</span>
                  <span style={{ color: "#999" }}> ({f.status})</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onReview}
          style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#555", background: "#f5f5f5", border: "1px solid #e8e8e8", borderRadius: 6, cursor: "pointer", flexShrink: 0 }}
        >
          Mark reviewed
        </button>
      </div>
    </div>
  )
}
