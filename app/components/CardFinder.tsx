"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { US_STATES, TRANSFER_PROGRAMS, findTransferProgram } from "../../lib/data/catalogTaxonomy"
import type { CreditCardBonus } from "../../lib/data/creditCardBonuses"
import {
  rankByIntroApr,
  balanceTransferCost,
  introAprSummary,
  type IntroAprMode,
} from "../../lib/data/introApr"
import {
  SPEND_BUCKETS,
  rankCardsForSpend,
  signupYearOneValue,
  type SpendInput,
  type RankMode,
} from "../../lib/data/cardSpendValue"
import {
  rankByTravelValue,
  travelPerkValue,
  travelSummary,
  type TravelMode,
} from "../../lib/data/travelValue"

/**
 * "Choose your own adventure" credit-card finder.
 *
 *  Path A — Best sign-up offers: cards ranked by year-one signup value.
 *  Path B — Best card for my daily spend: enter monthly spend, rank cards by
 *           the ongoing rewards they'd actually earn you.
 *
 * Credit cards are nationwide, so there's no state gate here — the state cross-
 * sell (bank bonuses by state) lives below in the page, where it's honest.
 */

type Path = "signup" | "spend" | "apr" | "travel"

const ZERO_SPEND: SpendInput = { groceries: 0, gas: 0, dining: 0, travel: 0, online: 0, other: 0 }

// A representative starting profile so the calculator shows something useful
// before the user touches anything.
const SAMPLE_SPEND: SpendInput = { groceries: 600, gas: 150, dining: 300, travel: 200, online: 150, other: 800 }

