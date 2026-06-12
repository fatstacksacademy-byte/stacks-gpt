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
  travelTransferCpp,
  travelSummary,
  transferKind,
  type TravelMode,
} from "../../lib/data/travelValue"
import { cardsForState, stateSpecificCards } from "../../lib/data/cardAvailability"
import { useCatalogUnlock } from "./useCatalogUnlock"
import CatalogUnlockGate from "./CatalogUnlockGate"

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
// How many ranked rows each path shows before the "Show all" expander.
const DEFAULT_VISIBLE = 12

export default function CardFinder({ cards }: { cards: CreditCardBonus[] }) {
  const { unlocked, unlocking, error: unlockError, unlock } = useCatalogUnlock()
  const [path, setPath] = useState<Path | null>(null)
  const [spend, setSpend] = useState<SpendInput>(SAMPLE_SPEND)
  const [mode, setMode] = useState<RankMode>("ongoing")
  const [stateSlug, setStateSlug] = useState<string>("")
  const [aprMode, setAprMode] = useState<IntroAprMode>("balance_transfer")
  const [balance, setBalance] = useState<number>(5000)
  const [travelMode, setTravelMode] = useState<TravelMode>("perks")
  const [travelProgram, setTravelProgram] = useState<string>("")
  // Each ranked list defaults to the top DEFAULT_VISIBLE rows for a fast,
  // skimmable page; "Show all" expands to the full eligible set so the finder
  // never silently hides cards a user qualifies for.
  const [showAll, setShowAll] = useState<Record<Path, boolean>>({
    signup: false,
    spend: false,
    apr: false,
    travel: false,
  })
  function visible<T>(list: T[], p: Path): T[] {
    return showAll[p] ? list : list.slice(0, DEFAULT_VISIBLE)
  }

  const totalMonthly = Object.values(spend).reduce((a, b) => a + (b || 0), 0)

  // Cards a resident of the chosen state can actually get: every nationwide
  // card, plus any regional/credit-union cards specific to that state. With no
  // state chosen, only nationwide cards (state-restricted ones stay hidden).
  const stateCode = useMemo(
    () => (stateSlug ? US_STATES.find(s => s.slug === stateSlug)?.code ?? null : null),
    [stateSlug],
  )
  // Regional cards only fold into the ranked lists once the email gate is
  // unlocked; until then the rankings stay nationwide-only (same as no state).
  const effectiveStateCode = unlocked ? stateCode : null
  const eligibleCards = useMemo(() => cardsForState(cards, effectiveStateCode), [cards, effectiveStateCode])
  const stateAddedCount = useMemo(
    () => (stateCode ? stateSpecificCards(cards, stateCode).length : 0),
    [cards, stateCode],
  )
  const selectedState = stateSlug ? US_STATES.find(s => s.slug === stateSlug) : null
  // Regional cards no longer get their own list — once unlocked they fold into
  // the merit-ranked paths above (tagged with a "Regional" chip). We still
  // compute the state's cards here to drive the email gate's count + preview.
  const stateCards = useMemo(
    () =>
      stateCode
        ? stateSpecificCards(cards, stateCode)
            .map(card => ({ card, value: signupYearOneValue(card) }))
            .sort((a, b) => b.value - a.value || a.card.card_name.localeCompare(b.card.card_name))
        : [],
    [cards, stateCode],
  )

  function changeState(slug: string) {
    setStateSlug(slug)
  }

  const signupRanked = useMemo(
    () =>
      eligibleCards
        .map(c => ({ card: c, value: signupYearOneValue(c) }))
        .sort((a, b) => b.value - a.value),
    [eligibleCards],
  )

  const spendRanked = useMemo(
    () => rankCardsForSpend(eligibleCards, spend, mode),
    [eligibleCards, spend, mode],
  )

  const aprRanked = useMemo(
    () => rankByIntroApr(eligibleCards, aprMode),
    [eligibleCards, aprMode],
  )

  const travelRanked = useMemo(
    () => rankByTravelValue(eligibleCards, travelMode, travelProgram || undefined),
    [eligibleCards, travelMode, travelProgram],
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
          {visible(signupRanked, "signup").map(({ card, value }, i) => (
            <CardRow
              key={card.id}
              rank={i + 1}
              card={card}
              primary={`$${value.toLocaleString()}`}
              primaryLabel="year-one value"
              secondary={`${bonusLabel(card)} after $${card.min_spend.toLocaleString()} in ${card.spend_months}mo`}
            />
          ))}
          <MoreToggle
            total={signupRanked.length}
            expanded={showAll.signup}
            onToggle={() => setShowAll(s => ({ ...s, signup: !s.signup }))}
          />
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
              visible(spendRanked, "spend").map((e, i) => {
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
            {totalMonthly > 0 && (
              <MoreToggle
                total={spendRanked.length}
                expanded={showAll.spend}
                onToggle={() => setShowAll(s => ({ ...s, spend: !s.spend }))}
              />
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
              visible(aprRanked, "apr").map((c, i) => {
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
            {aprRanked.length > 0 && (
              <MoreToggle
                total={aprRanked.length}
                expanded={showAll.apr}
                onToggle={() => setShowAll(s => ({ ...s, apr: !s.apr }))}
              />
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
              visible(travelRanked, "travel").map((c, i) => {
                const perk = travelPerkValue(c.travel)
                const cpp = travelTransferCpp(c, travelProgram || undefined)
                const indirect =
                  travelMode === "transfer" &&
                  travelProgram &&
                  transferKind(c, travelProgram) === "indirect"
                return (
                  <CardRow
                    key={c.id}
                    rank={i + 1}
                    card={c}
                    primary={travelMode === "transfer" ? `${(cpp * 100).toFixed(1)}¢` : `$${perk.toLocaleString()}`}
                    primaryLabel={travelMode === "transfer" ? (travelProgram ? "per point" : "best partner") : "travel value/yr"}
                    secondary={travelSummary(c, travelMode, travelProgram || undefined)}
                    badge={indirect ? "Pool to transfer" : undefined}
                  />
                )
              })
            )}
            {travelRanked.length > 0 && (
              <MoreToggle
                total={travelRanked.length}
                expanded={showAll.travel}
                onToggle={() => setShowAll(s => ({ ...s, travel: !s.travel }))}
              />
            )}
          </ResultBlock>
        </div>
      )}

      {/* ── Build-my-plan handoff (shows once a path is chosen) ── */}
      {path && <BuildPlanCta path={path} />}

      {/* ── State filter: add regional/credit-union cards for the user's state ── */}
      <StateCardFilter stateSlug={stateSlug} onChange={changeState} addedCount={stateAddedCount} unlocked={unlocked} />

      {/* ── Email gate: regional cards stay locked until the visitor unlocks ── */}
      {selectedState && stateCards.length > 0 && !unlocked && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 2 }}>
            {selectedState.name} regional cards
          </div>
          <div style={{ fontSize: 12, color: "#999", marginBottom: 14 }}>
            {stateCards.length} verified local bank and credit-union cards available in {selectedState.name}. Membership requirements still apply.
          </div>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <div
              aria-hidden
              style={{ display: "grid", gap: 10, filter: "blur(5px)", pointerEvents: "none", userSelect: "none", maxHeight: 190, overflow: "hidden", opacity: 0.75 }}
            >
              {stateCards.slice(0, 3).map(({ card }, index) => {
                const hasSignupBonus = card.bonus_amount > 0
                return (
                  <CardRow
                    key={card.id}
                    rank={index + 1}
                    card={card}
                    primary={hasSignupBonus ? bonusLabel(card) : `$${card.annual_fee}`}
                    primaryLabel={hasSignupBonus ? "sign-up bonus" : "annual fee"}
                    secondary={card.key_benefits[0] || card.eligibility_notes || "Verify current terms before applying."}
                  />
                )
              })}
            </div>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(255,255,255,0) 0%, #fff 72%)", pointerEvents: "none" }} />
          </div>
          <CatalogUnlockGate
            count={stateCards.length}
            stateName={selectedState.name}
            stateCode={stateCode ?? ""}
            source="spending_state"
            unlock={unlock}
            unlocking={unlocking}
            error={unlockError}
            noun="local cards"
          />
        </div>
      )}

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

// ── State card filter: pull in regional/credit-union cards for a state ──
function StateCardFilter({ stateSlug, onChange, addedCount, unlocked }: { stateSlug: string; onChange: (slug: string) => void; addedCount: number; unlocked: boolean }) {
  const selected = US_STATES.find(s => s.slug === stateSlug)
  return (
    <div style={{ marginTop: 28, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "22px 24px" }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 4 }}>
        Live in a specific state?
      </div>
      <div style={{ fontSize: 13, color: "#666", lineHeight: 1.55, marginBottom: 14 }}>
        Most cards above are nationwide. Pick your state to add regional bank and credit-union
        cards available in your area — they&apos;ll fold straight into the ranked lists above,
        ranked by the same value math and tagged with a <strong>Regional</strong> chip. Some require
        a qualifying county, employer, family, military, or association membership.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <select
          value={stateSlug}
          onChange={e => onChange(e.target.value)}
          style={{ padding: "10px 12px", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fafafa", color: "#111", minWidth: 200 }}
        >
          <option value="">All states (nationwide cards)</option>
          {US_STATES.map(s => (
            <option key={s.code} value={s.slug}>{s.name}</option>
          ))}
        </select>
        {selected && (
          <button
            onClick={() => onChange("")}
            style={{ ...linkBtn, fontSize: 13 }}
          >
            clear
          </button>
        )}
      </div>
      {selected && (
        <div style={{ fontSize: 13, color: addedCount > 0 ? "#0d7c5f" : "#888", marginTop: 12, lineHeight: 1.5 }}>
          {addedCount > 0 ? (
            unlocked ? (
              <><strong>{addedCount}</strong> regional card{addedCount === 1 ? "" : "s"} for {selected.name} {addedCount === 1 ? "is" : "are"} now mixed into the rankings above — look for the <strong>Regional</strong> chip. Check each eligibility note before applying.</>
            ) : (
              <><strong>{addedCount}</strong> regional card{addedCount === 1 ? "" : "s"} available in {selected.name}. Unlock below to fold {addedCount === 1 ? "it" : "them"} into the rankings above.</>
            )
          ) : (
            <>No regional cards verified for {selected.name} yet — we add them as issuer and membership terms are confirmed. Nationwide cards above still apply.</>
          )}
        </div>
      )}
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

// ── "Show all" expander ──────────────────────────────────────────────
// Renders nothing until a list exceeds DEFAULT_VISIBLE, so short result
// sets stay clean. Lets the finder show every eligible card instead of
// silently capping the ranking.
function MoreToggle({ total, expanded, onToggle }: { total: number; expanded: boolean; onToggle: () => void }) {
  if (total <= DEFAULT_VISIBLE) return null
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        marginTop: 2,
        justifySelf: "center",
        border: "1px solid #d8d8d8",
        borderRadius: 8,
        background: "#fff",
        color: "#0d7c5f",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
        padding: "10px 18px",
      }}
    >
      {expanded ? "Show fewer" : `Show all ${total} cards`}
    </button>
  )
}

// ── One card result row, with a faux card-art tile ───────────────────
function CardRow({ rank, card, primary, primaryLabel, secondary, badge }: { rank: number; card: CreditCardBonus; primary: string; primaryLabel: string; secondary: string; badge?: string }) {
  const earnChips = topEarnChips(card)
  const score = creditScoreChip(card)
  const detail = detailChips(card)
  const hasAnyChip = earnChips.length > 0 || score || detail.length > 0
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto auto 1fr auto", gap: 14, alignItems: "center", background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "12px 16px" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#bbb", width: 22, textAlign: "center" }}>{rank}</div>
      <CardArt card={card} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.card_name}</span>
          {badge && (
            <span
              title="Earns this currency but doesn't transfer on its own — pool its points into a premium card of the same currency to transfer."
              style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.02em", background: "#fff5e6", color: "#9a6400", border: "1px solid #f0dcb4", padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap" }}
            >
              {badge}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "#777", marginTop: 2 }}>{secondary}</div>
        {hasAnyChip && (
          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {earnChips.map((chip, i) => (
              <span
                key={`r${i}`}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  background: "#f0f7f4",
                  color: "#0d7c5f",
                  border: "1px solid #d6ebe2",
                  padding: "2px 6px",
                  borderRadius: 4,
                  whiteSpace: "nowrap",
                }}
              >
                {chip}
              </span>
            ))}
            {detail.map((chip, i) => (
              <span
                key={`d${i}`}
                title={chip.title}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  background: chip.bg,
                  color: chip.fg,
                  border: `1px solid ${chip.border}`,
                  padding: "2px 6px",
                  borderRadius: 4,
                  whiteSpace: "nowrap",
                }}
              >
                {chip.label}
              </span>
            ))}
            {score && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  background: score.bg,
                  color: score.fg,
                  border: `1px solid ${score.border}`,
                  padding: "2px 6px",
                  borderRadius: 4,
                  whiteSpace: "nowrap",
                }}
                title="Typical credit score required for approval"
              >
                {score.label}
              </span>
            )}
          </div>
        )}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#0d7c5f" }}>{primary}</div>
        <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.04em" }}>{primaryLabel}</div>
        {hasOfferLink(card) ? (
          <a href={card.offer_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#0d7c5f", fontWeight: 600, textDecoration: "none" }}>View offer →</a>
        ) : (
          <span style={{ fontSize: 11, color: "#bbb", fontWeight: 600 }}>Link coming soon</span>
        )}
      </div>
    </div>
  )
}

