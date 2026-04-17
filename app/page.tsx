"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

const YT = "https://www.youtube.com/@nathanielbooth"
const NOTION_VIDEOS = "https://nathanielbooth.notion.site/Latest-Videos-1d2e0e2e0e2080b5b0b5e77bc8ffc5bb"

export default function HomePage() {
  const supabase = createClient()
  const [loggedIn, setLoggedIn] = useState(false)
  const [nlEmail, setNlEmail] = useState("")
  const [nlStatus, setNlStatus] = useState<"idle" | "loading" | "done" | "error">("idle")

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setLoggedIn(true)
    })
  }, [])

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        .hp-section { padding: 80px 40px; max-width: 1100px; margin: 0 auto; }
        @media (max-width: 768px) {
          .hp-section { padding: 48px 20px; }
          .hp-hero h1 { font-size: 36px !important; }
          .hp-grid { grid-template-columns: 1fr !important; }
          .hp-nav { padding: 16px 20px !important; }
          .hp-nav-links a { font-size: 12px !important; }
          .hp-footer-inner { flex-direction: column !important; gap: 16px !important; text-align: center !important; }
          .hp-yt-row { flex-direction: column !important; }
          .hp-yt-embed { max-width: 100% !important; }
          .hp-yt-text { max-width: 100% !important; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav className="hp-nav" style={{ padding: "20px 40px", maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 800, color: "#111", letterSpacing: "-0.02em", textDecoration: "none" }}>Fat Stacks Academy</Link>
        <div className="hp-nav-links" style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link href="/blog" style={{ fontSize: 14, color: "#666", textDecoration: "none" }}>Blog</Link>
          <Link href="/blog/best-checking-bonuses-2026" style={{ fontSize: 14, color: "#666", textDecoration: "none" }}>Bonus Rankings</Link>
          <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "#ff0000", textDecoration: "none", fontWeight: 600 }}>YouTube</a>
          {loggedIn ? (
            <Link href="/stacksos" style={{ fontSize: 14, fontWeight: 700, color: "#fff", background: "#0d7c5f", padding: "8px 20px", borderRadius: 8, textDecoration: "none" }}>Open Stacks OS</Link>
          ) : (
            <Link href="/stacksos" style={{ fontSize: 14, fontWeight: 700, color: "#0d7c5f", textDecoration: "none" }}>Stacks OS</Link>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hp-section hp-hero" style={{ paddingTop: 100, paddingBottom: 60 }}>
        <div style={{ maxWidth: 640 }}>
          <h1 style={{ fontSize: 52, fontWeight: 800, color: "#111", lineHeight: 1.08, letterSpacing: "-0.03em", margin: "0 0 24px" }}>
            Bank bonuses, credit card rewards, and the strategy behind it all.
          </h1>
          <p style={{ fontSize: 18, color: "#666", lineHeight: 1.7, margin: "0 0 32px" }}>
            Fat Stacks Academy is where I share how I earn thousands of dollars a year from bank sign-up bonuses, credit card welcome offers, and high-yield savings strategies. Free on YouTube. In-depth guides on the blog.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <a href={YT} target="_blank" rel="noopener noreferrer" style={{
              fontSize: 16, fontWeight: 700, color: "#fff", background: "#111",
              padding: "14px 28px", borderRadius: 10, textDecoration: "none",
            }}>
              Subscribe on YouTube
            </a>
            <Link href="/blog" style={{
              fontSize: 16, fontWeight: 600, color: "#666",
              padding: "14px 28px", borderRadius: 10, textDecoration: "none",
              border: "1px solid #ddd",
            }}>
              Read the blog
            </Link>
          </div>
        </div>
      </section>

      {/* ── Latest Video ── */}
      <section className="hp-section" style={{ paddingTop: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>Latest Video</div>
        <div className="hp-yt-row" style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
          <div className="hp-yt-embed" style={{ maxWidth: 560, width: "100%", flexShrink: 0 }}>
            <div style={{ background: "#000", borderRadius: 12, overflow: "hidden", aspectRatio: "16/9" }}>
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/cS9xRWycQQk"
                title="Latest video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ border: "none" }}
              />
            </div>
          </div>
          <div className="hp-yt-text" style={{ maxWidth: 400 }}>
            <p style={{ fontSize: 15, color: "#555", lineHeight: 1.7, margin: "0 0 16px" }}>
              I post new videos every week covering individual bonus breakdowns, application strategy, and my real results. If you want to see how this works in practice, the channel is the best place to start.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "#ff0000", fontWeight: 600, textDecoration: "none" }}>
                Subscribe on YouTube &rarr;
              </a>
              <a href={NOTION_VIDEOS} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "#0d7c5f", fontWeight: 600, textDecoration: "none" }}>
                Full video list (Notion) &rarr;
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── What We Cover ── */}
      <section className="hp-section" style={{ borderTop: "1px solid #eee" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>What We Cover</div>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#111", letterSpacing: "-0.02em", margin: "0 0 32px", lineHeight: 1.2 }}>
          Three ways to make your money work harder
        </h2>
        <div className="hp-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "28px 24px" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>&#x1F3E6;</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 8 }}>Bank Bonuses</div>
            <p style={{ fontSize: 14, color: "#888", lineHeight: 1.7, margin: 0 }}>
              Banks pay $100-$500+ when you open an account and set up direct deposit. Most people can earn $2,000-$5,000 per year just by rotating through the best offers.
            </p>
            <Link href="/blog/best-checking-bonuses-2026" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0d7c5f", marginTop: 16, textDecoration: "none" }}>
              Best checking bonuses &rarr;
            </Link>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "28px 24px" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>&#x1F4B3;</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 8 }}>Credit Card Rewards</div>
            <p style={{ fontSize: 14, color: "#888", lineHeight: 1.7, margin: 0 }}>
              Sign-up bonuses on credit cards can be worth $500-$2,000 each. With the right application order, your normal spending generates thousands in travel and cash back.
            </p>
            <Link href="/stacksos" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0d7c5f", marginTop: 16, textDecoration: "none" }}>
              Spending roadmap in Stacks OS &rarr;
            </Link>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "28px 24px" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>&#x1F4B0;</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 8 }}>Savings Bonuses</div>
            <p style={{ fontSize: 14, color: "#888", lineHeight: 1.7, margin: 0 }}>
              Park your savings at banks offering bonus APY on top of interest. Effective rates of 9-16% are possible by timing your deposits with promotional windows.
            </p>
            <Link href="/blog/best-savings-bonuses-2026" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0d7c5f", marginTop: 16, textDecoration: "none" }}>
              Best savings bonuses &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stacks OS callout ── */}
      <section className="hp-section">
        <div style={{ background: "#fff", border: "2px solid #0d7c5f", borderRadius: 16, padding: "40px 36px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
          <div style={{ maxWidth: 500 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 8 }}>Stacks OS</div>
            <p style={{ fontSize: 15, color: "#666", lineHeight: 1.7, margin: 0 }}>
              The tool I built to manage my own bonus rotation. It sequences your bank bonuses by paycheck, tracks credit card spending, and shows you exactly what to do next.
            </p>
          </div>
          <Link href="/stacksos" style={{
            fontSize: 16, fontWeight: 700, color: "#fff", background: "#0d7c5f",
            padding: "14px 32px", borderRadius: 10, textDecoration: "none", flexShrink: 0,
          }}>
            Learn more &rarr;
          </Link>
        </div>
      </section>

      {/* ── Blog highlights ── */}
      <section className="hp-section" style={{ borderTop: "1px solid #eee" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>From the Blog</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111", letterSpacing: "-0.02em", margin: "0 0 24px" }}>
          Guides and reviews
        </h2>
        <div className="hp-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[
            { title: "Best Checking Bonuses (2026)", desc: "Ranked by profitability. Chase, BofA, Capital One, and more.", href: "/blog/best-checking-bonuses-2026" },
            { title: "What Counts as Direct Deposit", desc: "Per-bank breakdown with data points from Doctor of Credit.", href: "/blog/what-counts-as-direct-deposit" },
            { title: "Best Savings Bonuses (2026)", desc: "Ranked by effective APY. Up to 16% returns.", href: "/blog/best-savings-bonuses-2026" },
            { title: "Bank Bonus Tax Guide", desc: "How bonuses are taxed, what to report, and how to track it.", href: "/blog/bank-bonus-tax-guide-2026" },
            { title: "ChexSystems Guide", desc: "Which banks are sensitive and how to manage your report.", href: "/blog/chexsystems-guide-bank-bonuses" },
            { title: "All Reviews", desc: "Individual bonus reviews for every offer we track.", href: "/blog" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 20px", textDecoration: "none", display: "block" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>{item.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── About ── */}
      <section className="hp-section" style={{ borderTop: "1px solid #eee" }}>
        <div style={{ maxWidth: 600 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>About</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111", letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            Hi, I&apos;m Nathaniel
          </h2>
          <p style={{ fontSize: 15, color: "#666", lineHeight: 1.8, margin: "0 0 12px" }}>
            I&apos;ve been earning bank bonuses and optimizing credit card rewards for years. Fat Stacks Academy is where I share everything I&apos;ve learned — the strategies, the data points, and the tools I use to stay organized.
          </p>
          <p style={{ fontSize: 15, color: "#666", lineHeight: 1.8, margin: "0 0 20px" }}>
            On YouTube I break down individual bonuses, share my application strategy, and show my real results. On this site you&apos;ll find detailed reviews of every active bonus, and Stacks OS — the tool I built to manage my own bonus rotation.
          </p>
          <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 600, color: "#ff0000", textDecoration: "none" }}>
            Subscribe on YouTube &rarr;
          </a>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className="hp-section" style={{ paddingBottom: 40 }}>
        <div style={{ background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 14, padding: "32px 28px", maxWidth: 500 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 6 }}>Stay in the loop</div>
          <p style={{ fontSize: 14, color: "#888", lineHeight: 1.6, margin: "0 0 14px" }}>
            Get notified when new bonuses drop or existing ones increase. No spam.
          </p>
          {nlStatus === "done" ? (
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0d7c5f" }}>You&apos;re subscribed!</div>
          ) : (
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!nlEmail.includes("@")) return
              setNlStatus("loading")
              const res = await fetch("/api/newsletter/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: nlEmail }),
              })
              setNlStatus(res.ok ? "done" : "error")
            }} style={{ display: "flex", gap: 8 }}>
              <input type="email" value={nlEmail} onChange={e => setNlEmail(e.target.value)} placeholder="you@email.com" required
                style={{ flex: 1, padding: "10px 14px", fontSize: 14, border: "1px solid #a7f3d0", borderRadius: 8, background: "#fff", color: "#111" }} />
              <button type="submit" disabled={nlStatus === "loading"}
                style={{ padding: "10px 20px", fontSize: 14, fontWeight: 700, background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", flexShrink: 0 }}>
                {nlStatus === "loading" ? "..." : "Subscribe"}
              </button>
            </form>
          )}
          {nlStatus === "error" && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>Something went wrong. Try again.</div>}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid #eee", padding: "32px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="hp-footer-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#bbb" }}>&copy; Fat Stacks Academy</span>
          <div style={{ display: "flex", gap: 24 }}>
            <Link href="/blog" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>Blog</Link>
            <Link href="/stacksos" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>Stacks OS</Link>
            <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>YouTube</a>
            <a href="https://fatstacksacademy.beehiiv.com/subscribe" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>Newsletter</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
