"use client";

export function isAdmin(user) {
  return user?.role === "admin";
}

export function isCounselor(user) {
  return user?.role === "counselor";
}

export function isAuthenticated(session) {
  return !!session;
}
