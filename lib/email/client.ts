import { Resend } from "resend"

/**
 * Resend client. No-ops gracefully when RESEND_API_KEY is missing so
 * dev/CI doesn't accidentally fire real emails — sends return a fake
 * id and log to console instead.
 *
 * FROM_EMAIL must be a verified sender on the Resend account.
 * Defaults to a Stacks OS-branded address; override per environment
 * with RESEND_FROM_EMAIL.
 */

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Stacks OS <reminders@fatstacksacademy.com>"

export const REPLY_TO = "fatstacksacademy@gmail.com"

let cachedClient: Resend | null = null
function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!cachedClient) cachedClient = new Resend(key)
  return cachedClient
}

export type SendArgs = {
  to: string
  subject: string
  html: string
  text: string
  unsubscribeUrl: string
}

export async function sendEmail({
  to, subject, html, text, unsubscribeUrl,
}: SendArgs): Promise<{ id: string | null; error: string | null }> {
  const client = getClient()
  if (!client) {
    console.log(`[email:noop] would send to=${to} subject="${subject}"`)
    return { id: null, error: null }
  }

  try {
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
      replyTo: REPLY_TO,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:${REPLY_TO}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    })
    if (result.error) {
      return { id: null, error: result.error.message }
    }
    return { id: result.data?.id ?? null, error: null }
  } catch (e) {
    return { id: null, error: e instanceof Error ? e.message : String(e) }
  }
}
