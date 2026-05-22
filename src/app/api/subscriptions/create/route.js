import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { subscriptionService } from "@/lib/subscription-service";

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await request.json();
    const { url } = await subscriptionService.createSubscription(session.user.id, plan);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create subscription" },
      { status: 500 }
    );
  }
}
