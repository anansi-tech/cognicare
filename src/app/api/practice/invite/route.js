import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { isPracticeOwner, getSeatUsage } from "@/lib/practice";
import { connectDB } from "@/lib/mongodb";
import Invitation from "@/models/invitation";
import User from "@/models/user";
import {
  logAuditEvent,
  auditMetaFromRequest,
  AuditActions,
  EntityTypes,
} from "@/lib/audit";

// Owner-only: invite a clinician to join the practice.
// Body: { email }. Returns { invitation, link } so the owner can copy/share
// the link directly (email service wiring is a follow-up — see ROUND_10 notes).
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await isPracticeOwner(user))) {
    return NextResponse.json(
      { error: "Only the practice owner can invite clinicians." },
      { status: 403 }
    );
  }

  const { email: rawEmail } = await req.json();
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!email || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  await connectDB();

  // Don't re-invite someone who's already in the practice.
  const existingUser = await User.findOne({ email }).select("practiceId").lean();
  if (existingUser?.practiceId?.toString() === user.practiceId?.toString()) {
    return NextResponse.json(
      { error: "That clinician is already a member of this practice." },
      { status: 409 }
    );
  }
  if (existingUser) {
    return NextResponse.json(
      { error: "That email already has a CogniCare account in another practice." },
      { status: 409 }
    );
  }

  // Don't double-invite (re-use the existing pending one instead).
  const existingPending = await Invitation.findOne({
    practiceId: user.practiceId,
    email,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });
  if (existingPending) {
    const link = inviteLink(existingPending.token);
    return NextResponse.json({ invitation: existingPending, link });
  }

  // Seat check — invites count against capacity so we can't oversell.
  const usage = await getSeatUsage(user.practiceId);
  if (!usage.hasCapacity) {
    return NextResponse.json(
      { error: "All seats are in use. Add seats in Billing to invite more." },
      { status: 409 }
    );
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invitation = await Invitation.create({
    practiceId: user.practiceId,
    email,
    invitedBy: user.id,
    token,
    expiresAt,
  });

  await logAuditEvent({
    userId: user.id,
    practiceId: user.practiceId,
    action: AuditActions.CREATE,
    entityType: EntityTypes.USER,
    entityId: invitation._id,
    details: { kind: "invitation", email },
    ...auditMetaFromRequest(req),
  });

  return NextResponse.json({ invitation, link: inviteLink(token) }, { status: 201 });
}

// Owner-only: list outstanding invitations for the practice.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isPracticeOwner(user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  const invitations = await Invitation.find({
    practiceId: user.practiceId,
    status: "pending",
  })
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json(
    invitations.map((inv) => ({ ...inv, link: inviteLink(inv.token) }))
  );
}

function inviteLink(token) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  return `${base}/invite/${token}`;
}
