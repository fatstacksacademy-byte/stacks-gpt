/* eslint-disable no-console */
/**
 * One-shot: generate a VAPID keypair and print the env vars to paste
 * into .env.local + Vercel project settings.
 *
 *   npx tsx scripts/generate-vapid-keys.ts
 *
 * Run this ONCE per project.  Re-running invalidates every existing
 * push_subscription row (browsers tie subscriptions to the public key
 * they were created with), so don't rotate casually.
 */
import webpush from "web-push"

const keys = webpush.generateVAPIDKeys()
const subject = process.argv[2] ?? "mailto:reminders@fatstacksacademy.com"

console.log("=== VAPID keypair ===")
console.log("")
console.log(`# .env.local + Vercel env vars`)
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log(`VAPID_SUBJECT=${subject}`)
console.log("")
console.log("Public key is exposed to the browser via NEXT_PUBLIC_*.")
console.log("Private key MUST stay server-side — never expose it client-side.")
console.log("")
console.log("Paste all three into Vercel → Settings → Environment Variables, then redeploy.")
