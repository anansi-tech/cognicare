import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import Practice from "@/models/practice";
import { stripe } from "@/lib/billing";

// Only job: keep the Practice's stripeSubscriptionStatus (and seats) in sync
// with Stripe. No state machine, no billingHistory — the Stripe dashboard /
// portal is the billing record. Client invoicing uses the redirect-based
// payment-link flow, not this webhook.
export async function POST(request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type.startsWith("customer.subscription.")) {
    const sub = event.data.object; // created | updated | deleted
    const nextStatus =
      event.type === "customer.subscription.deleted" ? "canceled" : sub.status;
    const seats = sub.items?.data?.[0]?.quantity;

    await connectDB();
    await Practice.updateOne(
      { stripeCustomerId: sub.customer },
      {
        $set: {
          stripeSubscriptionStatus: nextStatus,
          ...(typeof seats === "number" ? { seats } : {}),
        },
      }
    );
  }
  return NextResponse.json({ received: true });
}
