"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useFormDraft } from "@/hooks/useFormDraft";
import { DraftRestoredNotice, DraftSaveIndicator } from "@/components/ui/DraftRestoredNotice";

// Self-edit profile form. The generic admin user CRUD was removed in
// Round 10 — this form is now used only by /profile.
export default function UserForm({ user, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    licenseNumber: "",
    specialization: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const draftData = useMemo(() => ({ ...formData, password: "" }), [formData]);
  const applyDraft = useCallback((updater) => {
    setFormData((prev) => {
      const next = typeof updater === "function" ? updater({ ...prev, password: "" }) : updater;
      return { ...prev, ...next, password: "" };
    });
  }, []);
  const { draftRestored, dismissRestored, clearDraft, saveState } = useFormDraft(
    `profile-draft-${user?._id ?? "loading"}`,
    draftData,
    applyDraft,
    !!user
  );

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        password: "",
        licenseNumber: user.licenseNumber || "",
        specialization: user.specialization || "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const requestData = { ...formData };
      if (!requestData.password) delete requestData.password;

      const response = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to save profile");
      }

      clearDraft();
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {draftRestored && (
        <DraftRestoredNotice onDismiss={dismissRestored} onDiscard={() => { clearDraft(); onCancel?.(); }} />
      )}
      {error && <div className="bg-red-50 text-red-500 p-4 rounded mb-4">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-foreground">Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-input rounded-md shadow-sm p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-input rounded-md shadow-sm p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground">
          Password (leave blank to keep current)
        </label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="mt-1 block w-full border border-input rounded-md shadow-sm p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground">License Number</label>
        <input
          type="text"
          name="licenseNumber"
          value={formData.licenseNumber}
          onChange={handleChange}
          className="mt-1 block w-full border border-input rounded-md shadow-sm p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground">Specialization</label>
        <input
          type="text"
          name="specialization"
          value={formData.specialization}
          onChange={handleChange}
          className="mt-1 block w-full border border-input rounded-md shadow-sm p-2"
        />
      </div>

      <div className="flex justify-end space-x-4">
        <DraftSaveIndicator state={saveState} />
        <button
          type="button"
          onClick={() => { clearDraft(); onCancel?.(); }}
          className="px-4 py-2 border border-input rounded-md text-foreground hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Update Profile"}
        </button>
      </div>
    </form>
  );
}
