import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isPracticeOwner } from "@/lib/practice";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import Client from "@/models/client";
import Practice from "@/models/practice";
import {
  logAuditEvent,
  auditMetaFromRequest,
  AuditActions,
  EntityTypes,
} from "@/lib/audit";

// Owner-only: remove a clinician from the practice.
// Soft removal — we detach the user from the practice (practiceId = null)
// rather than hard-delete, so their authored reports and audit history stay
// intact. Blocked if the clinician still has assigned clients (force
// reassignment first). The practice owner cannot remove themselves this way.
export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isPracticeOwner(user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();

  const practice = await Practice.findById(user.practiceId).select("ownerId").lean();
  if (practice?.ownerId?.toString() === String(id)) {
    return NextResponse.json(
      { error: "The practice owner cannot be removed from their own practice." },
      { status: 400 }
    );
  }

  const target = await User.findOne({ _id: id, practiceId: user.practiceId });
  if (!target) {
    return NextResponse.json({ error: "Clinician not found" }, { status: 404 });
  }

  const assigned = await Client.countDocuments({
    practiceId: user.practiceId,
    counselorId: id,
  });
  if (assigned > 0) {
    return NextResponse.json(
      {
        error: `Reassign their ${assigned} client${assigned === 1 ? "" : "s"} before removing this clinician.`,
        assignedClientCount: assigned,
      },
      { status: 409 }
    );
  }

  target.practiceId = null;
  await target.save();

  await logAuditEvent({
    userId: user.id,
    practiceId: user.practiceId,
    action: AuditActions.DELETE,
    entityType: EntityTypes.USER,
    entityId: target._id,
    details: { kind: "clinician_removed", email: target.email },
    ...auditMetaFromRequest(req),
  });

  return NextResponse.json({ ok: true });
}