/**
 * Detail chips — one per non-null premium feature on the card. These
 * encode the comparison signals that compete with NerdWallet / TPG:
 *   - Lounge network ("Centurion lounges", "Priority Pass")
 *   - Annual-credits total ("$2,200/yr credits") when itemized
 *   - Companion benefit ("Companion cert")
 *   - Travel insurance bundle ("Full travel insurance" — when 3+ are true)
 *   - Foreign tx fee % when nonzero
 *   - No-FX-fee (only when explicitly true and not a premium-bundle card)
 */
type DetailChip = { label: string; title: string; bg: string; fg: string; border: string }

function detailChips(card: CreditCardBonus): DetailChip[] {
  const out: DetailChip[] = []
  if (card.state_restricted && card.state_restricted.length > 0) {
    out.push({
      label: `Regional · ${card.state_restricted.join("/")}`,
      title: card.eligibility_notes || `Regional availability in ${card.state_restricted.join(", ")}`,
      bg: "#fff8e8",
      fg: "#8a5a00",
      border: "#efdca8",
    })
  }
  if (card.lounge_network) {
    const map: Record<NonNullable<CreditCardBonus["lounge_network"]>, string> = {
      "priority pass": "Priority Pass",
      centurion: "Centurion lounges",
      "admirals club": "Admirals Club",
      "delta sky club": "Delta Sky Club",
      "united club": "United Club",
      "alaska lounge": "Alaska Lounge",
      "capital one lounge": "Capital One Lounges",
      "chase sapphire lounge": "Sapphire Lounges",
    }
    out.push({
      label: map[card.lounge_network] || card.lounge_network,
      title: "Airport lounge network",
      bg: "#eef0fb",
      fg: "#3b46a0",
      border: "#d7dcf2",
    })
  }
  if (card.annual_credits_detail && card.annual_credits_detail.length > 0) {
    const total = card.annual_credits_detail.reduce((s, c) => s + (c.amount || 0), 0)
    if (total >= 100) {
      out.push({
        label: `$${total.toLocaleString()}/yr credits`,
        title: card.annual_credits_detail
          .map((c) => `$${c.amount} ${c.label}${c.cadence === "monthly" ? " (monthly)" : c.cadence === "biennial" ? " (biennial)" : ""}`)
          .join("\n"),
        bg: "#eafaf3",
        fg: "#0d6e51",
        border: "#cae8db",
      })
    }
  }
  if (card.companion_benefit) {
    const v = card.companion_benefit.estimated_value
    out.push({
      label: `Companion ~$${v.toLocaleString()}`,
      title: card.companion_benefit.label || "Companion benefit",
      bg: "#fff1ea",
      fg: "#a14620",
      border: "#f3d4be",
    })
  }
  if (card.anniversary_bonus?.free_night_cert_cap_points) {
    const k = Math.round((card.anniversary_bonus.free_night_cert_cap_points || 0) / 1000)
    out.push({
      label: `Free night up to ${k}k pts`,
      title: `Anniversary free-night certificate (${card.anniversary_bonus.program || "loyalty program"})`,
      bg: "#fdf6e0",
      fg: "#8a6d00",
      border: "#f0e2a8",
    })
  } else if (card.anniversary_bonus?.points && card.anniversary_bonus.points > 0) {
    out.push({
      label: `${(card.anniversary_bonus.points / 1000).toFixed(0)}k anniversary pts`,
      title: `Bonus points awarded each account anniversary`,
      bg: "#fdf6e0",
      fg: "#8a6d00",
      border: "#f0e2a8",
    })
  }
  // Travel insurance — show one chip when the bundle is comprehensive
  // (3+ protections) so the row doesn't get bloated with one chip per.
  if (card.travel_insurance) {
    const t = card.travel_insurance
    const protections = [
      t.trip_delay,
      t.trip_cancellation,
      t.baggage_delay,
      t.rental_cdw_primary,
      t.rental_cdw_secondary,
      t.emergency_medical,
    ].filter(Boolean).length
    if (protections >= 3) {
      out.push({
        label: t.rental_cdw_primary ? "Full insurance + 1° CDW" : "Full travel insurance",
        title: [
          t.trip_delay && "Trip delay",
          t.trip_cancellation && "Trip cancellation",
          t.baggage_delay && "Baggage delay",
          t.rental_cdw_primary && "Primary rental CDW",
          t.rental_cdw_secondary && "Secondary rental CDW",
          t.emergency_medical && "Emergency medical",
        ]
          .filter(Boolean)
          .join(" · "),
        bg: "#eef5fb",
        fg: "#1d5fa6",
        border: "#d4e4f3",
      })
    }
  }
  if (card.foreign_tx_fee_pct && card.foreign_tx_fee_pct > 0) {
    out.push({
      label: `${card.foreign_tx_fee_pct}% FX fee`,
      title: "Foreign transaction fee — applies on every non-USD purchase",
      bg: "#fbeaea",
      fg: "#a32424",
      border: "#f3cccc",
    })
  }
  return out.slice(0, 4) // Cap so the row stays readable
}

