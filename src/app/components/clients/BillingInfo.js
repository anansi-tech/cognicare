"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";

export default function BillingInfo({ client, onUpdate, onDelete }) {
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(null);

  const handleEditBilling = () => {
    setSelectedInvoice(null);
    setShowBillingModal(true);
  };

  const handleBillingUpdate = async (formData) => {
    try {
      // Prepare the update data for basic billing info
      const updateData = {
        paymentMethod: formData.paymentMethod,
        rate: parseFloat(formData.rate) || 0,
        initialRate: parseFloat(formData.initialRate) || 0,
        groupRate: parseFloat(formData.groupRate) || 0,
        notes: formData.notes,
        invoices: client?.billing?.invoices || [],
      };

      // Only process invoice data if an amount is provided
      if (formData.amount) {
        let invoiceData = {
          _id: formData.invoiceId || undefined,
          date: new Date().toISOString(),
          amount: formData.amount,
          status: "pending",
          notes: formData.invoiceNotes || "",
        };

        // Add document info if a file was uploaded
        if (formData.invoiceFile && formData.invoiceFile.size > 0) {
          console.log("Uploading file:", formData.invoiceFile);
          const uploadFormData = new FormData();
          uploadFormData.append("file", formData.invoiceFile);

          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: uploadFormData,
          });

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload invoice");
          }

          const uploadResult = await uploadResponse.json();
          console.log("Upload result:", uploadResult);
          invoiceData.document = uploadResult.path;
          invoiceData.documentKey = uploadResult.key;
        } else if (formData.invoiceId && selectedInvoice?.document) {
          // Keep existing document if editing and no new file uploaded
          invoiceData.document = selectedInvoice.document;
          invoiceData.documentKey = selectedInvoice.documentKey;
        }

        console.log("Invoice data before update:", invoiceData);

        // Update or add the invoice
        if (formData.invoiceId) {
          // Update existing invoice
          updateData.invoices = updateData.invoices.map((invoice) =>
            invoice._id === formData.invoiceId ? invoiceData : invoice
          );
        } else {
          // Add new invoice only if it doesn't already exist
          const existingInvoice = updateData.invoices.find(
            (inv) => inv.amount === formData.amount && inv.date === invoiceData.date
          );
          if (!existingInvoice) {
            updateData.invoices = [...updateData.invoices, invoiceData];
          }
        }
      }

      console.log("Update data:", updateData);

      // Update client billing information
      const response = await fetch(`/api/clients/${client._id}/billing`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update billing information");
      }

      const updatedBilling = await response.json();
      console.log("Updated billing:", updatedBilling);
      onUpdate({
        ...client,
        billing: updatedBilling,
      });
      setSelectedInvoice(null);
      setShowBillingModal(false);
    } catch (error) {
      console.error("Error updating billing:", error);
      // Handle error (show toast, etc.)
    }
  };

  const handleViewInvoice = (invoice) => {
    if (invoice.document) {
      window.open(invoice.document, "_blank");
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!confirm("Are you sure you want to delete this invoice?")) {
      return;
    }

    try {
      const response = await fetch(`/api/clients/${client._id}/invoices/${invoiceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete invoice");
      }

      // Update the client state by removing the deleted invoice
      onUpdate({
        ...client,
        billing: {
          ...client.billing,
          invoices: client.billing.invoices.filter((invoice) => invoice._id !== invoiceId),
        },
      });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      // Handle error (show toast, etc.)
    }
  };

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const response = await fetch(`/api/sessions?clientId=${client._id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      const sessions = await response.json();
      setSessions(sessions);
      return sessions;
    } catch (error) {
      console.error("Error fetching sessions:", error);
      alert("Failed to load sessions");
      return null;
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!client.billing?.rate) {
      alert("Please set a session rate first");
      return;
    }

    setIsGenerating(true);
    try {
      const sessions = await fetchSessions();
      if (!sessions || sessions.length === 0) {
        alert("No sessions available to invoice");
        return;
      }
      setShowSessionModal(true);
    } catch (error) {
      console.error("Error generating invoice:", error);
      alert("Failed to load sessions");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSessionSelection = async () => {
    if (selectedSessions.length === 0) {
      alert("Please select at least one session");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`/api/clients/${client._id}/invoices/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessions: selectedSessions.map((session) => ({
            ...session,
            rate:
              session.type === "initial"
                ? client.billing.initialRate || client.billing.rate
                : session.type === "group"
                  ? client.billing.groupRate || client.billing.rate
                  : client.billing.rate,
          })),
          notes: "Automatically generated invoice",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate invoice");
      }

      const data = await response.json();
      onUpdate({
        ...client,
        billing: {
          ...client.billing,
          invoices: [...(client.billing?.invoices || []), data.invoice],
        },
      });

      window.open(data.documentUrl, "_blank");
      setShowSessionModal(false);
      setSelectedSessions([]);
    } catch (error) {
      console.error("Error generating invoice:", error);
      alert("Failed to generate invoice. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkAsPaid = async (invoiceId, paymentMethod) => {
    try {
      const response = await fetch(`/api/clients/${client._id}/invoices/${invoiceId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "paid",
          paymentDate: new Date().toISOString(),
          paymentMethod: paymentMethod,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark invoice as paid");
      }

      const data = await response.json();
      if (data.success) {
        onUpdate({
          ...client,
          billing: {
            ...client.billing,
            invoices: client.billing.invoices.map((inv) =>
              inv._id === invoiceId
                ? {
                    ...inv,
                    status: "paid",
                    paymentDate: new Date().toISOString(),
                    paymentMethod: paymentMethod,
                    document: data.invoice.document,
                    documentKey: data.invoice.documentKey,
                  }
                : inv
            ),
          },
        });
      }
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
    }
  };

  const handleSendReminder = async (invoiceId) => {
    try {
      const response = await fetch(`/api/clients/${client._id}/invoices/${invoiceId}/reminder`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send reminder");
      }

      alert("Reminder sent successfully");
    } catch (error) {
      console.error("Error sending reminder:", error);
      alert(error.message || "Failed to send reminder");
    }
  };

  const renderInvoiceStatus = (invoice) => {
    if (invoice.status === "paid") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Paid
        </span>
      );
    }
    return (
      <div className="flex items-center space-x-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Pending
        </span>
        <button
          onClick={() => handleSendReminder(invoice._id)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Send Reminder
        </button>
      </div>
    );
  };

  const renderPaymentOptions = (invoice) => {
    if (invoice.status === "paid") {
      return null;
    }
    return (
      <div className="relative">
        <button
          onClick={() =>
            setShowPaymentDropdown(showPaymentDropdown === invoice._id ? null : invoice._id)
          }
          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
        >
          Mark as Paid
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showPaymentDropdown === invoice._id && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10">
            <div className="py-1">
              <button
                onClick={() => {
                  handleMarkAsPaid(invoice._id, "cash");
                  setShowPaymentDropdown(null);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Cash
                </span>
              </button>
              <button
                onClick={() => {
                  handleMarkAsPaid(invoice._id, "check");
                  setShowPaymentDropdown(null);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Check
                </span>
              </button>
              <button
                onClick={() => {
                  handleMarkAsPaid(invoice._id, "credit");
                  setShowPaymentDropdown(null);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  Credit Card
                </span>
              </button>
              <button
                onClick={() => {
                  handleMarkAsPaid(invoice._id, "insurance");
                  setShowPaymentDropdown(null);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  Insurance
                </span>
              </button>
              <button
                onClick={() => {
                  handleMarkAsPaid(invoice._id, "other");
                  setShowPaymentDropdown(null);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                  Other
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="px-4 py-5 sm:px-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Billing Information</h3>
          <div>
            <button
              onClick={handleEditBilling}
              className="text-sm text-blue-600 hover:text-blue-800 mr-4"
            >
              {client?.billing ? "Edit Billing" : "Add Billing Information"}
            </button>
            {client?.billing && (
              <>
                <button
                  onClick={handleGenerateInvoice}
                  disabled={isGenerating}
                  className="text-sm text-green-600 hover:text-green-800 mr-4"
                >
                  {isGenerating ? "Generating..." : "Generate Invoice"}
                </button>
                <button onClick={onDelete} className="text-sm text-red-600 hover:text-red-800">
                  Delete Billing
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {client?.billing ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Payment Method</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {client.billing.paymentMethod === "cash" && "Cash"}
                  {client.billing.paymentMethod === "check" && "Check"}
                  {client.billing.paymentMethod === "credit" && "Credit Card"}
                  {client.billing.paymentMethod === "insurance" && "Insurance"}
                  {client.billing.paymentMethod === "other" && "Other"}
                </dd>
              </div>

              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Standard Session Rate</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {client.billing.rate ? `$${client.billing.rate}` : "Not set"}
                </dd>
              </div>

              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Initial Session Rate</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {client.billing.initialRate ? `$${client.billing.initialRate}` : "Not set"}
                </dd>
              </div>

              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Group Session Rate</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {client.billing.groupRate ? `$${client.billing.groupRate}` : "Not set"}
                </dd>
              </div>

              {client.billing.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900">{client.billing.notes}</dd>
                </div>
              )}

              {/* Only show invoices section if there are valid invoices */}
              {Array.isArray(client?.billing?.invoices) &&
                client.billing.invoices.length > 0 &&
                client.billing.invoices.some((inv) => inv.amount) && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Recent Invoices</dt>
                    <dd className="mt-1">
                      <div className="space-y-4">
                        {client.billing.invoices.map((invoice) => (
                          <div key={invoice._id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">
                                  Invoice #
                                  {invoice.invoiceNumber || invoice._id.toString().slice(-6)}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Date: {new Date(invoice.date).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-gray-600">Amount: ${invoice.amount}</p>
                                <div className="text-sm">
                                  Status: {renderInvoiceStatus(invoice)}
                                </div>
                                <p className="text-sm text-gray-600">
                                  Payment Method:{" "}
                                  {invoice.paymentMethod ? (
                                    <span className="capitalize">
                                      {invoice.paymentMethod === "credit"
                                        ? "Credit Card"
                                        : invoice.paymentMethod}
                                    </span>
                                  ) : (
                                    "Not specified"
                                  )}
                                </p>
                                {invoice.status !== "paid" && invoice.paymentLink && (
                                  <a
                                    href={invoice.paymentLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    Pay Online
                                  </a>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                {renderPaymentOptions(invoice)}
                                <div className="flex space-x-2">
                                  <a
                                    href={invoice.document}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    View PDF
                                  </a>
                                  <button
                                    onClick={() => handleDeleteInvoice(invoice._id)}
                                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </dd>
                  </div>
                )}
            </dl>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <p className="text-sm text-gray-500">No billing information has been added yet.</p>
          </div>
        </div>
      )}

      {/* Billing Modal */}
      {showBillingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-xl font-semibold mb-4">Edit Billing Information</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleBillingUpdate({
                  paymentMethod: formData.get("paymentMethod"),
                  rate: formData.get("rate"),
                  initialRate: formData.get("initialRate"),
                  groupRate: formData.get("groupRate"),
                  notes: formData.get("notes"),
                  invoiceFile: formData.get("invoiceFile"),
                  amount: formData.get("amount"),
                  invoiceNotes: formData.get("invoiceNotes"),
                  invoiceId: formData.get("invoiceId"),
                });
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <select
                    name="paymentMethod"
                    defaultValue={client.billing?.paymentMethod}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="credit">Credit Card</option>
                    <option value="insurance">Insurance</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Standard Session Rate
                  </label>
                  <input
                    type="number"
                    name="rate"
                    defaultValue={client.billing?.rate}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Standard session rate"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Initial Session Rate
                  </label>
                  <input
                    type="number"
                    name="initialRate"
                    defaultValue={client.billing?.initialRate}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Initial consultation rate"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Group Session Rate
                  </label>
                  <input
                    type="number"
                    name="groupRate"
                    defaultValue={client.billing?.groupRate}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Group session rate"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Billing Notes</label>
                  <textarea
                    name="notes"
                    defaultValue={client.billing?.notes}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-2">
                    {selectedInvoice ? "Edit Invoice" : "Add Invoice"}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Invoice Document {selectedInvoice?.document && "(Replace Current)"}
                      </label>
                      <input
                        type="file"
                        name="invoiceFile"
                        accept=".pdf"
                        className="mt-1 block w-full"
                      />
                      {selectedInvoice?.document && (
                        <p className="text-xs text-gray-500 mt-1">
                          Current document:
                          <a
                            href={selectedInvoice.document}
                            target="_blank"
                            className="text-blue-500 ml-1"
                          >
                            View
                          </a>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Amount</label>
                      <input
                        type="number"
                        name="amount"
                        defaultValue={selectedInvoice?.amount || ""}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Invoice Notes
                      </label>
                      <textarea
                        name="invoiceNotes"
                        defaultValue={selectedInvoice?.notes || ""}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <input type="hidden" name="invoiceId" value={selectedInvoice?._id || ""} />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowBillingModal(false)}
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

      {/* Session Selection Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-xl font-semibold mb-4">Select Sessions for Invoice</h2>
            {isLoadingSessions ? (
              <div className="flex justify-center items-center h-32">
                <p className="text-gray-500">Loading sessions...</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {sessions.map((session) => (
                  <div
                    key={session._id}
                    className="flex items-center space-x-4 p-2 hover:bg-gray-50 rounded border border-gray-200"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSessions.some((s) => s._id === session._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSessions([...selectedSessions, session]);
                        } else {
                          setSelectedSessions(
                            selectedSessions.filter((s) => s._id !== session._id)
                          );
                        }
                      }}
                      className="h-4 w-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {new Date(session.date).toLocaleDateString()}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {session.type
                            ? session.type.charAt(0).toUpperCase() + session.type.slice(1)
                            : "Standard"}
                        </span>
                        <span className="text-sm text-gray-500">
                          {session.duration || "60"} minutes
                        </span>
                      </div>
                      {session.notes && (
                        <p className="text-sm text-gray-500 mt-1">{session.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-medium">
                        $
                        {session.type === "initial"
                          ? client.billing?.initialRate || client.billing?.rate
                          : session.type === "group"
                            ? client.billing?.groupRate || client.billing?.rate
                            : client.billing?.rate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Total: $
                {selectedSessions.reduce((sum, session) => {
                  const rate =
                    session.type === "initial"
                      ? client.billing?.initialRate || client.billing?.rate
                      : session.type === "group"
                        ? client.billing?.groupRate || client.billing?.rate
                        : client.billing?.rate;
                  return sum + rate;
                }, 0)}
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setShowSessionModal(false);
                    setSelectedSessions([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSessionSelection}
                  disabled={isGenerating || selectedSessions.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isGenerating ? "Generating..." : "Generate Invoice"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
