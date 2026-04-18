"use client"

import { useEffect, useMemo, useState } from "react"
import { LabelsProvider, labelsFor } from "../../../lib/stackhouse/useLabels"
import type {
  ActiveCook,
  SideHustle,
  StackhouseMode,
  StackhouseProfile,
  StreetWin,
} from "../../../lib/stackhouse/types"
import Header from "./Header"
import KingpinPanel from "./KingpinPanel"
import SideHustlesList from "./SideHustlesList"
import ActiveCooksList from "./ActiveCooksList"
import OperationLoadoutStub from "./OperationLoadoutStub"
import TerritoriesStub from "./TerritoriesStub"
import StreetWinsStub from "./StreetWinsStub"
import DailyRoundBanner from "./DailyRoundBanner"
import WelcomeModal from "./WelcomeModal"
import DebugXpPanel from "./DebugXpPanel"

type Props = {
  userEmail: string
  userId: string
  initialProfile: StackhouseProfile
  initialSideHustles: SideHustle[]
  activeCooks: ActiveCook[]
  stats: { jobsRun: number; bonusesStarted: number; purity: number; lifetimeEarned: number }
  streetWins: StreetWin[]
  debugEnabled: boolean
}

const LS_MODE_KEY = "stackhouse:mode"

export default function StackhouseClient(props: Props) {
  const { userEmail, userId, initialProfile, initialSideHustles, activeCooks, stats, streetWins, debugEnabled } = props

  const initialMode: StackhouseMode =
    (initialProfile.preferences?.mode as StackhouseMode | undefined) ?? "stackhouse"
  const [mode, setMode] = useState<StackhouseMode>(initialMode)
  const [profile, setProfile] = useState<StackhouseProfile>(initialProfile)
  const [sideHustles, setSideHustles] = useState<SideHustle[]>(initialSideHustles)
  const [showWelcome, setShowWelcome] = useState(!initialProfile.onboarded_at)

  // Sync mode choice to localStorage so next SSR pre-hydration doesn't flash
  // the wrong theme.
  useEffect(() => {
    try {
      localStorage.setItem(LS_MODE_KEY, mode)
    } catch {
      // ignore (safari private mode etc.)
    }
  }, [mode])

  // On mount, prefer localStorage over server-side preference if they differ.
  // This fixes the case where a user toggled mode in another tab.
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LS_MODE_KEY) as StackhouseMode | null
      if (cached && (cached === "stackhouse" || cached === "clean") && cached !== mode) {
        setMode(cached)
      }
    } catch {
      // ignore
    }
    // Intentionally run only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleModeChange(next: StackhouseMode) {
    setMode(next)
    // Fire-and-forget: we don't need to block the UI on the server write.
    fetch("/stackhouse/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: { ...profile.preferences, mode: next } }),
    }).catch(() => {})
  }

  async function handleWelcomeClose() {
    setShowWelcome(false)
    fetch("/stackhouse/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarded_at: new Date().toISOString() }),
    }).catch(() => {})
  }

  const labelsValue = useMemo(() => ({ labels: labelsFor(mode), mode }), [mode])

  return (
    <LabelsProvider value={labelsValue}>
      <div className={`stackhouse-root mode-${mode}`}>
        <Header
          userEmail={userEmail}
          profile={profile}
          onModeChange={handleModeChange}
        />
        <main style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 28px 80px" }} className="sh-main">
          <KingpinPanel profile={profile} stats={stats} userEmail={userEmail} />

          <div
            className="sh-two-col"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 22 }}
          >
            <SideHustlesList
              userId={userId}
              sideHustles={sideHustles}
              onChange={setSideHustles}
              onProfileUpdate={setProfile}
            />
            <ActiveCooksList cooks={activeCooks} />
          </div>

          <OperationLoadoutStub />
          <div
            className="sh-two-col"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}
          >
            <TerritoriesStub />
            <StreetWinsStub streetWins={streetWins} />
          </div>

          <DailyRoundBanner />

          {debugEnabled && (
            <DebugXpPanel
              userId={userId}
              currentXp={profile.current_xp}
              onProfileUpdate={setProfile}
            />
          )}
        </main>

        {showWelcome && <WelcomeModal onClose={handleWelcomeClose} />}

        <style>{`
          @media (max-width: 768px) {
            .sh-main { padding: 18px 16px 80px !important; }
          }
        `}</style>
      </div>
    </LabelsProvider>
  )
}
