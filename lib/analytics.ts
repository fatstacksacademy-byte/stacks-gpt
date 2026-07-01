"use client"

import posthog from "posthog-js"

/**
 * Typed wrapper around posthog.capture so events are consistent.
 * Names follow snake_case so PostHog groups them cleanly.
 *
 * Add a new event here before calling it anywhere. The compiler
 * forces every call site to pick a known name; renames flow through
 * the type system instead of slipping past code review.
 */
export type AnalyticsEvent =
  // Onboarding
  | "wizard_started"
  | "wizard_completed"
  | "wizard_step_completed"
  // Bonus actions
  | "bonus_applied"          // application submitted, decision pending
  | "bonus_started"          // module: paycheck|spending|savings|debt
  | "bonus_completed"
  | "bonus_skipped"
  | "custom_bonus_added"
  | "custom_bonus_modal_opened"
  | "account_created"        // free account created inline (e.g. blog "Track this bonus")
  // Smart Import
  | "smart_import_opened"
  | "smart_import_extracted"
  // Subscription
  | "checkout_started"
  | "billing_portal_opened"
  // 0% intro-APR float calculator
  | "intro_apr_card_selected"
  | "intro_apr_apply_click"
  | "intro_apr_finder_mode"      // purchase vs balance-transfer lens in the 0% finder
  | "intro_apr_finder_use"       // "Model it" — prefill the calculator from a finder row
  | "intro_apr_finder_apply"     // Apply click from a finder row
  | "intro_apr_finder_biz"       // "won't hit personal credit" toggle in the 0% finder
  // Misc
  | "tax_summary_viewed"
  | "dashboard_tab_changed"
  | "dashboard_bonus_advanced"   // inline step-advance from a dashboard card
  | "dashboard_bonus_undone"     // inline step-undo (walk back one milestone) from a dashboard card
  | "dashboard_date_edited"      // corrected a key date (opened/posted/funded) on a dashboard card
  | "pay_profile_saved"          // explicit Save on the Paycheck pay-profile panel
  | "dd_method_recorded"         // which DD source triggered a bonus (Bonus Posted step)
  | "deposit_source_recorded"    // where an individual logged deposit came from (per-deposit)

export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  try {
    if (typeof window === "undefined") return
    if (!posthog.__loaded) return
    posthog.capture(event, props)
  } catch {
    // Never let analytics break the app.
  }
}
