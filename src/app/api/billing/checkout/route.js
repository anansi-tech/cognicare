import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Practice from "@/models/practice";
import { stripe } from "@/lib/billing";

export async function POST(req) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { priceId, quantity } = await req.json();
  if (!priceId) return NextResponse.json({ error: "priceId required" }, { status: 400 });

  // Practice plan bills per seat; Solo passes no quantity and defaults to 1.
  // Clamp 1–100 server-side regardless of what the client sends.
  const seats = Math.max(1, Math.min(Number(quantity) || 1, 100));

  await connectDB();
  if (!current.practiceId) {
    return NextResponse.json({ error: "No practice on user" }, { status: 400 });
  }
  const practice = await Practice.findById(current.practiceId);
  if (!practice) return NextResponse.json({ error: "Practice not found" }, { status: 404 });

  let customerId = practice.stripeCustomerId;
  if (!customerId) {
    // The practice pays — customer lives on the Practice, not the user.
    const customer = await stripe.customers.create({
      email: current.email,
      metadata: {
        practiceId: String(practice._id),
        ownerUserId: String(practice.ownerId),
      },
    });
    customerId = customer.id;
    practice.stripeCustomerId = customerId;
    await practice.save();
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: seats }],
    subscription_data: { trial_period_days: 14 },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?checkout=cancel`,
  });
  return NextResponse.json({ url: session.url });
}
