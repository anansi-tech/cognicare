export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-secondary">
      <main className="py-6">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
