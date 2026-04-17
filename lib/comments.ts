import { createClient } from "./supabase/client"

export type Comment = {
  id: string
  slug: string
  user_id: string | null
  display_name: string
  email: string | null
  body: string
  parent_id: string | null
  created_at: string
}

export async function getComments(slug: string): Promise<Comment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("comments")
    .select("id, slug, user_id, display_name, body, parent_id, created_at")
    .eq("slug", slug)
    .order("created_at", { ascending: true })
  if (error) {
    console.error("[comments] fetch failed:", error.message)
    return []
  }
  return (data ?? []) as Comment[]
}

export async function addComment(comment: {
  slug: string
  user_id: string | null
  display_name: string
  email: string | null
  body: string
  parent_id: string | null
}): Promise<Comment | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("comments")
    .insert(comment)
    .select()
    .single()
  if (error) {
    console.error("[comments] insert failed:", error.message)
    return null
  }
  return data as Comment
}

export async function deleteComment(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", id)
  if (error) {
    console.error("[comments] delete failed:", error.message)
    return false
  }
  return true
}
