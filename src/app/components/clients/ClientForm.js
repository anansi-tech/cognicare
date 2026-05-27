"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toDateInputValue } from "@/lib/age";

export default function ClientForm({ client, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    name: client ? client.name || "" : "",
    dateOfBirth: client ? toDateInputValue(client.dateOfBirth) : "",
    gender: client ? client.gender || "male" : "male",
    contactInfo: {
      email: client ? client.contactInfo?.email || "" : "",
      phone: client ? client.contactInfo?.phone || "" : "",
      emergencyContact: client
        ? client.contactInfo?.emergencyContact || {
            name: "",
            relationship: "",
            phone: "",
          }
        : {
            name: "",
            relationship: "",
            phone: "",
          },
    },
    status: client ? client.status || "active" : "active",
  });
  // Light-structured initial assessment (Round 16). On submit these get
  // concatenated under headers into the single `initialAssessment` string
  // that the agents consume. When editing an existing client whose
  // initialAssessment is a single blob, we preload it into Presenting
  // Concerns so nothing is lost — we don't try to parse old blobs.
  const [intake, setIntake] = useState({
    presentingConcerns: client?.initialAssessment || "",
    relevantHistory: "",
    riskIndicators: "",
    currentStressors: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (client) {
      // Populate form with client data for editing
      setFormData({
        name: client.name || "",
        dateOfBirth: toDateInputValue(client.dateOfBirth),
        gender: client.gender || "male",
        contactInfo: {
          email: client.contactInfo?.email || "",
          phone: client.contactInfo?.phone || "",
          emergencyContact: {
            name: client.contactInfo?.emergencyContact?.name || "",
            relationship: client.contactInfo?.emergencyContact?.relationship || "",
            phone: client.contactInfo?.emergencyContact?.phone || "",
          },
        },
        status: client.status || "active",
      });
      setIntake({
        presentingConcerns: client.initialAssessment || "",
        relevantHistory: "",
        riskIndicators: "",
        currentStressors: "",
      });
    }
  }, [client]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.includes(".")) {
      // Handle nested properties (e.g., contactInfo.email)
      const parts = name.split(".");

      if (parts.length === 2) {
        // Handle contactInfo.email, contactInfo.phone
        const [parent, child] = parts;
        setFormData((prev) => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value,
          },
        }));
      } else if (parts.length === 3) {
        // Handle contactInfo.emergencyContact.name
        const [parent, middle, child] = parts;
        setFormData((prev) => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [middle]: {
              ...(prev[parent]?.[middle] || { name: "", relationship: "", phone: "" }),
              [child]: value,
            },
          },
        }));
      }
    } else {
      // Handle top-level properties
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const composeInitialAssessment = () => {
    const sections = [
      ["Presenting Concerns", intake.presentingConcerns],
      ["Relevant History", intake.relevantHistory],
      ["Risk Indicators", intake.riskIndicators],
      ["Current Stressors", intake.currentStressors],
    ];
    return sections
      .filter(([, v]) => v && v.trim())
      .map(([label, v]) => `${label}:\n${v.trim()}`)
      .join("\n\n");
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.dateOfBirth) {
      errors.dateOfBirth = "Date of birth is required";
    } else {
      const dob = new Date(formData.dateOfBirth);
      if (Number.isNaN(dob.getTime())) {
        errors.dateOfBirth = "Enter a valid date";
      } else if (dob > new Date()) {
        errors.dateOfBirth = "Date of birth must be in the past";
      }
    }
    if (!formData.gender) errors.gender = "Gender is required";
    if (!composeInitialAssessment().trim())
      errors.initialAssessment = "Fill at least one section of the initial assessment.";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate form before submission
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setLoading(false);
      return;
    }

    try {
      // Determine if this is a create or update operation
      const method = client ? "PATCH" : "POST";
      const url = client ? `/api/clients/${client._id}` : "/api/clients";

      // Save client data — compose the structured intake into the single
      // initialAssessment string the agents consume.
      const payload = { ...formData, initialAssessment: composeInitialAssessment() };
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.reason === "freeLimit") {
          setError(
            "You've reached your free trial client limit. Please upgrade to add more clients."
          );
          setLoading(false);
          return;
        } else if (errorData.reason === "paidLimit") {
          setError("You've reached your client limit. Please contact support to add more clients.");
          setLoading(false);
          return;
        } else if (errorData.reason === "subscriptionExpired") {
          setError("Your subscription has expired. Please renew your subscription to add clients.");
          setLoading(false);
          return;
        }
        setError(client ? "Failed to update client" : "Failed to create client");
        setLoading(false);
        return;
      }

      const savedClient = await response.json();

      if (onSuccess) {
        onSuccess(savedClient);
      }
    } catch (error) {
      console.error("Error saving client:", error);
      setError(error.message);
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
          {error.includes("free trial client limit") && (
            <div className="mt-4">
              <Link
                href="/subscription"
                className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Upgrade Plan
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full p-2 border rounded ${
              validationErrors.name ? "border-red-500" : "border-gray-300"
            }`}
          />
          {validationErrors.name && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              max={new Date().toISOString().slice(0, 10)}
              onChange={handleChange}
              className={`w-full p-2 border rounded ${
                validationErrors.dateOfBirth ? "border-red-500" : "border-gray-300"
              }`}
            />
            {validationErrors.dateOfBirth && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.dateOfBirth}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={`w-full p-2 border rounded ${
                validationErrors.gender ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {validationErrors.gender && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.gender}</p>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="contactInfo.email"
            value={formData.contactInfo.email}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            name="contactInfo.phone"
            value={formData.contactInfo.phone}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        {/* Emergency Contact */}
        <div className="md:col-span-2">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input
                type="text"
                name="contactInfo.emergencyContact.name"
                value={formData.contactInfo.emergencyContact.name}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Relationship</label>
              <input
                type="text"
                name="contactInfo.emergencyContact.relationship"
                value={formData.contactInfo.emergencyContact.relationship}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone</label>
              <input
                type="tel"
                name="contactInfo.emergencyContact.phone"
                value={formData.contactInfo.emergencyContact.phone}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Initial Clinical Assessment — light-structured (Round 16) */}
        <div className="md:col-span-2">
          <div className="mb-2">
            <h3 className="text-base font-semibold text-gray-900">
              Initial Clinical Assessment <span className="text-red-500">*</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              A thorough note here improves the AI&apos;s assessment, diagnosis, and treatment
              suggestions — write naturally; all sections are optional but more detail helps. At
              least one section must be filled.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Presenting concerns
              </label>
              <textarea
                value={intake.presentingConcerns}
                onChange={(e) =>
                  setIntake((s) => ({ ...s, presentingConcerns: e.target.value }))
                }
                rows={4}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="What brings them in — current symptoms, the precipitating event, what they're hoping to address."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relevant history
              </label>
              <textarea
                value={intake.relevantHistory}
                onChange={(e) =>
                  setIntake((s) => ({ ...s, relevantHistory: e.target.value }))
                }
                rows={3}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Mental health / treatment / medical history as known — prior diagnoses, medications, prior therapy."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Risk indicators
              </label>
              <textarea
                value={intake.riskIndicators}
                onChange={(e) =>
                  setIntake((s) => ({ ...s, riskIndicators: e.target.value }))
                }
                rows={3}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Suicidal/homicidal ideation, safety concerns — or 'none noted'."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current stressors / context
              </label>
              <textarea
                value={intake.currentStressors}
                onChange={(e) =>
                  setIntake((s) => ({ ...s, currentStressors: e.target.value }))
                }
                rows={3}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Situational factors — relationships, work, finances, recent changes, supports."
              />
            </div>
          </div>
          {validationErrors.initialAssessment && (
            <p className="text-red-500 text-xs mt-2">{validationErrors.initialAssessment}</p>
          )}
        </div>

        {/* Status - Only shown when editing */}
        {client && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="completed">Completed</option>
              <option value="transferred">Transferred</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
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
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {loading ? "Saving..." : "Save Client"}
        </button>
      </div>
    </form>
  );
}
