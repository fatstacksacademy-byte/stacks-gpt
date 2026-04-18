import type { ReactNode } from "react"
import { Lora, IBM_Plex_Mono } from "next/font/google"
import "./stackhouse.css"

// Scoped fonts — attach to the /stackhouse subtree only. The root
// layout continues to serve Geist; these additional CSS vars are
// picked up by .stackhouse-root rules in stackhouse.css.
const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-stackhouse-serif",
  display: "swap",
})
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-stackhouse-mono",
  display: "swap",
})

export default function StackhouseLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${lora.variable} ${plexMono.variable}`}>{children}</div>
  )
}
