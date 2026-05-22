import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { subscriptionService } from "@/lib/subscription-service";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updatedSubscription = await subscriptionService.cancelSubscription(session.user.id);
    return NextResponse.json(updatedSubscription);
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
