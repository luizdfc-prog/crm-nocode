"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Tag, Pencil, Check, X } from "lucide-react"

const PRESET_COLORS = [
  "#5B7FFF", "#CAFF33", "#2ED573", "#FF4757", "#FF6B35",
  "#A855F7", "#EC4899", "#06B6D4", "#F59E0B", "#8A8A8F",
]

interface TagDef {
  id: string
  name: string
  color: string
}

export function TagsTab() {
  const [tags, setTags] = useState<TagDef[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((d) => { setTags(d); setLoading(false) })
  }, [])

  async function createTag() {
    if (!newName.trim()) return
    setSaving(true)
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    })
    if (res.ok) {
      const tag = await res.json()
      setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName("")
      setNewColor(PRESET_COLORS[0])
    }
    setSaving(false)
  }

  function startEdit(tag: TagDef) {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), color: editColor }),
    })
    if (res.ok) {
      setTags((prev) => prev.map((t) => t.id === id ? { ...t, name: editName.trim(), color: editColor } : t))
      setEditingId(null)
    }
  }

  async function deleteTag(id: string) {
    if (!confirm("Remover esta tag? Ela será desvinculada de todos os leads.")) return
    const res = await fetch(`/api/tags/${id}`, { method: "DELETE" })
    if (res.ok) setTags((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h3 className="font-heading font-bold text-pf-text">Gerenciar Tags</h3>
        <p className="mt-1 text-sm text-pf-text-muted">
          Crie tags para categorizar leads e use-as em automações.
        </p>
      </div>

      {/* Criar nova tag */}
      <div className="rounded-xl border border-pf-border bg-pf-surface-2 p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-pf-text-sec uppercase tracking-wide">Nova tag</p>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createTag()}
            placeholder="Nome da tag..."
            className="flex-1 rounded-lg border border-pf-border bg-pf-surface px-3 py-2 text-sm text-pf-text placeholder:text-pf-text-muted focus:outline-none focus:border-pf-accent"
          />
          <button
            onClick={createTag}
            disabled={saving || !newName.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-pf-accent px-3 py-2 text-sm font-semibold text-black disabled:opacity-40"
          >
            <Plus className="size-3.5" />
            Criar
          </button>
        </div>
        {/* Seletor de cor */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-pf-text-muted">Cor:</span>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              className="size-5 rounded-full border-2 transition-transform hover:scale-110"
              style={{ background: c, borderColor: newColor === c ? "#fff" : "transparent" }}
            />
          ))}
        </div>
        {/* Preview */}
        {newName && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-pf-text-muted">Preview:</span>
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ background: newColor + "22", color: newColor, border: `1px solid ${newColor}44` }}
            >
              <Tag className="size-3" />
              {newName}
            </span>
          </div>
        )}
      </div>

      {/* Lista de tags */}
      <div className="flex flex-col gap-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="size-5 animate-spin rounded-full border-2 border-pf-border border-t-pf-accent" />
          </div>
        ) : tags.length === 0 ? (
          <p className="text-center text-sm text-pf-text-muted py-8">Nenhuma tag criada ainda.</p>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between rounded-lg border border-pf-border bg-pf-surface-2 px-3 py-2.5"
            >
              {editingId === tag.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(tag.id)}
                    className="flex-1 rounded border border-pf-border bg-pf-surface px-2 py-1 text-sm text-pf-text focus:outline-none focus:border-pf-accent"
                    autoFocus
                  />
                  <div className="flex items-center gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setEditColor(c)}
                        className="size-4 rounded-full border-2 transition-transform hover:scale-110"
                        style={{ background: c, borderColor: editColor === c ? "#fff" : "transparent" }}
                      />
                    ))}
                  </div>
                  <button onClick={() => saveEdit(tag.id)} className="text-pf-positive hover:opacity-80">
                    <Check className="size-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-pf-text-muted hover:text-pf-text">
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ background: tag.color + "22", color: tag.color, border: `1px solid ${tag.color}44` }}
                  >
                    <Tag className="size-3" />
                    {tag.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => startEdit(tag)}
                      className="rounded p-1 text-pf-text-muted hover:text-pf-text transition-colors"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTag(tag.id)}
                      className="rounded p-1 text-pf-text-muted hover:text-pf-negative transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
