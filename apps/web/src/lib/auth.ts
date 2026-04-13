"use client";

export function saveSession(token: string, workspaceId: string) {
  localStorage.setItem("purleads_token", token);
  localStorage.setItem("purleads_workspace", workspaceId);
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("purleads_token");
}

export function getWorkspaceId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("purleads_workspace");
}

export function clearSession() {
  localStorage.removeItem("purleads_token");
  localStorage.removeItem("purleads_workspace");
}

export function isLoggedIn() {
  return !!getToken();
}
