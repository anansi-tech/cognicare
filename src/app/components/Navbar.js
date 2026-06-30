"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useLiam } from "@/components/liam/LiamProvider";
import { Brand } from "@/components/Brand";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef(null);
  const { setOpen: setLiamOpen } = useLiam();
  const isAuthRoute = pathname === "/login" || pathname === "/signup" || pathname === "/";
  const isPublicRoute = pathname === "/" || pathname === "/about" || pathname === "/contact";

  useEffect(() => {
    setShowUserMenu(false);
    setShowMobileMenu(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (isAuthRoute) return null;

  if (!session) {
    if (!isPublicRoute) return null;

    return (
      <nav className="bg-background border-b border-border">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/">
              <Brand />
            </Link>
            <button
              type="button"
              onClick={() => setShowMobileMenu((v) => !v)}
              className="sm:hidden inline-flex items-center justify-center rounded-md border border-border p-2 text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Toggle navigation menu"
              aria-expanded={showMobileMenu}
            >
              {showMobileMenu ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
            <div className="hidden sm:flex items-center gap-6">
              <Link
                href="/about"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Contact
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Get Started
              </Link>
            </div>
          </div>
          {showMobileMenu && (
            <div className="sm:hidden border-t border-border py-3">
              <div className="flex flex-col gap-2 text-sm">
                <Link href="/about" className="rounded-md px-3 py-2 text-foreground hover:bg-muted">
                  About
                </Link>
                <Link
                  href="/contact"
                  className="rounded-md px-3 py-2 text-foreground hover:bg-muted"
                >
                  Contact
                </Link>
                <Link href="/login" className="rounded-md px-3 py-2 text-foreground hover:bg-muted">
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="mt-1 inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Get Started
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>
    );
  }

  const isActive = (path) => pathname === path;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // Hard nav so we don't briefly render the previous page with stale
      // session state (next-auth/react's signOut in v5 returns before the
      // SessionProvider broadcasts the new status).
      await signOut({ redirect: false });
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
      setIsSigningOut(false);
    }
  };

  return (
    <nav className="bg-primary shadow-lg">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" aria-label="CogniCare home">
                <img src="/logo-nav-white.svg" alt="CogniCare" className="h-8 w-8" />
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/dashboard"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive("/dashboard")
                    ? "border-white text-white"
                    : "border-transparent text-primary-foreground hover:border-border hover:text-white"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/clients"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive("/clients")
                    ? "border-white text-white"
                    : "border-transparent text-primary-foreground hover:border-border hover:text-white"
                }`}
              >
                Clients
              </Link>
              <Link
                href="/sessions"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive("/sessions")
                    ? "border-white text-white"
                    : "border-transparent text-primary-foreground hover:border-border hover:text-white"
                }`}
              >
                Sessions
              </Link>
              <Link
                href="/sessions/calendar"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive("/sessions/calendar")
                    ? "border-white text-white"
                    : "border-transparent text-primary-foreground hover:border-border hover:text-white"
                }`}
              >
                Calendar
              </Link>
              <Link
                href="/reports"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive("/reports")
                    ? "border-white text-white"
                    : "border-transparent text-primary-foreground hover:border-border hover:text-white"
                }`}
              >
                Reports
              </Link>
              {session.user.isPracticeOwner && (
                <Link
                  href="/team"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive("/team")
                      ? "border-white text-white"
                      : "border-transparent text-primary-foreground hover:border-border hover:text-white"
                  }`}
                >
                  Team
                </Link>
              )}
              {session.user.isPracticeOwner && (
                <Link
                  href="/audit"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive("/audit")
                      ? "border-white text-white"
                      : "border-transparent text-primary-foreground hover:border-border hover:text-white"
                  }`}
                >
                  Audit log
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowMobileMenu((v) => !v)}
              className="sm:hidden inline-flex items-center justify-center rounded-md bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
              aria-label="Toggle navigation menu"
              aria-expanded={showMobileMenu}
            >
              {showMobileMenu ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => setLiamOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              Ask LIAM
              <span className="hidden sm:inline rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-primary-foreground">
                ⌘K
              </span>
            </button>
            <div className="flex-shrink-0">
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center text-sm text-primary-foreground hover:text-white focus:outline-none"
                  aria-haspopup="menu"
                  aria-expanded={showUserMenu}
                >
                  <span className="mr-2">{session.user.name}</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md border border-border shadow-lg bg-background z-20">
                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                      >
                        Profile
                      </Link>
                      {session.user.isPracticeOwner && (
                        <Link
                          href="/billing"
                          className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                        >
                          Subscription
                        </Link>
                      )}
                      <Link
                        href="/settings"
                        className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                      >
                        Settings
                      </Link>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowConfirmDialog(true);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {showMobileMenu && (
        <div className="sm:hidden border-t border-white/15">
          <div className="space-y-1 px-4 py-3">
            {[
              ["/dashboard", "Dashboard"],
              ["/clients", "Clients"],
              ["/sessions", "Sessions"],
              ["/sessions/calendar", "Calendar"],
              ["/reports", "Reports"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={`block rounded-md px-3 py-2 text-sm ${
                  isActive(href)
                    ? "bg-white/20 text-white"
                    : "text-primary-foreground hover:bg-white/10"
                }`}
              >
                {label}
              </Link>
            ))}
            {session.user.isPracticeOwner && (
              <Link
                href="/team"
                className={`block rounded-md px-3 py-2 text-sm ${
                  isActive("/team")
                    ? "bg-white/20 text-white"
                    : "text-primary-foreground hover:bg-white/10"
                }`}
              >
                Team
              </Link>
            )}
            {session.user.isPracticeOwner && (
              <Link
                href="/audit"
                className={`block rounded-md px-3 py-2 text-sm ${
                  isActive("/audit")
                    ? "bg-white/20 text-white"
                    : "text-primary-foreground hover:bg-white/10"
                }`}
              >
                Audit log
              </Link>
            )}
          </div>
        </div>
      )}

      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
          <div className="bg-card text-card-foreground border border-border rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium mb-4">Sign Out</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to sign out? You&apos;ll need to sign in again to access your
              account.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigningOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
