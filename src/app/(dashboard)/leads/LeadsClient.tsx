"use client"

import { useState, useMemo, useTransition } from "react"
import { Plus, Users, Trash2, AlertTriangle, Upload, Download, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { LeadCard } from "@/components/features/leads/LeadCard"
import { LeadSearchBar } from "@/components/features/leads/LeadSearchBar"
import { LeadFilters, getPeriodStart, type LeadPeriodFilter } from "@/components/features/leads/LeadFilters"
import { LeadForm, type LeadFormData } from "@/components/features/leads/LeadForm"
import { ImportLeadsModal } from "@/components/features/leads/ImportLeadsModal"
import { createLead, deleteLead } from "@/actions/leads"
import { exportLeads } from "@/actions/leadsImport"
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
  const [periodFilter, setPeriodFilter] = useState<LeadPeriodFilter>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filtered = useMemo(() => {
    const periodStart = getPeriodStart(periodFilter)
    return leads.filter((lead) => {
      const q = search.toLowerCase().replace(/\D/g, "") || search.toLowerCase()
      const phoneDigits = (lead.phone ?? "").replace(/\D/g, "")
      const convPhoneDigits = (lead.conversations?.[0]?.phone_number ?? "").replace(/\D/g, "")
      const matchSearch =
        !search ||
        lead.name.toLowerCase().includes(search.toLowerCase()) ||
        lead.company?.toLowerCase().includes(search.toLowerCase()) ||
        lead.email?.toLowerCase().includes(search.toLowerCase()) ||
        (q.length > 0 && phoneDigits.length > 0 && phoneDigits.includes(q)) ||
        (q.length > 0 && convPhoneDigits.length > 0 && convPhoneDigits.includes(q))
      const matchStatus = statusFilter === "all" || lead.status === statusFilter
      const matchOwner = ownerFilter === "all" || lead.owner_id === ownerFilter
      const matchPeriod = !periodStart || new Date(lead.created_at) >= periodStart
      return matchSearch && matchStatus && matchOwner && matchPeriod
    })
  }, [leads, search, statusFilter, ownerFilter, periodFilter])

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    await deleteLead(deleteTarget.id)
    setLeads((prev) => prev.filter((l) => l.id !== deleteTarget.id))
    setDeleteTarget(null)
    setIsDeleting(false)
    startTransition(() => router.refresh())
  }

  async function handleExport() {
    setExporting(true)
    try {
      const result = await exportLeads()
      if (!result.success) return
      const XLSX = await import("xlsx")
      const ws = XLSX.utils.json_to_sheet(result.rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Leads")
      XLSX.writeFile(wb, `leads_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } finally {
      setExporting(false)
    }
  }

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-pf-border bg-pf-surface-2 px-3 py-2 text-sm font-medium text-pf-text-sec hover:text-pf-text transition-colors"
              title="Importar leads via CSV/XLSX"
            >
              <Upload className="size-4" />
              Importar
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || leads.length === 0}
              className="flex items-center gap-2 rounded-lg border border-pf-border bg-pf-surface-2 px-3 py-2 text-sm font-medium text-pf-text-sec hover:text-pf-text transition-colors disabled:opacity-50"
              title="Exportar leads em XLSX"
            >
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Exportar
            </button>
            <button
              onClick={() => setFormOpen(true)}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-pf-accent px-3 py-2 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Plus className="size-4" />
              Novo Lead
            </button>
          </div>
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
            periodFilter={periodFilter}
            onStatusChange={setStatusFilter}
            onOwnerChange={setOwnerFilter}
            onPeriodChange={setPeriodFilter}
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
                {search || statusFilter !== "all" || ownerFilter !== "all" || periodFilter !== "all"
                  ? "Nenhum lead encontrado"
                  : "Nenhum lead ainda"}
              </p>
              <p className="mt-1 text-xs text-pf-text-muted">
                {search || statusFilter !== "all" || ownerFilter !== "all" || periodFilter !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Adicione seu primeiro lead para começar"}
              </p>
            </div>
            {!search && statusFilter === "all" && ownerFilter === "all" && periodFilter === "all" && (
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
              <div key={lead.id} className="relative group/wrap">
                <LeadCard lead={lead} />
                <button
                  onClick={(e) => { e.preventDefault(); setDeleteTarget(lead) }}
                  className="absolute top-3 right-3 z-10 hidden group-hover/wrap:flex size-7 items-center justify-center rounded-lg border border-pf-border bg-pf-surface-2 text-pf-text-muted hover:border-pf-negative/50 hover:text-pf-negative transition-colors"
                  title="Excluir lead"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
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

      <ImportLeadsModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { startTransition(() => router.refresh()) }}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-pf-border bg-pf-surface p-6 shadow-2xl">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-pf-negative/10 border border-pf-negative/20">
              <AlertTriangle className="size-6 text-pf-negative" />
            </div>
            <h3 className="text-lg font-bold text-pf-text mb-1">Excluir lead</h3>
            <p className="text-sm text-pf-text-sec mb-4">
              Você está prestes a excluir permanentemente <span className="font-semibold text-pf-text">{deleteTarget.name}</span>. Esta ação irá remover:
            </p>
            <ul className="mb-5 space-y-1.5 text-sm text-pf-text-muted">
              <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-pf-negative/60 shrink-0" />Todos os dados do lead</li>
              <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-pf-negative/60 shrink-0" />Conversas e mensagens vinculadas</li>
              <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-pf-negative/60 shrink-0" />Cards no pipeline</li>
              <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-pf-negative/60 shrink-0" />Atividades registradas</li>
            </ul>
            <p className="mb-5 text-xs font-medium text-pf-negative">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 rounded-lg border border-pf-border bg-pf-surface-2 px-4 py-2 text-sm font-medium text-pf-text hover:bg-pf-surface transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#FF4757" }}
              >
                {isDeleting ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
