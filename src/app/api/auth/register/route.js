import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import Practice from "@/models/practice";
import Invitation from "@/models/invitation";
import { hash } from "bcryptjs";
import { getSeatUsage } from "@/lib/practice";
import { validatePassword } from "@/lib/password";

export async function POST(request) {
  try {
    const {
      email: rawEmail,
      password,
      name,
      licenseNumber,
      specialization,
      inviteToken,
      practiceName,
    } = await request.json();
    const email = String(rawEmail || "").trim().toLowerCase();

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { message: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    // Server is the authority on password policy; the form mirrors it for UX.
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ message: passwordError }, { status: 400 });
    }

    // Connect to MongoDB
    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    // Branch on invitation: joining an existing practice vs. creating one.
    let invitation = null;
    if (inviteToken) {
      invitation = await Invitation.findOne({ token: inviteToken, status: "pending" });
      if (!invitation) {
        return NextResponse.json(
          { message: "Invitation not found or already used" },
          { status: 400 }
        );
      }
      if (invitation.expiresAt && invitation.expiresAt < new Date()) {
        return NextResponse.json({ message: "Invitation expired" }, { status: 410 });
      }
      if (invitation.email !== email) {
        return NextResponse.json(
          { message: "Email does not match the invitation" },
          { status: 400 }
        );
      }
      // Re-check seats at accept time — capacity could have filled since the
      // invite was sent.
      const usage = await getSeatUsage(invitation.practiceId);
      // The pending invite itself counts in `used`; only block when other
      // invites/clinicians have already saturated the cap above this one.
      if (usage.used > usage.seats) {
        return NextResponse.json(
          { message: "All seats are in use. Ask the practice owner to add seats first." },
          { status: 409 }
        );
      }
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

    if (invitation) {
      // Join the existing practice.
      user.practiceId = invitation.practiceId;
      await user.save();
      invitation.status = "accepted";
      invitation.acceptedAt = new Date();
      await invitation.save();
    } else {
      // Auto-create the user's practice (a practice of one). Subscription state
      // lives on this Practice; the user will be gated to /billing until the
      // practice has an active Stripe subscription (Checkout starts the trial
      // via trial_period_days in subscription_data).
      const trimmedName = typeof practiceName === "string" ? practiceName.trim() : "";
      const practice = await Practice.create({
        name: trimmedName || `${name}'s Practice`,
        ownerId: user._id,
        seats: 1,
      });
      user.practiceId = practice._id;
      await user.save();
    }

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
