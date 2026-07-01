"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
      <nav
        className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-[12px] backdrop-saturate-150"
        style={{ fontFamily: "var(--font-hanken, system-ui, sans-serif)" }}
      >
        <div className="max-w-[1160px] mx-auto px-7">
          <div className="flex h-[60px] items-center justify-between gap-6">
            <Link href="/" className="shrink-0">
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            <div className="hidden sm:flex items-center gap-7">
              <Link href="/" className="text-[15px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                Product
              </Link>
              <Link
                href="/about"
                className={`text-[15px] transition-colors ${pathname === "/about" ? "font-semibold text-foreground" : "font-medium text-muted-foreground hover:text-foreground"}`}
              >
                About
              </Link>
              <Link
                href="/contact"
                className={`text-[15px] transition-colors ${pathname === "/contact" ? "font-semibold text-foreground" : "font-medium text-muted-foreground hover:text-foreground"}`}
              >
                Contact
              </Link>
              <Link href="/login" className="text-[15px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center rounded-full bg-primary px-[17px] py-[9px] text-[15px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Start free trial
              </Link>
            </div>
          </div>
          {showMobileMenu && (
            <div className="sm:hidden border-t border-border py-3">
              <div className="flex flex-col gap-1 text-sm">
                <Link href="/" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">Product</Link>
                <Link href="/about" className={`rounded-md px-3 py-2 hover:bg-muted ${pathname === "/about" ? "font-semibold text-foreground" : "text-foreground"}`}>About</Link>
                <Link href="/contact" className={`rounded-md px-3 py-2 hover:bg-muted ${pathname === "/contact" ? "font-semibold text-foreground" : "text-foreground"}`}>Contact</Link>
                <Link href="/login" className="rounded-md px-3 py-2 text-foreground hover:bg-muted">Log in</Link>
                <Link
                  href="/signup"
                  className="mt-1 inline-flex items-center justify-center rounded-full bg-primary px-3 py-2 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Start free trial
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
      await signOut({ redirect: false });
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
      setIsSigningOut(false);
    }
  };

  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  const NAV_LINKS = [
    ["/dashboard", "Dashboard"],
    ["/clients", "Clients"],
    ["/sessions", "Sessions"],
    ["/sessions/calendar", "Calendar"],
    ["/reports", "Reports"],
    ...(session.user.isPracticeOwner ? [["/team", "Team"], ["/audit", "Audit log"]] : []),
  ];

  return (
    <>
    <nav
      className="sticky top-0 z-40 border-b border-border"
      style={{ background: "rgba(252,254,255,.86)", backdropFilter: "saturate(160%) blur(12px)", fontFamily: "var(--font-hanken, system-ui, sans-serif)" }}
    >
      <div className="max-w-screen-2xl mx-auto px-7">
        <div className="flex h-[62px] items-center justify-between gap-6">

          {/* Left: logo + nav links */}
          <div className="flex items-center gap-[34px]">
            <Link href="/dashboard" className="flex items-center gap-[10px] flex-shrink-0" aria-label="CogniCare home">
              <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 10, background: "#0B2B6B", flexShrink: 0 }}>
                <svg width="19" height="19" viewBox="0 0 512 512" fill="none">
                  <path d="M352 166c-26-24-60-38-98-38-74 0-134 56-134 128s60 128 134 128c38 0 72-14 98-38" stroke="#25B9C8" strokeWidth="46" strokeLinecap="round" />
                </svg>
              </span>
              <Brand />
            </Link>
            <div className="hidden sm:flex items-center gap-[26px]">
              {NAV_LINKS.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className={`relative inline-flex items-center h-[62px] text-[14.5px] transition-colors duration-150 ${
                    isActive(href)
                      ? "font-bold text-foreground"
                      : "font-medium text-[#55698F] hover:text-foreground"
                  }`}
                >
                  {label}
                  {isActive(href) && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-sm bg-primary" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: Ask LIAM + mobile toggle + user chip */}
          <div className="flex items-center gap-[14px]">
            <button
              type="button"
              onClick={() => setLiamOpen(true)}
              className="hidden sm:inline-flex items-center gap-2 rounded-full bg-[#EAF3FF] px-[14px] py-2 text-[13.5px] font-bold text-primary transition-colors duration-150 hover:bg-[#E0EDFF] focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Ask LIAM
              <span className="rounded-[5px] bg-[#D3E5FF] px-1.5 py-0.5 text-[11px]">⌘K</span>
            </button>
            <button
              type="button"
              onClick={() => setShowMobileMenu((v) => !v)}
              className="sm:hidden inline-flex items-center justify-center rounded-md border border-border p-2 text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Toggle navigation menu"
              aria-expanded={showMobileMenu}
            >
              {showMobileMenu ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            <div className="flex-shrink-0">
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 focus:outline-none"
                  aria-haspopup="menu"
                  aria-expanded={showUserMenu}
                >
                  <span style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: "50%", background: "#0B2B6B", color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    {initials}
                  </span>
                  <span className="hidden sm:block text-sm font-semibold text-foreground">{session.user.name}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8298BC" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border shadow-lg bg-card z-20">
                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-foreground hover:bg-secondary"
                      >
                        Profile
                      </Link>
                      {session.user.isPracticeOwner && (
                        <Link
                          href="/billing"
                          className="block px-4 py-2 text-sm text-foreground hover:bg-secondary"
                        >
                          Subscription
                        </Link>
                      )}
                      <Link
                        href="/settings"
                        className="block px-4 py-2 text-sm text-foreground hover:bg-secondary"
                      >
                        Settings
                      </Link>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowConfirmDialog(true);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary"
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

      {/* Mobile menu */}
      {showMobileMenu && (
        <div className="sm:hidden border-t border-border py-3">
          <div className="flex flex-col gap-1 px-4 text-sm">
            {NAV_LINKS.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-2 transition-colors ${
                  isActive(href)
                    ? "bg-secondary font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => setLiamOpen(true)}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#EAF3FF] px-3 py-2 text-[13px] font-bold text-primary"
            >
              Ask LIAM
              <span className="rounded-[5px] bg-[#D3E5FF] px-1.5 py-0.5 text-[10px]">⌘K</span>
            </button>
          </div>
        </div>
      )}

    </nav>
    {showConfirmDialog && createPortal(
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center px-4"
        style={{ background: "rgba(0,0,0,.55)" }}
        onClick={() => setShowConfirmDialog(false)}
      >
        <div
          className="bg-card text-card-foreground border border-border rounded-lg p-6 max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}
        >
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
      </div>,
      document.body
    )}
    </>
  );
}
