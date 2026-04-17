"use client"

import React, { useState, useEffect, useCallback } from "react"
import { getComments, addComment, deleteComment, Comment } from "../../../lib/comments"
import { createClient } from "../../../lib/supabase/client"

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export default function CommentSection({ slug }: { slug: string }) {
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Form state
  const [body, setBody] = useState("")
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(true)

  const loadComments = useCallback(async () => {
    const data = await getComments(slug)
    setComments(data)
    setLoading(false)
  }, [slug])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        setUserEmail(data.user.email ?? null)
      }
    })
    loadComments()
  }, [loadComments])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    if (!userId && (!guestName.trim() || !guestEmail.trim())) return

    setSubmitting(true)
    const result = await addComment({
      slug,
      user_id: userId,
      display_name: userId ? (userEmail?.split("@")[0] ?? "User") : guestName.trim(),
      email: userId ? null : guestEmail.trim(),
      body: body.trim(),
      parent_id: replyTo,
    })
    setSubmitting(false)

    if (result) {
      // Subscribe to newsletter if checked
      const emailToSubscribe = userId ? userEmail : guestEmail.trim()
      if (subscribeNewsletter && emailToSubscribe) {
        fetch("/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailToSubscribe }),
        }).catch(() => {}) // fire and forget
      }
      setBody("")
      setReplyTo(null)
      await loadComments()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this comment?")) return
    await deleteComment(id)
    await loadComments()
  }

  // Build threaded structure
  const topLevel = comments.filter(c => !c.parent_id)
  const replies = (parentId: string) => comments.filter(c => c.parent_id === parentId)

  function CommentCard({ comment, depth = 0 }: { comment: Comment; depth?: number }) {
    const isOwn = userId && comment.user_id === userId
    const childReplies = replies(comment.id)

    return (
      <div style={{ marginLeft: depth > 0 ? 24 : 0, marginTop: depth > 0 ? 12 : 0 }}>
        <div style={{ background: depth > 0 ? "#fafafa" : "#fff", border: "1px solid #eee", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{comment.display_name}</span>
              {comment.user_id && (
                <span style={{ fontSize: 9, fontWeight: 700, color: "#0d7c5f", background: "#e6f5f0", padding: "1px 6px", borderRadius: 99 }}>MEMBER</span>
              )}
              <span style={{ fontSize: 11, color: "#bbb" }}>{timeAgo(comment.created_at)}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                style={{ fontSize: 11, color: "#999", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                {replyTo === comment.id ? "Cancel" : "Reply"}
              </button>
              {isOwn && (
                <button onClick={() => handleDelete(comment.id)}
                  style={{ fontSize: 11, color: "#ddd", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  Delete
                </button>
              )}
            </div>
          </div>
          <p style={{ fontSize: 14, color: "#555", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{comment.body}</p>
        </div>

        {/* Inline reply form */}
        {replyTo === comment.id && (
          <form onSubmit={handleSubmit} style={{ marginTop: 8, marginLeft: 24 }}>
            {!userId && (
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Your name" required
                  style={{ flex: 1, padding: "8px 12px", fontSize: 13, border: "1px solid #e0e0e0", borderRadius: 6, background: "#fff", color: "#111" }} />
                <input value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="Your email (not shown)" type="email" required
                  style={{ flex: 1, padding: "8px 12px", fontSize: 13, border: "1px solid #e0e0e0", borderRadius: 6, background: "#fff", color: "#111" }} />
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input value={body} onChange={e => setBody(e.target.value)} placeholder={`Reply to ${comment.display_name}...`}
                style={{ flex: 1, padding: "8px 12px", fontSize: 13, border: "1px solid #e0e0e0", borderRadius: 6, background: "#fff", color: "#111" }} />
              <button type="submit" disabled={submitting || !body.trim()}
                style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: body.trim() ? "#0d7c5f" : "#ccc", color: "#fff", border: "none", borderRadius: 6, cursor: body.trim() ? "pointer" : "default" }}>
                {submitting ? "..." : "Reply"}
              </button>
            </div>
          </form>
        )}

        {/* Child replies */}
        {childReplies.map(r => (
          <CommentCard key={r.id} comment={r} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ marginTop: 48, borderTop: "1px solid #eee", paddingTop: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111", margin: "0 0 20px", letterSpacing: "-0.01em" }}>
        Comments ({comments.length})
      </h2>

      {/* Comment form */}
      {replyTo === null && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
          {!userId && (
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Your name" required
                style={{ flex: 1, padding: "10px 14px", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fff", color: "#111" }} />
              <input value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="Your email (not displayed publicly)" type="email" required
                style={{ flex: 1, padding: "10px 14px", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fff", color: "#111" }} />
            </div>
          )}
          {userId && (
            <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
              Commenting as <span style={{ color: "#0d7c5f", fontWeight: 600 }}>{userEmail?.split("@")[0]}</span>
            </div>
          )}
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Share your experience or ask a question..."
            style={{ width: "100%", padding: "12px 14px", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fff", color: "#111", minHeight: 80, resize: "vertical", lineHeight: 1.6 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={subscribeNewsletter} onChange={e => setSubscribeNewsletter(e.target.checked)}
                style={{ accentColor: "#0d7c5f" }} />
              <span style={{ fontSize: 12, color: "#888" }}>Subscribe to the Fat Stacks newsletter</span>
            </label>
            <button type="submit" disabled={submitting || !body.trim() || (!userId && (!guestName.trim() || !guestEmail.trim()))}
              style={{ padding: "10px 24px", fontSize: 14, fontWeight: 700, background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", opacity: (!body.trim() || (!userId && (!guestName.trim() || !guestEmail.trim()))) ? 0.5 : 1 }}>
              {submitting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>
      )}

      {/* Comments list */}
      {loading ? (
        <div style={{ fontSize: 13, color: "#bbb", padding: "20px 0" }}>Loading comments...</div>
      ) : comments.length === 0 ? (
        <div style={{ fontSize: 14, color: "#bbb", padding: "20px 0" }}>No comments yet. Be the first to share your experience.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {topLevel.map(c => (
            <CommentCard key={c.id} comment={c} />
          ))}
        </div>
      )}
    </div>
  )
}
