import { appendFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"

const LOG_DIR = join(process.cwd(), "logs")

function ensureDir() {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true })
}

function logFile(): string {
  const date = new Date().toISOString().slice(0, 10)
  return join(LOG_DIR, `discover-${date}.jsonl`)
}

export type LogLevel = "info" | "warn" | "error" | "debug"

export type LogEntry = {
  ts: string
  level: LogLevel
  event: string
  [k: string]: unknown
}

export function log(level: LogLevel, event: string, meta: Record<string, unknown> = {}) {
  ensureDir()
  const entry: LogEntry = { ts: new Date().toISOString(), level, event, ...meta }
  const line = JSON.stringify(entry) + "\n"
  appendFileSync(logFile(), line)
  if (level !== "debug" || process.env.BONUS_BOT_DEBUG) {
    // also print to stdout
    const tag =
      level === "error"
        ? "🚨"
        : level === "warn"
          ? "⚠️ "
          : level === "debug"
            ? "🔍"
            : "•"
    console.log(`${tag} [${level}] ${event}`, metaForConsole(meta))
  }
}

function metaForConsole(meta: Record<string, unknown>): string {
  const keys = Object.keys(meta)
  if (keys.length === 0) return ""
  if (keys.length === 1) return String(meta[keys[0]])
  return keys.map((k) => `${k}=${safeStr(meta[k])}`).join(" ")
}

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return ""
  if (typeof v === "string") return v.length > 80 ? v.slice(0, 80) + "…" : v
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}
