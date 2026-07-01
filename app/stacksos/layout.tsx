import type { ReactNode } from "react"
import AuthBoundary from "../components/AuthBoundary"
import BottomNav from "../components/BottomNav"

export default function StacksOSLayout({ children }: { children: ReactNode }) {
  return (
    <AuthBoundary>
      {children}
      <BottomNav />
    </AuthBoundary>
  )
}
