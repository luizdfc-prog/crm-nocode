import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { resend } from "@/lib/resend/client"
import { WelcomeEmail } from "@/lib/resend/templates/WelcomeEmail"
import type { Database } from "@/types/database"

// GET — validar token e retornar preview do workspace
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  // Service role — token é público para aceite
  const serviceClient = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: invite, error } = await serviceClient
    .from("workspace_invites")
    .select("id, email, role, expires_at, accepted_at, workspace_id")
    .eq("token", token)
    .maybeSingle()

  if (error || !invite) {
    return NextResponse.json(
      { error: "Convite não encontrado" },
      { status: 404 },
    )
  }

  if (invite.accepted_at) {
    return NextResponse.json(
      { error: "Este convite já foi aceito" },
      { status: 410 },
    )
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Este convite expirou" },
      { status: 410 },
    )
  }

  const { data: workspace } = await serviceClient
    .from("workspaces")
    .select("name, plan")
    .eq("id", invite.workspace_id)
    .single()

  return NextResponse.json({
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expires_at: invite.expires_at,
    },
    workspace: {
      name: workspace?.name ?? "Workspace",
      plan: workspace?.plan ?? "free",
    },
  })
}

const acceptSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").optional(),
  password: z
    .string()
    .min(6, "Senha deve ter ao menos 6 caracteres")
    .optional(),
})

// POST — aceitar convite
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  const serviceClient = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Buscar e validar o convite
  const { data: invite, error: inviteError } = await serviceClient
    .from("workspace_invites")
    .select("id, email, role, expires_at, accepted_at, workspace_id")
    .eq("token", token)
    .maybeSingle()

  if (inviteError || !invite) {
    return NextResponse.json(
      { error: "Convite não encontrado" },
      { status: 404 },
    )
  }

  if (invite.accepted_at) {
    return NextResponse.json(
      { error: "Este convite já foi aceito" },
      { status: 410 },
    )
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Este convite expirou" },
      { status: 410 },
    )
  }

  const body = await request.json()
  const parsed = acceptSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    )
  }

  // Verificar se o usuário já está autenticado
  const supabase = await createClient()
  const {
    data: { user: existingUser },
  } = await supabase.auth.getUser()

  let userId: string
  let userName: string

  if (existingUser && existingUser.email === invite.email) {
    // Usuário já logado com o e-mail do convite
    userId = existingUser.id
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .single()
    userName = profile?.name ?? invite.email
  } else if (existingUser && existingUser.email !== invite.email) {
    return NextResponse.json(
      {
        error:
          "Você está logado com outro e-mail. Saia e tente novamente com o e-mail do convite.",
      },
      { status: 409 },
    )
  } else {
    // Novo usuário — precisa de name + password
    if (!parsed.data.name || !parsed.data.password) {
      return NextResponse.json(
        { error: "Nome e senha são obrigatórios para novos usuários" },
        { status: 400 },
      )
    }

    // Criar conta via service role
    const { data: authData, error: signupError } =
      await serviceClient.auth.admin.createUser({
        email: invite.email,
        password: parsed.data.password,
        email_confirm: true,
        user_metadata: { name: parsed.data.name },
      })

    if (signupError || !authData.user) {
      // Se o usuário já existe, tentar buscar pelo e-mail
      if (signupError?.message?.includes("already registered")) {
        return NextResponse.json(
          { error: "E-mail já cadastrado. Faça login para aceitar o convite." },
          { status: 409 },
        )
      }
      return NextResponse.json(
        { error: "Erro ao criar conta" },
        { status: 500 },
      )
    }

    userId = authData.user.id
    userName = parsed.data.name

    // Upsert explícito — garante name e email mesmo que o trigger
    // tenha criado o profile antes dos metadados estarem disponíveis
    await serviceClient
      .from("profiles")
      .upsert({ id: userId, name: userName, email: invite.email })
      .eq("id", userId)
  }

  // Verificar se já é membro do workspace
  const { data: existingMember } = await serviceClient
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", invite.workspace_id)
    .eq("profile_id", userId)
    .maybeSingle()

  if (!existingMember) {
    const { error: memberError } = await serviceClient
      .from("workspace_members")
      .insert({
        workspace_id: invite.workspace_id,
        profile_id: userId,
        role: invite.role,
      })

    if (memberError) {
      return NextResponse.json(
        { error: "Erro ao adicionar ao workspace" },
        { status: 500 },
      )
    }
  }

  // Marcar convite como aceito
  await serviceClient
    .from("workspace_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id)

  // Enviar e-mail de boas-vindas
  const { data: workspace } = await serviceClient
    .from("workspaces")
    .select("name")
    .eq("id", invite.workspace_id)
    .single()

  await resend.emails.send({
    from: "PipeFlow CRM <onboarding@resend.dev>",
    to: invite.email,
    subject: `Bem-vindo ao ${workspace?.name ?? "workspace"}!`,
    react: WelcomeEmail({
      userName,
      workspaceName: workspace?.name ?? "workspace",
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    }),
  })

  return NextResponse.json({ success: true })
}
