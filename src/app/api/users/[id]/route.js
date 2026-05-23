import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import { getCurrentUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

// Self-only user endpoints. Generic user CRUD was removed in Round 10 —
// roster management moved to /team. Used by /profile to read + update the
// signed-in user's own record.

export async function GET(_req, { params }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (currentUser.id !== id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const foundUser = await User.findById(id).select("-password").lean();
  if (!foundUser) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }
  return NextResponse.json(foundUser);
}

export async function PATCH(req, { params }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (currentUser.id !== id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const { name, email, password, licenseNumber, specialization } = body;

  const user = await User.findById(id);
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  if (name) user.name = name;
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: "Email already in use" }, { status: 400 });
    }
    user.email = email;
  }
  if (licenseNumber !== undefined) user.licenseNumber = licenseNumber;
  if (specialization !== undefined) user.specialization = specialization;
  if (password) user.password = await bcrypt.hash(password, 12);

  await user.save();
  const updatedUser = user.toObject();
  delete updatedUser.password;
  return NextResponse.json(updatedUser);
}
