"use server";

import mongoose from "mongoose";
import Client from "@/models/client";
import Session from "@/models/session";
import Report from "@/models/report";
import AIReport from "@/models/aiReport";
import User from "@/models/user";

// Ensure environment variables are read
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "No MONGODB_URI found in environment variables. Please check your .env.local file."
    );
  }
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => {
        // Import models to ensure they are registered
        // The models handle their own registration through mongoose.model()
        Client;
        Session;
        Report;
        AIReport;
        User;

        return mongoose;
      })
      .catch((error) => {
        console.error("MongoDB connection error:", error);
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
