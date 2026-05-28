"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [practice, setPractice] = useState(null); // { name, isOwner, ... }
  const [practiceName, setPracticeName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      try {
        const res = await fetch("/api/practice");
        if (!res.ok) return;
        const data = await res.json();
        setPractice(data.practice);
        setPracticeName(data.practice?.name || "");
      } catch {
        // Non-fatal — Practice card stays hidden until we can load it.
      }
    })();
  }, [status]);

  const savePracticeName = async (e) => {
    e.preventDefault();
    if (!practiceName.trim() || practiceName.trim() === practice?.name) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/practice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: practiceName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      setPractice((p) => ({ ...p, name: data.name }));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") {
    return <div className="text-center p-4 text-muted-foreground">Loading...</div>;
  }
  if (!session) return null;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-foreground">Settings</h1>
      <div className="space-y-8">
        {/* Card A — Practice */}
        {practice && (
          <div className="bg-card shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-foreground">Practice</h3>
              {practice.isOwner ? (
                <form onSubmit={savePracticeName} className="mt-5 max-w-md">
                  <label
                    htmlFor="practiceName"
                    className="block text-sm font-medium text-foreground"
                  >
                    Practice name
                  </label>
                  <input
                    id="practiceName"
                    type="text"
                    value={practiceName}
                    onChange={(e) => setPracticeName(e.target.value)}
                    className="mt-1 block w-full border border-input rounded-md shadow-sm p-2"
                  />
                  {saveError && (
                    <p className="mt-2 text-sm text-destructive">{saveError}</p>
                  )}
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving || !practiceName.trim() || practiceName.trim() === practice.name}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    {savedFlash && (
                      <span className="text-sm text-muted-foreground">Saved.</span>
                    )}
                  </div>
                </form>
              ) : (
                <p className="mt-5 text-sm text-muted-foreground">
                  Practice: <span className="font-medium text-foreground">{practice.name}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Card B — Subscription */}
        <div className="bg-card shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-foreground">Subscription</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage your plan, seats, and payment method.
            </p>
            <div className="mt-5">
              <Link
                href="/billing"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
              >
                Manage subscription
              </Link>
            </div>
          </div>
        </div>

        {/* Card C — Data Management */}
        <div className="bg-card shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-foreground">Data Management</h3>
            <div className="mt-5">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch("/api/export");
                    if (!response.ok) {
                      throw new Error("Failed to export data");
                    }
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `cognicare_export_${new Date().toISOString().split("T")[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  } catch (error) {
                    console.error("Error exporting data:", error);
                    alert("Failed to export data. Please try again.");
                  }
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
              >
                Export All Data
              </button>
              <p className="mt-2 text-sm text-muted-foreground">
                Download all your data in JSON format. This includes clients, sessions, reports, and
                AI analyses.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
