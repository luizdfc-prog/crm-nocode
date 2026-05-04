"use client"

import { useState, useMemo, useTransition } from "react"
import { Plus, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { LeadCard } from "@/components/features/leads/LeadCard"
import { LeadSearchBar } from "@/components/features/leads/LeadSearchBar"
import { LeadFilters } from "@/components/features/leads/LeadFilters"
import { LeadForm, type LeadFormData } from "@/components/features/leads/LeadForm"
import { createLead } from "@/actions/leads"
import type { Lead, LeadStatus, Profile } from "@/types"

interface LeadsClientProps {
  initialLeads: Lead[]
  members: Pick<Profile, "id" | "name" | "email" | "avatar_url" | "created_at">[]
}

export function LeadsClient({ initialLeads, members }: LeadsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all")
  const [ownerFilter, setOwnerFilter] = useState<string | "all">("all")
  const [formOpen, setFormOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        lead.name.toLowerCase().includes(q) ||
        lead.company?.toLowerCase().includes(q) ||
        lead.email?.toLowerCase().includes(q)
      const matchStatus = statusFilter === "all" || lead.status === statusFilter
      const matchOwner = ownerFilter === "all" || lead.owner_id === ownerFilter
      return matchSearch && matchStatus && matchOwner
    })
  }, [leads, search, statusFilter, ownerFilter])

  async function handleCreate(data: LeadFormData) {
    setErrorMsg(null)
    try {
      const result = await createLead({
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

      setLeads((prev) => [result.data, ...prev])
      setFormOpen(false)
      startTransition(() => router.refresh())
    } catch {
      setErrorMsg("Erro ao criar lead. Tente novamente.")
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-heading text-xl font-bold text-pf-text">Leads</h2>
            <p className="mt-0.5 text-sm text-pf-text-muted">
              {filtered.length === leads.length
                ? `${leads.length} lead${leads.length !== 1 ? "s" : ""} cadastrado${leads.length !== 1 ? "s" : ""}`
                : `${filtered.length} de ${leads.length} lead${leads.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={() => setFormOpen(true)}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-pf-accent px-3 py-2 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Plus className="size-4" />
            Novo Lead
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-lg border border-pf-negative/30 bg-pf-negative/10 px-4 py-3 text-sm text-pf-negative">
            {errorMsg}
          </div>
        )}

        {/* Busca + filtros */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <LeadSearchBar value={search} onChange={setSearch} className="flex-1" />
          <LeadFilters
            statusFilter={statusFilter}
            ownerFilter={ownerFilter}
            onStatusChange={setStatusFilter}
            onOwnerChange={setOwnerFilter}
            owners={members}
          />
        </div>

        {/* Grid de leads */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-pf-border bg-pf-surface py-20">
            <div className="flex size-12 items-center justify-center rounded-xl border border-pf-border bg-pf-surface-2">
              <Users className="size-6 text-pf-text-muted" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-pf-text">
                {search || statusFilter !== "all" || ownerFilter !== "all"
                  ? "Nenhum lead encontrado"
                  : "Nenhum lead ainda"}
              </p>
              <p className="mt-1 text-xs text-pf-text-muted">
                {search || statusFilter !== "all" || ownerFilter !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Adicione seu primeiro lead para começar"}
              </p>
            </div>
            {!search && statusFilter === "all" && ownerFilter === "all" && (
              <button
                onClick={() => setFormOpen(true)}
                className="mt-1 flex items-center gap-2 rounded-lg bg-pf-accent px-3 py-2 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90"
              >
                <Plus className="size-4" />
                Adicionar Lead
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </div>

      <LeadForm
        isOpen={formOpen}
        members={members}
        onClose={() => { setFormOpen(false); setErrorMsg(null) }}
        onSubmit={handleCreate}
        errorMsg={errorMsg}
      />
    </>
  )
}
