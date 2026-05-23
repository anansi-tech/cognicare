import Stripe from "stripe";
import { connectDB } from "@/lib/mongodb";
import Practice from "@/models/practice";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// past_due stays allowed — Stripe is mid-retry on a failed charge; don't lock
// out a paying customer during dunning. canceled / unpaid / incomplete are not active.
const ACTIVE = new Set(["trialing", "active", "past_due"]);

export function isActiveStatus(status) {
  return ACTIVE.has(status);
}

/**
 * Single source of access truth. Subscription lives on the Practice (Round 8);
 * a user has access iff their practice's status is in the allowed set.
 */
export async function getPracticeStatus(practiceId) {
  if (!practiceId) return null;
  await connectDB();
  const p = await Practice.findById(practiceId).select("stripeSubscriptionStatus").lean();
  return p?.stripeSubscriptionStatus ?? null;
}
