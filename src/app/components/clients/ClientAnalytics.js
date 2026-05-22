"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function ClientAnalytics({ clientId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [clientId]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/analytics`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      const data = await response.json();
      console.log("Analytics data:", data);
      console.log("Risk levels data:", data.riskLevels);
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Custom tooltip component with a fun twist
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-blue-200 rounded shadow-lg">
          <p className="font-medium text-blue-600">{formatDate(label)}</p>
          <p className="text-gray-700">{`${payload[0].name}: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  const getGoalStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "achieved":
        return "bg-green-100 text-green-800";
      case "in progress":
        return "bg-yellow-100 text-yellow-800";
      case "partially achieved":
        return "bg-blue-100 text-blue-800";
      case "not started":
        return "bg-gray-100 text-gray-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-purple-100 text-purple-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "on track":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-gray-600 flex items-center gap-2">
        <span className="animate-spin">⏳</span> Crunching the numbers...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 flex items-center gap-2">
        <span className="text-xl">⚠️</span> Oops! {error}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-blue-100 p-4 rounded-lg flex items-center gap-2">
        <span className="text-2xl">📊</span>
        <p className="text-blue-700 text-sm">
          No analytics yet! Let&apos;s get some data flowing to see the magic.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-white to-blue-50 p-6 rounded-xl shadow-lg border border-blue-100 space-y-6">
        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mood Trends Chart */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-xl">😊</span> Mood Vibes
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.moodTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10 }} />
                  <YAxis domain={[1, 10]} width={30} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="mood"
                    stroke="#8884d8"
                    name="Mood Rating"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Level Trends */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-xl">🚨</span> Symptoms
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.treatmentProgress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 10]} width={30} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-2 border border-blue-200 rounded shadow-lg">
                            <p className="font-medium text-blue-600">{formatDate(label)}</p>
                            <p className="text-gray-700">
                              Severity: {payload[0].payload.metrics?.symptomSeverity || 0}/10
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="metrics.symptomSeverity"
                    stroke="#9333ea"
                    name="Symptom Severity"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#9333ea" }}
                    activeDot={{ r: 6, fill: "#9333ea" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Level Charts */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="border-b pb-2 mb-4">
              <h3 className="text-lg font-semibold">Risk Analysis</h3>
            </div>
            <div className="space-y-6">
              {/* Assessment Risk Level */}
              <div>
                <h4 className="text-sm font-medium mb-2">Assessment Risk Level</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={analytics.riskLevels}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10 }} />
                    <YAxis
                      domain={[0, 4]}
                      width={40}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => {
                        const labels = {
                          0: "None",
                          1: "Low",
                          2: "Mod",
                          3: "High",
                          4: "Sev",
                        };
                        return labels[value] || value;
                      }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-2 border border-blue-200 rounded shadow-lg">
                              <p className="font-medium text-blue-600">{formatDate(label)}</p>
                              <p className="text-gray-700">
                                Risk Level: {payload[0].payload.levelText || "Unknown"}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="level"
                      stroke="#ff7300"
                      name="Risk Level"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#ff7300" }}
                      activeDot={{ r: 6, fill: "#ff7300" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Progress Risk Level */}
              <div>
                <h4 className="text-sm font-medium mb-2">Progress Risk Level</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={analytics.treatmentProgress}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 10]} width={40} tick={{ fontSize: 10 }} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-2 border border-blue-200 rounded shadow-lg">
                              <p className="font-medium text-blue-600">{formatDate(label)}</p>
                              <p className="text-gray-700">
                                Risk Level: {payload[0].payload.metrics?.riskLevel || 0}/10
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="metrics.riskLevel"
                      stroke="#4f46e5"
                      name="Risk Level"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#4f46e5" }}
                      activeDot={{ r: 6, fill: "#4f46e5" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          {/* Treatment Progress */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="border-b pb-2 mb-4">
              <h3 className="text-lg font-semibold">Treatment Progress</h3>
            </div>
            <div>
              {analytics.treatmentProgress?.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">Overall Progress</p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{
                            width: `${
                              analytics.treatmentProgress[analytics.treatmentProgress.length - 1]
                                ?.metrics?.overallProgress || 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-500">
                        {analytics.treatmentProgress[analytics.treatmentProgress.length - 1]
                          ?.metrics?.overallProgress || 0}
                        %
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">Treatment Adherence</p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-green-600 h-2.5 rounded-full"
                          style={{
                            width: `${
                              analytics.treatmentProgress[analytics.treatmentProgress.length - 1]
                                ?.metrics?.treatmentAdherence || 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-500">
                        {analytics.treatmentProgress[analytics.treatmentProgress.length - 1]
                          ?.metrics?.treatmentAdherence || 0}
                        %
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">No progress data available</p>
              )}
            </div>
            <div className="space-y-4">
              <h3 className="font-medium">Latest Goals</h3>
              {analytics.treatmentProgress[analytics.treatmentProgress.length - 1]?.goals?.map(
                (goal, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm">{goal.goal}</p>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${getGoalStatusColor(
                          goal.status
                        )}`}
                      >
                        {goal.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{goal.notes}</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
