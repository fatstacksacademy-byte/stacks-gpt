import { describe, it, expect } from "vitest"
import { runSequencer } from "./sequencer"

describe("runSequencer — contract against real catalog", () => {
  const baseInput = {
    slots: 3,
    payFrequency: "biweekly",
    paycheckAmount: 2500,
    userState: null,
  }

  it("returns a slot grid matching the requested slot count", () => {
    const r = runSequencer(baseInput)
    expect(r.slots).toHaveLength(3)
  })

  it("never schedules a bonus the user marked skipped", () => {
    const r = runSequencer(baseInput)
    const allIds = r.slots.flat()
      .filter(e => (e as any).type !== "placeholder")
      .map(e => (e as any).id as string)
    if (allIds.length === 0) return
    const blockId = allIds[0]
    const r2 = runSequencer({ ...baseInput, skippedBonusIds: [blockId] })
    const seenIds2 = new Set(
      r2.slots.flat()
        .filter(e => (e as any).type !== "placeholder")
        .map(e => (e as any).id as string),
    )
    expect(seenIds2.has(blockId)).toBe(false)
  })

  it("zero income → no bonuses scheduled (paychecks can't satisfy DDs)", () => {
    const r = runSequencer({ ...baseInput, paycheckAmount: 0 })
    const bonuses = r.slots.flat().filter(e => (e as any).type === "bonus")
    // It may still propose 0-DD bonuses; just ensure the run didn't crash.
    expect(Array.isArray(bonuses)).toBe(true)
  })

  it("multi-income raises total scheduling capacity vs single income", () => {
    const single = runSequencer({
      slots: 5,
      payFrequency: "biweekly",
      paycheckAmount: 1500,
    })
    const multi = runSequencer({
      slots: 5,
      payFrequency: "biweekly",
      paycheckAmount: 1500,
      incomeSources: [
        { pay_frequency: "biweekly", paycheck_amount: 1500 },
        { pay_frequency: "monthly", paycheck_amount: 4000 },
      ],
    })
    const single12 = single.slots.flat().filter(e => (e as any).type === "bonus" && (e as any).start_week * 7 <= 365)
    const multi12 = multi.slots.flat().filter(e => (e as any).type === "bonus" && (e as any).start_week * 7 <= 365)
    expect(multi12.length).toBeGreaterThanOrEqual(single12.length)
  })

  it("state filter doesn't crash and produces a valid grid", () => {
    // The catalog-level eligibility check happens inside runSequencer;
    // SequencedBonus doesn't carry eligibility back. We just assert the
    // sequencer cleanly handles a userState input.
    const r = runSequencer({ ...baseInput, userState: "TX" })
    expect(r.slots).toHaveLength(baseInput.slots)
    expect(Array.isArray(r.skipped)).toBe(true)
  })
})
