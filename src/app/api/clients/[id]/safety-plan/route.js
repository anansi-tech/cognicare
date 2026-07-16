import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { connectDB } from "@/lib/mongodb";
import SafetyPlan from "@/models/safetyPlan";
import { logAuditEvent, auditMetaFromRequest, AuditActions, EntityTypes } from "@/lib/audit";

// Stanley-Brown safety plan — one active plan per client, upsert semantics.
// Content is encrypted at rest; every read/write is audited.

const CONTENT_FIELDS = [
  "warningSigns",
  "internalCoping",
  "distractions",
  "peopleForHelp",
  "professionals",
  "environmentSafety",
  "reasonsForLiving",
];

async function guard(req, params) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { id: clientId } = await params;
  await connectDB();
  const allowed = await visibleClientIds(user);
  if (!allowed.some((id) => id.toString() === clientId)) {
    return { error: NextResponse.json({ error: "Client not found" }, { status: 404 }) };
  }
  return { user, clientId };
}

function serialize(doc) {
  if (!doc) return { exists: false };
  const o = doc.toObject();
  return {
    exists: true,
    ...Object.fromEntries(CONTENT_FIELDS.map((f) => [f, o[f] ?? (f === "reasonsForLiving" ? "" : [])])),
    reviewedAt: o.reviewedAt ?? null,
    updatedAt: o.updatedAt,
  };
}

export async function GET(req, { params }) {
  const { user, clientId, error } = await guard(req, params);
  if (error) return error;

  const doc = await SafetyPlan.findOne({ clientId, practiceId: user.practiceId });
  logAuditEvent({
    userId: user.id,
    practiceId: user.practiceId,
    action: AuditActions.READ,
    entityType: EntityTypes.SAFETY_PLAN,
    entityId: clientId,
    details: { exists: !!doc },
    ...auditMetaFromRequest(req),
  });
  return NextResponse.json(serialize(doc));
}

// Upsert plan content. save() (never findOneAndUpdate) so the encryption
// plugin's pre-save hook sees plaintext.
export async function PUT(req, { params }) {
  const { user, clientId, error } = await guard(req, params);
  if (error) return error;
  const body = await req.json();

  let doc = await SafetyPlan.findOne({ clientId, practiceId: user.practiceId });
  const created = !doc;
  if (!doc) doc = new SafetyPlan({ clientId, practiceId: user.practiceId });
  for (const f of CONTENT_FIELDS) {
    if (body[f] !== undefined) doc[f] = body[f];
  }
  await doc.save();

  logAuditEvent({
    userId: user.id,
    practiceId: user.practiceId,
    action: created ? AuditActions.CREATE : AuditActions.UPDATE,
    entityType: EntityTypes.SAFETY_PLAN,
    entityId: clientId,
    details: { fields: CONTENT_FIELDS.filter((f) => body[f] !== undefined) },
    ...auditMetaFromRequest(req),
  });

  // Re-fetch: the in-memory doc holds ciphertext after save (post-init decrypts).
  const fresh = await SafetyPlan.findById(doc._id);
  return NextResponse.json(serialize(fresh));
}

// "Reviewed today" — stamps reviewedAt; what session notes reference.
export async function PATCH(req, { params }) {
  const { user, clientId, error } = await guard(req, params);
  if (error) return error;

  const doc = await SafetyPlan.findOne({ clientId, practiceId: user.practiceId });
  if (!doc) return NextResponse.json({ error: "No safety plan on file" }, { status: 404 });
  doc.reviewedAt = new Date();
  await doc.save();

  logAuditEvent({
    userId: user.id,
    practiceId: user.practiceId,
    action: AuditActions.UPDATE,
    entityType: EntityTypes.SAFETY_PLAN,
    entityId: clientId,
    details: { review: true },
    ...auditMetaFromRequest(req),
  });

  const fresh = await SafetyPlan.findById(doc._id);
  return NextResponse.json(serialize(fresh));
}
