"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function ConsentFormPage() {
  const { id } = useParams();
  const [consentForm, setConsentForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchConsentForm = async () => {
      try {
        const response = await fetch(`/api/consent-forms/${id}?token=true`);
        if (!response.ok) throw new Error("Failed to fetch consent form");
        const data = await response.json();
        setConsentForm(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConsentForm();
  }, [id]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("token", id);

      const response = await fetch(`/api/consent-forms/sign`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload signed form");
      }

      const updatedForm = await response.json();
      console.log("Updated form:", updatedForm);
      setConsentForm(updatedForm);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    console.log("Current consent form:", consentForm);
  }, [consentForm]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!consentForm) return <div>Consent form not found</div>;

  const downloadUrl = consentForm.signedDocument || consentForm.documentUrl;
  console.log("Download URL:", downloadUrl);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Consent Form</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">{consentForm.type} Consent</h2>
        <p className="text-gray-600">Version: {consentForm.version}</p>
        <p className="text-gray-600">
          Status:{" "}
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              consentForm.status === "signed"
                ? "bg-green-100 text-green-800"
                : consentForm.status === "pending"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {consentForm.status}
          </span>
        </p>
      </div>

      <div className="mb-6">
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Download Consent Form
        </a>
      </div>

      {consentForm.status === "pending" && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Upload Signed Form</h3>
          <div className="mt-1 flex items-center">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
              disabled={uploading}
            />
          </div>
          {uploading && <p className="mt-2 text-sm text-gray-500">Uploading...</p>}
        </div>
      )}
    </div>
  );
}