export default function CardFinder({ cards }: { cards: CreditCardBonus[] }) {
  const [path, setPath] = useState<Path | null>(null)
  const [spend, setSpend] = useState<SpendInput>(SAMPLE_SPEND)
  const [mode, setMode] = useState<RankMode>("ongoing")
  const [stateSlug, setStateSlug] = useState<string>("")
  const [aprMode, setAprMode] = useState<IntroAprMode>("balance_transfer")
  const [balance, setBalance] = useState<number>(5000)
  const [travelMode, setTravelMode] = useState<TravelMode>("perks")
  const [travelProgram, setTravelProgram] = useState<string>("")

  const totalMonthly = Object.values(spend).reduce((a, b) => a + (b || 0), 0)

  const signupRanked = useMemo(
    () =>
      cards
        .filter(c => !c.expired)
        .map(c => ({ card: c, value: signupYearOneValue(c) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 12),
    [cards],
  )

  const spendRanked = useMemo(
    () => rankCardsForSpend(cards, spend, mode).slice(0, 12),
    [cards, spend, mode],
  )

  const aprRanked = useMemo(
    () => rankByIntroApr(cards, aprMode).slice(0, 12),
    [cards, aprMode],
  )

  const travelRanked = useMemo(
    () => rankByTravelValue(cards, travelMode, travelProgram || undefined).slice(0, 12),
    [cards, travelMode, travelProgram],
  )
  const selectedProgram = travelProgram ? findTransferProgram(travelProgram) : null

  return (
    <div style={{ marginBottom: 48 }}>
      {/* ── Four-path chooser ────────────────────────────────────────── */}
      <div className="cf-paths" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <PathCard
          active={path === "signup"}
          emoji="🎯"
          title="Best sign-up offers"
          sub="Biggest year-one payout — points, credits, minus the fee."
          onClick={() => setPath("signup")}
        />
        <PathCard
          active={path === "spend"}
          emoji="🛒"
          title="Best card for my daily spend"
          sub="Tell us what you spend, we rank cards by what they'd earn you."
          onClick={() => setPath("spend")}
        />
        <PathCard
          active={path === "travel"}
          emoji="✈️"
          title="Best card for award travel"
          sub="Ranked by transfer partners, travel credits & perks — not earn rate."
          onClick={() => setPath("travel")}
        />
        <PathCard
          active={path === "apr"}
          emoji="🧯"
          title="Best 0% APR / balance transfer"
          sub="Most interest-free runway for a balance or a big purchase."
          onClick={() => setPath("apr")}
        />
      </div>

      {path === "signup" && (
        <ResultBlock
          heading="Top sign-up offers, ranked by year-one value"
          note="Year-one value = signup points × point value + first-year statement credits − annual fee."
        >
          {signupRanked.map(({ card, value }, i) => (
            <CardRow
              key={card.id}
              rank={i + 1}
              card={card}
              primary={`$${value.toLocaleString()}`}
              primaryLabel="year-one value"
              secondary={`${bonusLabel(card)} after $${card.min_spend.toLocaleString()} in ${card.spend_months}mo`}
            />
          ))}
        </ResultBlock>
      )}

      {path === "spend" && (
        <div style={{ marginTop: 24 }}>
          {/* spend inputs */}
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 4 }}>
              Your monthly spend
            </div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
              Rough numbers are fine. We&apos;ll rank cards by the rewards you&apos;d actually earn.
            </div>
            <div className="cf-spend-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {SPEND_BUCKETS.map(b => (
                <label key={b.key} style={{ display: "block" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#444" }}>{b.label}</div>
                  <div style={{ fontSize: 10, color: "#aaa", marginBottom: 4 }}>{b.hint}</div>
                  <div style={{ display: "flex", alignItems: "center", border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 10px", background: "#fafafa" }}>
                    <span style={{ fontSize: 13, color: "#999" }}>$</span>
                    <input
                      type="number"
                      min={0}
                      value={spend[b.key] || ""}
                      onChange={e => setSpend(s => ({ ...s, [b.key]: e.target.value ? Number(e.target.value) : 0 } as SpendInput))}
                      placeholder="0"
                      style={{ border: "none", outline: "none", background: "transparent", padding: "9px 6px", fontSize: 14, color: "#111", width: "100%" }}
                    />
                    <span style={{ fontSize: 11, color: "#bbb" }}>/mo</span>
                  </div>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 16 }}>
              <div style={{ fontSize: 12, color: "#666" }}>
                ${totalMonthly.toLocaleString()}/mo · ${(totalMonthly * 12).toLocaleString()}/yr total
                {" · "}
                <button onClick={() => setSpend(ZERO_SPEND)} style={linkBtn}>clear</button>
                {" · "}
                <button onClick={() => setSpend(SAMPLE_SPEND)} style={linkBtn}>reset to example</button>
              </div>
              <div style={{ display: "inline-flex", border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden" }}>
                <ModeTab active={mode === "ongoing"} onClick={() => setMode("ongoing")}>Best long-term keeper</ModeTab>
                <ModeTab active={mode === "first_year"} onClick={() => setMode("first_year")}>Best first year (with bonus)</ModeTab>
              </div>
            </div>
          </div>

          <ResultBlock
            heading={mode === "first_year" ? "Best first-year total for your spend" : "Best long-term keeper for your spend"}
            note={
              mode === "first_year"
                ? "Ranked by signup value + ongoing rewards − annual fee. Great for the year you open it."
                : "Ranked by ongoing rewards − annual fee. The card worth keeping after the bonus is gone."
            }
          >
            {totalMonthly === 0 ? (
              <div style={{ fontSize: 14, color: "#666", padding: "12px 2px" }}>
                Enter some spend above to see your ranking.
              </div>
            ) : (
              spendRanked.map((e, i) => {
                const topBuckets = SPEND_BUCKETS
                  .map(b => ({ label: b.label, val: e.breakdown[b.key] }))
                  .filter(x => x.val > 0)
                  .sort((a, b) => b.val - a.val)
                  .slice(0, 2)
                  .map(x => `$${x.val.toLocaleString()} ${x.label.toLowerCase()}`)
                  .join(" · ")
                const headline = mode === "first_year" ? e.netAnnual + e.signupValue : e.netAnnual
                return (
                  <CardRow
                    key={e.card.id}
                    rank={i + 1}
                    card={e.card}
                    primary={`$${headline.toLocaleString()}`}
                    primaryLabel={mode === "first_year" ? "first-year total" : "net rewards/yr"}
                    secondary={
                      mode === "first_year"
                        ? `$${e.signupValue.toLocaleString()} signup + $${e.netAnnual.toLocaleString()}/yr rewards${topBuckets ? ` · ${topBuckets}` : ""}`
                        : `$${e.annualRewards.toLocaleString()} rewards${e.card.annual_fee ? ` − $${e.card.annual_fee} fee` : ""}${topBuckets ? ` · ${topBuckets}` : ""}`
                    }
                  />
                )
              })
            )}
          </ResultBlock>
        </div>
      )}

      {path === "apr" && (
        <div style={{ marginTop: 24 }}>
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: 20, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ display: "inline-flex", border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden" }}>
              <ModeTab active={aprMode === "balance_transfer"} onClick={() => setAprMode("balance_transfer")}>Balance transfer</ModeTab>
              <ModeTab active={aprMode === "purchases"} onClick={() => setAprMode("purchases")}>New purchase</ModeTab>
            </div>
            {aprMode === "balance_transfer" && (
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#444" }}>
                Balance to move
                <span style={{ display: "inline-flex", alignItems: "center", border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 10px", background: "#fafafa" }}>
                  <span style={{ fontSize: 13, color: "#999" }}>$</span>
                  <input
                    type="number"
                    min={0}
                    value={balance || ""}
                    onChange={e => setBalance(e.target.value ? Number(e.target.value) : 0)}
                    placeholder="5000"
                    style={{ border: "none", outline: "none", background: "transparent", padding: "9px 6px", fontSize: 14, color: "#111", width: 90 }}
                  />
                </span>
              </label>
            )}
          </div>

          <ResultBlock
            heading={aprMode === "balance_transfer" ? "Longest 0% balance-transfer windows" : "Longest 0% purchase windows"}
            note={
              aprMode === "balance_transfer"
                ? "Ranked by months of 0% APR on transfers, then lowest transfer fee. The runway to pay down a balance interest-free."
                : "Ranked by months of 0% APR on new purchases. Spread a big purchase out without interest."
            }
          >
            {aprRanked.length === 0 ? (
              <div style={{ background: "#fff", border: "1px dashed #e8e8e8", borderRadius: 12, padding: 24, fontSize: 14, color: "#666", lineHeight: 1.6 }}>
                <strong style={{ color: "#111" }}>No 0% APR offers captured yet.</strong> We&apos;re
                researching intro-APR terms card by card — this list lights up as the data lands.
              </div>
            ) : (
              aprRanked.map((c, i) => {
                const cost = balanceTransferCost(c, balance)
                return (
                  <CardRow
                    key={c.id}
                    rank={i + 1}
                    card={c}
                    primary={`${(aprMode === "balance_transfer" ? c.intro_apr?.bt_apr_months : c.intro_apr?.purchase_apr_months) ?? 0}mo`}
                    primaryLabel="0% APR"
                    secondary={
                      aprMode === "balance_transfer" && cost != null
                        ? `${introAprSummary(c, aprMode)} · ~$${cost.toLocaleString()} to move $${balance.toLocaleString()}`
                        : introAprSummary(c, aprMode)
                    }
                  />
                )
              })
            )}
          </ResultBlock>
        </div>
      )}

      {path === "travel" && (
        <div style={{ marginTop: 24 }}>
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: 20, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ display: "inline-flex", border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden" }}>
              <ModeTab active={travelMode === "perks"} onClick={() => setTravelMode("perks")}>Most travel perks</ModeTab>
              <ModeTab active={travelMode === "transfer"} onClick={() => setTravelMode("transfer")}>Best transfer value</ModeTab>
            </div>
            {travelMode === "transfer" && (
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#444" }}>
                Collecting a program?
                <select
                  value={travelProgram}
                  onChange={e => setTravelProgram(e.target.value)}
                  style={{ padding: "9px 12px", fontSize: 13, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fafafa", color: "#111", minWidth: 190 }}
                >
                  <option value="">Any transfer partner</option>
                  <optgroup label="Airlines">
                    {TRANSFER_PROGRAMS.filter(p => p.kind === "airline").map(p => (
                      <option key={p.slug} value={p.slug}>{p.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Hotels">
                    {TRANSFER_PROGRAMS.filter(p => p.kind === "hotel").map(p => (
                      <option key={p.slug} value={p.slug}>{p.name}</option>
                    ))}
                  </optgroup>
                </select>
              </label>
            )}
          </div>

          <ResultBlock
            heading={
              travelMode === "perks"
                ? "Most annual travel value"
                : selectedProgram
                  ? `Best cards for ${selectedProgram.name}`
                  : "Best transfer-partner value"
            }
            note={
              travelMode === "perks"
                ? "Ranked by hard-dollar travel credits, free-night certs, lounge access & Global Entry — the value you get whether or not you chase award redemptions."
                : selectedProgram
                  ? `Cards whose points transfer into ${selectedProgram.name}, ranked by redemption value. The fastest way to bank the currency you're collecting.`
                  : "Ranked by best realistic redemption (cents per point) through airline & hotel transfer partners. Where points cards pull ahead of cashback."
            }
          >
            {travelRanked.length === 0 ? (
              <div style={{ background: "#fff", border: "1px dashed #e8e8e8", borderRadius: 12, padding: 24, fontSize: 14, color: "#666", lineHeight: 1.6 }}>
                {selectedProgram ? (
                  <>
                    <strong style={{ color: "#111" }}>No cards mapped to {selectedProgram.name} yet.</strong>{" "}
                    We&apos;re filling in transfer partners card by card — this lights up as the data lands.
                    Try &ldquo;Any transfer partner&rdquo; in the meantime.
                  </>
                ) : (
                  <>
                    <strong style={{ color: "#111" }}>No award-travel data captured yet.</strong> We&apos;re
                    researching transfer partners, travel credits &amp; perks card by card — this list lights
                    up as the data lands.
                  </>
                )}
              </div>
            ) : (
              travelRanked.map((c, i) => {
                const perk = travelPerkValue(c.travel!)
                const cpp = c.travel?.max_transfer_cpp ?? 0
                return (
                  <CardRow
                    key={c.id}
                    rank={i + 1}
                    card={c}
                    primary={travelMode === "transfer" ? `${(cpp * 100).toFixed(1)}¢` : `$${perk.toLocaleString()}`}
                    primaryLabel={travelMode === "transfer" ? "per point" : "travel value/yr"}
                    secondary={travelSummary(c, travelMode)}
                  />
                )
              })
            )}
          </ResultBlock>
        </div>
      )}

      {/* ── Build-my-plan handoff (shows once a path is chosen) ── */}
      {path && <BuildPlanCta path={path} />}

      {/* ── State cross-sell (cards are nationwide; bank bonuses aren't) ── */}
      <StateCrossSell stateSlug={stateSlug} onChange={setStateSlug} />

      <style>{`
        @media (max-width: 1000px) {
          .cf-paths { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 560px) {
          .cf-paths { grid-template-columns: 1fr !important; }
          .cf-spend-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  )
}

// ── Build-my-plan handoff into Stacks OS ─────────────────────────────
function BuildPlanCta({ path }: { path: Path }) {
  const copy: Record<Path, { body: string; href: string; cta: string }> = {
    spend: {
      body: "Stacks OS sequences these cards around your real paycheck and spend, tracks each min-spend, and tells you exactly what to open next.",
      href: "/stacksos/spending",
      cta: "Build my plan with Stacks OS →",
    },
    signup: {
      body: "Stacks OS orders these bonuses by your 5/24 status and paycheck, so you hit every min-spend without overlapping.",
      href: "/stacksos/spending",
      cta: "Build my plan with Stacks OS →",
    },
    travel: {
      body: "Stacks OS pairs the right travel card with your real spend and goal trip, then sequences it so the points land before you need to redeem.",
      href: "/stacksos/spending",
      cta: "Build my travel plan with Stacks OS →",
    },
    apr: {
      body: "Stacks OS models a 0% balance transfer against your payoff timeline — see whether the transfer fee beats the interest you'd otherwise pay.",
      href: "/stacksos/debt",
      cta: "Plan my payoff with Stacks OS →",
    },
  }
  const c = copy[path]
  return (
    <div style={{ marginTop: 28, background: "linear-gradient(135deg, #f0faf5 0%, #fff 100%)", border: "1px solid #a7f3d0", borderRadius: 14, padding: "22px 24px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
      <div style={{ minWidth: 220, flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 4 }}>
          {path === "apr" ? "Turn this into a payoff plan" : "Turn this into a step-by-step plan"}
        </div>
        <div style={{ fontSize: 13, color: "#555", lineHeight: 1.55 }}>{c.body}</div>
      </div>
      <Link
        href={c.href}
        style={{ display: "inline-block", padding: "13px 26px", fontSize: 14, fontWeight: 700, background: "#0d7c5f", color: "#fff", borderRadius: 10, textDecoration: "none", whiteSpace: "nowrap" }}
      >
        {c.cta}
      </Link>
    </div>
  )
}

// ── State cross-sell ─────────────────────────────────────────────────
function StateCrossSell({ stateSlug, onChange }: { stateSlug: string; onChange: (slug: string) => void }) {
  const selected = US_STATES.find(s => s.slug === stateSlug)
  return (
    <div style={{ marginTop: 28, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "22px 24px" }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 4 }}>
        Looking for offers in your state?
      </div>
      <div style={{ fontSize: 13, color: "#666", lineHeight: 1.55, marginBottom: 14 }}>
        The credit cards above are available nationwide. <strong>Bank account bonuses</strong> are
        where state matters — pick yours to see checking, savings &amp; brokerage offers you&apos;re eligible for.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <select
          value={stateSlug}
          onChange={e => onChange(e.target.value)}
          style={{ padding: "10px 12px", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fafafa", color: "#111", minWidth: 200 }}
        >
          <option value="">Choose your state…</option>
          {US_STATES.map(s => (
            <option key={s.code} value={s.slug}>{s.name}</option>
          ))}
        </select>
        <Link
          href={selected ? `/bank-bonuses-by-state/${selected.slug}` : "/bank-bonuses-by-state"}
          style={{
            display: "inline-block",
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 700,
            background: selected ? "#0d7c5f" : "#f3f4f6",
            color: selected ? "#fff" : "#888",
            borderRadius: 8,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          {selected ? `See ${selected.name} bonuses →` : "Browse all states →"}
        </Link>
      </div>
    </div>
  )
}

// ── Path chooser card ────────────────────────────────────────────────
function PathCard({ active, emoji, title, sub, onClick }: { active: boolean; emoji: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        cursor: "pointer",
        background: active ? "#f0faf5" : "#fff",
        border: `1.5px solid ${active ? "#0d7c5f" : "#e8e8e8"}`,
        borderRadius: 14,
        padding: "20px 22px",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <div style={{ fontSize: 26, marginBottom: 8 }}>{emoji}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: "#111", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>{sub}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0d7c5f", marginTop: 10 }}>
        {active ? "Showing results ↓" : "Choose →"}
      </div>
    </button>
  )
}

// ── Result wrapper ───────────────────────────────────────────────────
function ResultBlock({ heading, note, children }: { heading: string; note: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 2 }}>{heading}</div>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 14 }}>{note}</div>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  )
}

// ── One card result row, with a faux card-art tile ───────────────────
function CardRow({ rank, card, primary, primaryLabel, secondary }: { rank: number; card: CreditCardBonus; primary: string; primaryLabel: string; secondary: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto auto 1fr auto", gap: 14, alignItems: "center", background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "12px 16px" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#bbb", width: 22, textAlign: "center" }}>{rank}</div>
      <CardArt card={card} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.card_name}</div>
        <div style={{ fontSize: 12, color: "#777", marginTop: 2 }}>{secondary}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#0d7c5f" }}>{primary}</div>
        <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.04em" }}>{primaryLabel}</div>
        <a href={card.offer_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#0d7c5f", fontWeight: 600, textDecoration: "none" }}>View offer →</a>
      </div>
    </div>
  )
}

// ── Placeholder card art: issuer-colored tile with initials ──────────
const ISSUER_COLORS: Record<string, string> = {
  chase: "#117aca",
  amex: "#006fcf",
  "american express": "#006fcf",
  citi: "#1f4e9d",
  capital_one: "#d03027",
  "capital one": "#d03027",
  wells_fargo: "#b31b1b",
  bank_of_america: "#012169",
  us_bank: "#0a2240",
  barclays: "#00aeef",
  discover: "#f37021",
  navy_federal: "#003366",
  usaa: "#13294b",
}

function CardArt({ card }: { card: CreditCardBonus }) {
  const key = card.issuer?.toLowerCase().replace(/\s+/g, "_") ?? ""
  const bg = ISSUER_COLORS[key] || hashColor(card.issuer || card.card_name)
  const initials = (card.issuer || card.card_name)
    .split(/[\s_]+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("")
  return (
    <div
      aria-hidden
      style={{
        width: 56,
        height: 36,
        borderRadius: 6,
        background: `linear-gradient(135deg, ${bg}, ${shade(bg, -18)})`,
        color: "#fff",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-start",
        padding: 5,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.02em",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

// ── small utils ──────────────────────────────────────────────────────
function bonusLabel(c: CreditCardBonus): string {
  if (c.bonus_currency === "cash") return `$${c.bonus_amount.toLocaleString()}`
  return `${c.bonus_amount.toLocaleString()} ${c.bonus_currency}`
}

function hashColor(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  const hue = h % 360
  return `hsl(${hue}, 45%, 38%)`
}

function shade(hex: string, amt: number): string {
  if (hex.startsWith("hsl")) return hex
  const n = parseInt(hex.replace("#", ""), 16)
  const clamp = (v: number) => Math.max(0, Math.min(255, v))
  const r = clamp((n >> 16) + amt)
  const g = clamp(((n >> 8) & 0xff) + amt)
  const b = clamp((n & 0xff) + amt)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

const linkBtn: React.CSSProperties = { background: "none", border: "none", color: "#0d7c5f", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: 12 }

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none",
        cursor: "pointer",
        padding: "8px 14px",
        fontSize: 12,
        fontWeight: 700,
        background: active ? "#0d7c5f" : "#fff",
        color: active ? "#fff" : "#666",
      }}
    >
      {children}
    </button>
  )
}
