"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { GLOSSARY, type GlossaryKey } from "../../lib/glossary"

/**
 * A small "?" chip that explains a piece of jargon. Shows its tip on hover
 * (desktop) and on tap (mobile); tapping outside or pressing Escape closes it.
 * The popover is rendered through a portal and positioned with fixed
 * coordinates so it never gets clipped by a card's `overflow: hidden`.
 *
 *   <InfoTip term="directDeposit" />          // pulls copy from the glossary
 *   <InfoTip tip="Custom explanation…" />      // ad-hoc copy
 */
export default function InfoTip({
  term,
  tip,
  label,
  size = 14,
}: {
  term?: GlossaryKey
  tip?: string
  /** Used for the accessible label, e.g. "What is direct deposit?" */
  label?: string
  size?: number
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 260 })
  const ref = useRef<HTMLSpanElement>(null)

  const text = tip ?? (term ? GLOSSARY[term] : "")

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const width = Math.min(260, window.innerWidth - 24)
    // Prefer below-right of the icon; clamp into the viewport.
    let left = r.left
    if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12
    if (left < 12) left = 12
    setPos({ top: r.bottom + 6, left, width })
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    // Any outside click / scroll dismisses (capture so it fires before re-renders).
    document.addEventListener("click", close, true)
    document.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("click", close, true)
      document.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  if (!text) return null

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex", verticalAlign: "middle", lineHeight: 0 }}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label ? `What is ${label}?` : "More information"}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          width: size, height: size, borderRadius: "50%", flexShrink: 0,
          border: "none", cursor: "pointer", padding: 0,
          background: "#e5e7eb", color: "#6b7280",
          fontSize: Math.round(size * 0.72), fontWeight: 700, lineHeight: 1,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}
      >?</button>
      {mounted && open && createPortal(
        <span role="tooltip"
          onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
          style={{
            position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999,
            background: "#1f2937", color: "#f9fafb", fontSize: 12, lineHeight: 1.5,
            fontWeight: 400, padding: "10px 12px", borderRadius: 10,
            boxShadow: "0 8px 28px rgba(0,0,0,0.22)", textTransform: "none", letterSpacing: 0,
            textAlign: "left", whiteSpace: "normal",
          }}>
          {text}
        </span>,
        document.body
      )}
    </span>
  )
}
