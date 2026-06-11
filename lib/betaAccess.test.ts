import { describe, it, expect, afterEach } from "vitest"
import { hasBetaAccess, betaAllowlist } from "./betaAccess"

const ENV_KEYS = ["STACKS_BETA_EMAILS", "STACKS_BETA_DEBT_EMAILS"]

afterEach(() => {
  for (const k of ENV_KEYS) delete process.env[k]
})

describe("betaAccess", () => {
  it("allows the built-in default owner accounts with no env set", () => {
    expect(hasBetaAccess("debt", "fatstacksacademy@gmail.com")).toBe(true)
    expect(hasBetaAccess("debt", "booth.nathaniel@gmail.com")).toBe(true)
  })

  it("is case-insensitive and rejects unknown / empty emails", () => {
    expect(hasBetaAccess("debt", "FatStacksAcademy@Gmail.com")).toBe(true)
    expect(hasBetaAccess("debt", "stranger@example.com")).toBe(false)
    expect(hasBetaAccess("debt", null)).toBe(false)
    expect(hasBetaAccess("debt", undefined)).toBe(false)
    expect(hasBetaAccess("debt", "")).toBe(false)
  })

  it("merges a feature-specific env allowlist (comma/space/semicolon separated)", () => {
    process.env.STACKS_BETA_DEBT_EMAILS = "alice@example.com, bob@example.com; carol@example.com"
    expect(hasBetaAccess("debt", "alice@example.com")).toBe(true)
    expect(hasBetaAccess("debt", "bob@example.com")).toBe(true)
    expect(hasBetaAccess("debt", "carol@example.com")).toBe(true)
    // Defaults still apply.
    expect(hasBetaAccess("debt", "fatstacksacademy@gmail.com")).toBe(true)
  })

  it("honors the global STACKS_BETA_EMAILS env list", () => {
    process.env.STACKS_BETA_EMAILS = "global@example.com"
    expect(hasBetaAccess("debt", "global@example.com")).toBe(true)
    expect(betaAllowlist("debt").has("global@example.com")).toBe(true)
  })
})
