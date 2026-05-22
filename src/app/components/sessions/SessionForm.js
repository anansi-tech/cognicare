"use client";

import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function SessionForm({
  session,
  onSuccess,
  onCancel,
  initialClientId,
  initialDate,
}) {
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [formData, setFormData] = useState({
    clientId: initialClientId || "",
    date: initialDate || new Date().toISOString(),
    duration: 50,
    type: "initial",
    format: "in-person",
    status: "scheduled",
    notes: "",
    concerns: "",
    progress: "",
    nextSteps: "",
    moodRating: 5,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Fetch all clients for the dropdown
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch("/api/clients");
        if (!response.ok) throw new Error("Failed to fetch clients");
        const data = await response.json();
        setClients(data);
      } catch (err) {
        console.error("Error fetching clients:", err);
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  // If editing, populate the form with existing session data
  useEffect(() => {
    if (session) {
      setFormData({
        clientId: session.clientId._id || session.clientId,
        date: session.date,
        duration: session.duration,
        type: session.type,
        format: session.format,
        status: session.status,
        notes: session.notes || "",
        concerns: session.concerns || "",
        progress: session.progress || "",
        nextSteps: session.nextSteps || "",
        moodRating: session.moodRating || 5,
      });
    }
  }, [session]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({
      ...prev,
      date: date.toISOString(),
    }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.clientId) errors.clientId = "Client is required";
    if (!formData.date) errors.date = "Date is required";
    if (!formData.duration) errors.duration = "Duration is required";
    if (formData.duration <= 0) errors.duration = "Duration must be greater than 0";
    if (!formData.type) errors.type = "Session type is required";
    if (!formData.format) errors.format = "Session format is required";

    // Only require notes for completed sessions
    if (formData.status === "completed" && !formData.notes.trim()) {
      errors.notes = "Notes are required for completed sessions";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const url = session?._id ? `/api/sessions/${session._id}` : "/api/sessions";
      const method = session?._id ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save session");
      }

      const savedSession = await response.json();
      console.log("Session saved successfully:", savedSession);

      // Call the success callback with the saved session
      if (onSuccess) {
        onSuccess(savedSession);
      }
    } catch (err) {
      console.error("Error saving session:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Selection */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client <span className="text-red-500">*</span>
          </label>
          <select
            name="clientId"
            value={formData.clientId}
            onChange={handleChange}
            className={`w-full p-2 border rounded ${
              validationErrors.clientId ? "border-red-500" : "border-gray-300"
            }`}
            disabled={loadingClients}
          >
            <option value="">Select Client</option>
            {clients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </select>
          {validationErrors.clientId && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.clientId}</p>
          )}
        </div>

        {/* Date and Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date & Time <span className="text-red-500">*</span>
          </label>
          <DatePicker
            selected={new Date(formData.date)}
            onChange={handleDateChange}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="MMMM d, yyyy h:mm aa"
            className={`w-full p-2 border rounded ${
              validationErrors.date ? "border-red-500" : "border-gray-300"
            }`}
          />
          {validationErrors.date && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.date}</p>
          )}
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (minutes) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            min="1"
            className={`w-full p-2 border rounded ${
              validationErrors.duration ? "border-red-500" : "border-gray-300"
            }`}
          />
          {validationErrors.duration && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.duration}</p>
          )}
        </div>

        {/* Session Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Session Type <span className="text-red-500">*</span>
          </label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className={`w-full p-2 border rounded ${
              validationErrors.type ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="initial">Initial Assessment</option>
            <option value="followup">Follow-up</option>
            <option value="assessment">Assessment</option>
            <option value="crisis">Crisis Intervention</option>
            <option value="group">Group Session</option>
            <option value="family">Family Session</option>
          </select>
          {validationErrors.type && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.type}</p>
          )}
        </div>

        {/* Session Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Format <span className="text-red-500">*</span>
          </label>
          <select
            name="format"
            value={formData.format}
            onChange={handleChange}
            className={`w-full p-2 border rounded ${
              validationErrors.format ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="in-person">In-Person</option>
            <option value="video">Video</option>
            <option value="phone">Phone</option>
            <option value="chat">Chat</option>
          </select>
          {validationErrors.format && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.format}</p>
          )}
        </div>

        {/* Session Status */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Mood Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Mood Rating (1-10)
          </label>
          <input
            type="number"
            name="moodRating"
            value={formData.moodRating}
            onChange={handleChange}
            min="1"
            max="10"
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        {/* Session Notes */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Session Notes{" "}
            {formData.status === "completed" && <span className="text-red-500">*</span>}
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={6}
            className={`w-full p-2 border rounded ${
              validationErrors.notes ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter session notes, observations, and next steps..."
          ></textarea>
          {validationErrors.notes && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.notes}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Session"}
        </button>
      </div>
    </form>
  );
}
