"use server"

import { redirect } from "next/navigation"
import { stripe } from "@/lib/stripe/client"
import { createClient } from "@/lib/supabase/server"
import { STRIPE_PRICE_IDS, type WorkspacePlan } from "@/types"

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

export async function createCheckoutSession(plan: WorkspacePlan, extraSeats = 0) {
  const { workspace, role } = await getWorkspace()

  if (role !== "admin") {
    throw new Error("Apenas admins podem assinar planos.")
  }

  if (workspace.plan === plan) {
    redirect("/settings?tab=plan")
  }

  const lineItems: { price: string; quantity: number }[] = [
    { price: STRIPE_PRICE_IDS[plan].base, quantity: 1 },
  ]

  if (extraSeats > 0) {
    lineItems.push({ price: STRIPE_PRICE_IDS[plan].addon, quantity: extraSeats })
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: lineItems,
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

// Adiciona ou remove seats (usuários adicionais) na assinatura ativa
export async function updateSeats(totalSeats: number) {
  const { workspace, role } = await getWorkspace()

  if (role !== "admin") {
    throw new Error("Apenas admins podem gerenciar seats.")
  }

  if (!workspace.stripe_subscription_id) {
    throw new Error("Workspace sem assinatura ativa.")
  }

  const extraSeats = Math.max(0, totalSeats - 1)
  const plan = workspace.plan as WorkspacePlan
  const addonPriceId = STRIPE_PRICE_IDS[plan].addon

  if (extraSeats === 0) {
    // Remover o item add-on se existir
    if (workspace.stripe_addon_item_id) {
      await stripe.subscriptionItems.del(workspace.stripe_addon_item_id, {
        proration_behavior: "always_invoice",
      })
    }
    return { seats: 1 }
  }

  if (workspace.stripe_addon_item_id) {
    // Atualizar quantidade do item existente
    await stripe.subscriptionItems.update(workspace.stripe_addon_item_id, {
      quantity: extraSeats,
      proration_behavior: "always_invoice",
    })
  } else {
    // Adicionar novo item add-on à assinatura
    await stripe.subscriptionItems.create({
      subscription: workspace.stripe_subscription_id,
      price: addonPriceId,
      quantity: extraSeats,
      proration_behavior: "always_invoice",
    })
  }

  return { seats: totalSeats }
}
