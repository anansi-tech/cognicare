import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { connectDB } from "@/lib/mongodb";
import MeasureAdministration from "@/models/measureAdministration";
import {
  logAuditEvent,
  auditMetaFromRequest,
  AuditActions,
  EntityTypes,
} from "@/lib/audit";

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId, administrationId } = await params;

  await connectDB();

  const allowed = await visibleClientIds(user);
  if (!allowed.some((id) => id.toString() === clientId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const adm = await MeasureAdministration.findOne({ _id: administrationId, clientId });
  if (!adm) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { instrumentId, isBaseline } = adm;
  await adm.deleteOne();

  // Baseline re-flag: promote the oldest remaining administration so trends stay anchored.
  if (isBaseline) {
    const oldest = await MeasureAdministration.findOne({ clientId, instrumentId })
      .sort({ administeredAt: 1 });
    if (oldest && !oldest.isBaseline) {
      oldest.isBaseline = true;
      await oldest.save();
    }
  }

  logAuditEvent({
    userId: user.id,
    practiceId: user.practiceId,
    action: AuditActions.DELETE,
    entityType: EntityTypes.MEASURE,
    entityId: administrationId,
    details: { instrumentId, wasBaseline: isBaseline },
    ...auditMetaFromRequest(req),
  });

  return NextResponse.json({ ok: true });
}
