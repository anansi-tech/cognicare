"use client";

import { useState } from "react";

export default function InsuranceInfo({ client, onUpdate }) {
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);

  const handleEditInsurance = () => {
    setShowInsuranceModal(true);
  };

  const handleInsuranceUpdate = async (formData) => {
    try {
      const updateData = {
        insurance: {
          provider: formData.provider,
          policyNumber: formData.policyNumber,
          groupNumber: formData.groupNumber,
          coverage: formData.coverage,
          notes: formData.notes,
        },
      };

      const response = await fetch(`/api/clients/${client._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update insurance information");
      }

      const updatedClient = await response.json();
      onUpdate(updatedClient);
      setShowInsuranceModal(false);
    } catch (error) {
      console.error("Error updating insurance:", error);
      // Handle error (show toast, etc.)
    }
  };

  return (
    <>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Insurance Information</h3>
          <button
            onClick={handleEditInsurance}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Edit
          </button>
        </div>
        <div className="border-t border-gray-200">
          {client?.insurance ? (
            <div className="px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Provider</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {client.insurance.provider || "Not set"}
                  </dd>
                </div>

                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Policy Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {client.insurance.policyNumber || "Not set"}
                  </dd>
                </div>

                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Group Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {client.insurance.groupNumber || "Not set"}
                  </dd>
                </div>

                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Coverage</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {client.insurance.coverage === "full" && "Full Coverage"}
                    {client.insurance.coverage === "partial" && "Partial Coverage"}
                    {client.insurance.coverage === "none" && "No Coverage"}
                  </dd>
                </div>

                {client.insurance.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.insurance.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          ) : (
            <div className="px-4 py-5 sm:p-6">
              <p className="text-sm text-gray-500">No insurance information has been added yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Insurance Modal */}
      {showInsuranceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-xl font-semibold mb-4">Edit Insurance Information</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleInsuranceUpdate({
                  provider: formData.get("provider"),
                  policyNumber: formData.get("policyNumber"),
                  groupNumber: formData.get("groupNumber"),
                  coverage: formData.get("coverage"),
                  notes: formData.get("notes"),
                });
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Provider</label>
                  <input
                    type="text"
                    name="provider"
                    defaultValue={client.insurance?.provider}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Policy Number</label>
                  <input
                    type="text"
                    name="policyNumber"
                    defaultValue={client.insurance?.policyNumber}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Group Number</label>
                  <input
                    type="text"
                    name="groupNumber"
                    defaultValue={client.insurance?.groupNumber}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Coverage</label>
                  <select
                    name="coverage"
                    defaultValue={client.insurance?.coverage}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="full">Full Coverage</option>
                    <option value="partial">Partial Coverage</option>
                    <option value="none">No Coverage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    name="notes"
                    defaultValue={client.insurance?.notes}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowInsuranceModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
