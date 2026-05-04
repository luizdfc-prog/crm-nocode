import type Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

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

  const supabase = getServiceClient()
  await supabase
    .from("workspaces")
    .update({
      plan: "pro",
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
    })
    .eq("id", workspaceId)
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
) {
  const workspaceId = subscription.metadata?.workspace_id
  if (!workspaceId) return

  const supabase = getServiceClient()
  await supabase
    .from("workspaces")
    .update({
      plan: "free",
      stripe_subscription_id: null,
    })
    .eq("id", workspaceId)
}

export async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const sub = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription
  const subscriptionId =
    typeof sub === "string"
      ? sub
      : (sub as Stripe.Subscription | null | undefined)?.id

  if (!subscriptionId) return

  const supabase = getServiceClient()
  // Localiza o workspace pela subscription e rebaixa para free
  await supabase
    .from("workspaces")
    .update({ plan: "free" })
    .eq("stripe_subscription_id", subscriptionId)
}
