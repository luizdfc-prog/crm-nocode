"use client"

import { useEffect, useState, useCallback } from "react"
import {
  UserPlus,
  Loader2,
  MoreHorizontal,
  Crown,
  User,
  Mail,
  Clock,
  Trash2,
  Shield,
  SlidersHorizontal,
  ChevronUp,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { InviteModal } from "@/components/features/workspace/InviteModal"
import { MemberPermissionsPanel } from "./MemberPermissionsPanel"
import type { WorkspaceRow } from "@/types/supabase"
import type { WorkspaceInvite, Pipeline } from "@/types"

interface ProfileJoin {
  name: string
  email: string
  avatar_url: string | null
}

interface MemberWithProfile {
  id: string
  profile_id: string
  role: "admin" | "member"
  created_at: string
  profiles: ProfileJoin | null
}

interface MembersTabProps {
  workspace: WorkspaceRow
  currentUserId: string
  currentUserRole: "admin" | "member"
  pipelines?: Pipeline[]
}

const FREE_LIMIT = 2

function getProfile(profiles: ProfileJoin | null): ProfileJoin | null {
  return profiles
}

export function MembersTab({
  workspace,
  currentUserId,
  currentUserRole,
  pipelines = [],
}: MembersTabProps) {
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [invites, setInvites] = useState<WorkspaceInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  // ID do membro com permissões expandidas inline
  const [expandedPermId, setExpandedPermId] = useState<string | null>(null)

  const isAdmin = currentUserRole === "admin"
  const isFreePlan = workspace.plan === "free"
  const memberCount = members.length
  const atLimit = isFreePlan && memberCount >= FREE_LIMIT

  const loadData = useCallback(async () => {
    const supabase = createClient()

    const [membersResult, invitesResult] = await Promise.all([
      supabase
        .from("workspace_members")
        .select("id, profile_id, role, created_at")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: true }),
      isAdmin
        ? fetch("/api/invites").then((r) => r.json())
        : Promise.resolve({ invites: [] }),
    ])

    if (membersResult.data && membersResult.data.length > 0) {
      const profileIds = membersResult.data.map((m) => m.profile_id)
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url")
        .in("id", profileIds)

      const profileMap = new Map(profilesData?.map((p) => [p.id, p]) ?? [])

      const enriched: MemberWithProfile[] = membersResult.data.map((m) => ({
        ...m,
        profiles: profileMap.get(m.profile_id) ?? null,
      }))
      setMembers(enriched)
    } else {
      setMembers([])
    }

    if (invitesResult.invites) {
      setInvites(invitesResult.invites)
    }
    setLoading(false)
  }, [workspace.id, isAdmin])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function changeRole(memberId: string, newRole: "admin" | "member") {
    setActionLoading(memberId)
    const supabase = createClient()
    await supabase
      .from("workspace_members")
      .update({ role: newRole })
      .eq("id", memberId)
    await loadData()
    setActionLoading(null)
    setOpenMenuId(null)
  }

  async function removeMember(memberId: string) {
    setActionLoading(memberId)
    const supabase = createClient()
    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("id", memberId)
    if (error) {
      alert(`Erro ao remover: ${error.message}`)
    }
    await loadData()
    setActionLoading(null)
    setOpenMenuId(null)
  }

  async function revokeInvite(inviteId: string) {
    setActionLoading(inviteId)
    await fetch("/api/invites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: inviteId }),
    })
    await loadData()
    setActionLoading(null)
  }

  const pendingInvites = invites.filter(
    (inv) => !inv.accepted_at && new Date(inv.expires_at) > new Date(),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-pf-accent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-heading text-base font-bold text-pf-text">Membros</h3>
          <p className="mt-0.5 text-sm text-pf-text-muted">
            {memberCount}{isFreePlan ? ` / ${FREE_LIMIT} — plano Free` : " membros"}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            disabled={atLimit}
            title={atLimit ? `Limite de ${FREE_LIMIT} membros atingido no plano Free` : undefined}
            className="flex h-9 items-center gap-2 rounded-lg bg-pf-accent px-4 text-sm font-semibold text-pf-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <UserPlus className="size-4" />
            Convidar
          </button>
        )}
      </div>

      {/* Aviso de limite */}
      {isAdmin && atLimit && (
        <div className="rounded-xl border border-pf-warm/30 bg-pf-warm/10 px-4 py-3 text-sm text-pf-warm">
          Limite de {FREE_LIMIT} membros atingido no plano Free.{" "}
          <span className="font-medium">Faça upgrade para Pro</span> para adicionar membros ilimitados.
        </div>
      )}

      {/* Lista de membros */}
      <div className="flex flex-col gap-2">
        {members.map((member) => {
          const isSelf = member.profile_id === currentUserId
          const isMenuOpen = openMenuId === member.id
          const isActing = actionLoading === member.id
          const isExpanded = expandedPermId === member.id
          const canEditPerms = isAdmin && !isSelf && member.role === "member"

          return (
            <div key={member.id} className="flex flex-col rounded-xl border border-pf-border bg-pf-surface overflow-hidden transition-colors">
              {/* Linha do membro */}
              <div className="flex items-center gap-3 p-4">
                {/* Avatar */}
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pf-surface-2 text-sm font-semibold text-pf-text-sec ring-1 ring-pf-border">
                  {getProfile(member.profiles)?.name?.charAt(0).toUpperCase() ?? "?"}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-pf-text">
                      {getProfile(member.profiles)?.name ?? "Usuário"}
                    </p>
                    {isSelf && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-pf-accent/10 text-pf-accent">
                        você
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-pf-text-muted">
                    {getProfile(member.profiles)?.email ?? "—"}
                  </p>
                </div>

                {/* Role badge */}
                <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-pf-border bg-pf-surface-2 px-2.5 py-1 text-xs font-medium text-pf-text-sec">
                  {member.role === "admin" ? (
                    <Crown className="size-3 text-pf-accent" />
                  ) : (
                    <User className="size-3" />
                  )}
                  {member.role === "admin" ? "Admin" : "Membro"}
                </div>

                {/* Botão editar permissões */}
                {canEditPerms && (
                  <button
                    onClick={() => setExpandedPermId(isExpanded ? null : member.id)}
                    title="Editar permissões"
                    className={`flex size-8 items-center justify-center rounded-lg transition-colors ${isExpanded ? "bg-pf-accent/10 text-pf-accent" : "text-pf-text-muted hover:bg-pf-surface-2 hover:text-pf-accent"}`}
                  >
                    {isExpanded ? <ChevronUp className="size-4" /> : <SlidersHorizontal className="size-4" />}
                  </button>
                )}

                {/* Menu de ações */}
                {isAdmin && !isSelf && (
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenMenuId(isMenuOpen ? null : member.id)}
                      className="flex size-8 items-center justify-center rounded-lg text-pf-text-muted hover:bg-pf-surface-2 hover:text-pf-text"
                    >
                      {isActing ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="size-4" />
                      )}
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 bottom-9 z-10 w-52 rounded-xl border border-pf-border bg-pf-surface shadow-xl">
                        <button
                          onClick={() => changeRole(member.id, member.role === "admin" ? "member" : "admin")}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-pf-text hover:bg-pf-surface-2 rounded-t-xl"
                        >
                          <Shield className="size-4 text-pf-cool" />
                          {member.role === "admin" ? "Rebaixar para Membro" : "Promover a Admin"}
                        </button>
                        <div className="h-px bg-pf-border" />
                        <button
                          onClick={() => removeMember(member.id)}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-pf-negative hover:bg-pf-surface-2 rounded-b-xl"
                        >
                          <Trash2 className="size-4" />
                          Remover do workspace
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Painel de permissões expandido inline */}
              {isExpanded && canEditPerms && (
                <div className="border-t border-pf-border bg-pf-surface-2 px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-pf-text-muted mb-3">
                    Permissões de {getProfile(member.profiles)?.name ?? "Membro"}
                  </p>
                  <MemberPermissionsPanel
                    profileId={member.profile_id}
                    isAdmin={false}
                    pipelines={pipelines}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Convites pendentes */}
      {isAdmin && pendingInvites.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-pf-text-muted">
            Convites pendentes
          </p>
          {pendingInvites.map((invite) => {
            const isActing = actionLoading === invite.id
            return (
              <div
                key={invite.id}
                className="flex items-center gap-3 rounded-xl border border-pf-border border-dashed bg-pf-surface p-4"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pf-surface-2 ring-1 ring-pf-border">
                  <Mail className="size-4 text-pf-text-muted" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-pf-text">{invite.email}</p>
                  <div className="flex items-center gap-1 text-xs text-pf-text-muted">
                    <Clock className="size-3" />
                    Expira em {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <span className="shrink-0 rounded-lg border border-pf-border bg-pf-surface-2 px-2.5 py-1 text-xs font-medium text-pf-text-sec">
                  {invite.role === "admin" ? "Admin" : "Membro"}
                </span>
                <button
                  onClick={() => revokeInvite(invite.id)}
                  disabled={isActing}
                  className="flex size-8 items-center justify-center rounded-lg text-pf-text-muted hover:bg-pf-surface-2 hover:text-pf-negative disabled:opacity-50"
                >
                  {isActing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  )
}
