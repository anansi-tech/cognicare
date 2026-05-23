import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isPracticeOwner } from "@/lib/practice";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/client";
import User from "@/models/user";
import {
  logAuditEvent,
  auditMetaFromRequest,
  AuditActions,
  EntityTypes,
} from "@/lib/audit";

// Reassign a client to a different clinician in the same practice.
// Rule (ROUND_10): owner can reassign any client; a clinician can only
// reassign clients currently assigned to them. Transfer (not share) — the
// previous clinician loses access once the counselorId flips.
export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { counselorId: newCounselorId } = await req.json();
  if (!newCounselorId) {
    return NextResponse.json({ error: "counselorId required" }, { status: 400 });
  }

  await connectDB();

  const client = await Client.findOne({ _id: id, practiceId: user.practiceId });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const owner = await isPracticeOwner(user);
  const isAssigned = client.counselorId?.toString() === String(user.id);
  if (!owner && !isAssigned) {
    return NextResponse.json(
      { error: "You can only reassign clients currently assigned to you." },
      { status: 403 }
    );
  }

  const target = await User.findOne({
    _id: newCounselorId,
    practiceId: user.practiceId,
  }).select("_id name");
  if (!target) {
    return NextResponse.json(
      { error: "Target clinician must be in the same practice." },
      { status: 400 }
    );
  }

  const previous = client.counselorId?.toString() ?? null;
  if (previous === String(target._id)) {
    return NextResponse.json(
      { error: "Client is already assigned to that clinician." },
      { status: 400 }
    );
  }

  client.counselorId = target._id;
  await client.save();

  await logAuditEvent({
    userId: user.id,
    practiceId: user.practiceId,
    action: AuditActions.UPDATE,
    entityType: EntityTypes.CLIENT,
    entityId: client._id,
    details: {
      reassignedFrom: previous,
      reassignedTo: target._id.toString(),
    },
    ...auditMetaFromRequest(req),
  });

  return NextResponse.json({
    ok: true,
    counselorId: target._id.toString(),
    counselorName: target.name,
  });
}
