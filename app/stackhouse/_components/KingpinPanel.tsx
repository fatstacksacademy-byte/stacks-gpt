"use client"

import { useLabels } from "../../../lib/stackhouse/useLabels"
import type { StackhouseProfile } from "../../../lib/stackhouse/types"
import {
  progressToNextRank,
  xpForRank,
  xpToNextRank,
  RANK_MAX,
} from "../../../lib/stackhouse/rank"

type Stats = {
  jobsRun: number
  bonusesStarted: number
  purity: number
  lifetimeEarned: number
}

export default function KingpinPanel({
  profile,
  stats,
  userEmail,
}: {
  profile: StackhouseProfile
  stats: Stats
  userEmail: string
}) {
  void userEmail
  const labels = useLabels()
  const pct = progressToNextRank(profile.current_xp)
  const toNext = xpToNextRank(profile.current_xp)
  const nextRankXp = xpForRank(Math.min(profile.rank + 1, RANK_MAX))
  const cleanRate =
    stats.bonusesStarted > 0
      ? `${Math.round((stats.jobsRun / stats.bonusesStarted) * 100)}%`
      : "—"

  const stripStats: { key: string; label: string; value: string }[] = [
    {
      key: "dough",
      label: labels.stat_dough_slung,
      value: `$${stats.lifetimeEarned.toLocaleString()}`,
    },
    {
      key: "jobs",
      label: labels.stat_jobs_run,
      value: String(stats.jobsRun),
    },
    { key: "clean", label: labels.stat_clean_rate, value: cleanRate },
    { key: "heat", label: labels.stat_heat_level, value: "Low" }, // PHASE 2
    { key: "524", label: labels.stat_five_24, value: "0 / 5" }, // PHASE 2
  ]

  return (
    <section className="sh-card" aria-label={labels.dashboard}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 28,
          alignItems: "center",
        }}
        className="sh-kingpin-grid"
      >
        {/* Purity ring / number */}
        <div style={{ textAlign: "center", minWidth: 140 }}>
          <div className="sh-eyebrow">{labels.level}</div>
          <div
            className="sh-numeric"
            style={{
              fontSize: 56,
              fontWeight: 600,
              color: "var(--sh-amber)",
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            {profile.purity_pct.toFixed(1)}%
          </div>
          <div
            className="sh-eyebrow"
            style={{ marginTop: 10, color: "var(--sh-text-secondary)" }}
          >
            {labels.rank} {profile.rank}
            {profile.rank >= RANK_MAX && " · MAX"}
          </div>
        </div>

        {/* XP bar + to-next copy */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 6,
            }}
          >
            <div className="sh-eyebrow">{labels.xp}</div>
            <div
              className="sh-numeric"
              style={{ fontSize: 13, color: "var(--sh-text-secondary)" }}
            >
              {profile.current_xp.toLocaleString()}
              {profile.rank < RANK_MAX && ` / ${nextRankXp.toLocaleString()}`}
            </div>
          </div>
          <div className="sh-progress" aria-hidden="true">
            <div style={{ width: `${pct * 100}%` }} />
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "var(--sh-text-muted)",
            }}
          >
            {profile.rank >= RANK_MAX
              ? "Max rank"
              : `${labels.xpToNext}: ${toNext.toLocaleString()}`}
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div
        className="sh-four-col"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 14,
          marginTop: 20,
          paddingTop: 18,
          borderTop: "1px solid var(--sh-divider)",
        }}
      >
        {stripStats.map((s) => (
          <div key={s.key}>
            <div className="sh-eyebrow" style={{ fontSize: 10 }}>
              {s.label}
            </div>
            <div
              className="sh-numeric"
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "var(--sh-text-primary)",
                marginTop: 2,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
