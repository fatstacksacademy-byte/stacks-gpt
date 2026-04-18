"use client"

import { useLabels } from "../../../lib/stackhouse/useLabels"

export default function WelcomeModal({ onClose }: { onClose: () => void }) {
  const labels = useLabels()
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={labels.welcome_title}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 8, 6, 0.78)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9000,
        padding: 18,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="sh-card"
        style={{
          width: "min(480px, calc(100vw - 36px))",
          padding: "28px 30px",
          background: "var(--sh-bg-card-elev)",
        }}
      >
        <div className="sh-eyebrow" style={{ marginBottom: 6 }}>
          {labels.mode_stackhouse}
        </div>
        <h2
          className="sh-numeric"
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: "var(--sh-text-primary)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {labels.welcome_title}
        </h2>
        <div
          style={{
            fontSize: 13,
            color: "var(--sh-text-secondary)",
            marginTop: 6,
          }}
        >
          {labels.welcome_subtitle}
        </div>
        <p
          style={{
            fontSize: 14,
            color: "var(--sh-text-primary)",
            lineHeight: 1.55,
            marginTop: 16,
          }}
        >
          {labels.welcome_body}
        </p>
        <button
          onClick={onClose}
          style={{
            marginTop: 20,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "var(--sh-font-mono)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            background: "var(--sh-amber)",
            color: "#1a1816",
            border: "none",
            borderRadius: "var(--sh-radius)",
            cursor: "pointer",
          }}
        >
          {labels.welcome_cta}
        </button>
      </div>
    </div>
  )
}
