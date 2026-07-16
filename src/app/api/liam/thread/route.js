import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { connectDB } from "@/lib/mongodb";
import LiamThread from "@/models/liamThread";
import {
  logAuditEvent,
  auditMetaFromRequest,
  AuditActions,
  EntityTypes,
} from "@/lib/audit";

export const runtime = "nodejs";

async function guard(req) {
  const user = await getCurrentUser();
  if (!user) return { error: new Response("Unauthorized", { status: 401 }) };
  const clientId = new URL(req.url).searchParams.get("clientId");
  if (!clientId) return { error: NextResponse.json({ error: "clientId required" }, { status: 400 }) };
  await connectDB();
  const allowed = await visibleClientIds(user);
  if (!allowed.some((id) => id.toString() === clientId)) {
    return { error: NextResponse.json({ error: "Client not found" }, { status: 404 }) };
  }
  return { user, clientId };
}

// GET — the last 20 turns of THIS user's thread with the client, + whether an
// older-conversation summary exists. Hydrated read: turns are encrypted at
// rest and only the post("init") hook decrypts them — never .lean() here.
// Returns nothing but the turns and the flag.
export async function GET(req) {
  const { user, clientId, error } = await guard(req);
  if (error) return error;

  const thread = await LiamThread.findOne({ userId: user.id, clientId });
  const turns = (thread?.turns ?? []).slice(-20).map((t) => ({
    role: t.role,
    content: t.content,
    at: t.createdAt ?? null,
  }));

  logAuditEvent({
    userId: user.id,
    practiceId: user.practiceId,
    action: AuditActions.READ,
    entityType: EntityTypes.CLIENT,
    entityId: clientId,
    details: { scope: "liam-thread" },
    ...auditMetaFromRequest(req),
  });

  return NextResponse.json({ turns, hasSummary: !!thread?.rollingSummary });
}

// DELETE — "New topic": permanently removes this user's conversation history
// with the client, INCLUDING the rolling summary (the whole thread doc).
// Server-side clear is the point — audit-logged as a PHI deletion.
export async function DELETE(req) {
  const { user, clientId, error } = await guard(req);
  if (error) return error;

  await LiamThread.deleteOne({ userId: user.id, clientId });

  logAuditEvent({
    userId: user.id,
    practiceId: user.practiceId,
    action: AuditActions.DELETE,
    entityType: EntityTypes.CLIENT,
    entityId: clientId,
    details: { scope: "liam-thread", rollingSummary: true },
    ...auditMetaFromRequest(req),
  });

  return NextResponse.json({ ok: true });
}
