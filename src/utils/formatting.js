// Format date to readable string
export const formatDate = (dateString) => {
  if (!dateString) return "Not specified";
  try {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
};

// Format duration in minutes to readable string
export const formatDuration = (minutes) => {
  if (!minutes) return "Not specified";
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours} hour${hours > 1 ? "s" : ""} and ${remainingMinutes} minute${
        remainingMinutes > 1 ? "s" : ""
      }`
    : `${hours} hour${hours > 1 ? "s" : ""}`;
};

// Get status badge color classes
export const getStatusBadgeColor = (status) => {
  switch (status?.toLowerCase()) {
    case "scheduled":
      return "bg-blue-100 text-blue-800";
    case "in-progress":
      return "bg-yellow-100 text-yellow-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-gray-100 text-gray-800";
    case "no-show":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Get risk level color classes
export const getRiskLevelColor = (riskLevel) => {
  switch (riskLevel?.toLowerCase()) {
    case "low":
      return "text-green-600";
    case "moderate":
      return "text-yellow-600";
    case "high":
      return "text-orange-600";
    case "severe":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
};

// Get progress status color classes
export const getProgressStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "improving":
      return "text-green-600";
    case "stable":
      return "text-blue-600";
    case "declining":
      return "text-red-600";
    case "unchanged":
      return "text-gray-600";
    default:
      return "text-gray-600";
  }
};
