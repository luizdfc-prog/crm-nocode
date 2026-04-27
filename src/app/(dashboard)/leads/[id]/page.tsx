"use client"

import { useState } from "react"
import { useParams, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { LeadProfile } from "@/components/features/leads/LeadProfile"
import { ActivityTimeline } from "@/components/features/leads/ActivityTimeline"
import { ActivityForm } from "@/components/features/leads/ActivityForm"
import { LeadForm, type LeadFormData } from "@/components/features/leads/LeadForm"
import { MOCK_LEADS, MOCK_ACTIVITIES, MOCK_PROFILES } from "@/utils/mock-data"
import type { Activity, Lead } from "@/types"

let nextActivityId = MOCK_ACTIVITIES.length + 1

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [lead, setLead] = useState<Lead | undefined>(
    MOCK_LEADS.find((l) => l.id === id)
  )
  const [activities, setActivities] = useState<Activity[]>(
    MOCK_ACTIVITIES.filter((a) => a.lead_id === id)
  )
  const [editOpen, setEditOpen] = useState(false)

  if (!lead) return notFound()

  function handleActivityCreate(data: { type: Activity["type"]; description: string; activity_date: string }) {
    const newActivity: Activity = {
      id: `act-${nextActivityId++}`,
      workspace_id: "ws-1",
      lead_id: lead!.id,
      type: data.type,
      description: data.description,
      author_id: "profile-1",
      activity_date: data.activity_date,
      created_at: new Date().toISOString(),
      author: MOCK_PROFILES[0],
    }
    setActivities((prev) => [newActivity, ...prev])
  }

  function handleLeadEdit(data: LeadFormData) {
    const owner = MOCK_PROFILES.find((p) => p.id === data.owner_id) ?? undefined
    setLead((prev) =>
      prev
        ? {
            ...prev,
            name: data.name,
            email: data.email || null,
            phone: data.phone ?? null,
            company: data.company ?? null,
            role: data.role ?? null,
            status: data.status,
            owner_id: data.owner_id ?? null,
            owner,
          }
        : prev
    )
    setEditOpen(false)
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

        {/* Layout de duas colunas */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
          {/* Sidebar — perfil do lead */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <LeadProfile lead={lead} onEdit={() => setEditOpen(true)} />
          </div>

          {/* Coluna principal — timeline */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-pf-text">Atividades</h3>
              <span className="text-xs text-pf-text-muted">
                {activities.length} registro{activities.length !== 1 ? "s" : ""}
              </span>
            </div>

            <ActivityForm onSubmit={handleActivityCreate} />

            <ActivityTimeline activities={activities} />
          </div>
        </div>
      </div>

      <LeadForm
        isOpen={editOpen}
        initialData={lead}
        onClose={() => setEditOpen(false)}
        onSubmit={handleLeadEdit}
      />
    </>
  )
}
