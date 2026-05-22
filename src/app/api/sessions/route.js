import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Session from "@/models/session";
import { requireAuth, getCurrentUser } from "@/lib/auth";

// Get all sessions for the authenticated counselor
export const GET = requireAuth(async (req) => {
  try {
    await connectDB();
    const user = await getCurrentUser();

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    // Build query based on filters
    const query = { counselorId: user.id };
    if (clientId) query.clientId = clientId;
    if (status) query.status = status;
    if (type) query.type = type;

    const sessions = await Session.find(query)
      .populate("clientId", "name")
      .sort({ date: -1 })
      .lean();

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Sessions GET error:", error);
    return NextResponse.json({ message: "Error fetching sessions" }, { status: 500 });
  }
});

// Create a new session
export const POST = requireAuth(async (req) => {
  try {
    await connectDB();
    const user = await getCurrentUser();

    const body = await req.json();
    const newSession = {
      ...body,
      counselorId: user.id,
      // Use the status from form data, default to "scheduled" if not provided
      status: body.status || "scheduled",
    };

    // Validate required fields
    const requiredFields = ["clientId", "date", "duration", "type", "format"];
    for (const field of requiredFields) {
      if (!newSession[field]) {
        return NextResponse.json({ message: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const createdSession = await Session.create(newSession);
    const populatedSession = await Session.findById(createdSession._id)
      .populate("clientId", "name")
      .lean();

    return NextResponse.json(populatedSession, { status: 201 });
  } catch (error) {
    console.error("Session POST error:", error);
    return NextResponse.json({ message: "Error creating session" }, { status: 500 });
  }
});
