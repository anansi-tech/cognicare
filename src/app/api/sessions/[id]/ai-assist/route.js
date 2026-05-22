import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import Session from "@/models/session";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/client";

export async function POST(req, context) {
  try {
    const params = await context.params;
    const { id } = params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { query } = body;

    // Find the session and verify ownership
    const session = await Session.findOne({ _id: id, counselorId: user.id });
    if (!session) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }

    // Get client data
    const client = await Client.findOne({ _id: session.clientId });
    if (!client) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    // Call the conversational agent
    const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/conversational`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        clientId: session.clientId,
        sessionId: id,
        query,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("Failed to get AI response");
    }

    const response = await aiResponse.json();

    // Return the response
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in AI assistance:", error);
    return NextResponse.json({ message: "Error processing AI request" }, { status: 500 });
  }
}
