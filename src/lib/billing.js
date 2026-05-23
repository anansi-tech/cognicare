import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// past_due stays allowed — Stripe is mid-retry on a failed charge; don't lock
// out a paying customer during dunning. canceled / unpaid / incomplete are not active.
const ACTIVE = new Set(["trialing", "active", "past_due"]);

/**
 * Single source of access truth. Reads the webhook-synced cache on the User doc.
 */
export function hasActiveSubscription(user) {
  return ACTIVE.has(user?.stripeSubscriptionStatus);
}
