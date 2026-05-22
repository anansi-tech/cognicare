import { Storage } from "@google-cloud/storage";

// Initialize Google Cloud Storage client
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
});

const BUCKET_NAME = process.env.GOOGLE_CLOUD_BUCKET_NAME;

export async function uploadFile(file, key, metadata = {}) {
  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const blob = bucket.file(key);

    // Create a write stream
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.type,
        metadata: metadata,
      },
    });

    // Convert file to buffer
    const buffer = await file.arrayBuffer();

    // Return a promise that resolves when the upload is complete
    return new Promise((resolve, reject) => {
      blobStream.on("error", (error) => reject(error));
      blobStream.on("finish", async () => {
        // Generate a signed URL for the uploaded file
        const [signedUrl] = await blob.getSignedUrl({
          version: "v4",
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        resolve(signedUrl);
      });

      // Write the buffer to the stream
      blobStream.end(Buffer.from(buffer));
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("Failed to upload file");
  }
}

export async function getSignedDownloadUrl(key, expiresIn = 3600) {
  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(key);

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + expiresIn * 1000,
    });

    return url;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw new Error("Failed to generate download URL");
  }
}

export async function deleteFile(key) {
  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(key);

    await file.delete();
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Failed to delete file");
  }
}

// Helper function to generate unique file keys
export function generateFileKey(prefix, originalName) {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split(".").pop();
  return `${prefix}/${timestamp}-${randomString}.${extension}`;
}
