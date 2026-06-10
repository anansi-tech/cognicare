import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Session from "@/models/session";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { generateSeriesDates } from "@/lib/recurrence";
import {
  logAuditEvent,
  auditMetaFromRequest,
  AuditActions,
  EntityTypes,
} from "@/lib/audit";

// Get all sessions for the authenticated counselor
export const GET = requireAuth(async (req) => {
  try {
    await connectDB();
    const user = await getCurrentUser();

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    // Visibility derives from clients: a clinician sees sessions for clients
    // assigned to them; owner sees everything in the practice.
    const allowedClientIds = await visibleClientIds(user);
    const query = {
      practiceId: user.practiceId,
      clientId: clientId
        ? // Honor the requested clientId only if it's in the visible set.
          allowedClientIds.some((id) => id.toString() === clientId)
          ? clientId
          : { $in: [] }
        : { $in: allowedClientIds },
    };
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
    // `recurrence` is a Round-15 client-only field — don't store it on the
    // session doc itself; it just controls whether we generate a series.
    const { recurrence, ...rest } = body;
    const base = {
      ...rest,
      practiceId: user.practiceId,
      counselorId: user.id,
      status: rest.status || "scheduled",
    };

    const requiredFields = ["clientId", "date", "duration", "type", "format"];
    for (const field of requiredFields) {
      if (!base[field]) {
        return NextResponse.json({ message: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Recurring path: pre-generate the whole series up front. Each session is
    // its own independent doc; the seriesId is the only thing linking them.
    if (recurrence?.frequency && recurrence.frequency !== "none") {
      const seriesId = new mongoose.Types.ObjectId();
      const dates = generateSeriesDates(base.date, recurrence.frequency, recurrence.occurrences);
      const count = dates.length;
      const docs = dates.map((date) => ({ ...base, date, seriesId }));
      const created = await Session.insertMany(docs);
      await logAuditEvent({
        userId: user.id,
        practiceId: user.practiceId,
        action: AuditActions.CREATE,
        entityType: EntityTypes.SESSION,
        entityId: seriesId,
        details: {
          kind: "recurring_series",
          clientId: base.clientId,
          frequency: recurrence.frequency,
          occurrences: count,
        },
        ...auditMetaFromRequest(req),
      });
      return NextResponse.json(
        { sessions: created, seriesId: seriesId.toString() },
        { status: 201 }
      );
    }

    const createdSession = await Session.create(base);
    const populatedSession = await Session.findById(createdSession._id)
      .populate("clientId", "name")
      .lean();

    await logAuditEvent({
      userId: user.id,
      practiceId: user.practiceId,
      action: AuditActions.CREATE,
      entityType: EntityTypes.SESSION,
      entityId: createdSession._id,
      details: { clientId: base.clientId },
      ...auditMetaFromRequest(req),
    });

    return NextResponse.json(populatedSession, { status: 201 });
  } catch (error) {
    console.error("Session POST error:", error);
    return NextResponse.json({ message: "Error creating session" }, { status: 500 });
  }
});
