import { guideAddenda } from "../../../lib/data/guideAddenda"

/**
 * Renders the web-verified addendum (data tables + sections + FAQ with FAQPage
 * schema) for a long-form guide. Data lives in lib/data/guideAddenda.ts.
 * Drop <GuideAddendum slug="..." /> near the bottom of a guide page.
 */
export default function GuideAddendum({ slug }: { slug: string }) {
  const data = guideAddenda[slug]
  if (!data) return null
  const { tables, faqs, sections } = data

  // NOTE: no FAQPage JSON-LD here — each guide page already emits one, and a
  // page should carry a single FAQPage. These render as visible content only.

  return (
    <div style={{ marginTop: 48 }}>
      {sections.map((s) => (
        <div key={s.heading} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>{s.heading}</h2>
          <p style={{ fontSize: 15, color: "#555", lineHeight: 1.8, margin: 0, whiteSpace: "pre-line" }}>{s.body}</p>
        </div>
      ))}

      {tables.map((t) => (
        <div key={t.title} style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>{t.title}</h2>
          <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {t.columns.map((c) => (
                    <th
                      key={c}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        fontSize: 11,
                        color: "#888",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        borderBottom: "2px solid #e8e8e8",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 ? "#fafafa" : "#fff" }}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: "10px 12px",
                          borderBottom: "1px solid #f0f0f0",
                          color: ci === 0 ? "#111" : "#555",
                          fontWeight: ci === 0 ? 700 : 400,
                          lineHeight: 1.5,
                          verticalAlign: "top",
                          minWidth: ci === 0 ? 120 : 140,
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {t.sources && (
            <p style={{ fontSize: 12, color: "#aaa", margin: "8px 2px 0", fontStyle: "italic" }}>{t.sources}</p>
          )}
        </div>
      ))}

      {faqs.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>More Questions, Answered</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {faqs.map((f) => (
              <div key={f.q}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 6px" }}>{f.q}</h3>
                <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7, margin: 0 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
