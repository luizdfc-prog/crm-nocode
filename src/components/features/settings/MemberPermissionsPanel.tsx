"use client"

import { useEffect, useState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import { getMemberPermissions, updateMemberPermissions, updatePipelinePermissions } from "@/actions/permissions"
import type { MemberPermissions, MemberPermissionsWithPipelines, PermissionLevel, Pipeline } from "@/types"

interface Props {
  profileId: string
  isAdmin: boolean
  pipelines: Pipeline[]
}

type PermField = keyof Omit<MemberPermissions, "id" | "workspace_id" | "profile_id">

const RESOURCES = [
  { key: "leads", label: "Leads", hasCreate: true, hasEdit: true },
  { key: "convs", label: "Conversas", hasCreate: false, hasEdit: false },
  { key: "deals", label: "Negócios", hasCreate: true, hasEdit: true },
] as const

const VIEW_OPTIONS: { value: PermissionLevel; label: string; color: string }[] = [
  { value: "all",  label: "Todos",      color: "#2ED573" },
  { value: "own",  label: "Só os seus", color: "#FF6B35" },
  { value: "none", label: "Nenhum",     color: "#FF4757" },
]

function TriToggle({ value, onChange }: { value: PermissionLevel; onChange: (v: PermissionLevel) => void }) {
  return (
    <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
      {VIEW_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="flex-1 px-2 py-1 text-[10px] font-medium transition-colors whitespace-nowrap"
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

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!value)}
      className="w-10 h-5 rounded-full transition-colors relative shrink-0 disabled:opacity-40"
      style={{ backgroundColor: value ? "#2ED573" : "var(--surface-2)", border: "1px solid var(--border)" }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
        style={{ left: value ? "calc(100% - 18px)" : "2px" }}
      />
    </button>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-[var(--text-sec)] shrink-0">{label}</span>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="px-3 py-2 bg-[var(--surface-2)] border-b border-[var(--border)]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{title}</span>
      </div>
      <div className="px-3 divide-y divide-[var(--border)]">
        {children}
      </div>
    </div>
  )
}

export function MemberPermissionsPanel({ profileId, isAdmin, pipelines }: Props) {
  const [perms, setPerms] = useState<MemberPermissionsWithPipelines | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pipelinePerms, setPipelinePerms] = useState<Record<string, { can_view: boolean; can_edit: boolean }>>({})

  useEffect(() => {
    setLoading(true)
    getMemberPermissions(profileId).then((p) => {
      setPerms(p)
      if (p) {
        const map: Record<string, { can_view: boolean; can_edit: boolean }> = {}
        // Se o membro nunca teve permissões salvas, libera todos por padrão (estado atual do produto)
        // Senão, respeita exatamente o que está salvo — pipelines não listados ficam desmarcados
        const hasSavedPerms = p.pipeline_permissions.length > 0
        for (const pip of pipelines) {
          map[pip.id] = hasSavedPerms
            ? { can_view: false, can_edit: false }
            : { can_view: true, can_edit: true }
        }
        for (const pp of p.pipeline_permissions) {
          map[pp.pipeline_id] = { can_view: pp.can_view, can_edit: pp.can_edit }
        }
        setPipelinePerms(map)
      }
      setLoading(false)
    })
  }, [profileId, pipelines])

  function update(field: PermField, value: boolean | PermissionLevel) {
    setPerms((prev) => prev ? { ...prev, [field]: value } : prev)
    setSaved(false)
  }

  async function handleSave() {
    if (!perms) return
    setSaving(true)
    const { id: _id, workspace_id: _ws, profile_id: _pid, pipeline_permissions: _pp, ...fields } = perms
    // Envia apenas pipelines marcados (can_view=true) — ausentes = sem acesso
    const enabledPipelines = Object.entries(pipelinePerms)
      .filter(([_, v]) => v.can_view)
      .map(([pipeline_id, v]) => ({ pipeline_id, can_view: true, can_edit: v.can_edit }))

    const [r1, r2] = await Promise.all([
      updateMemberPermissions(profileId, fields),
      updatePipelinePermissions(profileId, enabledPipelines),
    ])
    setSaving(false)
    if (r1.success && r2.success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
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
        <p className="text-xs text-[var(--text-muted)]">Admins têm acesso total e não podem ter permissões restringidas.</p>
      </div>
    )
  }

  if (!perms) return null

  return (
    <div className="flex flex-col gap-3 overflow-y-auto max-h-[62vh] pr-0.5">

      {/* Um card por recurso */}
      {RESOURCES.map((res) => (
        <Section key={res.key} title={res.label}>
          {res.hasCreate && (
            <Row label="Criar">
              <Toggle
                value={perms[`${res.key}_create` as PermField] as boolean}
                onChange={(v) => update(`${res.key}_create` as PermField, v)}
              />
            </Row>
          )}
          <Row label="Visualizar">
            <TriToggle
              value={perms[`${res.key}_view` as PermField] as PermissionLevel}
              onChange={(v) => update(`${res.key}_view` as PermField, v)}
            />
          </Row>
          {res.hasEdit && (
            <Row label="Editar">
              <TriToggle
                value={perms[`${res.key}_edit` as PermField] as PermissionLevel}
                onChange={(v) => update(`${res.key}_edit` as PermField, v)}
              />
            </Row>
          )}
          <Row label="Excluir">
            <Toggle
              value={perms[`${res.key}_delete` as PermField] as boolean}
              onChange={(v) => update(`${res.key}_delete` as PermField, v)}
            />
          </Row>
        </Section>
      ))}

      {/* Exportar CSV */}
      <Section title="Leads — Ações extras">
        <Row label="Exportar CSV">
          <Toggle value={perms.leads_export} onChange={(v) => update("leads_export", v)} />
        </Row>
      </Section>

      {/* Pipelines — lista com check + nível de acesso */}
      {pipelines.length > 0 && (
        <Section title="Pipelines visíveis">
          {pipelines.map((p) => {
            const pp = pipelinePerms[p.id] ?? { can_view: false, can_edit: false }
            const enabled = pp.can_view
            const level: "view" | "edit" = pp.can_edit ? "edit" : "view"
            return (
              <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setPipelinePerms((prev) => ({
                      ...prev,
                      [p.id]: e.target.checked
                        ? { can_view: true, can_edit: false }
                        : { can_view: false, can_edit: false },
                    }))}
                    className="size-4 shrink-0 accent-[var(--accent)] cursor-pointer"
                  />
                  <span className={`text-xs font-medium truncate ${enabled ? "text-[var(--text)]" : "text-[var(--text-muted)]"}`}>
                    {p.name}
                  </span>
                </label>

                {enabled && (
                  <div className="flex rounded-lg border border-[var(--border)] overflow-hidden shrink-0">
                    {(["view", "edit"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setPipelinePerms((prev) => ({
                          ...prev,
                          [p.id]: { can_view: true, can_edit: opt === "edit" },
                        }))}
                        className="px-2.5 py-1 text-[10px] font-medium transition-colors whitespace-nowrap"
                        style={{
                          backgroundColor: level === opt ? "#CAFF33" : "var(--surface-2)",
                          color: level === opt ? "#0C0C0E" : "var(--text-muted)",
                        }}
                      >
                        {opt === "view" ? "Só ver" : "Editar"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </Section>
      )}

      {/* Botão salvar */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: "#CAFF33" }}
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {saving ? "Salvando..." : "Salvar permissões"}
        </button>
        {saved && <span className="text-xs text-[#2ED573]">✓ Salvo</span>}
      </div>
    </div>
  )
}
