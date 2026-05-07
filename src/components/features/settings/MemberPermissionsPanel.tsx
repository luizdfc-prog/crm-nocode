"use client"

import { useEffect, useState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import { getMemberPermissions, updateMemberPermissions } from "@/actions/permissions"
import type { MemberPermissions, PermissionLevel } from "@/types"

interface Props {
  profileId: string
  isAdmin: boolean
}

type PermField = keyof Omit<MemberPermissions, "id" | "workspace_id" | "profile_id">

const RESOURCES = [
  { key: "leads", label: "Leads" },
  { key: "convs", label: "Conversas" },
  { key: "deals", label: "Negócios" },
] as const

type ResourceKey = typeof RESOURCES[number]["key"]

function hasCreate(r: ResourceKey) { return r !== "convs" }
function hasEdit(r: ResourceKey) { return r !== "convs" }

// Toggle 3 estados para visibilidade
function TriToggle({ value, onChange, disabled }: {
  value: PermissionLevel
  onChange: (v: PermissionLevel) => void
  disabled?: boolean
}) {
  const options: { value: PermissionLevel; label: string; color: string }[] = [
    { value: "all", label: "Todos", color: "#2ED573" },
    { value: "own", label: "Só os seus", color: "#FF6B35" },
    { value: "none", label: "Nenhum", color: "#FF4757" },
  ]
  return (
    <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className="px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-40"
          style={{
            backgroundColor: value === opt.value ? opt.color : "var(--surface-2)",
            color: value === opt.value ? "#0C0C0E" : "var(--text-muted)",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// Toggle simples Sim/Não
function BoolToggle({ value, onChange, disabled }: {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!value)}
      className="w-10 h-5 rounded-full transition-colors relative disabled:opacity-40"
      style={{ backgroundColor: value ? "#2ED573" : "var(--surface-2)", border: "1px solid var(--border)" }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
        style={{ left: value ? "calc(100% - 18px)" : "2px" }}
      />
    </button>
  )
}

export function MemberPermissionsPanel({ profileId, isAdmin }: Props) {
  const [perms, setPerms] = useState<MemberPermissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setLoading(true)
    getMemberPermissions(profileId).then((p) => {
      setPerms(p)
      setLoading(false)
    })
  }, [profileId])

  function update(field: PermField, value: boolean | PermissionLevel) {
    setPerms((prev) => prev ? { ...prev, [field]: value } : prev)
    setSaved(false)
  }

  async function handleSave() {
    if (!perms) return
    setSaving(true)
    const { id: _id, workspace_id: _ws, profile_id: _pid, ...fields } = perms
    await updateMemberPermissions(profileId, fields)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 animate-spin text-[var(--text-muted)]" />
      </div>
    )
  }

  if (isAdmin) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <ShieldCheck className="size-8 text-[var(--accent)]" />
        <p className="text-sm font-medium text-[var(--text)]">Administrador</p>
        <p className="text-xs text-[var(--text-muted)]">Admins têm acesso total ao workspace e não podem ter permissões restringidas.</p>
      </div>
    )
  }

  if (!perms) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Grid de permissões */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[100px_1fr_1fr_1fr_1fr] gap-2 px-3 py-2 bg-[var(--surface-2)] border-b border-[var(--border)]">
          <span />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-center">Criar</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-center">Ver</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-center">Editar</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-center">Excluir</span>
        </div>

        {RESOURCES.map((res, i) => (
          <div
            key={res.key}
            className={`grid grid-cols-[100px_1fr_1fr_1fr_1fr] gap-2 items-center px-3 py-3 ${i < RESOURCES.length - 1 ? "border-b border-[var(--border)]" : ""}`}
          >
            <span className="text-xs font-medium text-[var(--text)]">{res.label}</span>

            {/* Criar */}
            <div className="flex justify-center">
              {hasCreate(res.key) ? (
                <BoolToggle
                  value={perms[`${res.key}_create` as PermField] as boolean}
                  onChange={(v) => update(`${res.key}_create` as PermField, v)}
                />
              ) : <span className="text-[var(--text-muted)] text-xs">—</span>}
            </div>

            {/* Ver */}
            <div className="flex justify-center">
              <TriToggle
                value={perms[`${res.key}_view` as PermField] as PermissionLevel}
                onChange={(v) => update(`${res.key}_view` as PermField, v)}
              />
            </div>

            {/* Editar */}
            <div className="flex justify-center">
              {hasEdit(res.key) ? (
                <TriToggle
                  value={perms[`${res.key}_edit` as PermField] as PermissionLevel}
                  onChange={(v) => update(`${res.key}_edit` as PermField, v)}
                />
              ) : <span className="text-[var(--text-muted)] text-xs">—</span>}
            </div>

            {/* Excluir */}
            <div className="flex justify-center">
              <BoolToggle
                value={perms[`${res.key}_delete` as PermField] as boolean}
                onChange={(v) => update(`${res.key}_delete` as PermField, v)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-[10px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2ED573]" />Todos</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FF6B35]" />Só os seus</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FF4757]" />Nenhum</span>
      </div>

      {/* Botão salvar */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: "#CAFF33" }}
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {saving ? "Salvando..." : "Salvar permissões"}
        </button>
        {saved && <span className="text-xs text-[#2ED573]">✓ Salvo com sucesso</span>}
      </div>
    </div>
  )
}
