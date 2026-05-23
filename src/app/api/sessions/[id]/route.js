import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Session from "@/models/session";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import {
  logAuditEvent,
  auditMetaFromRequest,
  AuditActions,
  EntityTypes,
} from "@/lib/audit";

// Get a specific session
export const GET = requireAuth(async (req) => {
  try {
    await connectDB();
    const user = await getCurrentUser();
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    // Sessions inherit visibility from their parent client.
    const allowedClientIds = await visibleClientIds(user);
    const sessionData = await Session.findOne({
      _id: id,
      practiceId: user.practiceId,
      clientId: { $in: allowedClientIds },
    })
      .populate("clientId", "name")
      .lean();

    if (!sessionData) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(sessionData);
  } catch (error) {
    console.error("Session GET error:", error);
    return NextResponse.json({ message: "Error fetching session" }, { status: 500 });
  }
});

// Update a session
export const PATCH = requireAuth(async (req) => {
  try {
    await connectDB();
    const user = await getCurrentUser();
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    const body = await req.json();
    const { notes, status, date, duration, type, format } = body;

    // Find the session through assignment-aware visibility.
    const allowedClientIds = await visibleClientIds(user);
    const existingSession = await Session.findOne({
      _id: id,
      practiceId: user.practiceId,
      clientId: { $in: allowedClientIds },
    });

    if (!existingSession) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }

    // Update all editable fields if they are provided
    if (notes !== undefined) existingSession.notes = notes;
    if (status !== undefined) existingSession.status = status;
    if (date !== undefined) existingSession.date = new Date(date);
    if (duration !== undefined) existingSession.duration = duration;
    if (type !== undefined) existingSession.type = type;
    if (format !== undefined) existingSession.format = format;

    // Save the updated session
    await existingSession.save();

    await logAuditEvent({
      userId: user.id,
      practiceId: user.practiceId,
      action: AuditActions.UPDATE,
      entityType: EntityTypes.SESSION,
      entityId: id,
      ...auditMetaFromRequest(req),
    });

    // Return the updated session with populated fields
    const updatedSession = await Session.findById(id).populate("clientId", "name").lean();

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Session PATCH error:", error);
    return NextResponse.json({ message: "Error updating session" }, { status: 500 });
  }
});

// Delete a session
export const DELETE = requireAuth(async (req) => {
  try {
    await connectDB();
    const user = await getCurrentUser();
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    const allowedClientIds = await visibleClientIds(user);
    const deletedSession = await Session.findOneAndDelete({
      _id: id,
      practiceId: user.practiceId,
      clientId: { $in: allowedClientIds },
    });

    if (!deletedSession) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }

    await logAuditEvent({
      userId: user.id,
      practiceId: user.practiceId,
      action: AuditActions.DELETE,
      entityType: EntityTypes.SESSION,
      entityId: id,
      ...auditMetaFromRequest(req),
    });

    return NextResponse.json({ message: "Session deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Session DELETE error:", error);
    return NextResponse.json({ message: "Error deleting session" }, { status: 500 });
  }
});
