const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getHeaders(workspaceId?: string): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("purleads_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (workspaceId) headers["x-workspace-id"] = workspaceId;
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}, workspaceId?: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: { ...getHeaders(workspaceId), ...(options.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Request failed");
  }
  return res.json();
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    register: (data: { name: string; email: string; password: string }) =>
      request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request<{ token: string; user: any; workspaces: string[] }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    me: () => request("/auth/me"),
    updateProfile: (data: { name?: string; currentPassword?: string; newPassword?: string }) =>
      request("/auth/profile", { method: "PATCH", body: JSON.stringify(data) }),
  },

  workspaces: {
    list: () => request<any[]>("/workspaces"),
    create: (name: string) => request("/workspaces", { method: "POST", body: JSON.stringify({ name }) }),
    get: (id: string) => request(`/workspaces/${id}`),
    delete: (id: string) => request(`/workspaces/${id}`, { method: "DELETE" }),
    members: {
      list: (wid: string) => request<any[]>(`/workspaces/${wid}/members`),
      remove: (wid: string, userId: string) => request(`/workspaces/${wid}/members/${userId}`, { method: "DELETE" }),
    },
    invites: {
      list: (wid: string) => request<any[]>(`/workspaces/${wid}/invites`),
      create: (wid: string, email: string, role?: string) =>
        request(`/workspaces/${wid}/invites`, { method: "POST", body: JSON.stringify({ email, role }) }),
      revoke: (wid: string, inviteId: string) =>
        request(`/workspaces/${wid}/invites/${inviteId}`, { method: "DELETE" }),
    },
  },

  invites: {
    get: (token: string) => request<any>(`/invites/${token}`),
    accept: (token: string) => request(`/invites/${token}/accept`, { method: "POST" }),
  },

  leads: {
    list: (wid: string, page = 1, limit = 50) =>
      request<any>(`/leads?page=${page}&limit=${limit}`, {}, wid),
    create: (wid: string, data: any) =>
      request("/leads", { method: "POST", body: JSON.stringify(data) }, wid),
    uploadCsv: (wid: string, file: File) => {
      const token = localStorage.getItem("purleads_token");
      const form = new FormData();
      form.append("file", file);
      return fetch(`${API_BASE}/api/leads/upload-csv`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-workspace-id": wid,
        },
        body: form,
      }).then((r) => r.json());
    },
    delete: (wid: string, id: string) =>
      request(`/leads/${id}`, { method: "DELETE" }, wid),
  },

  campaigns: {
    list: (wid: string) => request<any[]>("/campaigns", {}, wid),
    create: (wid: string, data: any) =>
      request("/campaigns", { method: "POST", body: JSON.stringify(data) }, wid),
    get: (wid: string, id: string) => request<any>(`/campaigns/${id}`, {}, wid),
    addLeads: (wid: string, id: string, leadIds: string[]) =>
      request(`/campaigns/${id}/leads`, { method: "POST", body: JSON.stringify({ leadIds }) }, wid),
    launch: (wid: string, id: string) =>
      request(`/campaigns/${id}/launch`, { method: "POST" }, wid),
    pause: (wid: string, id: string) =>
      request(`/campaigns/${id}/pause`, { method: "PATCH" }, wid),
    delete: (wid: string, id: string) =>
      request(`/campaigns/${id}`, { method: "DELETE" }, wid),
    schedule: (wid: string, id: string, scheduledAt: string) =>
      request(`/campaigns/${id}/schedule`, { method: "POST", body: JSON.stringify({ scheduledAt }) }, wid),
    stats: (wid: string, id: string) => request<any>(`/campaigns/${id}/stats`, {}, wid),
  },

  sequences: {
    list: (wid: string, campaignId: string) =>
      request<any[]>(`/campaigns/${campaignId}/sequences`, {}, wid),
    create: (wid: string, campaignId: string, data: any) =>
      request(`/campaigns/${campaignId}/sequences`, { method: "POST", body: JSON.stringify(data) }, wid),
    delete: (wid: string, campaignId: string, id: string) =>
      request(`/campaigns/${campaignId}/sequences/${id}`, { method: "DELETE" }, wid),
  },

  inboxes: {
    list: (wid: string) => request<any[]>("/inboxes", {}, wid),
    create: (wid: string, data: any) =>
      request("/inboxes", { method: "POST", body: JSON.stringify(data) }, wid),
    delete: (wid: string, id: string) =>
      request(`/inboxes/${id}`, { method: "DELETE" }, wid),
  },

  domains: {
    list: (wid: string) => request<any[]>("/domains", {}, wid),
    create: (wid: string, name: string) =>
      request("/domains", { method: "POST", body: JSON.stringify({ name }) }, wid),
  },

  emails: {
    logs: (wid: string, page = 1) => request<any>(`/emails/logs?page=${page}`, {}, wid),
    stats: (wid: string) => request<any>("/emails/stats", {}, wid),
  },

  replies: {
    list: (wid: string, page = 1) => request<any>(`/replies?page=${page}`, {}, wid),
  },

  webhooks: {
    list: (wid: string) => request<any[]>("/webhooks", {}, wid),
    create: (wid: string, data: { url: string; events: string[] }) =>
      request("/webhooks", { method: "POST", body: JSON.stringify(data) }, wid),
    delete: (wid: string, id: string) =>
      request(`/webhooks/${id}`, { method: "DELETE" }, wid),
  },

  contacts: {
    list: (wid: string, page = 1, limit = 50, search?: string) => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      return request<any>(`/contacts?${params}`, {}, wid);
    },
    stats: (wid: string) => request<any>("/contacts/stats", {}, wid),
    byCompany: (wid: string, companyId: string) =>
      request<any[]>(`/contacts/by-company/${companyId}`, {}, wid),
  },

  companies: {
    list: (wid: string, page = 1, limit = 50, search?: string) => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      return request<any>(`/companies?${params}`, {}, wid);
    },
    get: (wid: string, id: string) => request<any>(`/companies/${id}`, {}, wid),
  },

  enrichment: {
    trigger: (wid: string, domain: string) =>
      request<any>("/enrichment/trigger", { method: "POST", body: JSON.stringify({ domain }) }, wid),
    status: (wid: string) => request<any>("/enrichment/status", {}, wid),
    providers: {
      list: (wid: string) => request<any[]>("/enrichment/providers", {}, wid),
      upsert: (wid: string, data: { name: string; displayName: string; credentials: Record<string, string> }) =>
        request<any>("/enrichment/providers", { method: "POST", body: JSON.stringify(data) }, wid),
      delete: (wid: string, name: string) =>
        request<any>(`/enrichment/providers/${encodeURIComponent(name)}`, { method: "DELETE" }, wid),
    },
  },
};
