"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { bonuses } from "@/lib/data/bonuses"
import { savingsBonuses } from "@/lib/data/savingsBonuses"
import { creditCardBonuses } from "@/lib/data/creditCardBonuses"
import { monthlyBankPicks } from "@/lib/data/monthlyBankPicks"
import { monthlyCardPicks } from "@/lib/data/monthlyCardPicks"
import { getPostByBonusId } from "@/lib/data/blogPosts"

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

// ── Sub-components ────────────────────────────────────────────────────────────

function SaveBar({
  saved,
  saving,
  error,
  onSave,
  previewUrl,
}: {
  saved: boolean
  saving: boolean
  error: string | null
  onSave: () => void
  previewUrl: string
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        background: saved ? "#f0faf5" : "#fff",
        border: `1px solid ${saved ? "#a7f3d0" : "#e8e8e8"}`,
        borderRadius: 10,
        marginBottom: 16,
      }}
    >
      <button
        onClick={onSave}
        disabled={saving}
        style={{
          padding: "9px 20px",
          fontSize: 14,
          fontWeight: 700,
          background: saving ? "#aaa" : "#0d7c5f",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: saving ? "default" : "pointer",
        }}
      >
        {saving ? "Saving…" : "Save"}
      </button>
      {saved && (
        <span style={{ fontSize: 13, color: "#0d7c5f", fontWeight: 600 }}>
          Saved — blog page will reflect these picks on next load
        </span>
      )}
      {error && <span style={{ fontSize: 13, color: "#dc2626" }}>{error}</span>}
      <a
        href={previewUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          marginLeft: "auto",
          fontSize: 13,
          color: "#0d7c5f",
          textDecoration: "none",
          fontWeight: 600,
          border: "1px solid #a7f3d0",
          padding: "6px 14px",
          borderRadius: 7,
        }}
      >
        View article ↗
      </a>
    </div>
  )
}

