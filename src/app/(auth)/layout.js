"use client";

import Link from "next/link";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">{children}</main>
        <footer className="bg-white py-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-500">
              © {new Date().getFullYear()} CogniCare. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
