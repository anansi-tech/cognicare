import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { connectDB } from "@/lib/mongodb";
import MeasureAdministration from "@/models/measureAdministration";
import { scoreInstrument } from "@/lib/mbc/score";
import { getTrend } from "@/lib/mbc/trend";
import { listInstruments } from "@/lib/mbc/instruments";

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId } = await params;
  const { instrumentId, responses, sessionId } = await req.json();
  if (!instrumentId || !responses) {
    return NextResponse.json({ error: "instrumentId and responses required" }, { status: 400 });
  }

  const { total, severityBand, flags, complete } = scoreInstrument(instrumentId, responses);
  if (!complete) return NextResponse.json({ error: "Answer all items" }, { status: 400 });

  await connectDB();
  const allowed = await visibleClientIds(user);
  if (!allowed.some((id) => id.toString() === clientId)) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  const priorCount = await MeasureAdministration.countDocuments({ clientId, instrumentId });
  const doc = await MeasureAdministration.create({
    userId: user.id,
    practiceId: user.practiceId,
    clientId,
    sessionId,
    instrumentId,
    responses,
    total,
    severityBand,
    flags,
    isBaseline: priorCount === 0,
  });
  return NextResponse.json({ id: doc._id, total, severityBand, flags });
}

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId } = await params;
  await connectDB();
  const allowed = await visibleClientIds(user);
  if (!allowed.some((id) => id.toString() === clientId)) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // ?history=1 returns all administrations (with responses) across all instruments.
  if (req.nextUrl.searchParams.get("history") === "1") {
    const instNameMap = new Map(listInstruments().map((i) => [i.id, i.name]));
    const docs = await MeasureAdministration.find({ clientId })
      .sort({ administeredAt: -1 });
    return NextResponse.json(
      docs.map((d) => ({ ...d.toObject(), instrumentName: instNameMap.get(d.instrumentId) ?? d.instrumentId }))
    );
  }

  const instrumentId = req.nextUrl.searchParams.get("instrumentId");
  if (!instrumentId) return NextResponse.json({ error: "instrumentId required" }, { status: 400 });
  return NextResponse.json(await getTrend(clientId, instrumentId, 12));
}