function PickRow({
  label,
  takeaway,
  rank,
  articleSlug,
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
  articleSlug?: string
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
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {articleSlug && (
            <a
              href={`/blog/${articleSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Open article"
              style={{
                padding: "2px 9px",
                fontSize: 12,
                background: "#e6f5f0",
                border: "1px solid #a7f3d0",
                borderRadius: 5,
                cursor: "pointer",
                color: "#0d7c5f",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              ↗
            </a>
          )}
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
        <label
          style={{
            fontSize: 11,
            color: "#aaa",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            display: "block",
            marginBottom: 4,
          }}
        >
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

// ── Shared styles ─────────────────────────────────────────────────────────────

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

// ── Bank Bonuses Tab ──────────────────────────────────────────────────────────

function BankTab({ supabase }: { supabase: ReturnType<typeof createClient> }) {
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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [dbLoaded, setDbLoaded] = useState(false)

  // Load from DB on mount
  useEffect(() => {
    supabase
      .from("monthly_bank_picks")
      .select("*")
      .eq("month_slug", draft.monthSlug)
      .single()
      .then(({ data }) => {
        if (data) {
          setDraft({
            monthSlug: data.month_slug,
            monthLabel: data.month_label,
            publishedDate: data.published_date,
            videoId: data.video_id ?? "",
            intro: data.intro,
            picks: data.picks,
          })
          setDbLoaded(true)
        }
      })
  }, [])

  const allBonuses = useMemo(() => {
    const checking = (bonuses as any[])
      .filter((b) => !b.expired)
      .map((b) => ({
        id: b.id as string,
        label: `${b.bank_name.split("(")[0].trim()} — ${money(b.bonus_amount)}${b.business ? " (business)" : ""} checking`,
        amount: b.bonus_amount as number,
      }))
    const savings = savingsBonuses
      .filter((b) => !b.expired)
      .map((b) => ({
        id: b.id,
        label: `${b.bank_name.split("(")[0].trim()} — ${money(b.tiers[b.tiers.length - 1].bonus_amount)} savings`,
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

  function addPick(id: string) {
    if (selectedIds.has(id)) return
    setDraft((d) => ({ ...d, picks: [...d.picks, { bonusId: id, takeaway: "" }] }))
    setSaved(false)
  }

  function removePick(idx: number) {
    setDraft((d) => ({ ...d, picks: d.picks.filter((_, i) => i !== idx) }))
    setSaved(false)
  }

  function movePick(idx: number, dir: -1 | 1) {
    setDraft((d) => {
      const next = [...d.picks]
      const target = idx + dir
      if (target < 0 || target >= next.length) return d
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return { ...d, picks: next }
    })
    setSaved(false)
  }

  function setTakeaway(idx: number, v: string) {
    setDraft((d) => {
      const next = [...d.picks]
      next[idx] = { ...next[idx], takeaway: v }
      return { ...d, picks: next }
    })
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase.from("monthly_bank_picks").upsert({
      month_slug: draft.monthSlug,
      month_label: draft.monthLabel,
      published_date: draft.publishedDate,
      video_id: draft.videoId || null,
      intro: draft.intro,
      picks: draft.picks,
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    if (error) {
      setSaveError(error.message)
    } else {
      setSaved(true)
    }
  }

  const previewUrl = `/blog/best-bank-bonuses-${draft.monthSlug}`

  return (
    <div>
      {dbLoaded && (
        <div
          style={{
            marginBottom: 12,
            fontSize: 12,
            color: "#0d7c5f",
            background: "#f0faf5",
            border: "1px solid #a7f3d0",
            padding: "6px 12px",
            borderRadius: 6,
            display: "inline-block",
          }}
        >
          Loaded saved picks from database
        </div>
      )}

      <SaveBar
        saved={saved}
        saving={saving}
        error={saveError}
        onSave={save}
        previewUrl={previewUrl}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        {/* Left: catalog */}
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>
            All bonuses ({allBonuses.length})
          </h3>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bank or amount…"
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
              maxHeight: 440,
              overflowY: "auto",
              border: "1px solid #f0f0f0",
              borderRadius: 10,
            }}
          >
            {filtered.map((b) => {
              const selected = selectedIds.has(b.id)
              const post = getPostByBonusId(b.id)
              return (
                <div
                  key={b.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderBottom: "1px solid #f8f8f8",
                    background: selected ? "#f0faf5" : "transparent",
                  }}
                >
                  <span
                    onClick={() => !selected && addPick(b.id)}
                    style={{
                      fontSize: 13,
                      color: "#333",
                      flex: 1,
                      cursor: selected ? "default" : "pointer",
                      opacity: selected ? 0.5 : 1,
                    }}
                  >
                    {b.label}
                  </span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    {post && (
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open article"
                        style={{
                          fontSize: 11,
                          color: "#0d7c5f",
                          textDecoration: "none",
                          padding: "2px 7px",
                          border: "1px solid #a7f3d0",
                          borderRadius: 4,
                        }}
                      >
                        ↗
                      </a>
                    )}
                    {selected ? (
                      <span style={{ fontSize: 11, color: "#0d7c5f", fontWeight: 700 }}>Added</span>
                    ) : (
                      <span
                        onClick={() => addPick(b.id)}
                        style={{
                          fontSize: 11,
                          color: "#0d7c5f",
                          fontWeight: 700,
                          background: "#e6f5f0",
                          padding: "2px 8px",
                          borderRadius: 999,
                          cursor: "pointer",
                        }}
                      >
                        + Add
                      </span>
                    )}
                  </div>
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
                onChange={(e) => { setDraft((d) => ({ ...d, monthSlug: e.target.value })); setSaved(false) }}
                placeholder="june-2026"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Month label</label>
              <input
                value={draft.monthLabel}
                onChange={(e) => { setDraft((d) => ({ ...d, monthLabel: e.target.value })); setSaved(false) }}
                placeholder="June 2026"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Publish date</label>
              <input
                value={draft.publishedDate}
                onChange={(e) => { setDraft((d) => ({ ...d, publishedDate: e.target.value })); setSaved(false) }}
                placeholder="2026-06-09"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>YouTube video ID (optional)</label>
              <input
                value={draft.videoId}
                onChange={(e) => { setDraft((d) => ({ ...d, videoId: e.target.value })); setSaved(false) }}
                placeholder="dQw4w9WgXcQ"
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Intro paragraph</label>
            <textarea
              value={draft.intro}
              onChange={(e) => { setDraft((d) => ({ ...d, intro: e.target.value })); setSaved(false) }}
              rows={3}
              placeholder="These are the four bank account bonuses I'm prioritizing this month…"
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
            const post = getPostByBonusId(p.bonusId)
            return (
              <PickRow
                key={p.bonusId}
                rank={i + 1}
                label={meta?.label ?? p.bonusId}
                takeaway={p.takeaway}
                articleSlug={post?.slug}
                onRemove={() => removePick(i)}
                onTakeaway={(v) => setTakeaway(i, v)}
                onMoveUp={() => movePick(i, -1)}
                onMoveDown={() => movePick(i, 1)}
                isFirst={i === 0}
                isLast={i === draft.picks.length - 1}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Credit Cards Tab ──────────────────────────────────────────────────────────

function CardsTab({ supabase }: { supabase: ReturnType<typeof createClient> }) {
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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [dbLoaded, setDbLoaded] = useState(false)

  // Load from DB on mount
  useEffect(() => {
    supabase
      .from("monthly_card_picks")
      .select("*")
      .eq("month_slug", draft.monthSlug)
      .single()
      .then(({ data }) => {
        if (data) {
          setDraft({
            monthSlug: data.month_slug,
            monthLabel: data.month_label,
            publishedDate: data.published_date,
            videoId: data.video_id ?? "",
            intro: data.intro,
            picks: data.picks,
          })
          setDbLoaded(true)
        }
      })
  }, [])

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
    return allCards.filter(
      (c) => c.label.toLowerCase().includes(q) || c.issuer.toLowerCase().includes(q),
    )
  }, [allCards, search])

  function addPick(id: string) {
    if (selectedIds.has(id)) return
    setDraft((d) => ({ ...d, picks: [...d.picks, { cardId: id, takeaway: "" }] }))
    setSaved(false)
  }

  function removePick(idx: number) {
    setDraft((d) => ({ ...d, picks: d.picks.filter((_, i) => i !== idx) }))
    setSaved(false)
  }

  function movePick(idx: number, dir: -1 | 1) {
    setDraft((d) => {
      const next = [...d.picks]
      const target = idx + dir
      if (target < 0 || target >= next.length) return d
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return { ...d, picks: next }
    })
    setSaved(false)
  }

  function setTakeaway(idx: number, v: string) {
    setDraft((d) => {
      const next = [...d.picks]
      next[idx] = { ...next[idx], takeaway: v }
      return { ...d, picks: next }
    })
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase.from("monthly_card_picks").upsert({
      month_slug: draft.monthSlug,
      month_label: draft.monthLabel,
      published_date: draft.publishedDate,
      video_id: draft.videoId || null,
      intro: draft.intro,
      picks: draft.picks,
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    if (error) {
      setSaveError(error.message)
    } else {
      setSaved(true)
    }
  }

  const previewUrl = `/blog/best-credit-cards-${draft.monthSlug}`

  return (
    <div>
      {dbLoaded && (
        <div
          style={{
            marginBottom: 12,
            fontSize: 12,
            color: "#0d7c5f",
            background: "#f0faf5",
            border: "1px solid #a7f3d0",
            padding: "6px 12px",
            borderRadius: 6,
            display: "inline-block",
          }}
        >
          Loaded saved picks from database
        </div>
      )}

      <SaveBar
        saved={saved}
        saving={saving}
        error={saveError}
        onSave={save}
        previewUrl={previewUrl}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        {/* Left: catalog */}
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>
            All cards ({allCards.length})
          </h3>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search card or issuer…"
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
              maxHeight: 440,
              overflowY: "auto",
              border: "1px solid #f0f0f0",
              borderRadius: 10,
            }}
          >
            {filtered.map((c) => {
              const selected = selectedIds.has(c.id)
              const post = getPostByBonusId(c.id)
              return (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderBottom: "1px solid #f8f8f8",
                    background: selected ? "#f0faf5" : "transparent",
                  }}
                >
                  <span
                    onClick={() => !selected && addPick(c.id)}
                    style={{
                      fontSize: 13,
                      color: "#333",
                      flex: 1,
                      cursor: selected ? "default" : "pointer",
                      opacity: selected ? 0.5 : 1,
                    }}
                  >
                    {c.label}
                  </span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    {post && (
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open article"
                        style={{
                          fontSize: 11,
                          color: "#0d7c5f",
                          textDecoration: "none",
                          padding: "2px 7px",
                          border: "1px solid #a7f3d0",
                          borderRadius: 4,
                        }}
                      >
                        ↗
                      </a>
                    )}
                    {selected ? (
                      <span style={{ fontSize: 11, color: "#0d7c5f", fontWeight: 700 }}>Added</span>
                    ) : (
                      <span
                        onClick={() => addPick(c.id)}
                        style={{
                          fontSize: 11,
                          color: "#0d7c5f",
                          fontWeight: 700,
                          background: "#e6f5f0",
                          padding: "2px 8px",
                          borderRadius: 999,
                          cursor: "pointer",
                        }}
                      >
                        + Add
                      </span>
                    )}
                  </div>
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
                onChange={(e) => { setDraft((d) => ({ ...d, monthSlug: e.target.value })); setSaved(false) }}
                placeholder="june-2026"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Month label</label>
              <input
                value={draft.monthLabel}
                onChange={(e) => { setDraft((d) => ({ ...d, monthLabel: e.target.value })); setSaved(false) }}
                placeholder="June 2026"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Publish date</label>
              <input
                value={draft.publishedDate}
                onChange={(e) => { setDraft((d) => ({ ...d, publishedDate: e.target.value })); setSaved(false) }}
                placeholder="2026-06-09"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>YouTube video ID (optional)</label>
              <input
                value={draft.videoId}
                onChange={(e) => { setDraft((d) => ({ ...d, videoId: e.target.value })); setSaved(false) }}
                placeholder="dQw4w9WgXcQ"
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Intro paragraph</label>
            <textarea
              value={draft.intro}
              onChange={(e) => { setDraft((d) => ({ ...d, intro: e.target.value })); setSaved(false) }}
              rows={3}
              placeholder="These are the credit cards I'm recommending this month…"
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
            const post = getPostByBonusId(p.cardId)
            return (
              <PickRow
                key={p.cardId}
                rank={i + 1}
                label={meta?.label ?? p.cardId}
                takeaway={p.takeaway}
                articleSlug={post?.slug}
                onRemove={() => removePick(i)}
                onTakeaway={(v) => setTakeaway(i, v)}
                onMoveUp={() => movePick(i, -1)}
                onMoveDown={() => movePick(i, 1)}
                isFirst={i === 0}
                isLast={i === draft.picks.length - 1}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

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
    return <div style={{ padding: 40, fontFamily: "sans-serif", color: "#999" }}>Checking auth…</div>
  }
  if (!authed) {
    return <div style={{ padding: 40, fontFamily: "sans-serif", color: "#dc2626" }}>Not authorized.</div>
  }

  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh", background: "#fafafa" }}>
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
      </div>

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

      <div style={{ padding: "24px 32px 60px" }}>
        {tab === "bank" ? (
          <BankTab supabase={supabase} />
        ) : (
          <CardsTab supabase={supabase} />
        )}
      </div>
    </div>
  )
}
