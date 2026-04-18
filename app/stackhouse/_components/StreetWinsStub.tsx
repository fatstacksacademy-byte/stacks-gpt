"use client"

// PHASE 2: real achievement unlock pipeline (check criteria on every xp event,
// insert into stackhouse_street_wins, award achievement.xp_reward). Today
// we just render anything already in stackhouse_street_wins.

import { useLabels } from "../../../lib/stackhouse/useLabels"
import type { StreetWin } from "../../../lib/stackhouse/types"

export default function StreetWinsStub({ streetWins }: { streetWins: StreetWin[] }) {
  const labels = useLabels()

  return (
    <section className="sh-card" aria-label={labels.achievementPlural}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 14,
        }}
      >
        <div className="sh-eyebrow">{labels.achievementPlural}</div>
        <span style={{ fontSize: 10, color: "var(--sh-text-muted)" }}>preview</span>
      </div>
      {streetWins.length === 0 ? (
        <div
          style={{
            fontSize: 13,
            color: "var(--sh-text-muted)",
            padding: "14px 0",
            textAlign: "center",
          }}
        >
          {labels.empty_street_wins}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {streetWins.slice(0, 10).map((w) => (
            <div
              key={w.id}
              style={{
                padding: "8px 0",
                borderBottom: "1px solid var(--sh-divider)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--sh-text-primary)",
                  }}
                >
                  {w.achievement_key}
                </div>
                <div style={{ fontSize: 11, color: "var(--sh-text-muted)" }}>
                  {new Date(w.earned_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
