"use client"

import { useMemo } from "react"
import type { bonuses as allBonuses } from "../../lib/data/bonuses"

type Bonus = (typeof allBonuses)[number]

type UserProfileLite = {
  pay_frequency: "weekly" | "biweekly" | "semimonthly" | "monthly"
  paycheck_amount: number
  state?: string | null
}

// How often a paycheck lands, in days
const DAYS_PER_PAY: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  semimonthly: 15.2,
  monthly: 30.4,
}

function calcNetBonus(bonus: Bonus) {
  const fee = bonus.fees?.monthly_fee ?? 0
  if (fee === 0) return { netBonus: bonus.bonus_amount, totalFees: 0, feeWaivedByDD: false }

  const waiver = (bonus.fees?.monthly_fee_waiver_text ?? "").toLowerCase()
  const hasDDRequirement = bonus.requirements?.direct_deposit_required
  const ddWaivesFee =
    !!hasDDRequirement &&
    (waiver.includes("direct deposit") ||
      waiver.includes("qualifying electronic") ||
      waiver.includes("qualifying deposit"))

  if (ddWaivesFee) return { netBonus: bonus.bonus_amount, totalFees: 0, feeWaivedByDD: true }

  const holdDays = bonus.timeline?.must_remain_open_days ?? 180
  const months = Math.max(1, Math.ceil(holdDays / 30))
  const totalFees = fee * months
  return { netBonus: bonus.bonus_amount - totalFees, totalFees, feeWaivedByDD: false }
}

function fmtDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return dateStr
  }
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

