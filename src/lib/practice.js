import Practice from "@/models/practice";
import Client from "@/models/client";
import User from "@/models/user";
import Invitation from "@/models/invitation";
import { connectDB } from "@/lib/mongodb";

// Practice ownership / visibility helpers (Round 10).
//
// "Owner" is the user whose id matches Practice.ownerId — not a role enum.
// Visibility = what clients a user is allowed to see:
//   - owner    → all clients in the practice (practiceId match)
//   - clinician → only clients assigned to them (practiceId + counselorId)

export async function isPracticeOwner(user) {
  if (!user?.practiceId || !user?.id) return false;
  await connectDB();
  const p = await Practice.findById(user.practiceId).select("ownerId").lean();
  return p?.ownerId?.toString() === String(user.id);
}

// Filter fragment for Client.find / findOne. Caller spreads it into their query
// alongside any other constraints (status, _id, etc.).
export async function clientScope(user) {
  if (!user?.practiceId) return { practiceId: null }; // no practice → no clients
  const owner = await isPracticeOwner(user);
  return owner
    ? { practiceId: user.practiceId }
    : { practiceId: user.practiceId, counselorId: user.id };
}

// Resolves the ids of every client the user may see. Sessions/Reports queries
// derive their visibility from this — confidentiality follows the client, so
// after a reassignment the old clinician loses access to past sessions too.
export async function visibleClientIds(user) {
  await connectDB();
  const scope = await clientScope(user);
  const docs = await Client.find(scope).select("_id").lean();
  return docs.map((d) => d._id);
}

// Counts active clinicians + pending invites against the practice's paid seats.
// Used at invite-create and invite-accept time to enforce the seat cap.
export async function getSeatUsage(practiceId) {
  if (!practiceId) return { used: 0, seats: 0, hasCapacity: false };
  await connectDB();
  const practice = await Practice.findById(practiceId).select("seats").lean();
  const seats = practice?.seats ?? 0;
  const activeClinicians = await User.countDocuments({ practiceId });
  const pendingInvites = await Invitation.countDocuments({
    practiceId,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });
  const used = activeClinicians + pendingInvites;
  return { used, seats, hasCapacity: used < seats };
}
