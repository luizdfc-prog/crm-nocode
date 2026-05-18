import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { getActiveWorkspaceId } from "@/lib/supabase/active-workspace"
import { resend } from "@/lib/resend/client"
import { InviteEmail } from "@/lib/resend/templates/InviteEmail"
import { brand } from "@/config/brand"
import type { Database } from "@/types/database"

const FREE_MEMBER_LIMIT = 2

const inviteSchema = z.object({
  email: z.string().email("E-mail inválido"),
  role: z.enum(["admin", "member"]).default("member"),
})

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    )
  }
  const { email, role } = parsed.data

  // workspace_id vem da sessão (cookie de workspace ativo) — nunca do body
  const workspaceId = await getActiveWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Usuário não pertence a nenhum workspace" },
      { status: 403 },
    )
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("profile_id", user.id)
    .eq("workspace_id", workspaceId)
    .single()

  if (!membership) {
    return NextResponse.json(
      { error: "Usuário não pertence a nenhum workspace" },
      { status: 403 },
    )
  }

  if (membership.role !== "admin") {
    return NextResponse.json(
      { error: "Apenas administradores podem convidar membros" },
      { status: 403 },
    )
  }

  // Verificar plano e limite de membros
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name, plan")
    .eq("id", workspaceId)
    .single()

  if (!workspace) {
    return NextResponse.json(
      { error: "Workspace não encontrado" },
      { status: 404 },
    )
  }

  // Todos os planos LeadLoop permitem membros ilimitados (seats controlados pelo Stripe)

  // Verificar se já existe convite pendente para este e-mail neste workspace
  const { data: existing } = await supabase
    .from("workspace_invites")
    .select("id, accepted_at, expires_at")
    .eq("workspace_id", workspaceId)
    .eq("email", email)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: "Já existe um convite pendente para este e-mail" },
      { status: 409 },
    )
  }

  // Buscar perfil do convidador para o e-mail
  const { data: inviterProfile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single()

  // Criar convite usando service role (bypassa RLS para insert — a RLS já garante via check)
  const serviceClient = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: invite, error: insertError } = await serviceClient
    .from("workspace_invites")
    .insert({ workspace_id: workspaceId, email, role })
    .select("token")
    .single()

  if (insertError || !invite) {
    return NextResponse.json(
      { error: "Erro ao criar convite" },
      { status: 500 },
    )
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.token}`
  const inviterName = inviterProfile?.name ?? "Um administrador"

  const { error: emailError } = await resend.emails.send({
    from: `${brand.fromName} <${brand.fromEmail}>`,
    to: email,
    subject: `Você foi convidado para ${workspace.name} no ${brand.name}`,
    react: InviteEmail({
      workspaceName: workspace.name,
      inviterName,
      role,
      inviteUrl,
    }),
  })

  if (emailError) {
    // Convite já foi criado — não reverter, mas avisar
    console.error("Erro ao enviar e-mail de convite:", emailError)
    return NextResponse.json(
      { error: "Convite criado, mas falha ao enviar e-mail" },
      { status: 207 },
    )
  }

  return NextResponse.json({ success: true }, { status: 201 })
}

// GET — listar convites pendentes do workspace ativo do usuário
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const workspaceIdGet = await getActiveWorkspaceId()
  if (!workspaceIdGet) {
    return NextResponse.json({ error: "Workspace não encontrado" }, { status: 403 })
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("profile_id", user.id)
    .eq("workspace_id", workspaceIdGet)
    .single()

  if (!membership || membership.role !== "admin") {
    return NextResponse.json(
      { error: "Acesso restrito a administradores" },
      { status: 403 },
    )
  }

  const { data: invites, error } = await supabase
    .from("workspace_invites")
    .select("id, email, role, expires_at, accepted_at, created_at")
    .eq("workspace_id", workspaceIdGet)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: "Erro ao buscar convites" }, { status: 500 })
  }

  return NextResponse.json({ invites })
}

// DELETE — revogar convite
export async function DELETE(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await request.json()
  if (!id) {
    return NextResponse.json({ error: "ID do convite obrigatório" }, { status: 400 })
  }

  // Verificar que o convite pertence a um workspace do qual o usuário é admin
  const { data: invite } = await supabase
    .from("workspace_invites")
    .select("workspace_id")
    .eq("id", id)
    .maybeSingle()

  if (!invite) {
    return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 })
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("profile_id", user.id)
    .eq("workspace_id", invite.workspace_id)
    .maybeSingle()

  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
  }

  const { error, count } = await supabase
    .from("workspace_invites")
    .delete({ count: "exact" })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: "Erro ao revogar convite" }, { status: 500 })
  }

  if (!count || count === 0) {
    return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