export default function BonusCommitCard({
  bonus,
  profile,
  openedDate,
  onChangeOpenedDate,
  onConfirm,
  onCancel,
  confirmLabel = "Start this bonus",
  linkedBonuses,
  onStartLinked,
}: {
  bonus: Bonus
  profile: UserProfileLite
  openedDate: string
  onChangeOpenedDate: (d: string) => void
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  /**
   * Linked offers surfaced as an "Also start" option. `effective_amount`
   * takes precedence over the bonus's stored bonus_amount so combo-only
   * pricing (e.g., Chase $300 checking portion) displays correctly.
   */
  linkedBonuses?: { bonus: Bonus; effective_amount?: number; note?: string }[]
  onStartLinked?: (id: string) => void
}) {
  const summary = useMemo(() => {
    const fee = calcNetBonus(bonus)
    const req = bonus.requirements ?? {}
    const minDDTotal = req.min_direct_deposit_total
    const ddWindow = req.deposit_window_days
    const ddCount = req.dd_count_required
    const minPerDD = req.min_direct_deposit_per_deposit
    const debitTxns = req.debit_transactions_required

    // Income math: how much will the user have deposited by end of DD window?
    const daysPerPay = DAYS_PER_PAY[profile.pay_frequency] ?? 14
    const paysWithinWindow = ddWindow ? Math.floor(ddWindow / daysPerPay) : 0
    const projectedDDTotal = paysWithinWindow * profile.paycheck_amount

    // Can they meet the DD requirement?
    const meetsDD =
      !minDDTotal ||
      projectedDDTotal >= minDDTotal ||
      (!!minPerDD && profile.paycheck_amount >= minPerDD)

    // State eligibility
    const statesAllowed: string[] = bonus.eligibility?.states_allowed ?? []
    const isNationwide =
      statesAllowed.some((s: string) => s.toLowerCase().includes("nationwide")) ||
      !bonus.eligibility?.state_restricted
    const userState = (profile.state ?? "").toUpperCase()
    const stateQualifies =
      isNationwide || !userState || statesAllowed.some((s: string) => s.toUpperCase().includes(userState))

    // Timeline
    const postDays = bonus.timeline?.bonus_posting_days_est ?? (ddWindow ? ddWindow + 30 : null)
    const holdDays = bonus.timeline?.must_remain_open_days
    const expectedPostDate = postDays ? fmtDate(addDays(openedDate, postDays)) : null
    const earliestCloseDate = holdDays ? fmtDate(addDays(openedDate, holdDays)) : null

    return {
      fee,
      minDDTotal,
      ddWindow,
      ddCount,
      minPerDD,
      debitTxns,
      projectedDDTotal,
      meetsDD,
      paysWithinWindow,
      stateQualifies,
      statesAllowed,
      expectedPostDate,
      earliestCloseDate,
      postDays,
      holdDays,
    }
  }, [bonus, profile, openedDate])

  const otherRequirements = bonus.requirements?.other_requirements_text
  const promoLink = bonus.source_links?.[0]
  const chexSensitive = bonus.screening?.chex_sensitive

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: "24px 28px",
        width: "min(560px, calc(100vw - 32px))",
        maxHeight: "calc(100vh - 40px)",
        overflowY: "auto",
        border: "1px solid #e0e0e0",
        boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
      }}
      className="bcc-inner"
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 20, color: "#111" }}>{bonus.bank_name}</div>
        <div style={{ fontWeight: 800, fontSize: 24, color: "#0d7c5f" }}>
          ${bonus.bonus_amount.toLocaleString()}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
        {bonus.product_type === "savings" ? "Savings bonus" : "Checking bonus"} · Start this bonus
      </div>

      {/* ── Net after fees ── */}
      <Section>
        <Row
          label="Gross bonus"
          value={`$${bonus.bonus_amount.toLocaleString()}`}
        />
        {summary.fee.feeWaivedByDD ? (
          <Row
            label="Monthly fee"
            value={`$${bonus.fees?.monthly_fee}/mo — waived by DD`}
            tone="ok"
          />
        ) : summary.fee.totalFees > 0 ? (
          <Row
            label="Fees over hold period"
            value={`−$${summary.fee.totalFees}`}
            tone="warn"
            subtitle={bonus.fees?.monthly_fee_waiver_text ?? undefined}
          />
        ) : (
          <Row label="Monthly fee" value="$0" tone="ok" />
        )}
        <Row
          label="Net in pocket"
          value={`$${summary.fee.netBonus.toLocaleString()}`}
          emphasized
          tone={summary.fee.netBonus === bonus.bonus_amount ? "ok" : "warn"}
        />
      </Section>

      {/* ── Direct deposit requirement ── */}
      {bonus.requirements?.direct_deposit_required && (
        <Section title="Direct deposit requirement">
          {summary.minDDTotal && (
            <Row
              label="Total DD needed"
              value={`$${summary.minDDTotal.toLocaleString()}${summary.ddWindow ? ` in ${summary.ddWindow} days` : ""}`}
            />
          )}
          {summary.ddCount && (
            <Row label="Number of deposits" value={`${summary.ddCount}+`} />
          )}
          {summary.minPerDD && (
            <Row label="Minimum per deposit" value={`$${summary.minPerDD.toLocaleString()}`} />
          )}
          {summary.ddWindow && summary.paysWithinWindow > 0 && (
            <Row
              label="Your projected DD"
              value={`$${summary.projectedDDTotal.toLocaleString()} (${summary.paysWithinWindow} paychecks)`}
              subtitle={`At your $${profile.paycheck_amount.toLocaleString()} ${profile.pay_frequency} rate`}
              tone={summary.meetsDD ? "ok" : "warn"}
            />
          )}
          {!summary.meetsDD && summary.minDDTotal && (
            <WarnBanner>
              Your current paycheck may not hit the ${summary.minDDTotal.toLocaleString()} minimum within the {summary.ddWindow}-day window. You may need a larger deposit or a second income source.
            </WarnBanner>
          )}
        </Section>
      )}

      {/* ── Other requirements ── */}
      {(summary.debitTxns || otherRequirements) && (
        <Section title="Other requirements">
          {summary.debitTxns && (
            <Row label="Debit card transactions" value={`${summary.debitTxns}+`} />
          )}
          {otherRequirements && (
            <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5, padding: "6px 0" }}>
              {otherRequirements}
            </div>
          )}
        </Section>
      )}

      {/* ── Timeline ── */}
      <Section title="Timeline">
        {summary.expectedPostDate && (
          <Row
            label="Expected bonus post"
            value={summary.expectedPostDate}
            subtitle={`~${summary.postDays} days after opening`}
          />
        )}
        {summary.earliestCloseDate && (
          <Row
            label="Earliest close date"
            value={summary.earliestCloseDate}
            subtitle={`Keep open ${summary.holdDays} days to avoid clawback`}
          />
        )}
      </Section>

      {/* ── Eligibility flags ── */}
      {(!summary.stateQualifies || chexSensitive === "high") && (
        <Section>
          {!summary.stateQualifies && (
            <WarnBanner>
              This bonus is restricted to: {summary.statesAllowed.join(", ")}.
              {profile.state ? ` Your profile state is ${profile.state}.` : ""}
            </WarnBanner>
          )}
          {chexSensitive === "high" && (
            <WarnBanner>
              This bank is known to be ChexSystems-strict. Consider pulling your ChexSystems report first.
            </WarnBanner>
          )}
        </Section>
      )}

      {/* ── Linked bonuses ── */}
      {linkedBonuses && linkedBonuses.length > 0 && (
        <Section title="Bundle for extra earnings">
          <div style={{ fontSize: 12, color: "#555", marginBottom: 8, lineHeight: 1.5 }}>
            This bank has linked bonuses you can open at the same time:
          </div>
          {linkedBonuses.map((lb) => {
            const displayAmount = lb.effective_amount ?? lb.bonus.bonus_amount
            return (
              <div
                key={lb.bonus.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#f7faf9",
                  border: "1px solid #d9ece5",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 6,
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
                    +${displayAmount.toLocaleString()} · {lb.bonus.product_type}
                  </div>
                  <div style={{ fontSize: 11, color: "#888" }}>
                    {lb.note
                      ? lb.note
                      : lb.bonus.requirements?.other_requirements_text
                        ? lb.bonus.requirements.other_requirements_text.slice(0, 80) + "…"
                        : "Same bank — start together"}
                  </div>
                </div>
                {onStartLinked && (
                  <button
                    onClick={() => onStartLinked(lb.bonus.id)}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#0d7c5f",
                      background: "#fff",
                      border: "1px solid #0d7c5f",
                      borderRadius: 6,
                      padding: "6px 10px",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Also start
                  </button>
                )}
              </div>
            )
          })}
        </Section>
      )}

      {/* ── Opened date ── */}
      <Section title="Account opened date">
        <input
          type="date"
          value={openedDate}
          onChange={(e) => onChangeOpenedDate(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: 14,
            border: "1px solid #e2e2e2",
            borderRadius: 8,
            background: "#fff",
            color: "#111",
          }}
        />
      </Section>

      {/* ── Terms link ── */}
      {promoLink && (
        <div style={{ marginTop: 12, marginBottom: 20 }}>
          <a
            href={promoLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: "#888", textDecoration: "underline" }}
          >
            View official bank offer page →
          </a>
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: "11px",
            fontSize: 14,
            fontWeight: 600,
            background: "#fff",
            color: "#666",
            border: "1px solid #e2e2e2",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            flex: 2,
            padding: "11px",
            fontSize: 14,
            fontWeight: 700,
            background: "#0d7c5f",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {confirmLabel}
        </button>
      </div>

      <style>{`
        @media (max-width: 520px) {
          .bcc-inner { padding: 18px 16px !important; border-radius: 10px !important; }
        }
      `}</style>
    </div>
  )
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      {title && (
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#888",
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

function Row({
  label,
  value,
  subtitle,
  tone,
  emphasized,
}: {
  label: string
  value: string
  subtitle?: string
  tone?: "ok" | "warn"
  emphasized?: boolean
}) {
  const color = tone === "warn" ? "#b45309" : tone === "ok" ? "#0d7c5f" : "#111"
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "7px 0",
        borderBottom: "1px solid #f4f4f2",
      }}
    >
      <div style={{ fontSize: 13, color: "#555" }}>
        <div>{label}</div>
        {subtitle && <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{subtitle}</div>}
      </div>
      <div
        style={{
          fontSize: emphasized ? 17 : 14,
          fontWeight: emphasized ? 800 : 600,
          color,
          textAlign: "right",
        }}
      >
        {value}
      </div>
    </div>
  )
}

function WarnBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#fef3c7",
        color: "#92400e",
        borderRadius: 8,
        padding: "8px 10px",
        fontSize: 12,
        lineHeight: 1.5,
        margin: "8px 0 4px",
      }}
    >
      ⚠ {children}
    </div>
  )
}
