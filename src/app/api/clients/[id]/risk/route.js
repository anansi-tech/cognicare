import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { connectDB } from "@/lib/mongodb";
import MeasureAdministration from "@/models/measureAdministration";
import SafetyPlan from "@/models/safetyPlan";
import { computeRiskSummary } from "@/lib/mbc/risk";
import { listInstruments } from "@/lib/mbc/instruments";
import { logAuditEvent, auditMetaFromRequest, AuditActions, EntityTypes } from "@/lib/audit";

// Risk summary powering the PHQ-9 item-9 trigger banner and the elevated
// C-SSRS banner (Round 55). Content-anchored: the trigger clears when a
// C-SSRS administration exists AFTER the flagged PHQ-9; the elevated state
// follows the LATEST C-SSRS tier and never expires by time.
export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId } = await params;
  await connectDB();
  const allowed = await visibleClientIds(user);
  if (!allowed.some((id) => id.toString() === clientId)) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const categoricalIds = listInstruments().filter((i) => i.categorical).map((i) => i.id);

  // Hydrated read — flags are encrypted at rest (post-init decrypts).
  const phq9Latest = await MeasureAdministration.findOne({ clientId, instrumentId: "phq9" })
    .sort({ administeredAt: -1 });
  // tier + administeredAt are unencrypted metadata; lean is fine here.
  const cssrsLatest = await MeasureAdministration.findOne({ clientId, instrumentId: { $in: categoricalIds } })
    .sort({ administeredAt: -1 })
    .select("tier administeredAt instrumentId")
    .lean();
  const safetyPlan = await SafetyPlan.findOne({ clientId, practiceId: user.practiceId })
    .select("reviewedAt updatedAt")
    .lean();

  logAuditEvent({
    userId: user.id,
    practiceId: user.practiceId,
    action: AuditActions.READ,
    entityType: EntityTypes.CLIENT,
    entityId: clientId,
    details: { scope: "risk-summary" },
    ...auditMetaFromRequest(req),
  });

  return NextResponse.json({
    ...computeRiskSummary({
      phq9Latest: phq9Latest
        ? { administeredAt: phq9Latest.administeredAt, flags: phq9Latest.flags ?? [] }
        : null,
      cssrsLatest,
      safetyPlan,
    }),
    // Which instrument the "Administer" CTA should open (registry-driven).
    screenerId: categoricalIds[0] ?? null,
  });
}
