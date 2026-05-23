import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Invitation from "@/models/invitation";
import Practice from "@/models/practice";
import { getCurrentUser } from "@/lib/auth";
import { isPracticeOwner } from "@/lib/practice";
import {
  logAuditEvent,
  auditMetaFromRequest,
  AuditActions,
  EntityTypes,
} from "@/lib/audit";

// Public endpoint: validate the token and return enough context for the
// /invite/[token] accept page (practice name, invited email). 404/410 if
// the token is invalid/expired so we don't leak existence either way.
export async function GET(_req, { params }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });

  await connectDB();
  const invitation = await Invitation.findOne({ token, status: "pending" }).lean();
  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }
  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
  }

  const practice = await Practice.findById(invitation.practiceId).select("name").lean();
  return NextResponse.json({
    email: invitation.email,
    practiceName: practice?.name || "the practice",
  });
}

// Owner-only: revoke a pending invitation.
export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isPracticeOwner(user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { token } = await params;
  await connectDB();
  const invitation = await Invitation.findOne({
    token,
    practiceId: user.practiceId,
    status: "pending",
  });
  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }
  invitation.status = "revoked";
  await invitation.save();

  await logAuditEvent({
    userId: user.id,
    practiceId: user.practiceId,
    action: AuditActions.DELETE,
    entityType: EntityTypes.USER,
    entityId: invitation._id,
    details: { kind: "invitation", email: invitation.email },
    ...auditMetaFromRequest(req),
  });

  return NextResponse.json({ ok: true });
}
