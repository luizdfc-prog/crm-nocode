"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Loader2 } from "lucide-react"
import { LostReasonModal } from "./LostReasonModal"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { STAGE_COLORS } from "./DealCard"
import { ActivityTimeline } from "@/components/features/leads/ActivityTimeline"
import { ActivityForm } from "@/components/features/leads/ActivityForm"
import { LeadChatTab } from "@/components/features/conversations/LeadChatTab"
import { getActivitiesForLead, createActivity } from "@/actions/activities"
import { getFieldValuesForLead } from "@/actions/customFields"
import { CustomFieldsSection } from "@/components/features/leads/CustomFieldsSection"
import type { Deal, DealStage, Lead, Profile, PipelineStage, Activity, LeadFieldWithValue } from "@/types"

// ─── Schema & types ──────────────────────────────────────────────────────────

const DEAL_STAGES = [
  "novo_lead",
  "contato_realizado",
  "proposta_enviada",
  "negociacao",
  "fechado_ganho",
  "fechado_perdido",
] as const

const dealSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  value: z.coerce.number().min(0, "Valor deve ser positivo"),
  stage: z.enum(DEAL_STAGES),
  lead_id: z.string().nullable(),
  owner_id: z.string().nullable(),
  due_date: z.string().nullable(),
  lost_reason: z.string().nullable().optional(),
})

export type DealFormData = z.infer<typeof dealSchema>

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  error?: string
  children: React.ReactNode
  required?: boolean
}

function Field({ label, error, children, required }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-pf-text-sec">
        {label}
        {required && <span className="ml-0.5 text-pf-negative">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-pf-negative">{error}</p>}
    </div>
  )
}

