import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import Practice from "@/models/practice";
import { hash } from "bcryptjs";

export async function POST(request) {
  try {
    const { email, password, name, licenseNumber, specialization } = await request.json();

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { message: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create new user
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      licenseNumber: licenseNumber || null,
      specialization: specialization || "General Counseling",
      role: "counselor",
    });

    // Auto-create the user's practice (a practice of one). Subscription state
    // lives on this Practice; the user will be gated to /billing until the
    // practice has an active Stripe subscription (Checkout starts the trial
    // via trial_period_days in subscription_data).
    const practice = await Practice.create({
      name: `${name}'s Practice`,
      ownerId: user._id,
      seats: 1,
    });
    user.practiceId = practice._id;
    await user.save();

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user.toObject();

    return NextResponse.json(
      {
        message: "Registration successful",
        user: userWithoutPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