/**
 * Compact credit-score chip rendered on each card row. Conveys the
 * typical FICO tier needed for approval so people don't waste a hard
 * pull on a card they won't get. Returns null when the catalog entry
 * hasn't been annotated yet — UI degrades cleanly.
 */
function creditScoreChip(
  card: CreditCardBonus,
): { label: string; bg: string; fg: string; border: string } | null {
  if (!card.credit_score_required) return null
  const palette: Record<
    NonNullable<CreditCardBonus["credit_score_required"]>,
    { label: string; bg: string; fg: string; border: string }
  > = {
    excellent: { label: "Needs 740+", bg: "#eaf6ec", fg: "#1e7a3a", border: "#cee6d3" },
    good: { label: "Needs 670+", bg: "#fdf6e0", fg: "#8a6d00", border: "#f0e2a8" },
    fair: { label: "Needs 580+", bg: "#fdf1e0", fg: "#9a5400", border: "#f0d6b3" },
    poor: { label: "No min credit", bg: "#f3f0fa", fg: "#534493", border: "#dcd2ee" },
  }
  return palette[card.credit_score_required]
}

/**
 * Pull the top 2-3 earning tiers off `card.rewards` and render them as
 * compact chips like "3x Dining" or "5% Groceries". The rewards array
 * was populated by the discover/verify extractors but never surfaced
 * in the UI — this brings the structured earning data into view next
 * to every card.
 */
function topEarnChips(card: CreditCardBonus): string[] {
  if (!card.rewards || card.rewards.length === 0) return []
  // Sort by multiplier descending so the strongest earn rate leads.
  const sorted = [...card.rewards].sort((a, b) => b.multiplier - a.multiplier)
  const out: string[] = []
  for (const tier of sorted) {
    // Skip the "everything else" fallback tier — it's structural noise
    // unless it's the only tier and the multiplier > 1.
    const isFallback = tier.categories.length === 1 && tier.categories[0] === "everything_else"
    if (isFallback && sorted.length > 1) continue
    const unit = tier.unit === "%" ? "%" : "x"
    const cats = tier.categories
      .map((c) => c.replace(/_/g, " "))
      .slice(0, 2)
      .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
      .join("/")
    out.push(`${tier.multiplier}${unit} ${cats || "Everything"}`)
    if (out.length >= 3) break
  }
  return out
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
// Many catalog entries ship without an offer URL yet. An empty href reloads
// the current page, so only render the link when it's a real http(s) URL.
function hasOfferLink(c: CreditCardBonus): boolean {
  return /^https?:\/\//i.test(c.offer_link?.trim() ?? "")
}

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
