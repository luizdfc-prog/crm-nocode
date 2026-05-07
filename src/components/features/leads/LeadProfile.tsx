"use client"

import { useState } from "react"
import { Mail, Phone, Building2, Briefcase, Calendar, Pencil, ChevronRight } from "lucide-react"
import { LeadStatusBadge } from "./LeadStatusBadge"
import { CustomFieldsSection } from "./CustomFieldsSection"
import type { Lead, Pipeline, Deal, LeadFieldWithValue } from "@/types"

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

interface InfoRowProps {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-pf-surface-2 text-pf-text-muted">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-pf-text-muted">{label}</p>
        <p className="mt-0.5 text-sm text-pf-text">{value}</p>
      </div>
    </div>
  )
}

interface LeadProfileProps {
  lead: Lead
  onEdit: () => void
  pipelines?: Pipeline[]
  leadDeals?: Deal[]
  pipelineSuccess?: string | null
  onAddToPipeline?: (pipelineId: string, stageId: string) => Promise<void>
  customFields?: LeadFieldWithValue[]
}

export function LeadProfile({ lead, onEdit, pipelines = [], leadDeals = [], pipelineSuccess, onAddToPipeline, customFields = [] }: LeadProfileProps) {
  const [addToPipelineOpen, setAddToPipelineOpen] = useState(false)
  return (
    <div className="flex flex-col gap-6 rounded-xl border border-pf-border bg-pf-surface p-6">
      {/* Avatar + nome */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-pf-accent/10 text-xl font-bold text-pf-accent">
          {getInitials(lead.name)}
        </div>
        <div>
          <h3 className="font-heading text-lg font-bold text-pf-text">{lead.name}</h3>
          {lead.role && lead.company && (
            <p className="mt-0.5 text-sm text-pf-text-sec">
              {lead.role} · {lead.company}
            </p>
          )}
          {lead.company && !lead.role && (
            <p className="mt-0.5 text-sm text-pf-text-sec">{lead.company}</p>
          )}
        </div>
        <LeadStatusBadge status={lead.status} />
      </div>

      {/* Botão editar */}
      <button
        onClick={onEdit}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-pf-border py-2 text-sm text-pf-text-sec transition-colors hover:bg-pf-surface-2 hover:text-pf-text"
      >
        <Pencil className="size-3.5" />
        Editar lead
      </button>

      {/* Dados de contato */}
      <div className="flex flex-col gap-4 border-t border-pf-border pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-pf-text-muted">
          Contato
        </p>
        <div className="flex flex-col gap-3">
          <InfoRow icon={<Mail className="size-3.5" />} label="E-mail" value={lead.email} />
          <InfoRow icon={<Phone className="size-3.5" />} label="Telefone" value={lead.phone} />
          <InfoRow icon={<Building2 className="size-3.5" />} label="Empresa" value={lead.company} />
          <InfoRow icon={<Briefcase className="size-3.5" />} label="Cargo" value={lead.role} />
          <InfoRow
            icon={<Calendar className="size-3.5" />}
            label="Criado em"
            value={new Date(lead.created_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          />
        </div>
      </div>

      {/* Responsável */}
      {lead.owner && (
        <div className="flex flex-col gap-3 border-t border-pf-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-pf-text-muted">
            Responsável
          </p>
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pf-surface-2 text-xs font-semibold text-pf-text-sec border border-pf-border">
              {getInitials(lead.owner.name)}
            </div>
            <div>
              <p className="text-sm font-medium text-pf-text">{lead.owner.name}</p>
              <p className="text-xs text-pf-text-muted">{lead.owner.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Campos personalizados */}
      {customFields.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-pf-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-pf-text-muted">
            Informações adicionais
          </p>
          <CustomFieldsSection fields={customFields} leadId={lead.id} />
        </div>
      )}

      {/* Pipeline */}
      {onAddToPipeline && (
        <div className="flex flex-col gap-3 border-t border-pf-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-pf-text-muted">
            Pipeline
          </p>

          {/* Etapa atual */}
          {leadDeals.length > 0 && (() => {
            const lastDeal = leadDeals[leadDeals.length - 1]
            const pipeline = pipelines.find((p) => p.id === lastDeal.pipeline_id)
            const stage = pipeline?.stages?.find((s) => s.id === lastDeal.stage_id)
            return (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-pf-text-muted px-1">Etapa Atual</p>
                <div className="flex items-center gap-2 rounded-lg border border-pf-border bg-pf-surface-2 px-3 py-2">
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: stage?.color ?? "#CAFF33" }} />
                  <p className="text-xs text-pf-text truncate">{stage?.name ?? lastDeal.stage}</p>
                </div>
              </div>
            )
          })()}

          {/* Feedback de confirmação */}
          {pipelineSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-pf-accent/30 bg-pf-accent/10 px-3 py-2">
              <span className="text-pf-accent text-xs">✓</span>
              <p className="text-xs text-pf-accent">{pipelineSuccess}</p>
            </div>
          )}

          {/* Botão + sub-menu */}
          <button
            onClick={() => setAddToPipelineOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-pf-border py-2 px-3 text-sm text-pf-text-sec transition-colors hover:bg-pf-surface-2 hover:text-pf-text"
          >
            <span className="text-xs">Adicionar ao pipeline</span>
            <ChevronRight className={`size-3.5 text-pf-text-muted transition-transform ${addToPipelineOpen ? "rotate-90" : ""}`} />
          </button>

          {addToPipelineOpen && (
            <div className="flex flex-col gap-1.5 pl-2">
              {pipelines.filter((p) => p.type !== "agent").map((pipeline) => (
                <div key={pipeline.id} className="flex flex-col gap-1">
                  <p className="text-xs text-pf-text-muted font-medium px-1">{pipeline.name}</p>
                  {(pipeline.stages ?? []).map((stage) => (
                    <button
                      key={stage.id}
                      onClick={async () => { await onAddToPipeline(pipeline.id, stage.id); setAddToPipelineOpen(false) }}
                      className="text-left px-3 py-1.5 rounded-lg border border-pf-border bg-pf-surface hover:border-pf-accent/60 text-xs text-pf-text transition-colors"
                    >
                      + {stage.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
