import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"

const envText = fs.readFileSync(".env.local", "utf8")
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1")
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error("Missing Supabase env"); process.exit(1) }

const sb = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  const arg = process.argv[2]
  const email = process.argv[3] ?? "test+e2e@fatstacksacademy.com"

  if (arg === "clean") {
    await sb.from("bonus_interests").delete().eq("email", email)
    await sb.from("contacts").delete().eq("email", email)
    console.log(`Cleaned ${email}`)
    return
  }

  const { data: contacts } = await sb.from("contacts").select("*").eq("email", email)
  console.log("=== contacts ===")
  console.log(JSON.stringify(contacts, null, 2))

  const { data: interests } = await sb.from("bonus_interests").select("*").eq("email", email).order("created_at")
  console.log(`\n=== bonus_interests (${interests?.length ?? 0} rows) ===`)
  console.log(JSON.stringify(interests, null, 2))
}

main()
