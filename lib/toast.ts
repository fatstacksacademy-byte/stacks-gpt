export type ToastKind = "error" | "success" | "info"
export type Toast = { id: string; kind: ToastKind; message: string }

export const TOAST_EVENT = "stacks:toast"

function emit(kind: ToastKind, message: string) {
  if (typeof window === "undefined") return
  const id = (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  window.dispatchEvent(new CustomEvent<Toast>(TOAST_EVENT, { detail: { id, kind, message } }))
}

export const toast = {
  error: (message: string) => emit("error", message),
  success: (message: string) => emit("success", message),
  info: (message: string) => emit("info", message),
}

/**
 * Logs a Supabase (or other) error to the console AND surfaces it to the
 * user as a toast. Use from lib mutation functions so silent DB failures
 * (e.g. a missing migration column) don't quietly swallow the user's action.
 */
export function reportError(context: string, error: unknown): void {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error)
  console.error(`[${context}]`, error)
  emit("error", `${context}: ${message}`)
}
