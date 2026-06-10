// Stub env vars so module-level initialisation in mongodb.js / billing.js
// doesn't throw during tests. No actual connections are made — tests
// that touch DB/network mock those calls explicitly.
process.env.MONGODB_URI = "mongodb://localhost:27017/test";
process.env.STRIPE_SECRET_KEY = "sk_test_stub00000000000000000";
