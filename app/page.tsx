"use client"

import React, { useState } from "react"
import Link from "next/link"

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual")

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh", fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* ── NAV ── */}
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 40px", maxWidth: 1100, margin: "0 auto",
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#111", letterSpacing: "-0.02em" }}>Stacks OS</span>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <Link href="/login" style={{ fontSize: 14, color: "#666", textDecoration: "none" }}>Log in</Link>
          <Link href="/login" style={{
            fontSize: 14, fontWeight: 600, color: "#fff", background: "#111",
            padding: "10px 22px", borderRadius: 8, textDecoration: "none",
          }}>Get started</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        maxWidth: 1100, margin: "0 auto", padding: "80px 40px 60px",
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      }}>
        <div style={{
          display: "inline-block", fontSize: 12, fontWeight: 600, color: "#0d7c5f",
          background: "#e6f5f0", padding: "6px 14px", borderRadius: 99, marginBottom: 24,
          letterSpacing: "0.04em", textTransform: "uppercase",
        }}>
          The bank bonus system
        </div>
        <h1 style={{
          fontSize: 56, fontWeight: 800, color: "#111", lineHeight: 1.1,
          letterSpacing: "-0.03em", margin: "0 0 20px", maxWidth: 700,
        }}>
          Turn your paycheck into
          <br />
          <span style={{ color: "#0d7c5f" }}>$2,000+ per year</span>
        </h1>
        <p style={{
          fontSize: 19, color: "#777", lineHeight: 1.6, margin: "0 0 40px",
          maxWidth: 520,
        }}>
          Banks pay you to switch your direct deposit. Stacks OS tells you exactly where to send it next, when to move it, and how much you'll earn.
        </p>
        <div style={{ display: "flex", gap: 14 }}>
          <Link href="/login" style={{
            fontSize: 16, fontWeight: 700, color: "#fff", background: "#0d7c5f",
            padding: "16px 36px", borderRadius: 10, textDecoration: "none",
            boxShadow: "0 4px 16px rgba(13,124,95,0.2)",
          }}>Start earning</Link>
          <a href="#how-it-works" style={{
            fontSize: 16, fontWeight: 500, color: "#666",
            padding: "16px 28px", borderRadius: 10, textDecoration: "none",
            border: "1px solid #ddd",
          }}>See how it works</a>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section style={{
        maxWidth: 1100, margin: "0 auto", padding: "20px 40px 60px",
        display: "flex", justifyContent: "center", gap: 48,
      }}>
        {[
          { value: "$3,200+", label: "avg projected first year" },
          { value: "15 min", label: "setup time" },
          { value: "$0 risk", label: "your money stays yours" },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#111" }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#999", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{
        maxWidth: 1100, margin: "0 auto", padding: "60px 40px",
      }}>
        <h2 style={{
          fontSize: 36, fontWeight: 800, color: "#111", textAlign: "center",
          letterSpacing: "-0.02em", margin: "0 0 12px",
        }}>
          Three steps. Repeat.
        </h2>
        <p style={{ fontSize: 15, color: "#999", textAlign: "center", margin: "0 0 48px" }}>
          No gimmicks. Just a system.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            {
              step: "01",
              title: "Open the account",
              desc: "We match you with the highest-value bonus based on your paycheck. Click the link, open the account in minutes.",
            },
            {
              step: "02",
              title: "Route your deposit",
              desc: "Point your direct deposit to the new account. Meet the deposit requirement with your regular paycheck — no extra money needed.",
            },
            {
              step: "03",
              title: "Collect and repeat",
              desc: "Bonus posts to your account. Close it, start the next one. We track cooldowns so you can earn the same bonus again later.",
            },
          ].map((item, i) => (
            <div key={i} style={{
              background: "#fff", borderRadius: 14, padding: "32px 28px",
              border: "1px solid #e8e8e8",
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#e0e0e0", marginBottom: 16 }}>{item.step}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 10 }}>{item.title}</div>
              <div style={{ fontSize: 14, color: "#888", lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT YOU GET ── */}
      <section style={{
        maxWidth: 1100, margin: "0 auto", padding: "60px 40px",
      }}>
        <h2 style={{
          fontSize: 36, fontWeight: 800, color: "#111", textAlign: "center",
          letterSpacing: "-0.02em", margin: "0 0 48px",
        }}>
          Everything you need to stack bonuses
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {[
            { title: "Personalized bonus queue", desc: "Ranked by your paycheck amount, pay frequency, and eligibility. Always know what's next." },
            { title: "Step-by-step checklist", desc: "Each bonus is a simple checklist. Check off steps as you go. No guesswork." },
            { title: "Deposit tracking", desc: "Log your deposits and see exactly how much you've contributed toward each requirement." },
            { title: "12-month projection", desc: "See how much you'll earn this year if you follow the plan. Updated as you complete bonuses." },
            { title: "Cooldown tracking", desc: "We remember when you earned each bonus so you know exactly when you're eligible again." },
            { title: "Fee alerts", desc: "Know which accounts have monthly fees and how to avoid them before you open." },
          ].map((f, i) => (
            <div key={i} style={{
              background: "#fff", borderRadius: 12, padding: "24px 24px",
              border: "1px solid #e8e8e8",
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{
        maxWidth: 1100, margin: "0 auto", padding: "60px 40px",
      }}>
        <h2 style={{
          fontSize: 36, fontWeight: 800, color: "#111", textAlign: "center",
          letterSpacing: "-0.02em", margin: "0 0 8px",
        }}>
          Pays for itself with your first bonus
        </h2>
        <p style={{ fontSize: 15, color: "#999", textAlign: "center", margin: "0 0 32px" }}>
          Most bonuses are $200–$500. The subscription costs less than a coffee.
        </p>

        {/* Toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <div style={{
            display: "flex", background: "#f0f0f0", borderRadius: 8, padding: 3,
          }}>
            <button onClick={() => setBillingCycle("monthly")} style={{
              padding: "8px 20px", fontSize: 13, fontWeight: 600, borderRadius: 6,
              border: "none", cursor: "pointer",
              background: billingCycle === "monthly" ? "#fff" : "transparent",
              color: billingCycle === "monthly" ? "#111" : "#999",
              boxShadow: billingCycle === "monthly" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}>Monthly</button>
            <button onClick={() => setBillingCycle("annual")} style={{
              padding: "8px 20px", fontSize: 13, fontWeight: 600, borderRadius: 6,
              border: "none", cursor: "pointer",
              background: billingCycle === "annual" ? "#fff" : "transparent",
              color: billingCycle === "annual" ? "#111" : "#999",
              boxShadow: billingCycle === "annual" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}>
              Annual <span style={{ fontSize: 11, color: "#0d7c5f", fontWeight: 700, marginLeft: 4 }}>Save 17%</span>
            </button>
          </div>
        </div>

        {/* Card */}
        <div style={{
          maxWidth: 400, margin: "0 auto",
          background: "#fff", border: "2px solid #0d7c5f", borderRadius: 16,
          padding: "36px 32px", textAlign: "center",
          boxShadow: "0 8px 32px rgba(13,124,95,0.08)",
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>
            Stacks OS
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: "#111" }}>
              ${billingCycle === "monthly" ? "5" : "50"}
            </span>
            <span style={{ fontSize: 16, color: "#999" }}>
              /{billingCycle === "monthly" ? "mo" : "yr"}
            </span>
          </div>
          {billingCycle === "annual" && (
            <div style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>$4.17/mo billed annually</div>
          )}
          {billingCycle === "monthly" && (
            <div style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>Cancel anytime</div>
          )}
          <Link href="/login" style={{
            display: "block", fontSize: 16, fontWeight: 700, color: "#fff",
            background: "#0d7c5f", padding: "16px 0", borderRadius: 10,
            textDecoration: "none", marginBottom: 20,
          }}>
            Start earning
          </Link>
          <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Personalized bonus queue",
              "Step-by-step checklists",
              "Deposit tracking",
              "12-month earnings projection",
              "Cooldown + eligibility tracking",
              "Fee avoidance alerts",
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#555" }}>
                <span style={{ color: "#0d7c5f", fontWeight: 700, fontSize: 13 }}>&#10003;</span>
                {f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{
        maxWidth: 700, margin: "0 auto", padding: "60px 40px",
      }}>
        <h2 style={{
          fontSize: 36, fontWeight: 800, color: "#111", textAlign: "center",
          letterSpacing: "-0.02em", margin: "0 0 40px",
        }}>
          Common questions
        </h2>
        {[
          {
            q: "Is this legal?",
            a: "Yes. Bank bonuses are promotional offers banks use to attract new customers. They want you to sign up.",
          },
          {
            q: "Do I need extra money?",
            a: "No. You use your existing paycheck. You're just temporarily routing your direct deposit to a new account, then moving it when the bonus posts.",
          },
          {
            q: "Will this affect my credit score?",
            a: "Most checking account bonuses don't require a hard credit pull. We flag the ones that do so you can decide.",
          },
          {
            q: "How much time does this take?",
            a: "Opening an account takes 10–15 minutes. After that, you're just checking off steps as they happen. The system tells you when to act.",
          },
          {
            q: "What if a bonus offer changes?",
            a: "Stacks OS aggregates publicly available information. We recommend verifying terms with the bank before applying. Offers can change at any time.",
          },
        ].map((faq, i) => (
          <div key={i} style={{
            borderBottom: "1px solid #eee", padding: "20px 0",
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 6 }}>{faq.q}</div>
            <div style={{ fontSize: 14, color: "#888", lineHeight: 1.6 }}>{faq.a}</div>
          </div>
        ))}
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{
        maxWidth: 1100, margin: "0 auto", padding: "60px 40px 40px",
        textAlign: "center",
      }}>
        <h2 style={{
          fontSize: 36, fontWeight: 800, color: "#111",
          letterSpacing: "-0.02em", margin: "0 0 12px",
        }}>
          Your first bonus is waiting
        </h2>
        <p style={{ fontSize: 15, color: "#999", margin: "0 0 28px" }}>
          Set up in minutes. Start earning this week.
        </p>
        <Link href="/login" style={{
          fontSize: 16, fontWeight: 700, color: "#fff", background: "#0d7c5f",
          padding: "16px 40px", borderRadius: 10, textDecoration: "none",
          display: "inline-block",
          boxShadow: "0 4px 16px rgba(13,124,95,0.2)",
        }}>
          Get started — ${billingCycle === "monthly" ? "5" : "50"}/{billingCycle === "monthly" ? "mo" : "yr"}
        </Link>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        maxWidth: 1100, margin: "0 auto", padding: "40px 40px 32px",
        borderTop: "1px solid #f0f0f0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 13, color: "#bbb" }}>&copy; {new Date().getFullYear()} Stacks OS</span>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/terms" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Terms</Link>
          <Link href="/privacy" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Privacy</Link>
        </div>
      </footer>

      {/* ── Font ── */}
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    </div>
  )
}
