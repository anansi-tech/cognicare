import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { subscriptionService } from "@/lib/subscription-service";

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { autoRenew } = await request.json();
    if (typeof autoRenew !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const updatedSubscription = await subscriptionService.updateAutoRenew(
      session.user.id,
      autoRenew
    );
    return NextResponse.json(updatedSubscription);
  } catch (error) {
    console.error("Error toggling auto-renewal:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
