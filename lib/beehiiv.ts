/**
 * Beehiiv subscribe helper.
 *
 * Wraps the publications/{id}/subscriptions POST and returns a structured
 * result instead of swallowing failures into a console.error. Callers can
 * persist the result (e.g. onto the contacts row) so we can tell from the
 * database whether a lead actually reached Beehiiv — without this, a missing
 * API key and a successful subscribe look identical from the outside.
 *
 * Note: a successful subscribe lands the contact in Beehiiv's `validating`
 * status, which is filtered out of the default (active) subscriber view in
 * the dashboard. `subscribed` here means "Beehiiv accepted it", not "active".
 */
export type BeehiivOutcome = "subscribed" | "skipped" | "error"

export type BeehiivSyncResult = {
  outcome: BeehiivOutcome
  /** Beehiiv subscription id (sub_...) when created/reactivated, else null. */
  subscriptionId: string | null
  /** Beehiiv subscription status, e.g. "validating" | "active". Null on skip/error. */
  status: string | null
  /** Short diagnostic when outcome === "error" (http status + truncated body). */
  error: string | null
}

export async function subscribeToBeehiiv(
  email: string,
  opts: { utmSource?: string; sendWelcomeEmail?: boolean } = {},
): Promise<BeehiivSyncResult> {
  const apiKey = process.env.BEEHIIV_API_KEY
  const pubId = process.env.BEEHIIV_PUBLICATION_ID

  if (!apiKey || !pubId) {
    return { outcome: "skipped", subscriptionId: null, status: null, error: "BEEHIIV env not configured" }
  }

  try {
    const res = await fetch(`https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        email,
        reactivate_existing: true,
        send_welcome_email: opts.sendWelcomeEmail ?? true,
        ...(opts.utmSource ? { utm_source: opts.utmSource } : {}),
      }),
    })

    if (!res.ok) {
      const error = `${res.status} ${(await res.text()).slice(0, 200)}`
      console.error("[beehiiv] subscribe non-ok:", error)
      return { outcome: "error", subscriptionId: null, status: null, error }
    }

    const json = (await res.json()) as { data?: { id?: string; status?: string } }
    return {
      outcome: "subscribed",
      subscriptionId: json.data?.id ?? null,
      status: json.data?.status ?? null,
      error: null,
    }
  } catch (e) {
    const error = (e as Error).message
    console.error("[beehiiv] subscribe threw:", error)
    return { outcome: "error", subscriptionId: null, status: null, error }
  }
}
