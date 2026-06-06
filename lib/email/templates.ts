/**
 * Plain-HTML email templates. Kept dependency-free (no React Email or
 * MJML) so the cron route stays a tiny serverless function. Inline
 * styles are required — Gmail strips <style> blocks.
 */

export type DeadlineReminderInput = {
  firstName: string | null
  bonusName: string
  bonusAmount: number
  nextStep: string
  deadlineLabel: string       // "in 7 days · Aug 5"
  daysLeft: number
  module: "paycheck" | "spending" | "savings"
  dashboardUrl: string
  unsubscribeUrl: string
}

export type DigestRow = {
  bonusName: string
  amount: number
  nextStep: string | null
  deadlineLabel: string | null   // "Aug 5 (4 days)"
  urgency: "overdue" | "urgent" | "soon" | "none"
}

export type WeeklyDigestInput = {
  firstName: string | null
  rows: DigestRow[]
  totalInProgress: number
  dashboardUrl: string
  unsubscribeUrl: string
}

const COLOR = {
  green: "#0d7c5f",
  amber: "#92400e",
  amberBg: "#fef3c7",
  red: "#b91c1c",
  redBg: "#fee2e2",
  ink: "#111",
  sub: "#666",
  hairline: "#e8e8e8",
}

const baseStyles = `
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
color: ${COLOR.ink}; line-height: 1.5;
`

function hello(name: string | null): string {
  return name ? `Hey ${name},` : "Hey,"
}

function footer(unsubscribeUrl: string): string {
  return `
    <p style="font-size: 12px; color: ${COLOR.sub}; margin-top: 28px;">
      You're getting this because you have email reminders turned on in Stacks OS.
      <br />
      <a href="${unsubscribeUrl}" style="color: ${COLOR.sub}; text-decoration: underline;">Unsubscribe</a>
      ·
      <a href="https://fatstacksacademy.com/stacksos" style="color: ${COLOR.sub}; text-decoration: underline;">Manage in Stacks OS</a>
    </p>
  `
}

// ─── Deadline reminder ──────────────────────────────────────────────

export function deadlineReminderHTML(i: DeadlineReminderInput): string {
  const urgentBadge = i.daysLeft <= 1
    ? `<span style="display: inline-block; font-size: 11px; font-weight: 700; color: ${COLOR.red}; background: ${COLOR.redBg}; padding: 3px 9px; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.05em;">Urgent</span>`
    : ""

  return `<!doctype html>
<html><body style="margin:0; padding: 24px 16px; background: #fafafa;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="100%" style="max-width: 520px; margin: 0 auto;">
  <tr><td style="${baseStyles} background: #fff; border: 1px solid ${COLOR.hairline}; border-radius: 14px; padding: 28px;">

    <p style="margin: 0 0 14px; font-size: 14px;">${hello(i.firstName)}</p>

    <h1 style="margin: 0 0 6px; font-size: 20px; font-weight: 800; color: ${COLOR.ink};">
      Heads up: ${i.bonusName} deadline ${i.daysLeft <= 1 ? "is tomorrow" : `in ${i.daysLeft} days`}
    </h1>
    <p style="margin: 0 0 18px; font-size: 14px; color: ${COLOR.sub};">${urgentBadge}</p>

    <div style="background: #f8faf9; border-left: 3px solid ${COLOR.green}; padding: 14px 16px; border-radius: 6px; margin-bottom: 18px;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: ${COLOR.sub}; margin-bottom: 4px;">Next step</div>
      <div style="font-size: 16px; font-weight: 700; color: ${COLOR.ink};">${i.nextStep}</div>
      <div style="font-size: 13px; color: ${COLOR.sub}; margin-top: 4px;">${i.deadlineLabel}</div>
    </div>

    <p style="margin: 0 0 20px; font-size: 14px;">
      You're tracking <strong>$${Math.round(i.bonusAmount).toLocaleString()}</strong> on this one — don't let the window close.
    </p>

    <a href="${i.dashboardUrl}" style="display: inline-block; background: ${COLOR.green}; color: #fff; font-weight: 700; font-size: 14px; padding: 12px 22px; border-radius: 8px; text-decoration: none;">
      Open Stacks OS →
    </a>

    ${footer(i.unsubscribeUrl)}
  </td></tr>
</table>
</body></html>`
}

