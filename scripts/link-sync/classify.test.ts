import { describe, it, expect } from "vitest"
import { analyzeDescription, classifyLink, extractLinks } from "./classify"
import type { LinkProgram } from "./types"

const registry: LinkProgram[] = [
  {
    key: "chase-business-referral",
    label: "Chase business",
    currentUrl: "https://www.referyourchasecard.com/21f/WDA5Q4R6ON",
    aliases: ["https://www.referyourchasecard.com/21e/I1HNZSS5VJ"],
    domainMatch: /referyourchasecard\.com/i,
    contextKeywords: ["ink", "business"],
  },
  {
    key: "chase-personal-referral",
    label: "Chase personal",
    currentUrl: "",
    domainMatch: /referyourchasecard\.com/i,
    contextKeywords: ["sapphire preferred", "freedom"],
  },
  {
    key: "amex-referral-generic",
    label: "Amex refer",
    currentUrl: "",
    rotates: true,
    domainMatch: /americanexpress\.com\/(en-us\/)?referral/i,
  },
  {
    key: "sofi-money",
    label: "SoFi",
    currentUrl: "https://www.sofi.com/invite/money?gcp=abc",
    domainMatch: /sofi\.com\/invite/i,
  },
]

describe("extractLinks", () => {
  it("pulls urls and trims trailing punctuation", () => {
    const links = extractLinks("Apply here: https://www.sofi.com/invite/money?gcp=abc.")
    expect(links).toHaveLength(1)
    expect(links[0].url).toBe("https://www.sofi.com/invite/money?gcp=abc")
  })

  it("captures the line as context", () => {
    const links = extractLinks("Chase Ink Business: https://www.referyourchasecard.com/21e/I1HNZSS5VJ")
    expect(links[0].context).toContain("ink")
  })
})

describe("classifyLink", () => {
  it("flags a known alias as stale + auto-fixable to current", () => {
    const v = classifyLink(
      { url: "https://www.referyourchasecard.com/21e/I1HNZSS5VJ", context: "chase ink business" },
      registry,
    )
    expect(v.status).toBe("stale")
    expect(v.autoFixable).toBe(true)
    expect(v.target).toBe("https://www.referyourchasecard.com/21f/WDA5Q4R6ON")
  })

  it("treats the current link as current (no change)", () => {
    const v = classifyLink(
      { url: "https://www.referyourchasecard.com/21f/WDA5Q4R6ON", context: "ink" },
      registry,
    )
    expect(v.status).toBe("current")
    expect(v.autoFixable).toBe(false)
  })

  it("never auto-rewrites an unrecognized same-domain link (review only)", () => {
    const v = classifyLink(
      { url: "https://www.referyourchasecard.com/99z/SOMETHINGELSE", context: "chase ink business" },
      registry,
    )
    expect(v.status).toBe("review")
    expect(v.autoFixable).toBe(false)
  })

  it("flags a personal-context Chase link with no current url as needs-current", () => {
    const v = classifyLink(
      { url: "https://www.referyourchasecard.com/77x/PERSONAL", context: "chase sapphire preferred" },
      registry,
    )
    expect(v.status).toBe("needs-current")
    expect(v.programKey).toBe("chase-personal-referral")
  })

  it("flags affiliate-shaped unknown links as orphan", () => {
    const v = classifyLink({ url: "https://someshop.com/?ref=natebooth", context: "deal" }, registry)
    expect(v.status).toBe("orphan")
  })

  it("ignores ordinary content links", () => {
    const v = classifyLink({ url: "https://youtube.com/watch?v=abc", context: "" }, registry)
    expect(v.status).toBe("ignore")
  })
})

describe("analyzeDescription", () => {
  it("rewrites only safe links and reports a change", () => {
    const desc = [
      "Chase Ink Business card: https://www.referyourchasecard.com/21e/I1HNZSS5VJ",
      "SoFi: https://www.sofi.com/invite/money?gcp=abc",
    ].join("\n")
    const r = analyzeDescription({ videoId: "v1", title: "T", description: desc }, registry)
    expect(r.changed).toBe(true)
    expect(r.proposedDescription).toContain("21f/WDA5Q4R6ON")
    expect(r.proposedDescription).not.toContain("21e/I1HNZSS5VJ")
    // SoFi was already current — untouched.
    expect(r.proposedDescription).toContain("sofi.com/invite/money?gcp=abc")
  })

  it("makes no change when nothing is auto-fixable", () => {
    const r = analyzeDescription(
      { videoId: "v2", title: "T", description: "https://www.referyourchasecard.com/99z/UNKNOWN (ink)" },
      registry,
    )
    expect(r.changed).toBe(false)
  })
})
