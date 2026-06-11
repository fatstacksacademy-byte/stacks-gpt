import { appendFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"

const LOG_DIR = join(process.cwd(), "logs")

function logFile(): string {
  const date = new Date().toISOString().slice(0, 10)
  return join(LOG_DIR, `canary-${date}.jsonl`)
}

export type LogLevel = "info" | "warn" | "error"

export function log(level: LogLevel, event: string, meta: Record<string, unknown> = {}) {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true })
  const entry = { ts: new Date().toISOString(), level, event, ...meta }
  appendFileSync(logFile(), JSON.stringify(entry) + "\n")
  const tag = level === "error" ? "🚨" : level === "warn" ? "⚠️ " : "•"
  const keys = Object.keys(meta)
  const tail =
    keys.length === 0
      ? ""
      : keys.length === 1
        ? String(meta[keys[0]])
        : keys.map((k) => `${k}=${stringify(meta[k])}`).join(" ")
  console.log(`${tag} [${level}] ${event}`, tail)
}

function stringify(v: unknown): string {
  if (v === null || v === undefined) return ""
  if (typeof v === "string") return v.length > 80 ? v.slice(0, 80) + "…" : v
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}