export function deadlineReminderText(i: DeadlineReminderInput): string {
  return [
    `${hello(i.firstName)}`,
    ``,
    `Heads up: ${i.bonusName} deadline ${i.daysLeft <= 1 ? "is tomorrow" : `in ${i.daysLeft} days`}.`,
    ``,
    `Next step: ${i.nextStep}`,
    `Deadline: ${i.deadlineLabel}`,
    ``,
    `You're tracking $${Math.round(i.bonusAmount).toLocaleString()} on this one — don't let the window close.`,
    ``,
    `Open Stacks OS: ${i.dashboardUrl}`,
    ``,
    `Unsubscribe: ${i.unsubscribeUrl}`,
  ].join("\n")
}

// ─── Weekly digest ──────────────────────────────────────────────────

function digestRowHTML(r: DigestRow): string {
  const chip =
    r.urgency === "overdue"
      ? `<span style="display: inline-block; font-size: 10px; font-weight: 700; color: ${COLOR.red}; background: ${COLOR.redBg}; padding: 2px 7px; border-radius: 99px; text-transform: uppercase;">Overdue</span>`
      : r.urgency === "urgent"
      ? `<span style="display: inline-block; font-size: 10px; font-weight: 700; color: ${COLOR.amber}; background: ${COLOR.amberBg}; padding: 2px 7px; border-radius: 99px; text-transform: uppercase;">Urgent</span>`
      : ""

  return `
    <tr><td style="padding: 12px 0; border-bottom: 1px solid ${COLOR.hairline};">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-size: 14px; font-weight: 700; color: ${COLOR.ink};">${r.bonusName}</td>
          <td style="font-size: 14px; font-weight: 700; color: ${COLOR.green}; text-align: right; white-space: nowrap;">$${Math.round(r.amount).toLocaleString()}</td>
        </tr>
        ${r.nextStep ? `<tr><td colspan="2" style="font-size: 12px; color: ${COLOR.ink}; padding-top: 4px;">
          <strong>Next:</strong> ${r.nextStep}${r.deadlineLabel ? ` · <span style="color: ${COLOR.sub};">by ${r.deadlineLabel}</span>` : ""}
          ${chip ? ` &nbsp;${chip}` : ""}
        </td></tr>` : ""}
      </table>
    </td></tr>
  `
}

export function weeklyDigestHTML(i: WeeklyDigestInput): string {
  const rowsHTML = i.rows.map(digestRowHTML).join("")
  const urgentCount = i.rows.filter(r => r.urgency === "urgent" || r.urgency === "overdue").length

  return `<!doctype html>
<html><body style="margin:0; padding: 24px 16px; background: #fafafa;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="100%" style="max-width: 580px; margin: 0 auto;">
  <tr><td style="${baseStyles} background: #fff; border: 1px solid ${COLOR.hairline}; border-radius: 14px; padding: 28px;">

    <p style="margin: 0 0 14px; font-size: 14px;">${hello(i.firstName)}</p>

    <h1 style="margin: 0 0 6px; font-size: 22px; font-weight: 800; color: ${COLOR.ink};">
      Your week in Stacks
    </h1>
    <p style="margin: 0 0 22px; font-size: 14px; color: ${COLOR.sub};">
      $${Math.round(i.totalInProgress).toLocaleString()} in progress · ${i.rows.length} active bonus${i.rows.length !== 1 ? "es" : ""}${urgentCount > 0 ? ` · <span style="color: ${COLOR.amber}; font-weight: 600;">${urgentCount} need attention this week</span>` : ""}
    </p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${rowsHTML}
    </table>

    <div style="margin-top: 24px;">
      <a href="${i.dashboardUrl}" style="display: inline-block; background: ${COLOR.green}; color: #fff; font-weight: 700; font-size: 14px; padding: 12px 22px; border-radius: 8px; text-decoration: none;">
        Open Stacks OS →
      </a>
    </div>

    ${footer(i.unsubscribeUrl)}
  </td></tr>
</table>
</body></html>`
}

export function weeklyDigestText(i: WeeklyDigestInput): string {
  const lines = [
    hello(i.firstName),
    "",
    `Your week in Stacks — $${Math.round(i.totalInProgress).toLocaleString()} in progress, ${i.rows.length} active bonus${i.rows.length !== 1 ? "es" : ""}.`,
    "",
  ]
  for (const r of i.rows) {
    lines.push(`• ${r.bonusName} — $${Math.round(r.amount).toLocaleString()}`)
    if (r.nextStep) lines.push(`   Next: ${r.nextStep}${r.deadlineLabel ? ` · by ${r.deadlineLabel}` : ""}`)
  }
  lines.push("", `Open Stacks OS: ${i.dashboardUrl}`, "", `Unsubscribe: ${i.unsubscribeUrl}`)
  return lines.join("\n")
}