const inputClass =
  "h-9 w-full rounded-lg border border-pf-border bg-pf-surface-2 px-3 text-sm text-pf-text placeholder:text-pf-text-muted outline-none transition-colors focus:border-pf-accent/50 aria-[invalid=true]:border-pf-negative/50"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildValues(
  initialData?: Deal,
  stages?: PipelineStage[],
  defaultStageId?: string | null,
): DealFormData {
  // Resolve the legacy stage enum: try to match via stage_id -> PipelineStage name pattern,
  // or fall back to the stored value, or "novo_lead".
  const stage: DealStage = initialData?.stage ?? "novo_lead"

  return {
    title: initialData?.title ?? "",
    value: initialData?.value ?? 0,
    stage,
    lead_id: initialData?.lead_id ?? null,
    owner_id: initialData?.owner_id ?? null,
    due_date: initialData?.due_date
      ? new Date(initialData.due_date).toISOString().split("T")[0]
      : null,
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DealDetailPanelProps {
  deal: Deal | undefined
  isOpen: boolean
  stages: PipelineStage[]
  leads: Pick<Lead, "id" | "name" | "company">[]
  members: Pick<Profile, "id" | "name">[]
  defaultStageId?: string | null
  onSubmit: (data: DealFormData) => Promise<void>
  onClose: () => void
  errorMsg?: string | null
}

// ─── Main component ───────────────────────────────────────────────────────────

type TabId = "atividades" | "whatsapp" | "lead"

export function DealDetailPanel({
  deal,
  isOpen,
  stages,
  leads,
  members,
  defaultStageId,
  onSubmit,
  onClose,
  errorMsg,
}: DealDetailPanelProps) {
  // Form state
  const [values, setValues] = useState<DealFormData>(() => buildValues(deal, stages, defaultStageId))
  const [errors, setErrors] = useState<Partial<Record<keyof DealFormData, string>>>({})
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(true)

  // Right panel state
  const [activeTab, setActiveTab] = useState<TabId>("atividades")
  const [activities, setActivities] = useState<Activity[]>([])
  const [activitiesLoaded, setActivitiesLoaded] = useState(false)
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [customFields, setCustomFields] = useState<LeadFieldWithValue[]>([])
  const [customFieldsLoaded, setCustomFieldsLoaded] = useState(false)

  // Resizable divider
  const [leftWidth, setLeftWidth] = useState(380)
  const isDraggingDivider = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const hasLead = Boolean(deal?.lead_id)
  const stageColor =
    STAGE_COLORS[values.stage] ?? "#CAFF33"

  // Sync form whenever the panel opens or the deal changes
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setValues(buildValues(deal, stages, defaultStageId))
      setErrors({})
      setLoading(false)
      setActivitiesLoaded(false)
      setActivities([])
      setActiveTab("atividades")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, deal?.id])

  // Load activities lazily when the right panel first appears with a lead
  useEffect(() => {
    if (!hasLead || !isOpen || activitiesLoaded || !deal?.lead_id) return
    if (activeTab !== "atividades") return

    setActivitiesLoading(true)
    getActivitiesForLead(deal.lead_id).then((data) => {
      if (!mountedRef.current) return
      setActivities(data)
      setActivitiesLoaded(true)
      setActivitiesLoading(false)
    })
  }, [activeTab, hasLead, isOpen, activitiesLoaded, deal?.lead_id])

  // Load custom fields lazily when "lead" tab opens
  useEffect(() => {
    if (!hasLead || !isOpen || customFieldsLoaded || !deal?.lead_id) return
    if (activeTab !== "lead") return

    getFieldValuesForLead(deal.lead_id).then((data) => {
      if (!mountedRef.current) return
      setCustomFields(data)
      setCustomFieldsLoaded(true)
    })
  }, [activeTab, hasLead, isOpen, customFieldsLoaded, deal?.lead_id])

  const [showLostModal, setShowLostModal] = useState(false)

  // Form helpers
  function set<K extends keyof DealFormData>(key: K, value: DealFormData[K]) {
    // Intercept stage change to fechado_perdido — ask for reason first
    if (key === "stage" && value === "fechado_perdido" && values.stage !== "fechado_perdido") {
      setShowLostModal(true)
      return
    }
    setValues((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = dealSchema.safeParse(values)
    if (!result.success) {
      const fieldErrors: typeof errors = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof DealFormData
        fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setLoading(true)
    await onSubmit(result.data)
    if (mountedRef.current) setLoading(false)
  }

  // Activity submit
  const handleActivitySubmit = useCallback(
    async (data: { type: "ligacao" | "email" | "reuniao" | "nota"; description: string; activity_date: string }) => {
      if (!deal?.lead_id) return
      const result = await createActivity({ ...data, lead_id: deal.lead_id })
      if (result.success && mountedRef.current) {
        setActivities((prev) => [result.data, ...prev])
      }
    },
    [deal?.lead_id],
  )

  // Resizable divider handlers
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingDivider.current = true

    function onMouseMove(ev: MouseEvent) {
      if (!isDraggingDivider.current || !panelRef.current) return
      const panelRect = panelRef.current.getBoundingClientRect()
      const newLeftWidth = ev.clientX - panelRect.left
      const clamped = Math.max(280, Math.min(560, newLeftWidth))
      setLeftWidth(clamped)
    }

    function onMouseUp() {
      isDraggingDivider.current = false
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }, [])

  if (!isOpen) return null

  return (
    <>
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 flex h-full w-full flex-col bg-pf-surface shadow-2xl sm:flex-row"
      >
        {/* Accent top line (mobile only — on desktop it becomes a left accent) */}
        <div
          className="h-[2px] w-full shrink-0 transition-colors duration-300 sm:hidden"
          style={{
            background: `linear-gradient(90deg, transparent, ${stageColor}, transparent)`,
          }}
        />

        {/* ── Left column: form ────────────────────────────────────────── */}
        <div
          className="flex shrink-0 flex-col overflow-hidden w-full sm:w-auto"
          style={hasLead ? { width: leftWidth, minWidth: 280, maxWidth: 560 } : undefined}
        >
          {/* Left accent line (desktop) */}
          <div
            className="hidden h-[2px] w-full shrink-0 transition-colors duration-300 sm:block"
            style={{
              background: `linear-gradient(90deg, transparent, ${stageColor}, transparent)`,
            }}
          />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-pf-border px-5 py-4">
            <h2 className="font-heading text-base font-bold text-pf-text">
              {deal?.id ? "Editar Negócio" : "Novo Negócio"}
            </h2>
            <button
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-lg text-pf-text-muted transition-colors hover:bg-pf-surface-2 hover:text-pf-text"
              aria-label="Fechar painel"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="mx-5 mt-4 rounded-lg border border-pf-negative/30 bg-pf-negative/10 px-4 py-2.5 text-xs text-pf-negative">
              {errorMsg}
            </div>
          )}

          {/* Form body */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
              <Field label="Título do negócio" required error={errors.title}>
                <input
                  className={inputClass}
                  placeholder="Ex: Licença Enterprise TechCorp"
                  value={values.title}
                  onChange={(e) => set("title", e.target.value)}
                  aria-invalid={!!errors.title}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Valor (R$)" required error={errors.value}>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    placeholder="0"
                    value={values.value || ""}
                    onChange={(e) => set("value", Number(e.target.value))}
                    aria-invalid={!!errors.value}
                  />
                </Field>
                <Field label="Prazo">
                  <input
                    type="date"
                    className={cn(inputClass, "cursor-pointer")}
                    value={values.due_date ?? ""}
                    onChange={(e) => set("due_date", e.target.value || null)}
                  />
                </Field>
              </div>

              {/* Etapa — usa PipelineStage[] mas mantém stage (enum) para compatibilidade */}
              <Field label="Etapa">
                {stages.length > 0 ? (
                  <>
                    <div className="relative">
                      <select
                        value={
                          // Map the legacy stage enum to a stage_id via the stages array,
                          // falling back to the first stage if unmatched.
                          stages.find((s) => {
                            // Try matching by deal's stage_id when editing
                            if (deal?.stage_id) return s.id === deal.stage_id
                            // Otherwise approximate by index (novo_lead → stages[0], etc.)
                            return false
                          })?.id ??
                          deal?.stage_id ??
                          stages[0]?.id ??
                          ""
                        }
                        onChange={(e) => {
                          const selectedStage = stages.find((s) => s.id === e.target.value)
                          if (!selectedStage) return
                          // Map position to legacy enum (best-effort, index-based)
                          const DEAL_STAGE_BY_INDEX: DealStage[] = [
                            "novo_lead",
                            "contato_realizado",
                            "proposta_enviada",
                            "negociacao",
                            "fechado_ganho",
                            "fechado_perdido",
                          ]
                          const sortedStages = [...stages].sort((a, b) => a.position - b.position)
                          const idx = sortedStages.findIndex((s) => s.id === selectedStage.id)
                          const legacyStage = DEAL_STAGE_BY_INDEX[idx] ?? "novo_lead"
                          set("stage", legacyStage)
                        }}
                        className={cn(inputClass, "appearance-none pr-8 cursor-pointer")}
                      >
                        {[...stages]
                          .sort((a, b) => a.position - b.position)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div
                      className="mt-1 h-1 rounded-full transition-all duration-300"
                      style={{ background: stageColor, opacity: 0.6 }}
                    />
                  </>
                ) : (
                  // Fallback to legacy enum when no stages configured
                  <div className="relative">
                    <select
                      value={values.stage}
                      onChange={(e) => set("stage", e.target.value as DealStage)}
                      className={cn(inputClass, "appearance-none pr-8 cursor-pointer")}
                    >
                      {DEAL_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <div
                      className="mt-1 h-1 rounded-full transition-all duration-300"
                      style={{ background: stageColor, opacity: 0.6 }}
                    />
                  </div>
                )}
              </Field>

              <Field label="Lead vinculado">
                <div className="relative">
                  <select
                    value={values.lead_id ?? ""}
                    onChange={(e) => set("lead_id", e.target.value || null)}
                    className={cn(inputClass, "appearance-none pr-8 cursor-pointer")}
                  >
                    <option value="">Sem lead vinculado</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                        {l.company ? ` — ${l.company}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              <Field label="Responsável">
                <div className="relative">
                  <select
                    value={values.owner_id ?? ""}
                    onChange={(e) => set("owner_id", e.target.value || null)}
                    className={cn(inputClass, "appearance-none pr-8 cursor-pointer")}
                  >
                    <option value="">Sem responsável</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>

            {/* Sticky footer */}
            <div className="mt-auto flex items-center justify-end gap-3 border-t border-pf-border px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-lg border border-pf-border px-4 text-sm text-pf-text-sec transition-colors hover:bg-pf-surface-2 hover:text-pf-text"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex h-9 items-center gap-2 rounded-lg bg-pf-accent px-4 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                {deal?.id ? "Salvar alterações" : "Criar negócio"}
              </button>
            </div>
          </form>
        </div>

        {/* ── Resizable divider ────────────────────────────────────────── */}
        {hasLead && (
          <div
            className="hidden w-1 shrink-0 cursor-col-resize self-stretch bg-pf-border transition-colors hover:bg-[#CAFF33]/60 active:bg-[#CAFF33] sm:block"
            onMouseDown={handleDividerMouseDown}
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionar painel"
          />
        )}

        {/* ── Right column: tabs ───────────────────────────────────────── */}
        {hasLead && deal?.lead_id && (
          <div
            className="hidden flex-1 flex-col overflow-hidden sm:flex"
          >
            {/* Right accent top line */}
            <div
              className="h-[2px] w-full shrink-0 transition-colors duration-300"
              style={{
                background: `linear-gradient(90deg, transparent, #CAFF33, transparent)`,
              }}
            />

            {/* Tab bar */}
            <div className="flex shrink-0 border-b border-pf-border">
              {(["atividades", "lead", "whatsapp"] as TabId[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-opacity border-b-2"
                  style={{
                    borderColor: activeTab === tab ? "#CAFF33" : "transparent",
                    color: "#CAFF33",
                    opacity: activeTab === tab ? 1 : 0.5,
                  }}
                >
                  {tab === "atividades" ? "Atividades" : tab === "lead" ? "Lead" : "WhatsApp"}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {activeTab === "atividades" && (
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                  <ActivityForm onSubmit={handleActivitySubmit} />
                  {activitiesLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="size-5 animate-spin text-pf-text-muted" />
                    </div>
                  ) : (
                    <ActivityTimeline activities={activities} />
                  )}
                </div>
              )}

              {activeTab === "lead" && (
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                  {customFields.length === 0 ? (
                    <p className="text-xs text-pf-text-muted text-center py-6">
                      Nenhum campo personalizado configurado.<br/>
                      Crie campos em Configurações → Campos.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3 rounded-xl border border-pf-border bg-pf-surface p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-pf-text-muted">Informações adicionais</p>
                      <CustomFieldsSection
                        fields={customFields}
                        leadId={deal.lead_id}
                        onSaved={setCustomFields}
                      />
                    </div>
                  )}
                </div>
              )}

              {activeTab === "whatsapp" && (
                <div className="relative flex flex-1 flex-col overflow-hidden p-4">
                  <LeadChatTab leadId={deal.lead_id} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

      {showLostModal && (
        <LostReasonModal
          dealTitle={values.title}
          onConfirm={(reason) => {
            setShowLostModal(false)
            setValues((prev) => ({ ...prev, stage: "fechado_perdido", lost_reason: reason }))
          }}
          onCancel={() => setShowLostModal(false)}
        />
      )}
    </>
  )
}
