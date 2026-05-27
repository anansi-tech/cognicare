"use client";

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Main content */}
      <div className="ml-0">
        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
