import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { connectDB } from "@/lib/mongodb";
import Session from "@/models/session";
import AIReport from "@/models/aiReport";

export const runtime = "nodejs";

// Batch metadata for citation chips: [session:id] → date, [report:id] →
// agentType. Metadata only (lean, unencrypted fields), scoped to the client.
// Unknown/deleted ids are simply omitted — the chip falls back to its generic
// label. The token grammar and the LLM prompt contract are untouched.
export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .filter((id) => /^[a-f0-9]{24}$/i.test(id))
    .slice(0, 50);
  if (!clientId || ids.length === 0) {
    return NextResponse.json({ error: "clientId and ids required" }, { status: 400 });
  }

  await connectDB();
  const allowed = await visibleClientIds(user);
  if (!allowed.some((id) => id.toString() === clientId)) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const scope = { _id: { $in: ids }, clientId, practiceId: user.practiceId };
  const [sessions, reports] = await Promise.all([
    Session.find(scope).select("date").lean(),
    AIReport.find(scope).select("agentType createdAt").lean(),
  ]);

  return NextResponse.json({
    items: [
      ...sessions.map((s) => ({ id: s._id.toString(), kind: "session", date: s.date })),
      ...reports.map((r) => ({ id: r._id.toString(), kind: "report", reportType: r.agentType, date: r.createdAt })),
    ],
  });
}
