"use client"

import React from "react"
import type { MilestoneDetail, MilestoneKey } from "../../lib/bonusSteps"

type Props = {
  detail: MilestoneDetail
  onOverride?: (milestone: MilestoneKey) => void
}

const GREEN = "#0d7c5f"
const GREEN_LIGHT = "#e6f5f0"
const BLUE = "#2563eb"
const BLUE_LIGHT = "#eff4ff"
const TEXT = "#111"
const TEXT_SECONDARY = "#555"
const TEXT_MUTED = "#888"
const BORDER = "#e5e5e5"

export default function MilestoneProgressCard({ detail, onOverride }: Props) {
  const { milestones, depositProgress, payCycleProgress, celebrationMessage } = detail

  return (
    <div style={{ padding: "4px 0" }}>
      {/* ── Milestone list (vertical) ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {milestones.map((m, i) => {
          const isLast = i === milestones.length - 1
          const isCompleted = m.status === "completed"
          const isActive = m.status === "active"

          return (
            <div key={m.key} style={{ display: "flex", alignItems: "stretch", minHeight: 44 }}>
              {/* Left rail: circle + connector */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 32,
                flexShrink: 0,
              }}>
                {/* Circle */}
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: isCompleted ? GREEN : isActive ? BLUE_LIGHT : "#f3f3f3",
                    border: isActive ? `2px solid ${BLUE}` : isCompleted ? `2px solid ${GREEN}` : "2px solid #ddd",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    cursor: onOverride ? "pointer" : "default",
                    transition: "all 0.15s ease",
                  }}
                  onClick={() => onOverride?.(m.key)}
                  title={onOverride ? `Mark as ${m.label}` : undefined}
                >
                  {isCompleted ? (
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7L6 10L11 4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: isActive ? BLUE : "#bbb",
                      lineHeight: 1,
                    }}>
                      {m.level}
                    </span>
                  )}
                </div>

                {/* Vertical connector */}
                {!isLast && (
                  <div style={{
                    width: 2,
                    flex: 1,
                    minHeight: 12,
                    background: isCompleted ? GREEN : "#e8e8e8",
                    transition: "background 0.15s ease",
                  }} />
                )}
              </div>

              {/* Right side: label + subtitle */}
              <div style={{
                paddingLeft: 10,
                paddingBottom: isLast ? 0 : 14,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                minHeight: 24,
              }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: isActive ? 700 : isCompleted ? 600 : 500,
                  color: isCompleted ? TEXT : isActive ? TEXT : "#bbb",
                  lineHeight: "24px",
                }}>
                  {m.label}
                </span>
                {m.subtitle && (
                  <span style={{
                    fontSize: 11,
                    color: isActive ? BLUE : isCompleted ? TEXT_MUTED : "#ccc",
                    marginTop: 1,
                    lineHeight: 1.3,
                  }}>
                    {m.subtitle}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Progress toward bonus (money-based) ── */}
      {(depositProgress || payCycleProgress) && (
        <div style={{
          marginTop: 16,
          padding: "12px 14px",
          background: "#f8faf9",
          borderRadius: 8,
          border: "1px solid #eef2f0",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            Progress
          </div>

          {depositProgress && (
            <div style={{ marginBottom: payCycleProgress ? 8 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
                  ${depositProgress.deposited.toLocaleString()} of ${depositProgress.required.toLocaleString()} deposited
                </span>
                <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                  {depositProgress.required > 0 ? Math.min(100, Math.round((depositProgress.deposited / depositProgress.required) * 100)) : 0}%
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 4, background: "#e8e8e8", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${depositProgress.required > 0 ? Math.min(100, (depositProgress.deposited / depositProgress.required) * 100) : 0}%`,
                  background: GREEN,
                  borderRadius: 2,
                  transition: "width 0.3s ease",
                }} />
              </div>
            </div>
          )}

          {payCycleProgress && (
            <div>
              <span style={{ fontSize: 13, color: TEXT_SECONDARY }}>
                {payCycleProgress.completed} of {payCycleProgress.required} required pay cycle{payCycleProgress.required !== 1 ? "s" : ""} completed
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Micro-celebration ── */}
      {celebrationMessage && (
        <div style={{
          marginTop: 12,
          padding: "10px 14px",
          background: GREEN_LIGHT,
          borderRadius: 8,
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
        }}>
          <span style={{ color: GREEN, fontSize: 13, fontWeight: 700, lineHeight: "18px", flexShrink: 0 }}>&#10003;</span>
          <span style={{ fontSize: 13, color: "#1a4a3a", lineHeight: "18px" }}>
            {celebrationMessage}
          </span>
        </div>
      )}

      {/* ── Manual override indicator ── */}
      {detail.isManualOverride && (
        <div style={{ marginTop: 8 }}>
          <span style={{ fontSize: 10, color: "#aaa", fontStyle: "italic" }}>manually updated</span>
        </div>
      )}
    </div>
  )
}
