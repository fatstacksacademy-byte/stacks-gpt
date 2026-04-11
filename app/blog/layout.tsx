import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Fat Stacks Academy - Bank Bonus Reviews",
  description: "Expert reviews of the best bank account bonuses, credit card offers, and savings promotions. Updated daily.",
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {children}
    </div>
  )
}
