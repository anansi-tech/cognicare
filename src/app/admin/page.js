import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AuditLogs from "@/app/components/admin/AuditLogs";

export default async function AdminPage() {
  const user = await getCurrentUser();

  // Redirect if not admin
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Audit Logs</h2>
          <AuditLogs />
        </section>
      </div>
    </div>
  );
}
