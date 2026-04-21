"use client"

import { useEffect, useState } from "react"
import { TOAST_EVENT, type Toast } from "../../lib/toast"

const AUTO_DISMISS_MS = 8000

export default function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    function onToast(e: Event) {
      const t = (e as CustomEvent<Toast>).detail
      setToasts(prev => [...prev, t])
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== t.id))
      }, AUTO_DISMISS_MS)
    }
    window.addEventListener(TOAST_EVENT, onToast)
    return () => window.removeEventListener(TOAST_EVENT, onToast)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 380,
        pointerEvents: "none",
      }}
    >
      {toasts.map(t => {
        const palette =
          t.kind === "error"
            ? { bg: "#fee2e2", border: "#fca5a5", fg: "#991b1b" }
            : t.kind === "success"
              ? { bg: "#d1fae5", border: "#86efac", fg: "#065f46" }
              : { bg: "#e0e7ff", border: "#a5b4fc", fg: "#3730a3" }
        return (
          <div
            key={t.id}
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            style={{
              padding: "11px 14px",
              background: palette.bg,
              border: `1px solid ${palette.border}`,
              color: palette.fg,
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1.4,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              cursor: "pointer",
              pointerEvents: "auto",
            }}
          >
            {t.message}
          </div>
        )
      })}
    </div>
  )
}
