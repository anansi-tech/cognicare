import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";

// GET: the documentation note for this session. PATCH: edit SOAP fields and/or approve.
export async function GET(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: sessionId } = await params;
  await connectDB();
  const note = await AIReport.findOne({ sessionId, agentType: "documentation" })
    .sort({ createdAt: -1 }).lean();
  return NextResponse.json(note ?? null);
}

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: sessionId } = await params;
  const { soap, status } = await req.json();
  await connectDB();
  const note = await AIReport.findOne({ sessionId, agentType: "documentation" }).sort({ createdAt: -1 });
  if (!note) return NextResponse.json({ error: "No note for this session" }, { status: 404 });
  if (soap) note.payload = { ...note.payload, soap };
  if (status === "approved") note.status = "approved";
  await note.save();
  return NextResponse.json({ id: note._id, status: note.status, payload: note.payload });
}
