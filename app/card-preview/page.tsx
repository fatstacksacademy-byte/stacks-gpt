"use client"

/**
 * STANDALONE DESIGN PREVIEW — not linked anywhere in the app.
 * Visit /card-preview to see the proposed "hero card" redesign.
 *
 * Concept: bonus cards behave like quest/mission cards in a game.
 *   - OFFER   (not started): color-coded front shows the reward + what it takes.
 *               One bold "Start" CTA.
 *   - ACTIVE  (started, action due): collapses to an XP-style progress bar +
 *               the single current objective + one action button. Detail hidden.
 *   - WAITING (started, nothing to do but wait): desaturated "cooldown" pill,
 *               shows what it's waiting on + countdown, and SINKS to the bottom.
 *   - BACK    (flip): the "under the hood" stat sheet — full checklist, every
 *               date, fees, requirements, deep link into the module.
 */

import { useState, useEffect, useLayoutEffect, useRef, type ReactNode } from "react"

type Phase = "offer" | "applying" | "recon" | "rejected" | "active" | "waiting"
type Module = "paycheck" | "spending" | "savings"

type Card = {
  id: string
  module: Module
  phase: Phase
  name: string
  issuer: string
  amount: number
  // OFFER face
  requirement: string
  reqDetail: string
  effort: string // e.g. "$5,000 DD" or "$4,000 spend in 90d"
  // ACTIVE face — numeric so "Log progress" can actually move the bar
  objective?: string
  unit?: "$" | ""           // how to format current/target
  current?: number          // progress so far (e.g. 2400)
  target?: number           // goal (e.g. 5000)
  deadline?: string
  daysLeft?: number
  // WAITING face
  waitingFor?: string
  waitUntil?: string
  waitDays?: number
  waitTotalDays?: number    // full length of the current waiting window (for the fill bar)
  // APPLICATION flow
  reconLine?: string        // issuer reconsideration line
  reconTip?: string         // what to say / how to improve odds
  // BACK (stat sheet)
  startedDaysAgo?: number
  openedDate?: string
  payoutEst?: string
  safeCloseEst?: string
  annualFee?: number
  // Full-info sheet
  category?: string
  rewardDetail?: string
  ddRequired?: string
  holdingDays?: number
  cooldownMonths?: number
  monthlyFee?: number
  earlyClosureFee?: number
  apy?: string
  lifetimeRestricted?: boolean
  notes?: string
  // Fee avoidance — bank bonuses only
  feeWaiver?: { type: "balance" | "dd"; balance?: number; label: string }
  accountApy?: number       // APY the parked cash earns in THIS account (0 for most checking)
  // Personal dates the user logs (editable on the back)
  dates?: { opened?: string; funded?: string; metReq?: string; bonusPosted?: string; closed?: string }
  // Paycheck deposits the user logs — amount + where it came from (data we keep going forward)
  deposits?: { amount: number; source: string; date: string }[]
  checklist: { label: string; done: boolean; current: boolean }[]
}

// Funding sources offered when logging a paycheck deposit. In the real app this
// list is the user's linked/known accounts; "Employer direct deposit" is the
// gold-standard source most bonuses require.
const DD_SOURCE = "Employer direct deposit"
const LINKED_ACCOUNTS = ["Chase ••4821", "Ally Savings ••0593", "Capital One 360 ••7240", "Fidelity CMA ••1186"]

const MOD: Record<Module, { label: string; from: string; to: string; fg: string; soft: string; glow: string }> = {
  paycheck: { label: "Paycheck", from: "#2563eb", to: "#1d4ed8", fg: "#2563eb", soft: "#eff6ff", glow: "rgba(37,99,235,0.45)" },
  spending: { label: "Spending", from: "#7c3aed", to: "#6d28d9", fg: "#7c3aed", soft: "#f3effe", glow: "rgba(124,58,237,0.45)" },
  savings:  { label: "Savings",  from: "#0d9668", to: "#0b7a55", fg: "#0d7c5f", soft: "#e6f5f0", glow: "rgba(13,150,104,0.45)" },
}

const CARDS: Card[] = [
  {
    id: "csp", module: "spending", phase: "offer",
    name: "Sapphire Preferred", issuer: "Chase", amount: 900,
    requirement: "Spend $5,000 in 3 months", reqDetail: "100,000 Ultimate Rewards points",
    effort: "$5k spend · 90d",
    annualFee: 95, objective: "Spend $5,000", unit: "$", target: 5000, daysLeft: 90, deadline: "Sep 28",
    category: "Travel rewards card", rewardDetail: "100,000 Ultimate Rewards pts (~$900 via portal, more via transfer partners)",
    cooldownMonths: 48, lifetimeRestricted: true,
    reconLine: "Chase recon · 1-888-245-0625",
    reconTip: "Ask them to reconsider — offer to move credit from another Chase card. Confirm you're under 5/24.",
    notes: "Subject to Chase 5/24. Premium transfer partners (Hyatt, United). $50 annual hotel credit not counted here.",
    checklist: [
      { label: "Apply", done: false, current: true },
      { label: "Approved?", done: false, current: false },
      { label: "Hit $5,000 spend", done: false, current: false },
      { label: "Bonus posts", done: false, current: false },
      { label: "Redeem points", done: false, current: false },
    ],
  },
  {
    id: "sofi", module: "paycheck", phase: "active",
    name: "SoFi Checking", issuer: "SoFi", amount: 300,
    requirement: "Direct deposit $5,000", reqDetail: "$300 cash bonus",
    effort: "$5k DD · 25d",
    objective: "Direct deposit $5,000", unit: "$", current: 2400, target: 5000,
    deadline: "Jul 25", daysLeft: 12,
    startedDaysAgo: 8, openedDate: "Jun 22, 2026", payoutEst: "Aug 10", safeCloseEst: "Oct 12",
    category: "Checking bonus", rewardDetail: "$300 cash, paid ~30 days after requirement met",
    ddRequired: "$5,000 in direct deposits within 25 days", holdingDays: 60, cooldownMonths: 24,
    monthlyFee: 0, earlyClosureFee: 0,
    dates: { opened: "2026-06-22" },
    notes: "P2P transfers (Zelle/ACH push) count as DD at SoFi. Keep open 60d to avoid clawback.",
    checklist: [
      { label: "Account opened", done: true, current: false },
      { label: "Hit $5,000 in deposits", done: false, current: true },
      { label: "Bonus posts", done: false, current: false },
      { label: "Hold 60 days", done: false, current: false },
    ],
  },
  {
    id: "ink", module: "spending", phase: "active",
    name: "Ink Business Preferred", issuer: "Chase", amount: 1150,
    requirement: "Spend $8,000 in 3 months", reqDetail: "120,000 Ultimate Rewards points",
    effort: "$8k spend · 90d",
    objective: "Spend $8,000", unit: "$", current: 6480, target: 8000,
    deadline: "Aug 02", daysLeft: 20, annualFee: 95,
    startedDaysAgo: 41, openedDate: "May 20, 2026", payoutEst: "Sep 01", safeCloseEst: "—",
    category: "Business rewards card", rewardDetail: "120,000 Ultimate Rewards pts (~$1,150 via portal)",
    cooldownMonths: 24, monthlyFee: 0,
    dates: { opened: "2026-05-20" },
    notes: "Business card — does NOT count toward 5/24, but you must be under 5/24 to be approved. Earns 3x on travel + select categories.",
    checklist: [
      { label: "Approved", done: true, current: false },
      { label: "Spend $8,000", done: false, current: true },
      { label: "Bonus posts", done: false, current: false },
    ],
  },
  {
    id: "bmo", module: "paycheck", phase: "offer",
    name: "Relationship Checking", issuer: "BMO", amount: 350,
    requirement: "Receive $4,000 in direct deposits in 90 days", reqDetail: "$350 cash bonus",
    effort: "$4k DD · 90d",
    objective: "Direct deposit $4,000", unit: "$", target: 4000, daysLeft: 90, deadline: "Sep 28",
    monthlyFee: 5, earlyClosureFee: 0, holdingDays: 60, cooldownMonths: 36,
    feeWaiver: { type: "balance", balance: 5000, label: "keep $5,000 daily balance" }, accountApy: 0.0001,
    reconLine: "BMO new accounts · 1-888-340-2265",
    reconTip: "Bank declines are usually a ChexSystems flag — ask which agency, then dispute or wait it out.",
    category: "Checking bonus", rewardDetail: "$350 cash, paid ~60 days after $4k in DDs",
    ddRequired: "$4,000 in direct deposits within 90 days",
    notes: "$5/mo maintenance fee. Waived with $5,000 balance OR $1,000+ monthly DD — the DD path is free, use that.",
    checklist: [
      { label: "Apply", done: false, current: true },
      { label: "Approved?", done: false, current: false },
      { label: "Hit $4,000 in deposits", done: false, current: false },
      { label: "Bonus posts", done: false, current: false },
      { label: "Hold 60 days", done: false, current: false },
    ],
  },
  {
    id: "cap1", module: "savings", phase: "waiting",
    name: "360 Performance Savings", issuer: "Capital One", amount: 250,
    requirement: "Deposit $10,000, hold 90 days", reqDetail: "$250 cash bonus",
    effort: "$10k · hold 90d",
    waitingFor: "Holding period", waitUntil: "Sep 14", waitDays: 63, waitTotalDays: 90,
    startedDaysAgo: 27, openedDate: "Jun 3, 2026", payoutEst: "Sep 20", safeCloseEst: "Sep 14",
    category: "Savings bonus", rewardDetail: "$250 cash + 3.80% APY while held",
    holdingDays: 90, apy: "3.80%", monthlyFee: 0, earlyClosureFee: 0, cooldownMonths: 12,
    dates: { opened: "2026-06-03", funded: "2026-06-05" },
    notes: "Must keep $10k balance the full 90 days. Bonus posts ~5 days after holding period ends.",
    checklist: [
      { label: "Account opened", done: true, current: false },
      { label: "Funded $10,000", done: true, current: false },
      { label: "Hold 90 days", done: false, current: true },
      { label: "Bonus posts", done: false, current: false },
    ],
  },
  {
    id: "usbank", module: "paycheck", phase: "waiting",
    name: "Smartly Checking", issuer: "U.S. Bank", amount: 450,
    requirement: "2 direct deposits totaling $8,000", reqDetail: "$450 cash bonus",
    effort: "$8k DD · 2x",
    waitingFor: "Bonus to post", waitUntil: "Jul 30", waitDays: 17, waitTotalDays: 45,
    startedDaysAgo: 52, openedDate: "May 9, 2026", payoutEst: "Jul 30", safeCloseEst: "Sep 28",
    category: "Checking bonus", rewardDetail: "$450 cash, posts within 60 days of qualifying",
    ddRequired: "2 direct deposits totaling $8,000", holdingDays: 60, cooldownMonths: 36,
    monthlyFee: 6.95, earlyClosureFee: 25,
    feeWaiver: { type: "balance", balance: 1500, label: "keep $1,500 daily balance" }, accountApy: 0.0001,
    dates: { opened: "2026-05-09", funded: "2026-05-15" },
    notes: "$6.95/mo fee waived with $1,500 balance. Both DDs must post in separate statement cycles.",
    checklist: [
      { label: "Account opened", done: true, current: false },
      { label: "2 deposits = $8,000", done: true, current: false },
      { label: "Bonus posts", done: false, current: true },
      { label: "Hold 60 days", done: false, current: false },
    ],
  },
]

