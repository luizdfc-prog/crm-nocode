"use client"

import { useState, useMemo, useRef } from "react"
import { Plus, Users } from "lucide-react"
import { LeadCard } from "@/components/features/leads/LeadCard"
import { LeadSearchBar } from "@/components/features/leads/LeadSearchBar"
import { LeadFilters } from "@/components/features/leads/LeadFilters"
import { LeadForm, type LeadFormData } from "@/components/features/leads/LeadForm"
import { MOCK_LEADS, MOCK_PROFILES } from "@/utils/mock-data"
import type { Lead, LeadStatus } from "@/types"

export default function LeadsPage() {
  const nextId = useRef(MOCK_LEADS.length + 1)
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all")
  const [ownerFilter, setOwnerFilter] = useState<string | "all">("all")
  const [formOpen, setFormOpen] = useState(false)

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

  function handleCreate(data: LeadFormData) {
    const owner = MOCK_PROFILES.find((p) => p.id === data.owner_id)
    const newLead: Lead = {
      id: `lead-${nextId.current++}`,
      workspace_id: "ws-1",
      name: data.name,
      email: data.email || null,
      phone: data.phone ?? null,
      company: data.company ?? null,
      role: data.role ?? null,
      status: data.status,
      owner_id: data.owner_id ?? null,
      created_at: new Date().toISOString(),
      owner: owner ? { ...owner } : undefined,
    }
    setLeads((prev) => [newLead, ...prev])
    setFormOpen(false)
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
            className="flex items-center gap-2 rounded-lg bg-pf-accent px-3 py-2 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            Novo Lead
          </button>
        </div>

        {/* Busca + filtros */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <LeadSearchBar value={search} onChange={setSearch} className="flex-1" />
          <LeadFilters
            statusFilter={statusFilter}
            ownerFilter={ownerFilter}
            onStatusChange={setStatusFilter}
            onOwnerChange={setOwnerFilter}
            owners={MOCK_PROFILES}
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
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
      />
    </>
  )
}
