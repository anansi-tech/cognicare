import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import { requireAuth, getCurrentUser, isAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

// Get users (admin only)
export const GET = requireAuth(async (req) => {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();

    // Only admin users can list all users
    if (!isAdmin(currentUser)) {
      return NextResponse.json({ message: "Unauthorized: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Build query based on filters
    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query).select("-password").sort({ createdAt: -1 }).lean();

    return NextResponse.json(users);
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json({ message: "Error fetching users" }, { status: 500 });
  }
});

// Create a new user (admin only)
export const POST = requireAuth(async (req) => {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();

    // Only admin users can create new users
    if (!isAdmin(currentUser)) {
      return NextResponse.json({ message: "Unauthorized: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { email, password, name, role, licenseNumber, specialization } = body;

    // Validate required fields
    const requiredFields = ["email", "password", "name", "role"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ message: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = await User.create({
      email,
      password: hashedPassword,
      name,
      role,
      licenseNumber,
      specialization,
      status: "active",
      createdAt: new Date(),
    });

    // Return user without password
    const userWithoutPassword = { ...newUser.toObject() };
    delete userWithoutPassword.password;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error("User POST error:", error);
    return NextResponse.json({ message: "Error creating user" }, { status: 500 });
  }
});
