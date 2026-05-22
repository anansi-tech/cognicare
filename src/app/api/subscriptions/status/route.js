import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { subscriptionService } from "@/lib/subscription-service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await subscriptionService.getSubscriptionStatus(session.user.id);

    // If no subscription exists, return null instead of creating a trial
    if (!subscription) {
      return NextResponse.json(null);
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json({ error: "Failed to fetch subscription status" }, { status: 500 });
  }
}
