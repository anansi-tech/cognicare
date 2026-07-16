// Password policy — NIST 800-63B style: length + a common-password blocklist,
// deliberately NO composition rules (uppercase/symbol requirements push users
// toward predictable substitutions; length beats complexity theater).
// The server routes are the authority; forms mirror this for inline UX only.

const MIN_LENGTH = 12; // HIPAA-appropriate
const MAX_LENGTH = 128;

// Embedded top-100 common passwords (SplashData/NCSC-style), lowercased.
// Matched against the lowercased input — no dependency, no API call. Most are
// under 12 chars and already fail the length rule; they stay listed so the
// blocklist holds even if the minimum ever changes, and the 12+ entries
// ("password1234", "administrator", …) are the ones this really catches.
const COMMON = new Set([
  "123456", "password", "12345678", "qwerty", "123456789", "12345", "1234",
  "111111", "1234567", "dragon", "123123", "baseball", "abc123", "football",
  "monkey", "letmein", "696969", "shadow", "master", "666666", "qwertyuiop",
  "123321", "mustang", "1234567890", "michael", "654321", "superman", "1qaz2wsx",
  "7777777", "121212", "000000", "qazwsx", "123qwe", "killer", "trustno1",
  "jordan", "jennifer", "zxcvbnm", "asdfgh", "hunter", "buster", "soccer",
  "harley", "batman", "andrew", "tigger", "sunshine", "iloveyou", "2000",
  "charlie", "robert", "thomas", "hockey", "ranger", "daniel", "starwars",
  "klaster", "112233", "george", "computer", "michelle", "jessica", "pepper",
  "1111", "zxcvbn", "555555", "11111111", "131313", "freedom", "777777",
  "pass", "maggie", "159753", "aaaaaa", "ginger", "princess", "joshua",
  "cheese", "amanda", "summer", "love", "ashley", "nicole", "chelsea",
  "biteme", "matthew", "access", "yankees", "987654321", "dallas", "austin",
  "thunder", "taylor", "matrix", "welcome", "admin", "administrator",
  "password1", "password123", "password1234", "passw0rd", "p@ssw0rd",
  "letmein12345", "qwerty123456", "welcome12345", "changeme12345", "1234567890123",
]);

// Returns an error string, or null when the password is acceptable.
export function validatePassword(pw) {
  if (typeof pw !== "string" || pw.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters.`;
  }
  if (pw.length > MAX_LENGTH) {
    return `Password must be at most ${MAX_LENGTH} characters.`;
  }
  if (COMMON.has(pw.toLowerCase())) {
    return "That password is too common — choose something more unique.";
  }
  return null;
}
