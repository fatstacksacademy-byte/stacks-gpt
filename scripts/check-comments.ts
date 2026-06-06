import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

const envText = readFileSync("/Users/nathaniel/stacks-gpt/.env.local", "utf8")
const envMap: Record<string, string> = {}
for (const line of envText.split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
  if (!m) continue
  let v = m[2]
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1)
  }
  envMap[m[1]] = v
}
const url = envMap.NEXT_PUBLIC_SUPABASE_URL
const key = envMap.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing Supabase env vars", { hasUrl: !!url, hasKey: !!key })
  process.exit(1)
}
console.log(`[env] url=${url}`)
const supabase = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  // Find Nathaniel's user id
  const { data: users, error: userErr } = await supabase.auth.admin.listUsers()
  if (userErr) throw userErr
  const me = users.users.find(
    (u) => (u.email ?? "").toLowerCase() === "fatstacksacademy@gmail.com",
  )
  const myId = me?.id ?? null
  console.log(`[me] user_id=${myId ?? "NOT FOUND"}`)

  const { data: comments, error } = await supabase
    .from("comments")
    .select("id, slug, user_id, display_name, email, body, parent_id, created_at")
    .order("created_at", { ascending: true })
  if (error) throw error
  if (!comments) {
    console.log("No comments table data.")
    return
  }
  console.log(`[total] ${comments.length} comments across all posts`)

  // Build parent -> children map
  const byParent = new Map<string | null, typeof comments>()
  for (const c of comments) {
    const k = c.parent_id
    if (!byParent.has(k)) byParent.set(k, [])
    byParent.get(k)!.push(c)
  }

  // A reply counts as mine if it's on my account OR posted as a guest under
  // my display name (I sometimes reply without signing in).
  const isMine = (c: (typeof comments)[number]) => {
    if (myId && c.user_id === myId) return true
    if (!c.user_id && c.display_name.trim().toLowerCase() === "nathaniel") return true
    return false
  }

  // "Unresponded" = comment NOT by me, AND no descendant reply by me.
  const hasMyDescendant = (id: string): boolean => {
    const kids = byParent.get(id) ?? []
    for (const k of kids) {
      if (isMine(k)) return true
      if (hasMyDescendant(k.id)) return true
    }
    return false
  }

  const unresponded = comments.filter(
    (c) => !isMine(c) && !hasMyDescendant(c.id),
  )

  console.log(`\n[unresponded] ${unresponded.length} comments need a reply:\n`)
  for (const c of unresponded) {
    const when = new Date(c.created_at).toISOString().slice(0, 10)
    const who = c.display_name + (c.user_id ? "" : " (guest)")
    const preview = c.body.replace(/\s+/g, " ").slice(0, 140)
    console.log(`- [${when}] /blog/${c.slug}`)
    console.log(`  ${who}: ${preview}${c.body.length > 140 ? "…" : ""}`)
    console.log(`  id=${c.id}${c.parent_id ? ` (reply to ${c.parent_id})` : " (top-level)"}`)
    console.log()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
