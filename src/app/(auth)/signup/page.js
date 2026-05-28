"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");
    const name = formData.get("name");
    const licenseNumber = formData.get("licenseNumber");
    const specialization = formData.get("specialization");
    const practiceName = formData.get("practiceName");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          name,
          licenseNumber,
          specialization,
          practiceName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      router.push("/login?registered=true");
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <Link
        href="/"
        className="absolute top-4 left-4 text-primary hover:text-primary/80 flex items-center space-x-1"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back to Home</span>
      </Link>

      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-primary-foreground">
          <h1 className="text-4xl font-bold mb-6">Join CogniCare</h1>
          <p className="text-lg mb-8 opacity-90">
            Start with six specialized AI agents designed to support therapy workflows from intake
            through documentation.
          </p>
          <div className="space-y-4">
            {["6 specialized AI agents", "Smart documentation", "Progress tracking"].map((item) => (
              <div key={item} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full space-y-7">
          <div className="text-center">
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold text-primary">CogniCare</h1>
            </Link>
            <h2 className="mt-6 text-2xl font-bold text-foreground">Create your account</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:text-primary/80">
                Sign in
              </Link>
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@practice.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="practiceName" className="text-sm font-medium text-foreground">
                Practice name <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                id="practiceName"
                name="practiceName"
                type="text"
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Cedar Counseling Group"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank if you&apos;re a solo practitioner. You can update this later.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="licenseNumber" className="text-sm font-medium text-foreground">
                Professional license number <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                id="licenseNumber"
                name="licenseNumber"
                type="text"
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter your license number if available"
              />
              <p className="text-xs text-muted-foreground">
                Students and clinicians in training can leave this blank.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="specialization" className="text-sm font-medium text-foreground">
                Specialization <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                id="specialization"
                name="specialization"
                type="text"
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Anxiety, trauma, adolescents"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Create password"
              />
              <p className="text-xs text-muted-foreground">
                Use at least 8 characters with a mix of letters, numbers, and symbols.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm password
                </label>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Confirm password"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
