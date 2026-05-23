"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

// Small reassignment control shown in the client header. Visible only to:
//   - the practice owner (can reassign any client), or
//   - the currently-assigned clinician (can hand off their own client).
// Transfer semantics: the previous assignee loses access immediately.
export default function ReassignControl({ client, onReassigned }) {
  const { data: session } = useSession();
  const [clinicians, setClinicians] = useState([]);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/practice/clinicians")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setClinicians(data))
      .catch(() => {});
  }, []);

  const userId = session?.user?.id;
  const meAsMember = clinicians.find((c) => String(c._id) === String(userId));
  const isOwner = !!meAsMember?.isOwner;
  const isAssigned = String(client?.counselorId) === String(userId);
  const canReassign = isOwner || isAssigned;

  // No-op if practice only has one clinician (nothing to reassign to).
  const others = clinicians.filter((c) => String(c._id) !== String(client?.counselorId));
  if (!canReassign || others.length === 0) return null;

  const currentAssignee =
    clinicians.find((c) => String(c._id) === String(client?.counselorId))?.name ?? "—";

  const submit = async () => {
    if (!target) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${client._id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counselorId: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reassignment failed");
      toast.success(`Client reassigned to ${data.counselorName}.`);
      setOpen(false);
      if (typeof onReassigned === "function") onReassigned(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1 bg-amber-500 text-white rounded hover:bg-amber-600"
      >
        Reassign
      </button>

      {open && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900">Reassign client</h3>
            <p className="mt-2 text-sm text-gray-600">
              Currently assigned to <span className="font-medium">{currentAssignee}</span>.
              Select a new clinician to transfer this client to.
            </p>
            {isAssigned && !isOwner && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                After transfer you will no longer see this record.
              </p>
            )}
            <label htmlFor="reassign-target" className="mt-4 block text-sm font-medium text-gray-700">
              Reassign to
            </label>
            <select
              id="reassign-target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a clinician…</option>
              {others.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.isOwner ? "(owner)" : ""}
                </option>
              ))}
            </select>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !target}
                className="px-3 py-1 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitting ? "Reassigning…" : "Reassign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
