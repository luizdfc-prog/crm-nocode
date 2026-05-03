"use server"

import { redirect } from "next/navigation"
import { stripe } from "@/lib/stripe/client"
import { createClient } from "@/lib/supabase/server"

async function getWorkspace() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()
  if (!membership) redirect("/login")

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", membership.workspace_id)
    .single()
  if (!workspace) redirect("/login")

  return { workspace, role: membership.role }
}

export async function createCheckoutSession() {
  const { workspace, role } = await getWorkspace()

  if (role !== "admin") {
    throw new Error("Apenas admins podem assinar o plano Pro.")
  }

  if (workspace.plan === "pro") {
    redirect("/settings?tab=plan")
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    // workspace_id viaja nos metadata para o webhook identificar qual workspace ativar
    metadata: { workspace_id: workspace.id },
    subscription_data: { metadata: { workspace_id: workspace.id } },
    customer: workspace.stripe_customer_id ?? undefined,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=plan&upgrade=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=plan`,
  })

  redirect(session.url!)
}

export async function createPortalSession() {
  const { workspace, role } = await getWorkspace()

  if (role !== "admin") {
    throw new Error("Apenas admins podem gerenciar a assinatura.")
  }

  if (!workspace.stripe_customer_id) {
    redirect("/settings?tab=plan")
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: workspace.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=plan`,
  })

  redirect(session.url)
}
