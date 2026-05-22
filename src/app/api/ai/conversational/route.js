import { NextResponse } from "next/server";

// The conversational agent is being replaced by LIAM in Round 2 (/api/liam/chat).
// Kept as a stub so any stale caller fails clearly instead of throwing a 500.
export async function POST() {
  return NextResponse.json(
    { error: "The conversational agent has moved. LIAM ships in Round 2 at /api/liam/chat." },
    { status: 410 }
  );
}
