import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import type { WorkspacePlan } from "@/types"

function planFromPriceId(priceId: string): WorkspacePlan {
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return "starter"
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro"
  if (priceId === process.env.STRIPE_SCALE_PRICE_ID) return "scale"
  return "free"
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

  // Buscar o price do subscription para mapear ao plano correto
  const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const subscriptionId = session.subscription as string
  const subscription = await stripeClient.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price.id ?? ""
  const plan = planFromPriceId(priceId)

  const supabase = getServiceClient()
  const { error } = await supabase
    .from("workspaces")
    .update({
      plan,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
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
      plan: "free",
      stripe_subscription_id: null,
    })
    .eq("id", workspaceId)

  if (error) throw new Error(`handleSubscriptionDeleted: ${error.message}`)
}

// Trata cancelamentos agendados, upgrades/downgrades e mudanças de status
// (ex: cancel_at_period_end via Customer Portal → status permanece "active"
// até o fim do ciclo, mas o evento "deleted" só chega depois)
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
) {
  const workspaceId = subscription.metadata?.workspace_id
  if (!workspaceId) return

  const priceId = subscription.items.data[0]?.price.id ?? ""
  const plan = subscription.status === "active" ? planFromPriceId(priceId) : "free"
  const supabase = getServiceClient()
  const { error } = await supabase
    .from("workspaces")
    .update({ plan })
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
    .update({ plan: "free" })
    .eq("stripe_subscription_id", subscriptionId)

  if (error) throw new Error(`handlePaymentFailed: ${error.message}`)
}
