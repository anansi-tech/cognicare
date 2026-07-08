import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { encrypt, decrypt } from "mongoose-field-encryption";

// Mirrors the plugin's internal key derivation.
function deriveKey(secret) {
  return crypto.createHash("sha256").update(secret).digest("hex").substring(0, 32);
}

const TEST_SECRET = "test-phi-encryption-key-for-vitest";
const KEY = deriveKey(TEST_SECRET);
const saltGenerator = () => crypto.randomBytes(16);

describe("PHI field-level encryption round-trip", () => {
  it("encrypts and decrypts a string", () => {
    const plain = "Patient reports persistent low mood for 3 weeks.";
    const ciphertext = encrypt(plain, KEY, saltGenerator);
    expect(ciphertext).not.toBe(plain);
    expect(decrypt(ciphertext, KEY)).toBe(plain);
  });

  it("encrypts and decrypts a JSON payload", () => {
    const payload = {
      riskLevel: "moderate",
      goals: ["improve sleep", "reduce avoidance"],
    };
    const plain = JSON.stringify(payload);
    const ciphertext = encrypt(plain, KEY, saltGenerator);
    expect(ciphertext).not.toBe(plain);
    expect(JSON.parse(decrypt(ciphertext, KEY))).toEqual(payload);
  });

  it("produces different ciphertext each call (random IV)", () => {
    const plain = "same plaintext";
    const c1 = encrypt(plain, KEY, saltGenerator);
    const c2 = encrypt(plain, KEY, saltGenerator);
    expect(c1).not.toBe(c2);
    expect(decrypt(c1, KEY)).toBe(plain);
    expect(decrypt(c2, KEY)).toBe(plain);
  });
});
