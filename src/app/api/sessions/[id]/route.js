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
      .populate("clientId", "name");

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
    const {
      notes,
      status,
      date,
      duration,
      type,
      format,
      cancellationReason,
      applyToFuture,
    } = body;

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

    const previousStatus = existingSession.status;

    // Update all editable fields if they are provided
    if (notes !== undefined) existingSession.notes = notes;
    if (status !== undefined) {
      existingSession.status = status;
      if (status === "completed") existingSession.completedAt = new Date();
    }
    if (date !== undefined) existingSession.date = new Date(date);
    if (duration !== undefined) existingSession.duration = duration;
    if (type !== undefined) existingSession.type = type;
    if (format !== undefined) existingSession.format = format;
    // Round 15: capture optional cancellation reason on status changes.
    if (cancellationReason !== undefined) {
      existingSession.cancellationReason = cancellationReason || undefined;
    }

    await existingSession.save();

    // Optional bulk cancel: when cancelling a session in a series, the client
    // can ask to cancel "this and future" — same status + reason for every
    // sibling whose date is >= this one.
    let bulkAffected = 0;
    const cancelAllFuture =
      applyToFuture &&
      status === "cancelled" &&
      existingSession.seriesId &&
      existingSession.date;
    if (cancelAllFuture) {
      const result = await Session.updateMany(
        {
          seriesId: existingSession.seriesId,
          _id: { $ne: existingSession._id },
          date: { $gt: existingSession.date },
          status: "scheduled",
        },
        {
          $set: {
            status: "cancelled",
            ...(cancellationReason ? { cancellationReason } : {}),
          },
        }
      );
      bulkAffected = result.modifiedCount ?? 0;
    }

    await logAuditEvent({
      userId: user.id,
      practiceId: user.practiceId,
      action: AuditActions.UPDATE,
      entityType: EntityTypes.SESSION,
      entityId: id,
      details: {
        previousStatus,
        newStatus: existingSession.status,
        ...(cancellationReason ? { cancellationReason } : {}),
        ...(cancelAllFuture ? { appliedToFuture: bulkAffected } : {}),
      },
      ...auditMetaFromRequest(req),
    });

    // Return the updated session with populated fields
    const updatedSession = await Session.findById(id).populate("clientId", "name");

    return NextResponse.json({ ...updatedSession.toObject(), bulkAffected });
  } catch (error) {
    console.error("Session PATCH error:", error);
    return NextResponse.json({ message: "Error updating session" }, { status: 500 });
  }
});

// Delete a session. Supports `?applyToFuture=1` for series — deletes the
// session plus every future scheduled session in the same series.
export const DELETE = requireAuth(async (req) => {
  try {
    await connectDB();
    const user = await getCurrentUser();
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop().split("?")[0];
    const applyToFuture = url.searchParams.get("applyToFuture") === "1";

    const allowedClientIds = await visibleClientIds(user);
    const target = await Session.findOne({
      _id: id,
      practiceId: user.practiceId,
      clientId: { $in: allowedClientIds },
    });
    if (!target) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }

    let bulkAffected = 0;
    if (applyToFuture && target.seriesId) {
      const result = await Session.deleteMany({
        seriesId: target.seriesId,
        _id: { $ne: target._id },
        date: { $gt: target.date },
        status: "scheduled",
      });
      bulkAffected = result.deletedCount ?? 0;
    }
    await target.deleteOne();

    await logAuditEvent({
      userId: user.id,
      practiceId: user.practiceId,
      action: AuditActions.DELETE,
      entityType: EntityTypes.SESSION,
      entityId: id,
      details: { ...(applyToFuture ? { appliedToFuture: bulkAffected } : {}) },
      ...auditMetaFromRequest(req),
    });

    return NextResponse.json(
      { message: "Session deleted successfully", bulkAffected },
      { status: 200 }
    );
  } catch (error) {
    console.error("Session DELETE error:", error);
    return NextResponse.json({ message: "Error deleting session" }, { status: 500 });
  }
});
