import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe/client"
import {
  handleCheckoutCompleted,
  handleSubscriptionDeleted,
  handlePaymentFailed,
} from "@/lib/stripe/webhooks"

export async function POST(req: NextRequest) {
  // Body raw — Stripe rejeita se parsear como JSON antes de verificar assinatura
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object)
        break
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object)
        break
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object)
        break
    }
  } catch {
    return NextResponse.json({ error: "Handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