const PHASE_RANK: Record<Phase, number> = { active: 0, applying: 1, recon: 1, offer: 2, rejected: 3, waiting: 4 }

const YEAR_GOAL = 5000
const BEST_HYSA_APY = 0.043   // benchmark: what the parked cash could earn elsewhere
const TODAY = "2026-06-30"    // auto-stamp date for milestones logged "today"

/** Net-after-fees + "is dodging the fee actually worth it vs a HYSA?" math. */
function feeAnalysis(card: Card) {
  const months = Math.max(1, Math.round((card.holdingDays ?? 30) / 30))
  const monthly = card.monthlyFee ?? 0
  const totalFees = +(monthly * months).toFixed(2)
  const waiver = card.feeWaiver
  const parked = waiver?.type === "balance" ? (waiver.balance ?? 0) : 0
  // Yield you give up by parking cash here (low APY) instead of a HYSA.
  const oppCost = +(parked * (BEST_HYSA_APY - (card.accountApy ?? 0)) * (months / 12)).toFixed(2)
  const netIfPay = card.amount - totalFees
  const netIfWaive = waiver?.type === "balance" ? card.amount - oppCost : card.amount
  // DD-based waivers are free → always waive. Balance waivers: only if cheaper than the fees.
  const canWaive = !!waiver
  const recommend: "waive" | "pay" =
    !canWaive ? "pay" : waiver!.type === "dd" ? "waive" : oppCost > totalFees ? "pay" : "waive"
  return { months, monthly, totalFees, parked, oppCost, netIfPay, netIfWaive, canWaive, recommend, waiver }
}

function hasFees(c: Card) {
  return (c.module === "paycheck" || c.module === "savings") && ((c.monthlyFee ?? 0) > 0 || (c.earlyClosureFee ?? 0) > 0)
}

