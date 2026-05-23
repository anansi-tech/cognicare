import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Practice from "@/models/practice";
import { stripe } from "@/lib/billing";

export async function POST() {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const practice = current.practiceId
    ? await Practice.findById(current.practiceId).select("stripeCustomerId").lean()
    : null;
  if (!practice?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account" }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: practice.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  });
  return NextResponse.json({ url: session.url });
}
