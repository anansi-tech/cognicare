import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MeasureAdministration from "@/models/measureAdministration";
import { scoreInstrument } from "@/lib/mbc/score";
import { getTrend } from "@/lib/mbc/trend";

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
  });
  return NextResponse.json({ id: doc._id, total, severityBand, flags });
}

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId } = await params;
  const instrumentId = req.nextUrl.searchParams.get("instrumentId");
  if (!instrumentId) return NextResponse.json({ error: "instrumentId required" }, { status: 400 });
  return NextResponse.json(await getTrend(clientId, instrumentId, 12));
}
