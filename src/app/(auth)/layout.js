"use client";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-secondary">
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">{children}</main>
        <footer className="bg-background border-t border-border py-4">
          <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} CogniCare. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
