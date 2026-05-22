import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

// Get a specific user
export async function GET(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const foundUser = await User.findById(id).select("-password").lean();

    if (!foundUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(foundUser);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ message: "Error fetching user" }, { status: 500 });
  }
}

// Update a user
export async function PATCH(req, { params }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;

    // Users can only update their own profile unless they're admin
    if (!isAdmin(currentUser) && currentUser.id !== id) {
      return NextResponse.json(
        { message: "Unauthorized: Cannot update other user profiles" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, licenseNumber, specialization, role } = body;

    // Find the user
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Only admin can update role
    if (!isAdmin(currentUser)) {
      delete body.role;
    }

    // Update basic fields
    if (name) user.name = name;
    if (email && email !== user.email) {
      // Check if new email is already taken
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return NextResponse.json({ message: "Email already in use" }, { status: 400 });
      }
      user.email = email;
    }
    if (licenseNumber) user.licenseNumber = licenseNumber;
    if (specialization) user.specialization = specialization;
    if (role && isAdmin(currentUser)) user.role = role;

    // Update password if provided
    if (password) {
      user.password = await bcrypt.hash(password, 12);
    }

    // Save the updated user
    await user.save();

    // Return user without password
    const updatedUser = user.toObject();
    delete updatedUser.password;

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("User PATCH error:", error);
    return NextResponse.json({ message: "Error updating user" }, { status: 500 });
  }
}

// Delete a user (admin only)
export async function DELETE(req, { params }) {
  try {
    // Check authentication first
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Only admin can delete users
    if (!isAdmin(currentUser)) {
      return NextResponse.json({ message: "Unauthorized: Admin access required" }, { status: 403 });
    }

    const deletedUser = await User.findByIdAndDelete(params.id);

    if (!deletedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "User deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("User DELETE error:", error);
    return NextResponse.json({ message: "Error deleting user" }, { status: 500 });
  }
}