export default function CardPreviewPage() {
  const [cards, setCards] = useState<Card[]>(CARDS)
  const [flipped, setFlipped] = useState<Set<string>>(new Set())
  const [banked, setBanked] = useState(1200)      // cash already received this year
  const [pops, setPops] = useState<{ id: number; amount: number }[]>([])
  const [infoId, setInfoId] = useState<string | null>(null)   // full-info modal
  const [history, setHistory] = useState<{ cards: Card[]; banked: number }[]>([])
  const popId = useRef(0)

  // Snapshot the board before any change so the top "Undo" can roll it back.
  const snapshot = () => setHistory(h => [...h.slice(-24), { cards, banked }])
  function undo() {
    setHistory(h => {
      if (!h.length) return h
      const prev = h[h.length - 1]
      setCards(prev.cards)
      setBanked(prev.banked)
      setPops([])
      return h.slice(0, -1)
    })
  }

  // Application flow: Apply → Approved? (yes/no) → recon → final rejection.
  // "Apply" marks step 0 done and lights the "Approved?" gate.
  function apply(id: string) {
    snapshot()
    setCards(cs => cs.map(c => c.id === id ? { ...c, phase: "applying", checklist: c.checklist.map((it, i) => i === 0 ? { ...it, done: true, current: false } : i === 1 ? { ...it, current: true } : it) } : c))
  }
  // Approved (first pass OR after recon) → become an active, tracked bonus.
  // Auto-stamp the open date "as they did it" (still editable on the back).
  function approve(id: string) {
    snapshot()
    setCards(cs => cs.map(c => c.id === id ? { ...c, phase: "active", current: 0, startedDaysAgo: 0, dates: { ...c.dates, opened: c.dates?.opened ?? TODAY }, checklist: c.checklist.map((it, i) => i === 1 ? { ...it, done: true, current: false } : i === 2 ? { ...it, current: true } : it) } : c))
  }
  // First "No" → send them to the recon line. Final "No" → rejected (info kept).
  function deny(id: string) {
    snapshot()
    setCards(cs => cs.map(c => c.id === id ? { ...c, phase: c.phase === "recon" ? "rejected" : "recon" } : c))
  }
  // Walk away from a dead application — drop it off the board entirely.
  function dismiss(id: string) {
    snapshot()
    setCards(cs => cs.filter(c => c.id !== id))
  }
  function toggleFlip(id: string) {
    setFlipped(f => { const n = new Set(f); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  // Log progress → move the bar. When it hits the target, flip the front
  // checklist so "Bonus posts" becomes the live step.
  function logProgress(id: string, newCurrent: number) {
    snapshot()
    setCards(cs => cs.map(c => {
      if (c.id !== id) return c
      const target = c.target ?? 0
      const capped = Math.max(0, Math.min(target, Math.round(newCurrent)))
      const hit = target > 0 && capped >= target
      const reqKey = c.module === "spending" ? "metReq" : "funded"
      return { ...c, current: capped,
        dates: hit ? { ...c.dates, [reqKey]: c.dates?.[reqKey] ?? TODAY } : c.dates,
        checklist: hit
          ? c.checklist.map((it, i) => i === 1 ? { ...it, done: true, current: false } : i === 2 ? { ...it, current: true } : it)
          : c.checklist }
    }))
  }
  // Log a single paycheck deposit: how much hit the account + where it came from.
  // Each hit is appended (so the history accrues) and bumps the running total.
  function logDeposit(id: string, amount: number, source: string) {
    if (!(amount > 0)) return
    snapshot()
    setCards(cs => cs.map(c => {
      if (c.id !== id) return c
      const target = c.target ?? 0
      const next = Math.max(0, (c.current ?? 0) + Math.round(amount))
      const capped = target > 0 ? Math.min(target, next) : next
      const hit = target > 0 && capped >= target
      const deposits = [...(c.deposits ?? []), { amount: Math.round(amount), source, date: TODAY }]
      return { ...c, current: capped, deposits,
        dates: hit ? { ...c.dates, funded: c.dates?.funded ?? TODAY } : c.dates,
        checklist: hit
          ? c.checklist.map((it, i) => i === 1 ? { ...it, done: true, current: false } : i === 2 ? { ...it, current: true } : it)
          : c.checklist }
    }))
  }
  // Edit any personal date from the back of the card.
  function setDate(id: string, key: keyof NonNullable<Card["dates"]>, value: string) {
    snapshot()
    setCards(cs => cs.map(c => c.id === id ? { ...c, dates: { ...c.dates, [key]: value || undefined } } : c))
  }
  // Bonus received → grow the stack, fire the +$ animation, remove the card.
  function receive(id: string) {
    const card = cards.find(c => c.id === id)
    if (!card) return
    snapshot()
    const pid = ++popId.current
    setInfoId(cur => cur === id ? null : cur)
    setPops(p => [...p, { id: pid, amount: card.amount }])
    setTimeout(() => setBanked(b => b + card.amount), 220)       // sync growth to the bill landing
    setTimeout(() => setPops(p => p.filter(x => x.id !== pid)), 1400)
    setTimeout(() => setCards(cs => cs.filter(c => c.id !== id)), 600)
  }

  const sorted = [...cards].sort((a, b) => PHASE_RANK[a.phase] - PHASE_RANK[b.phase])
  const live = sorted.filter(c => c.phase !== "waiting")
  const waiting = sorted.filter(c => c.phase === "waiting")
  const infoCard = cards.find(c => c.id === infoId) || null

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", color: "#e8eaed", padding: "28px 16px 96px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#6b7280", textTransform: "uppercase" }}>
          Stacks OS · Mission Board
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, margin: "0 0 16px" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#fff" }}>Your bonuses</h1>
          <button onClick={undo} disabled={history.length === 0} title="Undo last change"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 13px", fontSize: 12.5, fontWeight: 700, borderRadius: 10, cursor: history.length ? "pointer" : "default",
              color: history.length ? "#cdd2db" : "#4b515c", background: history.length ? "#1a1d24" : "transparent",
              border: `1px solid ${history.length ? "#2a2e38" : "#1c1f27"}`, transition: "all .15s" }}>
            ↶ Undo{history.length ? ` (${history.length})` : ""}
          </button>
        </div>

        <FatStackMeter banked={banked} goal={YEAR_GOAL} pops={pops} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {live.map(c => (
            <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <HeroCard card={c} flipped={flipped.has(c.id)} onFlip={() => toggleFlip(c.id)} onApply={() => apply(c.id)} onApprove={() => approve(c.id)} onDeny={() => deny(c.id)} onDismiss={() => dismiss(c.id)} onReceive={() => receive(c.id)} onLog={(v) => logProgress(c.id, v)} onDeposit={(amt, src) => logDeposit(c.id, amt, src)} onInfo={() => setInfoId(c.id)} onSetDate={(k, v) => setDate(c.id, k, v)} />
              {hasFees(c) && c.phase !== "rejected" && !flipped.has(c.id) && <FeeStrip card={c} />}
            </div>
          ))}
        </div>

        {waiting.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "26px 0 12px" }}>
              <div style={{ height: 1, flex: 1, background: "#23262e" }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#5b6170", textTransform: "uppercase" }}>
                ⏳ Waiting · {waiting.length}
              </span>
              <div style={{ height: 1, flex: 1, background: "#23262e" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {waiting.map(c => (
                <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  <HeroCard card={c} flipped={flipped.has(c.id)} onFlip={() => toggleFlip(c.id)} onApply={() => apply(c.id)} onApprove={() => approve(c.id)} onDeny={() => deny(c.id)} onDismiss={() => dismiss(c.id)} onReceive={() => receive(c.id)} onLog={(v) => logProgress(c.id, v)} onDeposit={(amt, src) => logDeposit(c.id, amt, src)} onInfo={() => setInfoId(c.id)} onSetDate={(k, v) => setDate(c.id, k, v)} />
                  {hasFees(c) && !flipped.has(c.id) && <FeeStrip card={c} />}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {infoCard && <FullInfoModal card={infoCard} onClose={() => setInfoId(null)} onReceive={() => receive(infoCard.id)} />}
      <CooldownBar waiting={waiting} onInfo={setInfoId} />

      <style>{`
        @keyframes shimmer { 0% { left: -22% } 100% { left: 100% } }
        @keyframes pulseGlow { 0%,100% { opacity: 0.55 } 50% { opacity: 1 } }
        @keyframes billDrop { 0% { transform: translateY(-46px) scale(.7) rotate(-8deg); opacity: 0 } 55% { opacity: 1 } 70% { transform: translateY(4px) scale(1.04) } 100% { transform: translateY(0) scale(1) rotate(0); opacity: 1 } }
        @keyframes floatUp { 0% { transform: translateY(8px) scale(.8); opacity: 0 } 18% { opacity: 1; transform: translateY(0) scale(1.1) } 75% { opacity: 1 } 100% { transform: translateY(-54px) scale(1); opacity: 0 } }
        @keyframes meterFlash { 0%,100% { box-shadow: 0 0 0 1px #23262e, 0 10px 30px rgba(0,0,0,.4) } 30% { box-shadow: 0 0 0 1px #f7d774, 0 0 34px rgba(247,215,116,.55) } }
        @keyframes coinSpin { 0% { transform: rotateY(0) } 100% { transform: rotateY(360deg) } }
        .cardLeave { animation: none; }
        .hc { perspective: 1400px; position: relative; }
        .hc-inner { position: relative; transition: transform 0.55s cubic-bezier(.2,.7,.2,1), height 0.35s ease; transform-style: preserve-3d; }
        .hc-inner.flip { transform: rotateY(180deg); }
        .hc-face { position: absolute; top: 0; left: 0; right: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .hc-back { transform: rotateY(180deg); }
        .hc-lift { transition: transform .18s ease, box-shadow .18s ease; }
        .hc-lift:hover { transform: translateY(-2px); }
      `}</style>
    </div>
  )
}

/* ---------- DASHBOARD: the fat stack that grows as you bank bonuses ---------- */
function useCountUp(target: number, ms = 700) {
  const [val, setVal] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const start = from.current
    if (start === target) return
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(start + (target - start) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return val
}

function FatStackMeter({ banked, goal, pops }: { banked: number; goal: number; pops: { id: number; amount: number }[] }) {
  const display = useCountUp(banked)
  const pct = Math.min(100, (banked / goal) * 100)
  // The pile grows one "bill" layer per ~$250 banked, capped so it stays tidy.
  const layers = Math.min(14, Math.max(3, Math.round(banked / 250)))
  const flashing = pops.length > 0
  return (
    <div style={{
      position: "relative", borderRadius: 18, padding: "16px 18px 14px", marginBottom: 22,
      background: "radial-gradient(140% 120% at 50% 0%, #1c2230, #12141b)",
      border: "1px solid #23262e",
      boxShadow: "0 0 0 1px #23262e, 0 10px 30px rgba(0,0,0,.4)",
      animation: flashing ? "meterFlash 0.9s ease-out" : "none", overflow: "hidden",
    }}>
      {/* floating +$ amount on receive */}
      {pops.map(p => (
        <div key={p.id} style={{ position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 5, fontSize: 26, fontWeight: 900, color: "#f7d774", textShadow: "0 2px 12px rgba(247,215,116,0.7)", animation: "floatUp 1.3s ease-out forwards", pointerEvents: "none" }}>
          +${p.amount.toLocaleString()}
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8b919c" }}>Banked this year</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 38, fontWeight: 900, color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              ${display.toLocaleString()}
            </span>
            <span style={{ display: "inline-block", fontSize: 22, animation: flashing ? "coinSpin .8s ease-out" : "none" }}>🪙</span>
          </div>
          <div style={{ fontSize: 11.5, color: "#6f7682", marginTop: 4 }}>
            of ${goal.toLocaleString()} goal · <span style={{ color: "#e7c34a", fontWeight: 700 }}>{Math.round(pct)}%</span>
          </div>
        </div>

        {/* the literal growing stack of bills */}
        <div style={{ display: "flex", flexDirection: "column-reverse", alignItems: "center", gap: 2, minHeight: 64, justifyContent: "flex-end" }}>
          {Array.from({ length: layers }).map((_, i) => {
            const isTop = i === layers - 1
            return (
              <div key={i} style={{
                width: 46 - (i % 2) * 3, height: 5, borderRadius: 2,
                background: "linear-gradient(90deg,#1e7a52,#3fae74,#1e7a52)",
                border: "1px solid #0d3d29",
                boxShadow: isTop && flashing ? "0 0 12px rgba(247,215,116,0.9)" : "0 1px 2px rgba(0,0,0,.4)",
                animation: isTop && flashing ? "billDrop .6s cubic-bezier(.2,1.4,.4,1)" : "none",
              }} />
            )
          })}
          <div style={{ fontSize: 9, color: "#5b6170", marginTop: 4, fontWeight: 700 }}>THE STACK</div>
        </div>
      </div>

      {/* goal progress bar */}
      <div style={{ marginTop: 12, height: 8, borderRadius: 99, background: "#0c0e13", border: "1px solid #23262e", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: "linear-gradient(90deg,#1e7a52,#f7d774)", boxShadow: "0 0 12px rgba(247,215,116,0.5)", transition: "width .7s cubic-bezier(.2,.7,.2,1)" }} />
      </div>
    </div>
  )
}

function HeroCard({ card, flipped, onFlip, onApply, onApprove, onDeny, onDismiss, onReceive, onLog, onDeposit, onInfo, onSetDate }: { card: Card; flipped: boolean; onFlip: () => void; onApply: () => void; onApprove: () => void; onDeny: () => void; onDismiss: () => void; onReceive: () => void; onLog: (v: number) => void; onDeposit: (amount: number, source: string) => void; onInfo: () => void; onSetDate: (k: keyof NonNullable<Card["dates"]>, v: string) => void }) {
  const m = MOD[card.module]
  const dim = card.phase === "waiting" || card.phase === "rejected"
  // Both faces are absolutely stacked, so the container has no intrinsic height.
  // Measure whichever face is showing and size the container to it — this keeps
  // the (often taller) back from spilling under the next card, and we lift the
  // z-index while flipped so the 3D swing renders above its neighbors.
  const frontRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)
  const [h, setH] = useState<number | undefined>(undefined)

  useLayoutEffect(() => {
    const measure = () => setH((flipped ? backRef.current : frontRef.current)?.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    if (frontRef.current) ro.observe(frontRef.current)
    if (backRef.current) ro.observe(backRef.current)
    return () => ro.disconnect()
  }, [flipped, card])

  return (
    <div className="hc" style={{ zIndex: flipped ? 20 : 0 }}>
      <div className={`hc-inner${flipped ? " flip" : ""}`} style={{ height: h }}>
        {/* FRONT */}
        <div className="hc-face" ref={frontRef}>
          {card.phase === "offer" && <OfferFace card={card} m={m} onApply={onApply} onFlip={onFlip} />}
          {(card.phase === "applying" || card.phase === "recon") && <ApplyFace card={card} m={m} onApprove={onApprove} onDeny={onDeny} onFlip={onFlip} onInfo={onInfo} />}
          {card.phase === "rejected" && <RejectedFace card={card} m={m} onDismiss={onDismiss} onFlip={onFlip} onInfo={onInfo} />}
          {card.phase === "active" && <ActiveFace card={card} m={m} onFlip={onFlip} onReceive={onReceive} onLog={onLog} onDeposit={onDeposit} />}
          {card.phase === "waiting" && <WaitingFace card={card} m={m} onFlip={onFlip} onReceive={onReceive} />}
        </div>
        {/* BACK */}
        <div className="hc-face hc-back" ref={backRef}>
          <BackFace card={card} m={m} onFlip={onFlip} dim={dim} onInfo={onInfo} onSetDate={onSetDate} />
        </div>
      </div>
    </div>
  )
}

function fmtVal(n: number, unit?: "$" | ""): string {
  return unit === "$" ? `$${n.toLocaleString()}` : n.toLocaleString()
}

function ModuleTab({ m }: { m: typeof MOD[Module] }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#fff", background: `linear-gradient(135deg, ${m.from}, ${m.to})`, padding: "3px 9px", borderRadius: 99 }}>
      {m.label}
    </span>
  )
}

function FlipBtn({ onFlip, light }: { onFlip: () => void; light?: boolean }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onFlip() }}
      title="Flip for details"
      style={{ background: light ? "rgba(255,255,255,0.14)" : "#1a1d24", border: "1px solid rgba(255,255,255,0.14)", color: light ? "#fff" : "#9aa1ad", width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      ⤺
    </button>
  )
}

/* ---------- OFFER: the recruitable quest card ---------- */
function OfferFace({ card, m, onApply, onFlip }: { card: Card; m: typeof MOD[Module]; onApply: () => void; onFlip: () => void }) {
  return (
    <div className="hc-lift" style={{ borderRadius: 16, overflow: "hidden", background: "#161922", border: "1px solid #262a35", boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>
      <div style={{ background: `linear-gradient(135deg, ${m.from}, ${m.to})`, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120px 80px at 85% 0%, rgba(255,255,255,0.25), transparent)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.8)" }}>{m.label} · {card.issuer}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginTop: 2 }}>{card.name}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.75)", textTransform: "uppercase" }}>Reward</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", lineHeight: 1 }}>${card.amount}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <Chip label="🎯 Objective" value={card.requirement} />
          {card.annualFee != null && <Chip label="💳 Annual fee" value={card.annualFee ? `$${card.annualFee}` : "$0"} />}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={onApply}
            style={{ flex: 1, padding: "12px 16px", fontSize: 14, fontWeight: 800, color: "#fff", background: `linear-gradient(135deg, ${m.from}, ${m.to})`, border: "none", borderRadius: 11, cursor: "pointer", boxShadow: `0 6px 18px ${m.glow}` }}>
            ✍ Apply
          </button>
          <FlipBtn onFlip={onFlip} />
        </div>
      </div>
    </div>
  )
}

/* ---------- APPLYING / RECON: the approval gate ---------- */
function ApplyFace({ card, m, onApprove, onDeny, onFlip, onInfo }: { card: Card; m: typeof MOD[Module]; onApprove: () => void; onDeny: () => void; onFlip: () => void; onInfo: () => void }) {
  const recon = card.phase === "recon"
  const accent = recon ? "#f59e0b" : m.fg
  return (
    <div className="hc-lift" style={{ borderRadius: 16, overflow: "hidden", background: "#161922", border: `1px solid ${accent}66`, boxShadow: `0 8px 22px rgba(0,0,0,0.35), 0 0 0 1px ${accent}22` }}>
      <div style={{ background: recon ? "linear-gradient(135deg,#b45309,#92400e)" : `linear-gradient(135deg, ${m.from}, ${m.to})`, padding: "13px 16px", position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.8)" }}>{m.label} · {card.issuer}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginTop: 2 }}>{card.name}</div>
          </div>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff", background: "rgba(0,0,0,0.28)", border: "1px solid rgba(255,255,255,0.25)", padding: "4px 9px", borderRadius: 99, whiteSpace: "nowrap" }}>
            {recon ? "📞 In recon" : "✍ Applied"}
          </span>
        </div>
      </div>

      <div style={{ padding: "14px 16px 16px" }}>
        {recon && (
          <div style={{ marginBottom: 13, padding: "11px 12px", borderRadius: 11, background: "#1c160a", border: "1px solid #4a3a16" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#f0b95a", marginBottom: 4 }}>Don't take the no — call recon</div>
            {card.reconLine && <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 5, letterSpacing: "0.01em" }}>📞 {card.reconLine}</div>}
            {card.reconTip && <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "#cdb87a" }}>{card.reconTip}</div>}
          </div>
        )}

        <div style={{ fontSize: 13, fontWeight: 700, color: "#cdd2db", marginBottom: 11, textAlign: "center" }}>
          {recon ? "Any luck after recon?" : "Did your application get approved?"}
        </div>

        <div style={{ display: "flex", gap: 9, marginBottom: 11 }}>
          <button onClick={onApprove}
            style={{ flex: 1, padding: "12px", fontSize: 13.5, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#0d9668,#0b7a55)", border: "none", borderRadius: 11, cursor: "pointer", boxShadow: "0 5px 16px rgba(13,150,104,0.4)" }}>
            ✓ {recon ? "Approved on recon" : "Yes — approved"}
          </button>
          <button onClick={onDeny}
            style={{ flex: 1, padding: "12px", fontSize: 13.5, fontWeight: 800, color: recon ? "#fca5a5" : "#cdd2db", background: recon ? "rgba(220,38,38,0.12)" : "#1a1d24", border: `1px solid ${recon ? "#7f1d1d" : "#2a2e38"}`, borderRadius: 11, cursor: "pointer" }}>
            ✗ {recon ? "Final denial" : "No — denied"}
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
          <button onClick={(e) => { e.stopPropagation(); onInfo() }} style={{ background: "none", border: "none", color: "#7b8290", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>Full details</button>
          <button onClick={(e) => { e.stopPropagation(); onFlip() }} style={{ background: "none", border: "none", color: "#7b8290", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>Flip ⤺</button>
        </div>
      </div>
    </div>
  )
}

/* ---------- REJECTED: keep the info, move on ---------- */
function RejectedFace({ card, m, onDismiss, onFlip, onInfo }: { card: Card; m: typeof MOD[Module]; onDismiss: () => void; onFlip: () => void; onInfo: () => void }) {
  return (
    <div className="hc-lift" style={{ borderRadius: 14, background: "#16121296", border: "1px solid #3a2222", padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, opacity: 0.9 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: "#241818", border: "1px solid #3a2222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, filter: "grayscale(0.3)" }}>🚫</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#b9a3a3" }}>{card.name}</span>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#e88", background: "#2a1a1a", border: "1px solid #4a2a2a", padding: "2px 7px", borderRadius: 99 }}>Not approved</span>
        </div>
        <div style={{ fontSize: 11.5, color: "#8a7676", marginTop: 3 }}>
          Info kept for your records · retry after the cooldown
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onInfo() }} title="View details"
        style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #3a2a2a", background: "transparent", color: "#cdb8b8", cursor: "pointer", fontSize: 13, flexShrink: 0 }}>ℹ</button>
      <button onClick={onFlip} title="Flip for details"
        style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #3a2a2a", background: "transparent", color: "#cdb8b8", cursor: "pointer", fontSize: 13, flexShrink: 0 }}>⤺</button>
      <button onClick={(e) => { e.stopPropagation(); onDismiss() }} title="Remove from board"
        style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #3a2a2a", background: "transparent", color: "#8a7676", cursor: "pointer", fontSize: 15, flexShrink: 0 }}>✕</button>
    </div>
  )
}

/* ---------- ACTIVE: XP bar + single objective + working log panel ---------- */
function ActiveFace({ card, m, onFlip, onReceive, onLog, onDeposit }: { card: Card; m: typeof MOD[Module]; onFlip: () => void; onReceive: () => void; onLog: (v: number) => void; onDeposit: (amount: number, source: string) => void }) {
  const cur = card.current ?? 0
  const target = card.target ?? 1
  const pct = Math.round(Math.min(100, (cur / target) * 100))
  const urgent = (card.daysLeft ?? 99) <= 14
  const ready = pct >= 100
  const isPaycheck = card.module === "paycheck"
  const [logging, setLogging] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [val, setVal] = useState(String(cur))

  function save(v: number) { onLog(v); setLogging(false) }
  const step = card.unit === "$" ? (target >= 5000 ? 1000 : 500) : 1

  return (
    <div className="hc-lift" style={{ borderRadius: 16, background: "#161922", border: `1px solid ${m.fg}55`, boxShadow: `0 8px 22px rgba(0,0,0,0.35), 0 0 0 1px ${m.fg}22`, padding: "14px 16px 16px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 4, bottom: 0, background: `linear-gradient(${m.from}, ${m.to})` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingLeft: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ModuleTab m={m} />
          <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{card.name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>${card.amount}</span>
          <FlipBtn onFlip={onFlip} />
        </div>
      </div>

      <div style={{ paddingLeft: 6, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#cdd2db" }}>🎯 {card.objective}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: m.fg }}>{fmtVal(cur, card.unit)} / {fmtVal(target, card.unit)}</span>
        </div>
        {/* XP bar that fills toward a fat stack of cash at the finish line */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 14, borderRadius: 99, background: "#0c0e13", border: "1px solid #23262e", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: `linear-gradient(90deg, ${m.from}, ${m.to})`, borderRadius: 99, boxShadow: `0 0 14px ${m.glow}`, transition: "width .5s ease", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, height: "100%", width: "22%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)", animation: "shimmer 2.2s linear infinite" }} />
            </div>
          </div>
          <CashStack pct={pct} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingRight: 40 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: m.fg }}>{pct}% to the stack</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: urgent ? "#f59e0b" : "#7b8290" }}>
            ⏱ {card.daysLeft}d left · by {card.deadline}
          </span>
        </div>
      </div>

      {/* inline log panel — paycheck cards log a single deposit (amount + source);
          spending/savings update a running total. */}
      {logging && !ready && isPaycheck && (
        <DepositPanel m={m} onCancel={() => setLogging(false)}
          onLog={(amt, src) => { onDeposit(amt, src); setLogging(false) }} />
      )}
      {logging && !ready && !isPaycheck && (
        <div style={{ marginLeft: 6, marginBottom: 12, padding: "12px", borderRadius: 11, background: "#0f1219", border: `1px solid ${m.fg}44` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9aa1ad", marginBottom: 8 }}>
            Update {card.unit === "$" ? "total" : "count"} so far
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            {card.unit === "$" && <span style={{ fontSize: 16, fontWeight: 800, color: "#cdd2db" }}>$</span>}
            <input autoFocus type="number" value={val} onChange={e => setVal(e.target.value)}
              style={{ flex: 1, padding: "9px 11px", fontSize: 15, fontWeight: 700, background: "#161922", border: "1px solid #2a2e38", borderRadius: 9, color: "#fff", outline: "none" }} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <Quick label={`+${fmtVal(step, card.unit)}`} onClick={() => setVal(String(Math.min(target, cur + step)))} />
            <Quick label={`+${fmtVal(step * 2, card.unit)}`} onClick={() => setVal(String(Math.min(target, cur + step * 2)))} />
            <Quick label="Hit goal 🎯" onClick={() => setVal(String(target))} gold />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => save(Number(val) || 0)}
              style={{ flex: 1, padding: "9px 14px", fontSize: 13, fontWeight: 800, color: "#fff", background: `linear-gradient(135deg, ${m.from}, ${m.to})`, border: "none", borderRadius: 9, cursor: "pointer" }}>Save</button>
            <button onClick={() => { setLogging(false); setVal(String(cur)) }}
              style={{ padding: "9px 14px", fontSize: 13, fontWeight: 700, color: "#8b919c", background: "transparent", border: "1px solid #2a2e38", borderRadius: 9, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {confirming && <ReceivePrompt onConfirm={() => { setConfirming(false); onReceive() }} onCancel={() => setConfirming(false)} />}

      <div style={{ paddingLeft: 6, display: "flex", gap: 8 }}>
        {!ready && (
          <button onClick={() => { setVal(String(cur)); setLogging(v => !v) }}
            style={{ flex: 1, padding: "11px 16px", fontSize: 13, fontWeight: 800, color: "#fff", background: logging ? "#2a2e38" : `linear-gradient(135deg, ${m.from}, ${m.to})`, border: "none", borderRadius: 11, cursor: "pointer", boxShadow: logging ? "none" : `0 5px 16px ${m.glow}` }}>
            {logging ? "Close" : isPaycheck ? "＋ Log a deposit" : "✓ Log progress"}
          </button>
        )}
        <button onClick={() => { setLogging(false); setConfirming(v => !v) }}
          style={{ flex: ready ? 1 : "0 0 auto", padding: "11px 14px", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", color: ready ? "#3d2c00" : "#e7c34a", background: ready ? "linear-gradient(135deg,#f7d774,#d4a017)" : "transparent", border: ready ? "none" : "1px solid #6b5a1f", borderRadius: 11, cursor: "pointer", boxShadow: ready ? "0 5px 16px rgba(247,215,116,0.5)" : "none" }}>
          {ready ? "💰 Mark received" : "💰 Received"}
        </button>
      </div>
    </div>
  )
}

/* Quick "when did it post?" capture before banking the bonus. */
function ReceivePrompt({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const [d, setD] = useState(TODAY)
  return (
    <div style={{ marginLeft: 6, marginBottom: 12, padding: "12px", borderRadius: 11, background: "#15130c", border: "1px solid #4a3a16" }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#e7c34a", marginBottom: 8 }}>📅 When did the bonus post?</div>
      <input type="date" value={d} onClick={e => e.stopPropagation()} onChange={e => setD(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", background: "#161922", border: "1px solid #3a3016", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700, padding: "9px 11px", fontFamily: "inherit", colorScheme: "dark", outline: "none", marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onConfirm}
          style={{ flex: 1, padding: "9px 14px", fontSize: 13, fontWeight: 800, color: "#3d2c00", background: "linear-gradient(135deg,#f7d774,#d4a017)", border: "none", borderRadius: 9, cursor: "pointer" }}>💰 Confirm received</button>
        <button onClick={onCancel}
          style={{ padding: "9px 14px", fontSize: 13, fontWeight: 700, color: "#8b919c", background: "transparent", border: "1px solid #2a2e38", borderRadius: 9, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  )
}

/* Paycheck deposit capture: how much hit the account + where it came from.
   Source defaults to employer DD (what most bonuses require) but the user can
   attribute it to any linked account — that's the data we keep going forward. */
function DepositPanel({ m, onLog, onCancel }: { m: typeof MOD[Module]; onLog: (amount: number, source: string) => void; onCancel: () => void }) {
  const [amt, setAmt] = useState("")
  const [source, setSource] = useState(DD_SOURCE)
  const sources = [DD_SOURCE, ...LINKED_ACCOUNTS]
  const valid = Number(amt) > 0
  return (
    <div style={{ marginLeft: 6, marginBottom: 12, padding: "12px", borderRadius: 11, background: "#0f1219", border: `1px solid ${m.fg}44` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9aa1ad", marginBottom: 7 }}>How much hit the account?</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#cdd2db" }}>$</span>
        <input autoFocus type="number" inputMode="decimal" placeholder="0" value={amt} onChange={e => setAmt(e.target.value)}
          style={{ flex: 1, padding: "9px 11px", fontSize: 15, fontWeight: 700, background: "#161922", border: "1px solid #2a2e38", borderRadius: 9, color: "#fff", outline: "none" }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9aa1ad", marginBottom: 7 }}>Where did it come from?</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {sources.map(s => {
          const on = source === s
          const dd = s === DD_SOURCE
          return (
            <button key={s} onClick={() => setSource(s)}
              style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 9, cursor: "pointer", textAlign: "left",
                background: on ? `${m.fg}1f` : "#161922", border: `1px solid ${on ? m.fg : "#2a2e38"}`, transition: "all .12s" }}>
              <span style={{ width: 15, height: 15, borderRadius: 99, flexShrink: 0, border: `2px solid ${on ? m.fg : "#3a3f4a"}`, background: on ? m.fg : "transparent", boxShadow: on ? `0 0 0 2px ${m.fg}33` : "none" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: on ? "#fff" : "#cdd2db" }}>{dd ? "🏦 " : "💳 "}{s}</span>
              {dd && <span style={{ marginLeft: "auto", fontSize: 9.5, fontWeight: 800, letterSpacing: ".04em", color: m.fg, background: `${m.fg}22`, padding: "2px 6px", borderRadius: 5 }}>QUALIFIES</span>}
            </button>
          )
        })}
      </div>
      {source !== DD_SOURCE && (
        <div style={{ fontSize: 10.5, fontWeight: 600, color: "#c9974a", marginBottom: 10, lineHeight: 1.45 }}>
          ⚠ Transfers from your own accounts often don't count as a qualifying direct deposit — confirm this one triggers the bonus.
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={!valid} onClick={() => valid && onLog(Number(amt), source)}
          style={{ flex: 1, padding: "9px 14px", fontSize: 13, fontWeight: 800, color: valid ? "#fff" : "#5a606b", background: valid ? `linear-gradient(135deg, ${m.from}, ${m.to})` : "#1c2029", border: "none", borderRadius: 9, cursor: valid ? "pointer" : "default" }}>Add deposit</button>
        <button onClick={onCancel}
          style={{ padding: "9px 14px", fontSize: 13, fontWeight: 700, color: "#8b919c", background: "transparent", border: "1px solid #2a2e38", borderRadius: 9, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  )
}

function Quick({ label, onClick, gold }: { label: string; onClick: () => void; gold?: boolean }) {
  return (
    <button onClick={onClick}
      style={{ padding: "6px 11px", fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: "pointer",
        background: gold ? "rgba(247,215,116,0.14)" : "#161922",
        border: gold ? "1px solid #6b5a1f" : "1px solid #2a2e38",
        color: gold ? "#e7c34a" : "#cdd2db" }}>
      {label}
    </button>
  )
}

/* ---------- FEE STRIP: net-after-fees + dodge-vs-HYSA, bank bonuses only ---------- */
function Switch({ on, onToggle, color }: { on: boolean; onToggle: () => void; color: string }) {
  return (
    <button onClick={onToggle} role="switch" aria-checked={on}
      style={{ width: 42, height: 24, borderRadius: 99, border: "none", cursor: "pointer", flexShrink: 0,
        background: on ? color : "#2a2e38", position: "relative", transition: "background .2s" }}>
      <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: 99, background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.4)" }} />
    </button>
  )
}

function FeeStrip({ card }: { card: Card }) {
  const a = feeAnalysis(card)
  const [avoid, setAvoid] = useState(a.recommend === "waive")
  const ddWaiver = a.waiver?.type === "dd"
  const stackProtected = avoid && (a.recommend === "waive")
  const net = avoid ? a.netIfWaive : a.netIfPay
  const netNeg = net <= 0
  const gold = "#d4a017"

  let insight: { tone: "good" | "warn"; text: string }
  if (avoid && a.canWaive) {
    insight = a.recommend === "waive"
      ? { tone: "good", text: ddWaiver
          ? "Waiver is free — just keep a qualifying deposit going. No fees, no parked cash."
          : `Parking $${a.parked.toLocaleString()} costs ~$${a.oppCost} in lost HYSA yield — still beats the $${a.totalFees} in fees.` }
      : { tone: "warn", text: `Heads up: parking $${a.parked.toLocaleString()} loses ~$${a.oppCost} vs a ${(BEST_HYSA_APY * 100).toFixed(1)}% HYSA — more than the $${a.totalFees} in fees. Cheaper to just pay.` }
  } else {
    insight = a.recommend === "pay"
      ? { tone: "good", text: a.canWaive
          ? `Smart — dodging the $${a.totalFees} fee means parking $${a.parked.toLocaleString()} (~$${a.oppCost} of lost HYSA yield). Just eat the fee.`
          : `No waiver available — the $${a.totalFees} fee is unavoidable. Still nets $${net}.` }
      : { tone: "warn", text: `You could skip $${a.totalFees} in fees by ${a.waiver?.label} (~$${a.oppCost} opportunity cost). Toggle on to protect your stack.` }
  }

  return (
    <div style={{ marginTop: 4, marginLeft: 10, marginRight: 10, borderRadius: "0 0 13px 13px", background: "#15130c", border: "1px solid #2e2713", borderTop: "none", padding: "11px 14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 9 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#e7c34a", letterSpacing: "0.04em" }}>⚠ FEES</span>
        {(card.monthlyFee ?? 0) > 0 && <FeeChip>${card.monthlyFee}/mo · ${a.totalFees} over {a.months}mo</FeeChip>}
        {(card.earlyClosureFee ?? 0) > 0 && <FeeChip>${card.earlyClosureFee} if closed before {card.safeCloseEst}</FeeChip>}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {stackProtected && (
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", color: "#1f4d34", background: "linear-gradient(135deg,#7fe3b0,#3fae74)", padding: "3px 9px", borderRadius: 99 }}>
              🛡 STACK PROTECTED
            </span>
          )}
          <span style={{ fontSize: 13, fontWeight: 800, color: netNeg ? "#f87171" : "#3fae74" }}>
            {netNeg ? "⚠ " : ""}Nets ≈ ${net.toLocaleString()}
          </span>
        </span>
      </div>

      {(card.monthlyFee ?? 0) > 0 && a.canWaive && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
          <Switch on={avoid} onToggle={() => setAvoid(v => !v)} color={gold} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#d7cfae" }}>
            Avoid the ${card.monthlyFee}/mo fee — {a.waiver?.label}
          </span>
        </div>
      )}

      <div style={{ fontSize: 11.5, lineHeight: 1.5, color: insight.tone === "good" ? "#9fd9b8" : "#e7c97a", display: "flex", gap: 6 }}>
        <span style={{ flexShrink: 0 }}>{insight.tone === "good" ? "✓" : "💡"}</span>
        <span>{insight.text}</span>
      </div>
    </div>
  )
}

function FeeChip({ children }: { children: ReactNode }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: "#cdb87a", background: "#211c0e", border: "1px solid #3a3016", padding: "3px 8px", borderRadius: 7 }}>
      {children}
    </span>
  )
}

/* ---------- WAITING: cooldown with a holding-period fill bar ---------- */
function WaitingFace({ card, m, onFlip, onReceive }: { card: Card; m: typeof MOD[Module]; onFlip: () => void; onReceive: () => void }) {
  const total = card.waitTotalDays ?? card.holdingDays ?? Math.max(1, card.waitDays ?? 1)
  const left = Math.max(0, card.waitDays ?? 0)
  const elapsed = Math.max(0, total - left)
  const targetPct = Math.min(100, Math.round((elapsed / total) * 100))
  // Animate the fill from day 1 each time the board loads, so progress is visible on every login.
  const [w, setW] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setW(targetPct), 90)
    return () => clearTimeout(t)
  }, [targetPct])
  const ready = left <= 0
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="hc-lift" style={{ borderRadius: 14, background: "#13151b", border: "1px solid #20232c", padding: "12px 14px 13px", opacity: 0.96 }}>
      {/* identity row */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 11 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#1a1d24", border: "1px solid #262a35", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, filter: "grayscale(0.4)", flexShrink: 0 }}>⏳</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#aeb4bf" }}>{card.name}</span>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8b919c", background: "#1d2028", border: "1px solid #2a2e38", padding: "2px 7px", borderRadius: 99 }}>Waiting</span>
          </div>
          <div style={{ fontSize: 11.5, color: "#6f7682", marginTop: 2 }}>{card.waitingFor} · ready {card.waitUntil}</div>
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#7b8290", flexShrink: 0 }}>${card.amount}</span>
        <button onClick={() => setConfirming(v => !v)} title="Mark bonus received"
          style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${confirming ? "#e7c34a" : "#6b5a1f"}`, background: confirming ? "rgba(247,215,116,0.14)" : "transparent", color: "#e7c34a", cursor: "pointer", fontSize: 14, flexShrink: 0 }}>💰</button>
        <FlipBtn onFlip={onFlip} />
      </div>

      {confirming && <div style={{ marginBottom: 11 }}><ReceivePrompt onConfirm={() => { setConfirming(false); onReceive() }} onCancel={() => setConfirming(false)} /></div>}

      {/* holding-period fill bar: day 1 → ready */}
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: "#565d68", flexShrink: 0 }}>Day 1</span>
        <div style={{ flex: 1, height: 11, borderRadius: 99, background: "#0c0e13", border: "1px solid #23262e", overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, width: `${w}%`, borderRadius: 99, background: ready ? "linear-gradient(90deg,#1e7a52,#f7d774)" : `linear-gradient(90deg, ${m.from}, ${m.to})`, boxShadow: `0 0 10px ${m.glow}`, transition: "width 1.1s cubic-bezier(.2,.7,.2,1)", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, height: "100%", width: "22%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)", animation: "shimmer 2.6s linear infinite" }} />
          </div>
        </div>
        <span style={{ fontSize: 12, flexShrink: 0 }}>{ready ? "💵" : "🏁"}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: m.fg }}>{targetPct}% there · {elapsed} of {total}d</span>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: ready ? "#3fae74" : "#e7c34a" }}>
          {ready ? "Ready to claim" : `${left} days left`}
        </span>
      </div>
    </div>
  )
}

/* ---------- BACK: the under-the-hood stat sheet ---------- */
function dateFields(card: Card): { key: keyof NonNullable<Card["dates"]>; label: string }[] {
  const spend = card.module === "spending"
  return [
    { key: "opened", label: spend ? "Card approved" : "Account opened" },
    { key: spend ? "metReq" : "funded", label: spend ? "Spend completed" : card.module === "savings" ? "Funded" : "DD requirement met" },
    { key: "bonusPosted", label: "Bonus posted" },
    { key: "closed", label: spend ? "Card closed" : "Account closed" },
  ]
}

function DateRow({ label, value, onChange, m }: { label: string; value: string; onChange: (v: string) => void; m: typeof MOD[Module] }) {
  const set = !!value
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <span style={{ fontSize: 12, color: "#9aa1ad" }}>{label}</span>
      <input type="date" value={value} onClick={e => e.stopPropagation()} onChange={e => { e.stopPropagation(); onChange(e.target.value) }}
        style={{ background: "#0f1219", border: `1px solid ${set ? m.fg + "66" : "#2a2e38"}`, borderRadius: 8, color: set ? "#fff" : "#6b7280", fontSize: 12, fontWeight: 600, padding: "5px 8px", fontFamily: "inherit", colorScheme: "dark", outline: "none", cursor: "pointer" }} />
    </div>
  )
}

function BackFace({ card, m, onFlip, dim, onInfo, onSetDate }: { card: Card; m: typeof MOD[Module]; onFlip: () => void; dim?: boolean; onInfo: () => void; onSetDate: (k: keyof NonNullable<Card["dates"]>, v: string) => void }) {
  return (
    <div style={{ borderRadius: 16, background: "#10131a", border: `1px solid ${m.fg}44`, padding: "14px 16px 16px", boxShadow: "0 8px 22px rgba(0,0,0,0.4)", opacity: dim ? 0.96 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ModuleTab m={m} />
          <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{card.name}</span>
        </div>
        <FlipBtn onFlip={onFlip} light />
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5b6170", marginBottom: 7 }}>Checklist</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 14 }}>
        {card.checklist.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "3px 0" }}>
            <span style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0, border: it.done ? "none" : `2px solid ${it.current ? m.fg : "#33373f"}`, background: it.done ? m.fg : "transparent", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: it.current && !it.done ? `0 0 8px ${m.glow}` : "none" }}>
              {it.done && <svg width="9" height="9" viewBox="0 0 14 14" fill="none"><path d="M3 7L6 10L11 4" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </span>
            <span style={{ fontSize: 12.5, color: it.done ? "#5b6170" : it.current ? "#fff" : "#7b8290", fontWeight: it.current ? 700 : 500, textDecoration: it.done ? "line-through" : "none" }}>{it.label}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5b6170", marginBottom: 7 }}>Under the hood</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <Stat label="Reward" value={`$${card.amount}`} m={m} />
        <Stat label="Requirement" value={card.effort} m={m} />
        {card.startedDaysAgo != null && <Stat label="Started" value={`${card.startedDaysAgo}d ago`} m={m} />}
        {card.payoutEst && <Stat label="Payout est." value={card.payoutEst} m={m} />}
        {card.safeCloseEst && <Stat label="Safe to close" value={card.safeCloseEst} m={m} />}
        {card.annualFee != null && <Stat label="Annual fee" value={card.annualFee ? `$${card.annualFee}` : "$0"} m={m} />}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 7 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5b6170" }}>Your dates</span>
        <span style={{ fontSize: 9.5, color: "#4b515c" }}>tap to edit</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14, background: "#0c0e13", border: "1px solid #1c1f27", borderRadius: 11, padding: "10px 12px" }}>
        {dateFields(card).map(f => (
          <DateRow key={f.key} label={f.label} value={card.dates?.[f.key] ?? ""} onChange={v => onSetDate(f.key, v)} m={m} />
        ))}
      </div>

      {card.deposits && card.deposits.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5b6170" }}>Deposits logged</span>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: m.fg }}>{card.deposits.length} · ${card.deposits.reduce((s, d) => s + d.amount, 0).toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14, background: "#0c0e13", border: "1px solid #1c1f27", borderRadius: 11, padding: "10px 12px" }}>
            {card.deposits.map((d, i) => {
              const dd = d.source === DD_SOURCE
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>${d.amount.toLocaleString()}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: dd ? "#9aa1ad" : "#c9974a" }}>
                    {dd ? "🏦" : "💳"} {d.source}
                    {!dd && <span title="May not qualify as a direct deposit">⚠</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={(e) => { e.stopPropagation(); onInfo() }}
          style={{ flex: 1, textAlign: "center", padding: "10px 14px", fontSize: 12.5, fontWeight: 800, color: "#3d2c00", background: "linear-gradient(135deg,#f7d774,#d4a017)", border: "none", borderRadius: 11, cursor: "pointer" }}>
          📋 Full details
        </button>
        <a href="#" onClick={(e) => e.preventDefault()} style={{ flex: 1, textAlign: "center", padding: "10px 14px", fontSize: 12.5, fontWeight: 700, color: m.fg, border: `1px solid ${m.fg}66`, borderRadius: 11, textDecoration: "none" }}>
          Open in {m.label} →
        </a>
      </div>
    </div>
  )
}

/* The "fat stack" finish line — dim until you get close, then it lights up gold. */
function CashStack({ pct }: { pct: number }) {
  const near = pct >= 70
  const done = pct >= 100
  return (
    <div title="The payout" style={{
      width: 30, height: 30, flexShrink: 0, borderRadius: 9,
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
      background: near ? "linear-gradient(135deg,#f7d774,#d4a017)" : "#1a1d24",
      border: near ? "1px solid #f7d774" : "1px solid #2a2e38",
      filter: near ? "none" : "grayscale(0.7) brightness(0.85)",
      boxShadow: done ? "0 0 16px rgba(247,215,116,0.9)" : near ? "0 0 10px rgba(247,215,116,0.5)" : "none",
      animation: done ? "pulseGlow 1.2s ease-in-out infinite" : "none",
    }}>
      💵
    </div>
  )
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#0f1219", border: "1px solid #23262e", borderRadius: 10, padding: "8px 11px", flex: "1 1 auto", minWidth: 130 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#d7dbe2" }}>{value}</div>
    </div>
  )
}

function Stat({ label, value, m }: { label: string; value: string; m: typeof MOD[Module] }) {
  return (
    <div style={{ background: "#0f1219", border: "1px solid #23262e", borderRadius: 9, padding: "7px 10px" }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#5b6170", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: m.fg }}>{value}</div>
    </div>
  )
}

/* ---------- FULL INFO: everything about the bonus in one sheet ---------- */
function FullInfoModal({ card, onClose, onReceive }: { card: Card; onClose: () => void; onReceive: () => void }) {
  const m = MOD[card.module]
  const rows: [string, string | null | undefined][] = [
    ["Institution", card.issuer],
    ["Bonus type", card.category],
    ["Reward", card.rewardDetail ?? `$${card.amount}`],
    ["Requirement", card.requirement],
    ["Direct deposit", card.ddRequired],
    ["Holding period", card.holdingDays ? `${card.holdingDays} days` : null],
    ["Promo APY", card.apy],
    ["Opened", card.openedDate],
    ["Action deadline", card.deadline && card.daysLeft != null ? `${card.deadline} (${card.daysLeft}d)` : null],
    ["Est. payout", card.payoutEst],
    ["Safe to close", card.safeCloseEst],
    ["Annual fee", card.annualFee != null ? (card.annualFee ? `$${card.annualFee}` : "$0") : null],
    ["Monthly fee", card.monthlyFee != null ? (card.monthlyFee ? `$${card.monthlyFee}/mo` : "$0") : null],
    ["Early-close fee", card.earlyClosureFee != null ? (card.earlyClosureFee ? `$${card.earlyClosureFee}` : "$0") : null],
    ["Re-bonus cooldown", card.cooldownMonths ? `${card.cooldownMonths} months` : null],
    ["Lifetime language", card.lifetimeRestricted ? "Yes — once per lifetime" : null],
  ]
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.66)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto", background: "#11141b", borderRadius: "18px 18px 0 0", border: "1px solid #23262e", borderBottom: "none", boxShadow: "0 -10px 40px rgba(0,0,0,0.5)" }}>
        {/* header band */}
        <div style={{ position: "sticky", top: 0, background: `linear-gradient(135deg, ${m.from}, ${m.to})`, padding: "16px 18px", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.82)" }}>{m.label} · {card.issuer}</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: "#fff", marginTop: 2 }}>{card.name}</div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.14)", color: "#fff", fontSize: 16, cursor: "pointer", flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: "#fff", marginTop: 8 }}>${card.amount.toLocaleString()}</div>
        </div>

        <div style={{ padding: "16px 18px 20px" }}>
          {/* checklist */}
          <SectionLabel>Progress</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 18 }}>
            {card.checklist.map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
                <span style={{ width: 17, height: 17, borderRadius: 5, flexShrink: 0, border: it.done ? "none" : `2px solid ${it.current ? m.fg : "#33373f"}`, background: it.done ? m.fg : "transparent", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: it.current && !it.done ? `0 0 8px ${m.glow}` : "none" }}>
                  {it.done && <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M3 7L6 10L11 4" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </span>
                <span style={{ fontSize: 13.5, color: it.done ? "#5b6170" : it.current ? "#fff" : "#7b8290", fontWeight: it.current ? 700 : 500, textDecoration: it.done ? "line-through" : "none" }}>{it.label}</span>
              </div>
            ))}
          </div>

          {/* every field */}
          <SectionLabel>The details</SectionLabel>
          <div style={{ borderRadius: 12, border: "1px solid #23262e", overflow: "hidden", marginBottom: 18 }}>
            {rows.filter(([, v]) => v != null && v !== "").map(([k, v], i) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 13px", background: i % 2 ? "#0f1219" : "#12151c", borderTop: i ? "1px solid #1c1f27" : "none" }}>
                <span style={{ fontSize: 12, color: "#7b8290", flexShrink: 0 }}>{k}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#e7eaef", textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </div>

          {card.notes && (
            <>
              <SectionLabel>Notes & gotchas</SectionLabel>
              <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "#aab0bb", background: "#0f1219", border: "1px solid #23262e", borderRadius: 12, padding: "12px 13px", marginBottom: 18 }}>
                {card.notes}
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onReceive} style={{ flex: 1, padding: "12px", fontSize: 13.5, fontWeight: 800, color: "#3d2c00", background: "linear-gradient(135deg,#f7d774,#d4a017)", border: "none", borderRadius: 12, cursor: "pointer" }}>💰 Mark received</button>
            <a href="#" onClick={e => e.preventDefault()} style={{ flex: 1, textAlign: "center", padding: "12px", fontSize: 13.5, fontWeight: 700, color: m.fg, border: `1px solid ${m.fg}66`, borderRadius: 12, textDecoration: "none" }}>Open in {m.label} →</a>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#5b6170", marginBottom: 8 }}>{children}</div>
}

/* ---------- BOTTOM HUD: persistent cooldown status bar ---------- */
function CooldownBar({ waiting, onInfo }: { waiting: Card[]; onInfo: (id: string) => void }) {
  if (waiting.length === 0) return null
  const next = [...waiting].sort((a, b) => (a.waitDays ?? 999) - (b.waitDays ?? 999))[0]
  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, background: "rgba(16,19,26,0.92)", backdropFilter: "blur(10px)", borderTop: "1px solid #23262e", boxShadow: "0 -6px 20px rgba(0,0,0,0.4)" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "9px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>⏳</span>
        <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#cdd2db", lineHeight: 1.1 }}>{waiting.length} in cooldown</span>
          <span style={{ fontSize: 10, color: "#6f7682" }}>next: {next.name} · {next.waitDays}d</span>
        </div>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", flex: 1, paddingLeft: 4, scrollbarWidth: "none" }}>
          {[...waiting].sort((a, b) => (a.waitDays ?? 999) - (b.waitDays ?? 999)).map(c => {
            const m = MOD[c.module]
            return (
              <button key={c.id} onClick={() => onInfo(c.id)}
                style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", borderRadius: 99, background: "#161922", border: "1px solid #2a2e38", cursor: "pointer" }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: m.fg, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#cdd2db", whiteSpace: "nowrap" }}>{c.issuer}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#e7c34a", whiteSpace: "nowrap" }}>{c.waitDays}d</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
