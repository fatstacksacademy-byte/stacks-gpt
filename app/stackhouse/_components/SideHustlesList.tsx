"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLabels } from "../../../lib/stackhouse/useLabels"
import type { Milestone, SideHustle, StackhouseProfile } from "../../../lib/stackhouse/types"

export default function SideHustlesList({
  userId,
  sideHustles,
  onChange,
  onProfileUpdate,
}: {
  userId: string
  sideHustles: SideHustle[]
  onChange: (next: SideHustle[]) => void
  onProfileUpdate: (p: StackhouseProfile) => void
}) {
  void userId
  const labels = useLabels()
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function markMilestone(hustleId: string, milestoneId: string) {
    setBusyId(hustleId + ":" + milestoneId)
    try {
      const res = await fetch(`/stackhouse/api/side-hustles/${hustleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_milestone", milestone_id: milestoneId }),
      })
      if (!res.ok) throw new Error(await res.text())
      const payload = await res.json()
      const updated = payload.side_hustle as SideHustle
      onChange(sideHustles.map((h) => (h.id === hustleId ? updated : h)))
      if (payload.profile) onProfileUpdate(payload.profile)
    } catch (err) {
      console.error("[stackhouse] mark_milestone failed:", err)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="sh-card" aria-label={labels.customQuestPlural}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 14,
        }}
      >
        <div className="sh-eyebrow">{labels.customQuestPlural}</div>
        <button
          onClick={() => router.push("/stackhouse/side-hustle/new")}
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--sh-amber)",
            background: "transparent",
            border: "1px solid var(--sh-amber)",
            borderRadius: "var(--sh-radius)",
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          + {labels.cta_start_hustle}
        </button>
      </div>

      {sideHustles.length === 0 ? (
        <div
          style={{
            fontSize: 13,
            color: "var(--sh-text-muted)",
            padding: "14px 0",
            textAlign: "center",
          }}
        >
          {labels.empty_side_hustles}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sideHustles.map((h) => (
            <HustleRow
              key={h.id}
              hustle={h}
              busyId={busyId}
              onMarkMilestone={markMilestone}
              onEdit={() => router.push(`/stackhouse/side-hustle/${h.id}`)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function HustleRow({
  hustle,
  busyId,
  onMarkMilestone,
  onEdit,
}: {
  hustle: SideHustle
  busyId: string | null
  onMarkMilestone: (hustleId: string, milestoneId: string) => void
  onEdit: () => void
}) {
  const milestones = hustle.milestones ?? []
  const completed = milestones.filter((m) => m.completed_at).length
  const pct = milestones.length > 0 ? completed / milestones.length : 0

  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid var(--sh-divider)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
          gap: 12,
        }}
      >
        <button
          onClick={onEdit}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--sh-text-primary)",
            textAlign: "left",
            fontFamily: "inherit",
          }}
        >
          {hustle.title}
        </button>
        <div
          className="sh-numeric"
          style={{ fontSize: 13, color: "var(--sh-text-secondary)", flexShrink: 0 }}
        >
          ${hustle.target_amount.toLocaleString()}
        </div>
      </div>

      {/* Segmented milestone bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(milestones.length, 1)}, 1fr)`,
          gap: 3,
          marginBottom: 8,
        }}
        role="progressbar"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${hustle.title} progress`}
      >
        {milestones.length === 0 ? (
          <div
            style={{
              height: 4,
              background: "var(--sh-divider)",
            }}
          />
        ) : (
          milestones.map((m) => (
            <MilestoneSegment
              key={m.id}
              milestone={m}
              hustleId={hustle.id}
              busy={busyId === hustle.id + ":" + m.id}
              onMark={onMarkMilestone}
            />
          ))
        )}
      </div>

      <div style={{ fontSize: 11, color: "var(--sh-text-muted)" }}>
        {completed}/{milestones.length || 0} milestones · +{hustle.xp_reward} XP on
        completion
      </div>
    </div>
  )
}

function MilestoneSegment({
  milestone,
  hustleId,
  busy,
  onMark,
}: {
  milestone: Milestone
  hustleId: string
  busy: boolean
  onMark: (hustleId: string, milestoneId: string) => void
}) {
  const done = !!milestone.completed_at
  return (
    <button
      onClick={() => !done && !busy && onMark(hustleId, milestone.id)}
      disabled={done || busy}
      aria-label={milestone.label}
      title={`${milestone.label} — $${milestone.threshold.toLocaleString()} · +${milestone.xp_reward} XP`}
      style={{
        height: 4,
        background: done ? "var(--sh-amber)" : "var(--sh-divider)",
        border: "none",
        padding: 0,
        cursor: done || busy ? "default" : "pointer",
        opacity: busy ? 0.6 : 1,
      }}
    />
  )
}
