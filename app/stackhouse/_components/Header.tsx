"use client"

import { useLabels } from "../../../lib/stackhouse/useLabels"
import type { StackhouseMode, StackhouseProfile } from "../../../lib/stackhouse/types"
import ModeToggle from "./ModeToggle"

export default function Header({
  userEmail,
  profile,
  onModeChange,
}: {
  userEmail: string
  profile: StackhouseProfile
  onModeChange: (mode: StackhouseMode) => void
}) {
  const labels = useLabels()
  const handle = deriveHandle(userEmail)
  const territory = "—" // PHASE 2: wire to user_profiles.state

  return (
    <header className="sh-header">
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "16px 28px",
          display: "flex",
          alignItems: "center",
          gap: 18,
          flexWrap: "wrap",
        }}
        className="sh-header-inner"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="sh-atom-badge" aria-hidden="true">
            <div className="sh-atom-symbol">Au</div>
            <div className="sh-atom-num">79</div>
          </div>
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "var(--sh-text-primary)",
              }}
              className="sh-numeric"
            >
              {labels.appTitle}
            </div>
            <div className="sh-eyebrow" style={{ marginTop: 2 }}>
              {handle} · {labels.rank} {profile.rank} · {territory}
            </div>
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <ModeToggle onChange={onModeChange} />
        </div>
      </div>
      <style>{`
        @media (max-width: 520px) {
          .sh-header-inner { padding: 12px 16px !important; gap: 12px !important; }
        }
      `}</style>
    </header>
  )
}

function deriveHandle(email: string): string {
  if (!email) return "You"
  const local = email.split("@")[0]
  // Title-case with a single separator — "fatstacksacademy" → "Fat Stacks Academy"
  return local
    .replace(/[-_.]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 32)
}
