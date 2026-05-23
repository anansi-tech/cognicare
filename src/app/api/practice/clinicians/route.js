import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import Client from "@/models/client";
import Practice from "@/models/practice";

// List clinicians in the caller's practice. Used by the reassignment
// dropdown and the /team page. Any practice member can call this — the
// roster itself isn't PHI.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json([]);

  await connectDB();
  const practice = await Practice.findById(user.practiceId).select("ownerId").lean();
  const members = await User.find({ practiceId: user.practiceId })
    .select("name email specialization licenseNumber createdAt")
    .sort({ createdAt: 1 })
    .lean();

  // Annotate each with their assigned client count + owner flag.
  const counts = await Client.aggregate([
    { $match: { practiceId: user.practiceId } },
    { $group: { _id: "$counselorId", n: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.n]));

  return NextResponse.json(
    members.map((m) => ({
      ...m,
      isOwner: practice?.ownerId?.toString() === m._id.toString(),
      assignedClientCount: countMap.get(m._id.toString()) ?? 0,
    }))
  );
}
