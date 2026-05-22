import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { uploadFile, generateFileKey } from "@/lib/storage";

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    // Generate a unique file key
    const fileKey = generateFileKey("invoices", file.name);

    // Upload file to Google Cloud Storage
    const documentUrl = await uploadFile(file, fileKey, {
      type: "invoice",
      uploadedBy: user._id,
    });

    return NextResponse.json({
      success: true,
      path: documentUrl,
      key: fileKey,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ message: "Error uploading file" }, { status: 500 });
  }
}
