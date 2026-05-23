import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { isPracticeOwner, getSeatUsage } from "@/lib/practice";
import { connectDB } from "@/lib/mongodb";
import Invitation from "@/models/invitation";
import User from "@/models/user";
import Practice from "@/models/practice";
import { sendEmail } from "@/lib/email";
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

  const practice = await Practice.findById(user.practiceId).select("name").lean();
  const practiceName = practice?.name || "the practice";

  // Don't double-invite (re-use the existing pending one instead).
  const existingPending = await Invitation.findOne({
    practiceId: user.practiceId,
    email,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });
  if (existingPending) {
    const link = inviteLink(existingPending.token);
    // Re-send the email so the invitee has a fresh copy (no-op locally
    // if Resend isn't configured).
    sendInviteEmail({ to: email, practiceName, inviterName: user.name, link }).catch(
      (e) => console.error("Invite re-send failed; link still available:", e)
    );
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

  const link = inviteLink(token);
  // Fire the email but don't fail the invite if Resend hiccups — the link
  // is still returned for manual share.
  try {
    await sendInviteEmail({ to: email, practiceName, inviterName: user.name, link });
  } catch (e) {
    console.error("Invite email failed; link still available:", e);
  }

  await logAuditEvent({
    userId: user.id,
    practiceId: user.practiceId,
    action: AuditActions.CREATE,
    entityType: EntityTypes.USER,
    entityId: invitation._id,
    details: { kind: "invitation", email },
    ...auditMetaFromRequest(req),
  });

  return NextResponse.json({ invitation, link }, { status: 201 });
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

function inviteEmailHtml({ practiceName, inviterName, link }) {
  const inviter = inviterName || "A colleague";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a202c;">
      <h2 style="color: #312e81; margin-bottom: 16px;">You're invited to CogniCare</h2>
      <p>${escapeHtml(inviter)} invited you to join <strong>${escapeHtml(practiceName)}</strong> on CogniCare —
      an AI-native platform for therapists and their clinical teams.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${link}"
           style="display: inline-block; padding: 12px 22px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Accept invitation
        </a>
      </div>
      <p style="font-size: 13px; color: #4a5568;">Or paste this link into your browser:<br/>
        <a href="${link}" style="color: #4f46e5;">${link}</a>
      </p>
      <p style="font-size: 13px; color: #718096;">This invitation expires in 7 days.</p>
    </div>
  `;
}

function sendInviteEmail({ to, practiceName, inviterName, link }) {
  return sendEmail({
    to,
    subject: `You're invited to join ${practiceName} on CogniCare`,
    html: inviteEmailHtml({ practiceName, inviterName, link }),
  });
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}
