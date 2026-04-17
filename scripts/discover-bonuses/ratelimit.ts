import { DEFAULT_THROTTLE_SECONDS } from "./env"

/** Per-host: last request timestamp (epoch ms) */
const lastRequestAt = new Map<string, number>()
/** Per-host: in-flight promise queue so requests to the same host never fire concurrently */
const hostQueue = new Map<string, Promise<void>>()

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function throttleHost(
  urlOrHost: string,
  seconds: number = DEFAULT_THROTTLE_SECONDS,
): Promise<void> {
  let host: string
  try {
    host = new URL(urlOrHost).host
  } catch {
    host = urlOrHost
  }
  const minGapMs = seconds * 1000

  // Chain onto any in-flight throttle for this host so requests to the same
  // host serialize with the configured gap between them.
  const prev = hostQueue.get(host) ?? Promise.resolve()
  const mine = prev.then(async () => {
    const last = lastRequestAt.get(host) ?? 0
    const elapsed = Date.now() - last
    if (elapsed < minGapMs) await sleep(minGapMs - elapsed)
    lastRequestAt.set(host, Date.now())
  })
  hostQueue.set(host, mine)
  await mine
}
