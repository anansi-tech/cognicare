import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Practice from "@/models/practice";
import { stripe } from "@/lib/billing";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const practice = await Practice.findById(user.practiceId);
  if (!practice) return NextResponse.json({ error: "Practice not found" }, { status: 404 });

  // No subscription yet — nothing to reconcile.
  if (!practice.stripeSubscriptionId && !practice.stripeCustomerId) {
    return NextResponse.json({ status: practice.stripeSubscriptionStatus ?? null });
  }

  let liveStatus = practice.stripeSubscriptionStatus;

  try {
    let sub;
    if (practice.stripeSubscriptionId) {
      sub = await stripe.subscriptions.retrieve(practice.stripeSubscriptionId);
      liveStatus = sub.status;
    } else {
      // Subscription ID not yet stored (pre-existing practice); list by customer.
      const list = await stripe.subscriptions.list({
        customer: practice.stripeCustomerId,
        limit: 1,
        status: "all",
      });
      if (list.data.length > 0) {
        sub = list.data[0];
        liveStatus = sub.status;
        practice.stripeSubscriptionId = sub.id;
      }
    }
  } catch (err) {
    // Subscription deleted in Stripe (404) → mark canceled.
    if (err?.statusCode === 404 || err?.code === "resource_missing") {
      liveStatus = "canceled";
    } else {
      // Stripe unreachable — return cached status, don't heal.
      return NextResponse.json({ status: liveStatus });
    }
  }

  // Heal DB if stale.
  if (liveStatus !== practice.stripeSubscriptionStatus) {
    practice.stripeSubscriptionStatus = liveStatus;
    await practice.save();
  }

  return NextResponse.json({ status: liveStatus });
}
