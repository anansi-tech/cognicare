import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";
import Session from "@/models/session";
import { payloadHash } from "@/lib/hash";
import { reconciliationStamp } from "@/lib/ai/upstream";

// The note is visible iff the parent session's client is visible to the user.
async function sessionVisibleTo(sessionId, user) {
  const allowed = await visibleClientIds(user);
  const parent = await Session.findOne({ _id: sessionId, practiceId: user.practiceId })
    .select("clientId").lean();
  if (!parent) return false;
  return allowed.some((id) => id.toString() === parent.clientId.toString());
}

// GET: the documentation note for this session. PATCH: edit SOAP fields and/or approve.
export async function GET(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: sessionId } = await params;
  await connectDB();
  if (!(await sessionVisibleTo(sessionId, user))) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  const note = await AIReport.findOne({ sessionId, agentType: "documentation", practiceId: user.practiceId })
    .sort({ createdAt: -1 });
  return NextResponse.json(note ?? null);
}

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: sessionId } = await params;
  const { soap, status } = await req.json();
  await connectDB();
  if (!(await sessionVisibleTo(sessionId, user))) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  const note = await AIReport.findOne({ sessionId, agentType: "documentation", practiceId: user.practiceId }).sort({ createdAt: -1 });
  if (!note) return NextResponse.json({ error: "No note for this session" }, { status: 404 });
  // Same payload-changed pattern as the generalized report PATCH: only a REAL
  // change is a human edit, and a human edit reconciles the note with the
  // session's current notes (Sol amendment). Canonical hash comparison, so
  // editor round-trip artifacts don't count as changes. Approve/save-without-
  // change refreshes nothing.
  if (soap) {
    const next = { ...note.payload, soap };
    if (payloadHash(next) !== payloadHash(note.payload)) {
      note.payload = next;
      note.editedAt = new Date();
      const parentSession = await Session.findById(sessionId);
      Object.assign(note, reconciliationStamp("documentation", { session: parentSession }));
    }
  }
  if (status === "approved") note.status = "approved";
  await note.save();
  // Re-fetch so post("init") decrypts payload — pre("save") encrypts it in-place.
  const fresh = await AIReport.findById(note._id);
  return NextResponse.json({ id: fresh._id, status: fresh.status, payload: fresh.payload });
}
