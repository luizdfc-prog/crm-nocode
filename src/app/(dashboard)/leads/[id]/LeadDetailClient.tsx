"use client"

import { useState, useTransition, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { LeadProfile } from "@/components/features/leads/LeadProfile"
import { ActivityTimeline } from "@/components/features/leads/ActivityTimeline"
import { ActivityForm } from "@/components/features/leads/ActivityForm"
import { LeadForm, type LeadFormData } from "@/components/features/leads/LeadForm"
import { LeadChatTab } from "@/components/features/conversations/LeadChatTab"
import { updateLead } from "@/actions/leads"
import { createActivity } from "@/actions/activities"
import { getPipelines } from "@/actions/pipeline"
import { getDeals, createDeal } from "@/actions/deals"
import { getFieldValuesForLead, upsertFieldValues } from "@/actions/customFields"
import type { Activity, Lead, Profile, Pipeline, Deal, LeadFieldWithValue } from "@/types"

type Tab = "atividades" | "whatsapp"

interface LeadDetailClientProps {
  lead: Lead
  initialActivities: Activity[]
  members: Pick<Profile, "id" | "name" | "email" | "avatar_url" | "created_at">[]
  initialCustomFields?: LeadFieldWithValue[]
}

export function LeadDetailClient({ lead: initialLead, initialActivities, members, initialCustomFields = [] }: LeadDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [lead, setLead] = useState<Lead>(initialLead)
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [editOpen, setEditOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("atividades")
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [leadDeals, setLeadDeals] = useState<Deal[]>([])
  const [pipelineSuccess, setPipelineSuccess] = useState<string | null>(null)
  const [customFields, setCustomFields] = useState<LeadFieldWithValue[]>(initialCustomFields)

  useEffect(() => {
    Promise.all([getPipelines(), getDeals(), getFieldValuesForLead(initialLead.id)]).then(([pips, deals, fields]) => {
      setPipelines(pips)
      setLeadDeals(deals.filter((d) => d.lead_id === initialLead.id))
      setCustomFields(fields)
    })
  }, [initialLead.id])

  async function handleAddToPipeline(pipelineId: string, stageId: string) {
    const result = await createDeal({
      title: lead.name,
      value: 0,
      stage: "novo_lead",
      pipeline_id: pipelineId,
      stage_id: stageId,
      lead_id: lead.id,
    })
    if (result.success) {
      setLeadDeals((prev) => [...prev, result.data])
      const pipeline = pipelines.find((p) => p.id === pipelineId)
      const stage = pipeline?.stages?.find((s) => s.id === stageId)
      const label = pipeline ? `${pipeline.name}${stage ? ` › ${stage.name}` : ""}` : "Pipeline"
      setPipelineSuccess(`Adicionado em "${label}"`)
      setTimeout(() => setPipelineSuccess(null), 4000)
    }
  }

  async function handleActivityCreate(data: {
    type: Activity["type"]
    description: string
    activity_date: string
  }) {
    setErrorMsg(null)
    const result = await createActivity({
      lead_id: lead.id,
      type: data.type,
      description: data.description,
      activity_date: data.activity_date,
    })

    if (!result.success) {
      setErrorMsg(result.error)
      return
    }

    setActivities((prev) => [result.data, ...prev])
    startTransition(() => router.refresh())
  }

  async function handleLeadEdit(data: LeadFormData) {
    setErrorMsg(null)
    const result = await updateLead({
      id: lead.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      role: data.role,
      status: data.status,
      owner_id: data.owner_id || null,
    })

    if (!result.success) {
      setErrorMsg(result.error)
      return
    }

    if (data.customValues && Object.keys(data.customValues).length > 0) {
      await upsertFieldValues(lead.id, data.customValues)
      const updated = customFields.map((f) =>
        f.id in data.customValues! ? { ...f, value: data.customValues![f.id] ?? null } : f
      )
      setCustomFields(updated)
    }

    setLead(result.data)
    setEditOpen(false)
    startTransition(() => router.refresh())
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <Link
            href="/leads"
            className="flex items-center gap-1.5 text-sm text-pf-text-muted transition-colors hover:text-pf-text"
          >
            <ArrowLeft className="size-3.5" />
            Leads
          </Link>
          <span className="text-pf-text-muted">/</span>
          <span className="text-sm text-pf-text">{lead.name}</span>
        </div>

        {errorMsg && (
          <div className="rounded-lg border border-pf-negative/30 bg-pf-negative/10 px-4 py-3 text-sm text-pf-negative">
            {errorMsg}
          </div>
        )}

        {/* Layout de duas colunas */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
          <div className="lg:sticky lg:top-6 lg:self-start">
            <LeadProfile
              lead={lead}
              onEdit={() => setEditOpen(true)}
              pipelines={pipelines}
              leadDeals={leadDeals}
              pipelineSuccess={pipelineSuccess}
              onAddToPipeline={handleAddToPipeline}
              customFields={customFields}
            />
          </div>

          <div className="flex flex-col gap-6">
            {/* Tabs */}
            <div className="flex gap-1 border-b border-[var(--border)]">
              <button
                onClick={() => setActiveTab("atividades")}
                className="px-4 py-2 text-sm font-medium transition-opacity border-b-2 -mb-px"
                style={{
                  borderColor: activeTab === "atividades" ? "#CAFF33" : "transparent",
                  color: "#CAFF33",
                  opacity: activeTab === "atividades" ? 1 : 0.5,
                }}
              >
                Atividades
              </button>
              <button
                onClick={() => setActiveTab("whatsapp")}
                className="px-4 py-2 text-sm font-medium transition-opacity border-b-2 -mb-px"
                style={{
                  borderColor: activeTab === "whatsapp" ? "#CAFF33" : "transparent",
                  color: "#CAFF33",
                  opacity: activeTab === "whatsapp" ? 1 : 0.5,
                }}
              >
                WhatsApp
              </button>
            </div>

            {activeTab === "atividades" && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-pf-text-muted">
                    {activities.length} registro{activities.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <ActivityForm onSubmit={handleActivityCreate} />
                <ActivityTimeline activities={activities} />
              </>
            )}

            {activeTab === "whatsapp" && (
              <LeadChatTab leadId={lead.id} />
            )}
          </div>
        </div>
      </div>

      <LeadForm
        isOpen={editOpen}
        initialData={lead}
        members={members}
        customFields={customFields}
        onClose={() => { setEditOpen(false); setErrorMsg(null) }}
        onSubmit={handleLeadEdit}
      />
    </>
  )
}
