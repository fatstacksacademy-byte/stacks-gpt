"use client"

import React from "react"
import type { StepDetail, BonusStep } from "../../lib/bonusSteps"

type Props = {
  detail: StepDetail
  onOverride?: (step: BonusStep) => void
}

export default function StepProgressBar({ detail, onOverride }: Props) {
  const { steps } = detail

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, width: "100%", padding: "8px 0" }}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        const color = stepColor(step.status)
        const bgColor = stepBg(step.status)

        return (
          <React.Fragment key={step.key}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: isLast ? "0 0 auto" : "0 0 auto",
                minWidth: 64,
                cursor: onOverride ? "pointer" : "default",
              }}
              onClick={() => onOverride?.(step.key)}
              title={onOverride ? `Mark as ${step.label}` : undefined}
            >
              {/* Circle */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: bgColor,
                  border: step.status === "active" ? `2px solid ${color}` : "2px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
              >
                {step.status === "completed" ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, color: step.status === "active" ? color : "#aaa" }}>
                    {i + 1}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: step.status === "active" ? 700 : 500,
                  color: step.status === "upcoming" ? "#bbb" : step.status === "active" ? color : "#555",
                  marginTop: 4,
                  whiteSpace: "nowrap",
                }}
              >
                {step.label}
              </span>

              {/* Subtitle */}
              {step.subtitle && (
                <span
                  style={{
                    fontSize: 10,
                    color: step.status === "active" ? color : "#999",
                    marginTop: 1,
                    whiteSpace: "nowrap",
                    maxWidth: 90,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textAlign: "center",
                  }}
                >
                  {step.subtitle}
                </span>
              )}
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  marginTop: 13,
                  minWidth: 20,
                  background: i < steps.findIndex((s) => s.status === "active")
                    ? "#0d9e6e"
                    : "#e0e0e0",
                  borderRadius: 1,
                  transition: "background 0.2s ease",
                }}
              />
            )}
          </React.Fragment>
        )
      })}

      {/* Manual override indicator */}
      {detail.isManualOverride && (
        <div style={{ marginLeft: 8, marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "#aaa", fontStyle: "italic" }}>manual</span>
        </div>
      )}
    </div>
  )
}

function stepColor(status: "completed" | "active" | "upcoming"): string {
  if (status === "completed") return "#0d9e6e"
  if (status === "active") return "#1a6ef5"
  return "#ccc"
}

function stepBg(status: "completed" | "active" | "upcoming"): string {
  if (status === "completed") return "#0d9e6e"
  if (status === "active") return "#e8f0fe"
  return "#f0f0f0"
}
