import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import { STRIPE_PRICE_IDS, type WorkspacePlan } from "@/types"

function planFromPriceId(priceId: string): WorkspacePlan | null {
  for (const [plan, ids] of Object.entries(STRIPE_PRICE_IDS)) {
    if (ids.base === priceId) return plan as WorkspacePlan
  }
  return null
}

// Usa service role para escrever fora do contexto de sessão do usuário — sem RLS
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
) {
  const workspaceId = session.metadata?.workspace_id
  if (!workspaceId) return

  const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const subscriptionId = session.subscription as string
  const subscription = await stripeClient.subscriptions.retrieve(subscriptionId)

  // Identificar item base e item add-on na assinatura
  let plan: WorkspacePlan = "essencial"
  let seats = 1
  let addonItemId: string | null = null

  for (const item of subscription.items.data) {
    const detectedPlan = planFromPriceId(item.price.id)
    if (detectedPlan) {
      plan = detectedPlan
    } else {
      // item é o add-on de usuários adicionais
      seats = 1 + (item.quantity ?? 0)
      addonItemId = item.id
    }
  }

  const supabase = getServiceClient()
  const { error } = await supabase
    .from("workspaces")
    .update({
      plan,
      seats,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
      stripe_addon_item_id: addonItemId,
    })
    .eq("id", workspaceId)

  if (error) throw new Error(`handleCheckoutCompleted: ${error.message}`)
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
) {
  const workspaceId = subscription.metadata?.workspace_id
  if (!workspaceId) return

  const supabase = getServiceClient()
  const { error } = await supabase
    .from("workspaces")
    .update({
      plan: "essencial",
      seats: 1,
      stripe_subscription_id: null,
      stripe_addon_item_id: null,
    })
    .eq("id", workspaceId)

  if (error) throw new Error(`handleSubscriptionDeleted: ${error.message}`)
}

// Trata upgrades/downgrades, mudanças de seats e cancelamentos agendados
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
) {
  const workspaceId = subscription.metadata?.workspace_id
  if (!workspaceId) return

  if (subscription.status !== "active" && subscription.status !== "trialing") {
    const supabase = getServiceClient()
    await supabase
      .from("workspaces")
      .update({ plan: "essencial", seats: 1 })
      .eq("id", workspaceId)
    return
  }

  let plan: WorkspacePlan = "essencial"
  let seats = 1
  let addonItemId: string | null = null

  for (const item of subscription.items.data) {
    const detectedPlan = planFromPriceId(item.price.id)
    if (detectedPlan) {
      plan = detectedPlan
    } else {
      seats = 1 + (item.quantity ?? 0)
      addonItemId = item.id
    }
  }

  const supabase = getServiceClient()
  const { error } = await supabase
    .from("workspaces")
    .update({ plan, seats, stripe_addon_item_id: addonItemId })
    .eq("id", workspaceId)

  if (error) throw new Error(`handleSubscriptionUpdated: ${error.message}`)
}

export async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const sub = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription
  const subscriptionId =
    typeof sub === "string"
      ? sub
      : (sub as Stripe.Subscription | null | undefined)?.id

  if (!subscriptionId) return

  const supabase = getServiceClient()
  const { error } = await supabase
    .from("workspaces")
    .update({ plan: "essencial", seats: 1 })
    .eq("stripe_subscription_id", subscriptionId)

  if (error) throw new Error(`handlePaymentFailed: ${error.message}`)
}
