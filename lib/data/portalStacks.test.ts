import { describe, expect, it } from "vitest"
import { getPortalStacks, hasPortalStacks } from "./portalStacks"

describe("portal stacks", () => {
  it("does not advertise an unverified stack for Citi's $325 checking offer", () => {
    expect(hasPortalStacks("citi-regular-checking-325-edd-2026")).toBe(false)
    expect(getPortalStacks("citi-regular-checking-325-edd-2026")).toEqual([])
  })
})
