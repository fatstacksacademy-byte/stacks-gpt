"use client"

import { useLabels, useMode } from "../../../lib/stackhouse/useLabels"
import type { StackhouseMode } from "../../../lib/stackhouse/types"

export default function ModeToggle({
  onChange,
}: {
  onChange: (mode: StackhouseMode) => void
}) {
  const labels = useLabels()
  const mode = useMode()

  const options: { value: StackhouseMode; label: string }[] = [
    { value: "stackhouse", label: labels.mode_stackhouse },
    { value: "clean", label: labels.mode_clean },
  ]

  return (
    <div
      role="group"
      aria-label={labels.mode_label}
      style={{
        display: "inline-flex",
        border: "1px solid var(--sh-divider)",
        borderRadius: "var(--sh-radius)",
        padding: 2,
      }}
    >
      {options.map((opt) => {
        const active = mode === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            style={{
              padding: "4px 11px",
              fontSize: 12,
              fontWeight: 600,
              background: active ? "var(--sh-amber)" : "transparent",
              color: active ? "#1a1816" : "var(--sh-text-secondary)",
              border: "none",
              borderRadius: "calc(var(--sh-radius) - 1px)",
              cursor: "pointer",
              letterSpacing: "0.04em",
              fontFamily: "var(--sh-font-mono)",
              textTransform: "uppercase",
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
