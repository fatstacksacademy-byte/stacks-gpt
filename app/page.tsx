"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

const YT = "https://www.youtube.com/@nathanielbooth"
const NOTION_VIDEOS = "https://nathanielbooth.notion.site/Latest-Videos-1d2e0e2e0e2080b5b0b5e77bc8ffc5bb"

export default function HomePage() {
  const supabase = createClient()
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setLoggedIn(true)
    })
  }, [])

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        .hp-nav { padding: 20px 40px; }
        .hp-section { padding: 60px 40px; max-width: 1100px; margin: 0 auto; }
        .hp-hero { padding: 80px 40px 60px; max-width: 1100px; margin: 0 auto; }
        .hp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .hp-card { background: #fff; border: 1px solid #e8e8e8; border-radius: 14px; padding: 28px 24px; text-decoration: none; color: inherit; transition: border-color 0.2s, box-shadow 0.2s; }
        .hp-card:hover { border-color: #0d7c5f; box-shadow: 0 8px 24px rgba(13,124,95,0.08); }
        .hp-footer { padding: 40px; max-width: 1100px; margin: 0 auto; border-top: 1px solid #e8e8e8; }
        @media (max-width: 768px) {
          .hp-nav { padding: 16px 20px; }
          .hp-section { padding: 40px 20px; }
          .hp-hero { padding: 48px 20px 40px; }
          .hp-hero h1 { font-size: 36px !important; }
          .hp-grid { grid-template-columns: 1fr; }
          .hp-footer { padding: 32px 20px; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav className="hp-nav" style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#111", letterSpacing: "-0.02em" }}>Fat Stacks Academy</span>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/blog" style={{ fontSize: 13, color: "#666", textDecoration: "none" }}>Blog</Link>
          <Link href="/blog/best-checking-bonuses-2026" style={{ fontSize: 13, color: "#666", textDecoration: "none" }}>Bonus Rankings</Link>
          <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#ff0000", textDecoration: "none", fontWeight: 600 }}>YouTube</a>
          {loggedIn ? (
            <Link href="/stacksos" style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: "#0d7c5f", padding: "8px 18px", borderRadius: 8, textDecoration: "none" }}>Open Stacks OS</Link>
          ) : (
            <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: "#0d7c5f", textDecoration: "none" }}>Log in</Link>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hp-hero">
        <div style={{ maxWidth: 700 }}>
          <div style={{
            display: "inline-block", fontSize: 11, fontWeight: 700, color: "#0d7c5f",
            background: "#e6f5f0", padding: "5px 12px", borderRadius: 99, marginBottom: 20,
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            Bank bonuses, credit card strategy, and free money
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 800, color: "#111", lineHeight: 1.08, letterSpacing: "-0.03em", margin: "0 0 20px" }}>
            Make your money
            <br />
            <span style={{ color: "#0d7c5f" }}>work harder</span>
          </h1>
          <p style={{ fontSize: 18, color: "#666", lineHeight: 1.7, margin: "0 0 12px", maxWidth: 560 }}>
            Fat Stacks Academy teaches you how to earn thousands in bank bonuses, optimize credit card rewards, and build a system that pays you to manage your money.
          </p>
          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.7, margin: "0 0 32px", maxWidth: 560 }}>
            Free content on YouTube. Tools and tracking in Stacks OS.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href={YT} target="_blank" rel="noopener noreferrer" style={{
              fontSize: 15, fontWeight: 700, color: "#fff", background: "#ff0000",
              padding: "14px 28px", borderRadius: 10, textDecoration: "none",
              boxShadow: "0 4px 16px rgba(255,0,0,0.15)",
            }}>
              Watch on YouTube
            </a>
            <Link href="/stacksos" style={{
              fontSize: 15, fontWeight: 700, color: "#fff", background: "#0d7c5f",
              padding: "14px 28px", borderRadius: 10, textDecoration: "none",
              boxShadow: "0 4px 16px rgba(13,124,95,0.2)",
            }}>
              Open Stacks OS
            </Link>
          </div>
        </div>
      </section>

      {/* ── Latest Video ── */}
      <section className="hp-section">
        <div style={{ fontSize: 13, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Latest from Nathaniel</div>
        <div style={{ background: "#000", borderRadius: 14, overflow: "hidden", maxWidth: 700, aspectRatio: "16/9" }}>
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
        <div style={{ marginTop: 12, display: "flex", gap: 16, alignItems: "center" }}>
          <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#ff0000", fontWeight: 600, textDecoration: "none" }}>
            Subscribe on YouTube
          </a>
          <a href={NOTION_VIDEOS} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#0d7c5f", fontWeight: 600, textDecoration: "none" }}>
            All videos (Notion list)
          </a>
        </div>
      </section>

      {/* ── Explore ── */}
      <section className="hp-section">
        <div style={{ fontSize: 13, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>Explore</div>
        <div className="hp-grid">

          {/* Stacks OS */}
          <Link href="/stacksos" className="hp-card" style={{ borderLeft: "3px solid #0d7c5f" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 6 }}>Stacks OS</div>
            <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, margin: 0 }}>
              Your personal bonus dashboard. Tracks bank bonuses, credit card spending, and savings — sequenced by return on your paycheck and budget.
            </p>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#0d7c5f", marginTop: 12 }}>Open app &rarr;</div>
          </Link>

          {/* Best Checking Bonuses */}
          <Link href="/blog/best-checking-bonuses-2026" className="hp-card" style={{ borderLeft: "3px solid #2563eb" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 6 }}>Best Checking Bonuses</div>
            <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, margin: 0 }}>
              Ranked by profitability. Chase, BofA, Wells Fargo, Capital One, Citi, and more — with what counts as direct deposit for each bank.
            </p>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#2563eb", marginTop: 12 }}>View rankings &rarr;</div>
          </Link>

          {/* Best Savings Bonuses */}
          <Link href="/blog/best-savings-bonuses-2026" className="hp-card" style={{ borderLeft: "3px solid #7c3aed" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 6 }}>Best Savings Bonuses</div>
            <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, margin: 0 }}>
              Ranked by effective APY. Park your savings and earn 9-16% returns through bonus stacking.
            </p>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed", marginTop: 12 }}>View rankings &rarr;</div>
          </Link>

          {/* Blog */}
          <Link href="/blog" className="hp-card">
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 6 }}>Blog</div>
            <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, margin: 0 }}>
              Individual bonus reviews, direct deposit guides, tax guides, and ChexSystems info.
            </p>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginTop: 12 }}>Read articles &rarr;</div>
          </Link>

          {/* What Counts as DD */}
          <Link href="/blog/what-counts-as-direct-deposit" className="hp-card">
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 6 }}>Direct Deposit Guide</div>
            <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, margin: 0 }}>
              Per-bank breakdown of what triggers direct deposit credit. The #1 reason people miss bonuses.
            </p>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginTop: 12 }}>Read guide &rarr;</div>
          </Link>

          {/* YouTube */}
          <a href={YT} target="_blank" rel="noopener noreferrer" className="hp-card" style={{ borderLeft: "3px solid #ff0000" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 6 }}>YouTube Channel</div>
            <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, margin: 0 }}>
              Video walkthroughs, bonus strategy, and Nathaniel&apos;s personal bonus rotation.
            </p>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#ff0000", marginTop: 12 }}>Subscribe &rarr;</div>
          </a>

        </div>
      </section>

      {/* ── About ── */}
      <section className="hp-section" style={{ maxWidth: 700 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>About</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111", letterSpacing: "-0.02em", margin: "0 0 16px", lineHeight: 1.2 }}>
          Hi, I&apos;m Nathaniel
        </h2>
        <p style={{ fontSize: 15, color: "#666", lineHeight: 1.8, margin: "0 0 12px" }}>
          I&apos;ve been earning bank bonuses and optimizing credit card rewards for years. Fat Stacks Academy is where I share everything I&apos;ve learned — the strategies, the data points, and the tools I use to stay organized.
        </p>
        <p style={{ fontSize: 15, color: "#666", lineHeight: 1.8, margin: "0 0 16px" }}>
          On YouTube I break down individual bonuses, share my application strategy, and show my real results. On this site you&apos;ll find detailed reviews of every active bonus, and Stacks OS — the tool I built to manage my own bonus rotation.
        </p>
        <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 600, color: "#ff0000", textDecoration: "none" }}>
          Watch on YouTube &rarr;
        </a>
      </section>

      {/* ── Newsletter ── */}
      <section className="hp-section">
        <div style={{ background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 14, padding: "32px 28px", maxWidth: 600 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 6 }}>Stay in the loop</div>
          <p style={{ fontSize: 14, color: "#888", lineHeight: 1.6, margin: "0 0 14px" }}>
            Get notified when new bonuses drop or existing ones increase. No spam.
          </p>
          <a href="https://fatstacksacademy.beehiiv.com/subscribe" target="_blank" rel="noopener noreferrer" style={{
            display: "inline-block", fontSize: 14, fontWeight: 700, color: "#fff", background: "#0d7c5f",
            padding: "12px 24px", borderRadius: 8, textDecoration: "none",
          }}>
            Subscribe to newsletter
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="hp-footer">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#bbb" }}>Fat Stacks Academy</span>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href="/blog" style={{ fontSize: 12, color: "#999", textDecoration: "none" }}>Blog</Link>
            <Link href="/stacksos" style={{ fontSize: 12, color: "#999", textDecoration: "none" }}>Stacks OS</Link>
            <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#999", textDecoration: "none" }}>YouTube</a>
            <a href="https://fatstacksacademy.beehiiv.com/subscribe" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#999", textDecoration: "none" }}>Newsletter</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
