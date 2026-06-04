import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Practice from "@/models/practice";
import { isPracticeOwner } from "@/lib/practice";
import { logAuditEvent, auditMetaFromRequest } from "@/lib/audit";

// Practice record: read for any member, update (name only, for now) for the
// owner. Subscription + seat plumbing lives in /api/billing and /api/practice/seats.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice" }, { status: 404 });

  await connectDB();
  const practice = await Practice.findById(user.practiceId)
    .select("name ownerId seats stripeSubscriptionStatus")
    .lean();
  if (!practice) return NextResponse.json({ error: "No practice" }, { status: 404 });
  return NextResponse.json({
    practice: { ...practice, isOwner: practice.ownerId?.toString() === user.id },
  });
}

export async function PATCH(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isPracticeOwner(user))) {
    return NextResponse.json(
      { error: "Only the practice owner can do this" },
      { status: 403 }
    );
  }
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  await connectDB();
  const trimmed = name.trim();
  await Practice.updateOne({ _id: user.practiceId }, { $set: { name: trimmed } });
  await logAuditEvent({
    userId: user.id,
    practiceId: user.practiceId,
    action: "update",
    entityType: "practice",
    entityId: user.practiceId,
    details: { field: "name", name: trimmed },
    ...auditMetaFromRequest(req),
  });
  return NextResponse.json({ ok: true, name: trimmed });
}
