import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Subscription from "@/models/subscription";
import { getSession } from "@/lib/auth";

export async function POST(request) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Find the user's trial subscription
    const subscription = await Subscription.findOne({
      userId: session.user.id,
      status: "trial",
    });

    if (!subscription) {
      return NextResponse.json({ error: "No trial subscription found" }, { status: 404 });
    }

    // Set end date to 5 minutes from now
    const endDate = new Date();
    endDate.setMinutes(endDate.getMinutes() + 5);

    // Update the subscription
    await Subscription.updateOne(
      { _id: subscription._id },
      {
        $set: {
          endDate,
          status: "expired",
        },
      }
    );

    return NextResponse.json({
      message: "Trial will expire in 5 minutes",
      endDate,
    });
  } catch (error) {
    console.error("Error expiring trial:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
