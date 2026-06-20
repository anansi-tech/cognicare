"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { Brand } from "@/components/Brand";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  if (status === "authenticated") return null;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const registered = searchParams.get("registered") === "true";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        const friendly =
          result.error === "CredentialsSignin"
            ? "Incorrect email or password."
            : "Something went wrong. Please try again.";
        setError(friendly);
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
    } catch (err) {
      setError("An error occurred during login");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-primary-foreground">
          <h1 className="text-4xl font-bold mb-6">Welcome Back</h1>
          <p className="text-lg mb-8 opacity-90">
            Sign in to access your AI therapy team and continue supporting your clients with less
            admin burden.
          </p>
          <div className="space-y-4">
            {["Access your AI therapy team", "Track client progress", "Get AI-powered insights"].map((item) => (
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
              <Brand className="text-3xl font-bold" />
            </Link>
            <h2 className="mt-6 text-2xl font-bold text-foreground">Sign in to your account</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              New here?{" "}
              <Link href="/signup" className="font-medium text-primary hover:text-primary/80">
                Create an account
              </Link>
            </p>
          </div>

          {registered && (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Account created. Sign in to continue.
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
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
                autoComplete="current-password"
                required
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter password"
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
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center">
            Need help signing in? Email{" "}
            <a href="mailto:cognicare@anansi.xyz" className="text-primary hover:text-primary/80">
              cognicare@anansi.xyz
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
