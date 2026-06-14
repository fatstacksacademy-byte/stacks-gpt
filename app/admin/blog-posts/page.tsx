"use client"

import React, { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { bonuses } from "@/lib/data/bonuses"
import { savingsBonuses } from "@/lib/data/savingsBonuses"
import { creditCardBonuses } from "@/lib/data/creditCardBonuses"
import { monthlyBankPicks } from "@/lib/data/monthlyBankPicks"
import { monthlyCardPicks } from "@/lib/data/monthlyCardPicks"

// ── Types ─────────────────────────────────────────────────────────────────────

type BankPick = { bonusId: string; takeaway: string }
type CardPick = { cardId: string; takeaway: string }

type BankDraft = {
  monthSlug: string
  monthLabel: string
  publishedDate: string
  videoId: string
  intro: string
  picks: BankPick[]
}

type CardDraft = {
  monthSlug: string
  monthLabel: string
  publishedDate: string
  videoId: string
  intro: string
  picks: CardPick[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function money(n: number) {
  return `$${n.toLocaleString("en-US")}`
}

function bonusLabel(amount: number, currency: string) {
  if (currency === "cash") return money(amount)
  return `${amount.toLocaleString()} ${currency.toUpperCase()}`
}

function escStr(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/`/g, "\\`")
}

function generateBankCode(draft: BankDraft): string {
  const picks = draft.picks
    .map(
      (p) => `      {\n        bonusId: "${p.bonusId}",\n        takeaway:\n          "${escStr(p.takeaway)}",\n      },`,
    )
    .join("\n")
  return `  {
    monthSlug: "${draft.monthSlug}",
    monthLabel: "${draft.monthLabel}",
    publishedDate: "${draft.publishedDate}",${draft.videoId ? `\n    videoId: "${draft.videoId}",` : ""}
    intro:
      "${escStr(draft.intro)}",
    picks: [
${picks}
    ],
  },`
}

function generateCardCode(draft: CardDraft): string {
  const picks = draft.picks
    .map(
      (p) => `      {\n        cardId: "${p.cardId}",\n        takeaway:\n          "${escStr(p.takeaway)}",\n      },`,
    )
    .join("\n")
  return `  {
    monthSlug: "${draft.monthSlug}",
    monthLabel: "${draft.monthLabel}",
    publishedDate: "${draft.publishedDate}",${draft.videoId ? `\n    videoId: "${draft.videoId}",` : ""}
    intro:
      "${escStr(draft.intro)}",
    picks: [
${picks}
    ],
  },`
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      style={{
        padding: "8px 16px",
        fontSize: 13,
        fontWeight: 700,
        background: copied ? "#0d7c5f" : "#111",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
      }}
    >
      {copied ? "Copied!" : "Copy code"}
    </button>
  )
}

function PickRow({
  label,
  takeaway,
  rank,
  onRemove,
  onTakeaway,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  label: string
  takeaway: string
  rank: number
  onRemove: () => void
  onTakeaway: (v: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <div
      style={{
        border: "1px solid #e8e8e8",
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: "#fafafa",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: rank === 1 ? "#0d7c5f" : "#eee",
            color: rank === 1 ? "#fff" : "#666",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          #{rank}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#111", flex: 1 }}>{label}</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            style={{
              padding: "2px 7px",
              fontSize: 13,
              background: "transparent",
              border: "1px solid #ddd",
              borderRadius: 5,
              cursor: isFirst ? "default" : "pointer",
              color: isFirst ? "#ccc" : "#666",
            }}
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            style={{
              padding: "2px 7px",
              fontSize: 13,
              background: "transparent",
              border: "1px solid #ddd",
              borderRadius: 5,
              cursor: isLast ? "default" : "pointer",
              color: isLast ? "#ccc" : "#666",
            }}
          >
            ↓
          </button>
          <button
            onClick={onRemove}
            style={{
              padding: "2px 9px",
              fontSize: 13,
              background: "transparent",
              border: "1px solid #fca5a5",
              borderRadius: 5,
              cursor: "pointer",
              color: "#dc2626",
            }}
          >
            ✕
          </button>
        </div>
      </div>
      <div style={{ padding: "10px 14px" }}>
        <label style={{ fontSize: 11, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
          Why I picked it
        </label>
        <textarea
          value={takeaway}
          onChange={(e) => onTakeaway(e.target.value)}
          rows={2}
          placeholder="One-line reason in your voice..."
          style={{
            width: "100%",
            fontSize: 14,
            color: "#333",
            lineHeight: 1.5,
            border: "1px solid #e8e8e8",
            borderRadius: 6,
            padding: "8px 10px",
            resize: "vertical",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
      </div>
    </div>
  )
}

// ── Bank Bonuses Tab ──────────────────────────────────────────────────────────

function BankTab() {
  const initial = monthlyBankPicks[0]
  const [draft, setDraft] = useState<BankDraft>({
    monthSlug: initial?.monthSlug ?? "",
    monthLabel: initial?.monthLabel ?? "",
    publishedDate: initial?.publishedDate ?? "",
    videoId: initial?.videoId ?? "",
    intro: initial?.intro ?? "",
    picks: (initial?.picks ?? []).map((p) => ({ bonusId: p.bonusId, takeaway: p.takeaway })),
  })
  const [search, setSearch] = useState("")

  const allBonuses = useMemo(() => {
    const checking = (bonuses as any[])
      .filter((b) => !b.expired)
      .map((b) => ({
        id: b.id as string,
        label: `${b.bank_name.split("(")[0].trim()} — ${money(b.bonus_amount)} checking`,
        kind: "checking" as const,
        amount: b.bonus_amount as number,
      }))
    const savings = savingsBonuses
      .filter((b) => !b.expired)
      .map((b) => ({
        id: b.id,
        label: `${b.bank_name.split("(")[0].trim()} — ${money(b.tiers[b.tiers.length - 1].bonus_amount)} savings`,
        kind: "savings" as const,
        amount: b.tiers[b.tiers.length - 1].bonus_amount,
      }))
    return [...checking, ...savings].sort((a, b) => b.amount - a.amount)
  }, [])

  const selectedIds = new Set(draft.picks.map((p) => p.bonusId))

  const filtered = useMemo(() => {
    if (!search.trim()) return allBonuses
    const q = search.toLowerCase()
    return allBonuses.filter((b) => b.label.toLowerCase().includes(q))
  }, [allBonuses, search])

  function addPick(id: string, label: string) {
    if (selectedIds.has(id)) return
    setDraft((d) => ({ ...d, picks: [...d.picks, { bonusId: id, takeaway: "" }] }))
  }

  function removePick(idx: number) {
    setDraft((d) => ({ ...d, picks: d.picks.filter((_, i) => i !== idx) }))
  }

  function movePick(idx: number, dir: -1 | 1) {
    setDraft((d) => {
      const next = [...d.picks]
      const target = idx + dir
      if (target < 0 || target >= next.length) return d
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return { ...d, picks: next }
    })
  }

  function setTakeaway(idx: number, v: string) {
    setDraft((d) => {
      const next = [...d.picks]
      next[idx] = { ...next[idx], takeaway: v }
      return { ...d, picks: next }
    })
  }

  const code = generateBankCode(draft)
  const previewUrl = `/blog/best-bank-bonuses-${draft.monthSlug}`

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
      {/* Left: catalog browser */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>
          All bonuses ({allBonuses.length})
        </h3>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search bank or amount..."
          style={{
            width: "100%",
            padding: "9px 12px",
            fontSize: 13,
            border: "1px solid #e8e8e8",
            borderRadius: 8,
            marginBottom: 10,
            boxSizing: "border-box",
          }}
        />
        <div
          style={{
            maxHeight: 420,
            overflowY: "auto",
            border: "1px solid #f0f0f0",
            borderRadius: 10,
          }}
        >
          {filtered.map((b) => {
            const selected = selectedIds.has(b.id)
            return (
              <div
                key={b.id}
                onClick={() => !selected && addPick(b.id, b.label)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderBottom: "1px solid #f8f8f8",
                  cursor: selected ? "default" : "pointer",
                  background: selected ? "#f0faf5" : "transparent",
                  opacity: selected ? 0.6 : 1,
                }}
              >
                <span style={{ fontSize: 13, color: "#333" }}>{b.label}</span>
                {selected ? (
                  <span style={{ fontSize: 11, color: "#0d7c5f", fontWeight: 700 }}>Added</span>
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#0d7c5f",
                      fontWeight: 700,
                      background: "#e6f5f0",
                      padding: "2px 8px",
                      borderRadius: 999,
                    }}
                  >
                    + Add
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Right: picks + config */}
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Month slug</label>
            <input
              value={draft.monthSlug}
              onChange={(e) => setDraft((d) => ({ ...d, monthSlug: e.target.value }))}
              placeholder="june-2026"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Month label</label>
            <input
              value={draft.monthLabel}
              onChange={(e) => setDraft((d) => ({ ...d, monthLabel: e.target.value }))}
              placeholder="June 2026"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Publish date</label>
            <input
              value={draft.publishedDate}
              onChange={(e) => setDraft((d) => ({ ...d, publishedDate: e.target.value }))}
              placeholder="2026-06-09"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>YouTube video ID (optional)</label>
            <input
              value={draft.videoId}
              onChange={(e) => setDraft((d) => ({ ...d, videoId: e.target.value }))}
              placeholder="dQw4w9WgXcQ"
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Intro paragraph</label>
          <textarea
            value={draft.intro}
            onChange={(e) => setDraft((d) => ({ ...d, intro: e.target.value }))}
            rows={3}
            placeholder="These are the four bank account bonuses I'm prioritizing this month..."
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 10px" }}>
          Current picks ({draft.picks.length})
        </h3>
        {draft.picks.length === 0 && (
          <p style={{ fontSize: 13, color: "#bbb", marginBottom: 12 }}>
            Click a bonus from the left to add it.
          </p>
        )}
        {draft.picks.map((p, i) => {
          const meta = allBonuses.find((b) => b.id === p.bonusId)
          return (
            <PickRow
              key={p.bonusId}
              rank={i + 1}
              label={meta?.label ?? p.bonusId}
              takeaway={p.takeaway}
              onRemove={() => removePick(i)}
              onTakeaway={(v) => setTakeaway(i, v)}
              onMoveUp={() => movePick(i, -1)}
              onMoveDown={() => movePick(i, 1)}
              isFirst={i === 0}
              isLast={i === draft.picks.length - 1}
            />
          )
        })}

        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: "#f8f8f8",
            borderRadius: 10,
            border: "1px solid #eee",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>
              Code to paste into monthlyBankPicks.ts
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}
              >
                Preview page ↗
              </a>
              <CopyButton text={code} />
            </div>
          </div>
          <pre
            style={{
              margin: 0,
              fontSize: 11,
              color: "#444",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {code}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ── Credit Cards Tab ───────────────────────────────────────────────────────────

function CardsTab() {
  const initial = monthlyCardPicks[0]
  const [draft, setDraft] = useState<CardDraft>({
    monthSlug: initial?.monthSlug ?? "",
    monthLabel: initial?.monthLabel ?? "",
    publishedDate: initial?.publishedDate ?? "",
    videoId: initial?.videoId ?? "",
    intro: initial?.intro ?? "",
    picks: (initial?.picks ?? []).map((p) => ({ cardId: p.cardId, takeaway: p.takeaway })),
  })
  const [search, setSearch] = useState("")

  const allCards = useMemo(() => {
    return creditCardBonuses
      .filter((c) => !c.expired && c.bonus_amount > 0)
      .map((c) => ({
        id: c.id,
        label: `${c.card_name} — ${bonusLabel(c.bonus_amount, c.bonus_currency)} (${c.card_type})`,
        amount: c.bonus_amount,
        issuer: c.issuer,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [])

  const selectedIds = new Set(draft.picks.map((p) => p.cardId))

  const filtered = useMemo(() => {
    if (!search.trim()) return allCards
    const q = search.toLowerCase()
    return allCards.filter((c) => c.label.toLowerCase().includes(q) || c.issuer.toLowerCase().includes(q))
  }, [allCards, search])

  function addPick(id: string) {
    if (selectedIds.has(id)) return
    setDraft((d) => ({ ...d, picks: [...d.picks, { cardId: id, takeaway: "" }] }))
  }

  function removePick(idx: number) {
    setDraft((d) => ({ ...d, picks: d.picks.filter((_, i) => i !== idx) }))
  }

  function movePick(idx: number, dir: -1 | 1) {
    setDraft((d) => {
      const next = [...d.picks]
      const target = idx + dir
      if (target < 0 || target >= next.length) return d
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return { ...d, picks: next }
    })
  }

  function setTakeaway(idx: number, v: string) {
    setDraft((d) => {
      const next = [...d.picks]
      next[idx] = { ...next[idx], takeaway: v }
      return { ...d, picks: next }
    })
  }

  const code = generateCardCode(draft)
  const previewUrl = `/blog/best-credit-cards-${draft.monthSlug}`

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
      {/* Left: catalog browser */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>
          All cards ({allCards.length})
        </h3>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search card or issuer..."
          style={{
            width: "100%",
            padding: "9px 12px",
            fontSize: 13,
            border: "1px solid #e8e8e8",
            borderRadius: 8,
            marginBottom: 10,
            boxSizing: "border-box",
          }}
        />
        <div
          style={{
            maxHeight: 420,
            overflowY: "auto",
            border: "1px solid #f0f0f0",
            borderRadius: 10,
          }}
        >
          {filtered.map((c) => {
            const selected = selectedIds.has(c.id)
            return (
              <div
                key={c.id}
                onClick={() => !selected && addPick(c.id)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderBottom: "1px solid #f8f8f8",
                  cursor: selected ? "default" : "pointer",
                  background: selected ? "#f0faf5" : "transparent",
                  opacity: selected ? 0.6 : 1,
                }}
              >
                <span style={{ fontSize: 13, color: "#333" }}>{c.label}</span>
                {selected ? (
                  <span style={{ fontSize: 11, color: "#0d7c5f", fontWeight: 700 }}>Added</span>
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#0d7c5f",
                      fontWeight: 700,
                      background: "#e6f5f0",
                      padding: "2px 8px",
                      borderRadius: 999,
                    }}
                  >
                    + Add
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Right: picks + config */}
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Month slug</label>
            <input
              value={draft.monthSlug}
              onChange={(e) => setDraft((d) => ({ ...d, monthSlug: e.target.value }))}
              placeholder="june-2026"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Month label</label>
            <input
              value={draft.monthLabel}
              onChange={(e) => setDraft((d) => ({ ...d, monthLabel: e.target.value }))}
              placeholder="June 2026"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Publish date</label>
            <input
              value={draft.publishedDate}
              onChange={(e) => setDraft((d) => ({ ...d, publishedDate: e.target.value }))}
              placeholder="2026-06-09"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>YouTube video ID (optional)</label>
            <input
              value={draft.videoId}
              onChange={(e) => setDraft((d) => ({ ...d, videoId: e.target.value }))}
              placeholder="dQw4w9WgXcQ"
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Intro paragraph</label>
          <textarea
            value={draft.intro}
            onChange={(e) => setDraft((d) => ({ ...d, intro: e.target.value }))}
            rows={3}
            placeholder="These are the credit cards I'm recommending this month..."
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 10px" }}>
          Current picks ({draft.picks.length})
        </h3>
        {draft.picks.length === 0 && (
          <p style={{ fontSize: 13, color: "#bbb", marginBottom: 12 }}>
            Click a card from the left to add it.
          </p>
        )}
        {draft.picks.map((p, i) => {
          const meta = allCards.find((c) => c.id === p.cardId)
          return (
            <PickRow
              key={p.cardId}
              rank={i + 1}
              label={meta?.label ?? p.cardId}
              takeaway={p.takeaway}
              onRemove={() => removePick(i)}
              onTakeaway={(v) => setTakeaway(i, v)}
              onMoveUp={() => movePick(i, -1)}
              onMoveDown={() => movePick(i, 1)}
              isFirst={i === 0}
              isLast={i === draft.picks.length - 1}
            />
          )
        })}

        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: "#f8f8f8",
            borderRadius: 10,
            border: "1px solid #eee",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>
              Code to paste into monthlyCardPicks.ts
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}
              >
                Preview page ↗
              </a>
              <CopyButton text={code} />
            </div>
          </div>
          <pre
            style={{
              margin: 0,
              fontSize: 11,
              color: "#444",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {code}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#aaa",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  color: "#333",
  border: "1px solid #e8e8e8",
  borderRadius: 6,
  fontFamily: "inherit",
  boxSizing: "border-box",
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function BlogPostsAdminPage() {
  const supabase = createClient()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<"bank" | "cards">("bank")

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(data.user?.email === "booth.nathaniel@gmail.com")
    })
  }, [])

  if (authed === null) {
    return (
      <div style={{ padding: 40, fontFamily: "sans-serif", color: "#999" }}>Checking auth…</div>
    )
  }
  if (!authed) {
    return (
      <div style={{ padding: 40, fontFamily: "sans-serif", color: "#dc2626" }}>
        Not authorized.
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh", background: "#fafafa" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px 32px",
          borderBottom: "1px solid #eee",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <a href="/admin" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>
          ← Admin
        </a>
        <span style={{ color: "#ddd" }}>|</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>Blog Posts</span>
        <span
          style={{
            fontSize: 11,
            color: "#888",
            background: "#f0f0f0",
            padding: "2px 8px",
            borderRadius: 999,
          }}
        >
          Pick catalog items → copy code → paste into data file → deploy
        </span>
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 32px", background: "#fff", borderBottom: "1px solid #eee" }}>
        {(["bank", "cards"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "14px 20px",
              fontSize: 14,
              fontWeight: tab === t ? 700 : 400,
              color: tab === t ? "#0d7c5f" : "#999",
              background: "transparent",
              border: "none",
              borderBottom: tab === t ? "2px solid #0d7c5f" : "2px solid transparent",
              cursor: "pointer",
              marginRight: 8,
            }}
          >
            {t === "bank" ? "Bank Bonuses" : "Credit Cards"}
          </button>
        ))}
      </div>

      {/* Workflow hint */}
      <div
        style={{
          margin: "16px 32px 0",
          padding: "12px 16px",
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: 8,
          fontSize: 13,
          color: "#92400e",
        }}
      >
        <strong>How to publish:</strong> Pick bonuses below and write takeaways → click{" "}
        <strong>Copy code</strong> → open{" "}
        <code style={{ fontFamily: "monospace" }}>
          {tab === "bank" ? "lib/data/monthlyBankPicks.ts" : "lib/data/monthlyCardPicks.ts"}
        </code>{" "}
        → paste the entry at the top of the <code style={{ fontFamily: "monospace" }}>monthly{tab === "bank" ? "Bank" : "Card"}Picks</code> array → deploy. For a new month, also copy{" "}
        <code style={{ fontFamily: "monospace" }}>
          app/blog/best-{tab === "bank" ? "bank-bonuses" : "credit-cards"}-june-2026/page.tsx
        </code>{" "}
        and update the slug.
      </div>

      {/* Body */}
      <div style={{ padding: "24px 32px 60px" }}>
        {tab === "bank" ? <BankTab /> : <CardsTab />}
      </div>
    </div>
  )
}
