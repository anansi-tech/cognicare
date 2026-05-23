import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import { stripe } from "@/lib/billing";

// Only job: keep User.stripeSubscriptionStatus in sync with Stripe.
// No state machine, no billingHistory — the Stripe dashboard/portal is the
// billing record. Client invoicing uses the redirect-based payment-link flow,
// not this webhook.
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
    await connectDB();
    await User.updateOne(
      { stripeCustomerId: sub.customer },
      {
        $set: {
          stripeSubscriptionStatus:
            event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
        },
      }
    );
  }
  return NextResponse.json({ received: true });
}
