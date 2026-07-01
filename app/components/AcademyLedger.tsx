"use client"

import { useEffect, useRef, useState } from "react"

/**
 * The Fat Stacks Academy ledger — one collective number: every dollar Academy
 * members have reclaimed from the banks, climbing toward the $1,000,000,000
 * mission. Mr. Fat Stacks recruits people into the Academy; this is the
 * scoreboard. Self-contained: fetches the aggregate from /api/heist (public,
 * CDN-cached) and animates a count-up. Renders a dark "mission" band by default
 * so it stands out against the light marketing page; pass variant="inline" for
 * a compact in-app card.
 *
 * Pass `userContribution` (in-app only) to add a personal "your stack" line —
 * the hook that turns the free tracker into part of the story.
 */

const GOAL = 1_000_000_000

type HeistTotal = { taken: number; goal: number; contributors: number }

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return reduced
}

/** Animate a number from 0 → target with an ease-out curve. */
function useCountUp(target: number, run: boolean, reduced: boolean): number {
  const [value, setValue] = useState(0)
  const raf = useRef<number | null>(null)
  useEffect(() => {
    if (!run) return
    if (reduced || target <= 0) {
      setValue(target)
      return
    }
    const duration = 1400
    let start: number | null = null
    const tick = (ts: number) => {
      if (start === null) start = ts
      const p = Math.min(1, (ts - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, run, reduced])
  return value
}

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US")

export default function AcademyLedger({
  variant = "band",
  userContribution,
}: {
  variant?: "band" | "inline"
  userContribution?: number
}) {
  const [data, setData] = useState<HeistTotal | null>(null)
  const [visible, setVisible] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const reduced = usePrefersReducedMotion()

  // Fetch the aggregate once on mount.
  useEffect(() => {
    let cancelled = false
    fetch("/api/heist")
      .then((r) => r.json())
      .then((d: HeistTotal) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        if (!cancelled) setData({ taken: 0, goal: GOAL, contributors: 0 })
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Only run the count-up once the band scrolls into view.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const taken = data?.taken ?? 0
  const contributors = data?.contributors ?? 0
  const shown = useCountUp(taken, visible, reduced)
  const pct = Math.min(100, (taken / GOAL) * 100)
  // Always show a faint sliver even at a tiny fraction so the bar reads as "started".
  const barWidth = taken > 0 ? Math.max(0.6, pct) : 0

  const inline = variant === "inline"
  const accent = "#f5b301" // Fat Stacks gold

  return (
    <section
      ref={rootRef}
      style={{
        background: inline ? "#111" : "#0f0f0f",
        color: "#fff",
        borderRadius: inline ? 14 : 0,
        padding: inline ? "28px 24px" : "64px 40px",
        fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: accent,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          The Fat Stacks Academy
        </div>

        <div
          style={{
            fontSize: inline ? 40 : 56,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {money(shown)}
        </div>
        <div style={{ fontSize: 14, color: "#9a9a9a", marginTop: 8 }}>
          reclaimed from the banks · of{" "}
          <span style={{ color: "#e5e5e5", fontWeight: 600 }}>$1,000,000,000</span>{" "}
          {contributors > 0 && (
            <>
              · {contributors.toLocaleString()} recruit{contributors === 1 ? "" : "s"}
            </>
          )}
        </div>

        {/* progress bar toward the billion */}
        <div
          style={{
            marginTop: 22,
            height: 8,
            borderRadius: 999,
            background: "rgba(255,255,255,0.10)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${barWidth}%`,
              background: `linear-gradient(90deg, ${accent}, #ffd873)`,
              borderRadius: 999,
              transition: reduced ? "none" : "width 1.4s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: "#7a7a7a", marginTop: 8 }}>
          {pct < 0.01 ? "Class is in session. We're just getting started." : `${pct.toFixed(2)}% of the mission`}
        </div>

        {inline ? (
          typeof userContribution === "number" && (
            <div
              style={{
                marginTop: 20,
                display: "inline-block",
                padding: "8px 16px",
                borderRadius: 999,
                background: "rgba(245,179,1,0.12)",
                color: accent,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Your stack so far: {money(userContribution)}
            </div>
          )
        ) : (
          <a
            href="#signup"
            style={{
              marginTop: 24,
              display: "inline-block",
              padding: "13px 26px",
              borderRadius: 10,
              background: accent,
              color: "#111",
              fontSize: 15,
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Join the Academy — it&apos;s free →
          </a>
        )}
      </div>
    </section>
  )
}
