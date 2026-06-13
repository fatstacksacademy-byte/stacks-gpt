"use client"

import { useId, useState } from "react"
import {
  SPENDING_CATEGORY_DEFINITIONS,
  type SpendingCategory,
} from "../../lib/spendingCategories"

export default function SpendingCategoryPicker({
  selected,
  onAdd,
  placeholder = "Search spending categories",
}: {
  selected: readonly SpendingCategory[]
  onAdd: (category: SpendingCategory) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState("")
  const listId = useId()
  const available = SPENDING_CATEGORY_DEFINITIONS.filter(category => !selected.includes(category.key))

  function addCategory() {
    const normalized = query.trim().toLowerCase()
    const match = available.find(category =>
      category.key.toLowerCase() === normalized || category.label.toLowerCase() === normalized,
    )
    if (!match) return
    onAdd(match.key)
    setQuery("")
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input
        list={listId}
        value={query}
        onChange={event => setQuery(event.target.value)}
        onKeyDown={event => {
          if (event.key === "Enter") {
            event.preventDefault()
            addCategory()
          }
        }}
        placeholder={placeholder}
        style={{ minWidth: 220, flex: "1 1 240px", padding: "8px 10px", fontSize: 12, color: "#222", background: "#fff", border: "1px solid #ddd", borderRadius: 7 }}
      />
      <datalist id={listId}>
        {available.map(category => (
          <option key={category.key} value={category.label}>{category.group}</option>
        ))}
      </datalist>
      <button
        type="button"
        onClick={addCategory}
        disabled={!query.trim()}
        style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, color: query.trim() ? "#7c3aed" : "#aaa", background: "#fff", border: "1px solid #ddd", borderRadius: 7, cursor: query.trim() ? "pointer" : "default" }}
      >
        Add category
      </button>
      <span style={{ fontSize: 11, color: "#999" }}>{available.length} available</span>
    </div>
  )
}
