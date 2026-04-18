"use client"

import { useLabels } from "../../../lib/stackhouse/useLabels"
import type { ActiveCook } from "../../../lib/stackhouse/types"

export default function ActiveCooksList({ cooks }: { cooks: ActiveCook[] }) {
  const labels = useLabels()

  return (
    <section className="sh-card" aria-label={labels.activeBonusPlural}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 14,
        }}
      >
        <div className="sh-eyebrow">{labels.activeBonusPlural}</div>
        <a
          href="/stacksos/paycheck"
          style={{ fontSize: 11, color: "var(--sh-amber)", fontWeight: 600 }}
        >
          Paycheck →
        </a>
      </div>

      {cooks.length === 0 ? (
        <div
          style={{
            fontSize: 13,
            color: "var(--sh-text-muted)",
            padding: "14px 0",
            textAlign: "center",
          }}
        >
          {labels.empty_active_cooks}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {cooks.map((c) => (
            <CookRow key={c.record_id} cook={c} />
          ))}
        </div>
      )}
    </section>
  )
}

function CookRow({ cook }: { cook: ActiveCook }) {
  const progress =
    cook.deposit_required && cook.deposit_required > 0
      ? Math.min(1, cook.deposit_progress / cook.deposit_required)
      : cook.window_days
        ? Math.min(1, cook.days_elapsed / cook.window_days)
        : 0
  const pctLabel =
    cook.deposit_required && cook.deposit_required > 0
      ? `$${cook.deposit_progress.toLocaleString()} / $${cook.deposit_required.toLocaleString()}`
      : cook.window_days
        ? `Day ${cook.days_elapsed} / ${cook.window_days}`
        : `Day ${cook.days_elapsed}`

  return (
    <div
      style={{
        padding: "10px 0",
        borderBottom: "1px solid var(--sh-divider)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 4,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--sh-text-primary)" }}>
          {cook.bank_name}
        </div>
        <div
          className="sh-numeric"
          style={{ fontSize: 15, fontWeight: 600, color: "var(--sh-amber)" }}
        >
          ${cook.bonus_amount.toLocaleString()}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <div className="sh-progress" aria-hidden="true">
            <div style={{ width: `${progress * 100}%` }} />
          </div>
          <div
            style={{
              marginTop: 3,
              fontSize: 10,
              color: "var(--sh-text-muted)",
            }}
          >
            {pctLabel}
          </div>
        </div>
        <div
          className="sh-pill"
          style={{ color: "var(--sh-amber)", flexShrink: 0 }}
        >
          +{cook.xp_reward} XP
        </div>
      </div>
    </div>
  )
}
