import { redirect } from "next/navigation"

// Clean, say-out-loud URL for the card finder (the canonical page lives at
// /spending, which keeps its SEO). Used as the "search 1,000+ cards by state"
// CTA in the monthly YouTube videos.
export default function CardsRedirect() {
  redirect("/spending")
}
