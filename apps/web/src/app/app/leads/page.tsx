"use client";
import { useEffect, useState, useRef } from "react";
import { Upload, UserPlus, Trash2, Search, Download, Filter } from "lucide-react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  REPLIED: "bg-blue-100 text-blue-700",
  BOUNCED: "bg-red-100 text-red-700",
  UNSUBSCRIBED: "bg-gray-100 text-gray-600",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const wid = getWorkspaceId() || "";

  async function load() {
    setLoading(true);
    try {
      const res = await api.leads.list(wid, page, 50) as any;
      setLeads(res.leads);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (wid) load(); }, [page, wid]);

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const res = await api.leads.uploadCsv(wid, file) as any;
      setUploadResult(`✅ Imported ${res.imported} leads (${res.skipped} skipped)`);
      load();
    } catch (err: any) {
      setUploadResult(`❌ ${err.message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function deleteLead(id: string) {
    if (!confirm("Delete this lead?")) return;
    await api.leads.delete(wid, id);
    load();
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} selected leads?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selected).map((id) => api.leads.delete(wid, id)));
      setSelected(new Set());
      load();
    } finally {
      setBulkDeleting(false);
    }
  }

  function exportCsv() {
    const rows = [
      ["Email", "First Name", "Last Name", "Company", "Title", "Website", "Phone", "Status"],
      ...filtered.map((l) => [
        l.email, l.firstName || "", l.lastName || "",
        l.company || "", l.title || "", l.website || "",
        l.phone || "", l.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((l) => l.id)));
    }
  }

  const filtered = leads.filter((l) => {
    const matchesSearch = !search ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      l.company?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">{total.toLocaleString()} total leads</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCsv} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={15} />
            Export CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-secondary flex items-center gap-2"
          >
            <Upload size={16} />
            {uploading ? "Uploading..." : "Upload CSV"}
          </button>
        </div>
      </div>

      {uploadResult && (
        <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700">
          {uploadResult}
        </div>
      )}

      <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
        <strong>CSV columns:</strong> email, firstName, lastName, company, title, website, phone
      </div>

      {/* Search + Filter bar */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search by email, name, or company..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelected(new Set()); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-gray-400" />
          <select
            className="input py-2 pr-8 text-sm"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setSelected(new Set()); }}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="REPLIED">Replied</option>
            <option value="BOUNCED">Bounced</option>
            <option value="UNSUBSCRIBED">Unsubscribed</option>
          </select>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 px-4 py-2 bg-brand-50 border border-brand-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-brand-700 font-medium">{selected.size} lead{selected.size !== 1 ? "s" : ""} selected</span>
          <button
            onClick={bulkDelete}
            disabled={bulkDeleting}
            className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 font-medium"
          >
            <Trash2 size={14} />
            {bulkDeleting ? "Deleting..." : "Delete selected"}
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <UserPlus size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">
              {search || statusFilter !== "ALL" ? "No leads match your filters" : "No leads yet"}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {search || statusFilter !== "ALL" ? "Try adjusting your search or filter" : "Upload a CSV to get started"}
            </p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Company</th>
                  <th className="px-4 py-3 text-left font-medium">Title</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((lead) => (
                  <tr key={lead.id} className={`hover:bg-gray-50 ${selected.has(lead.id) ? "bg-brand-50" : ""}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{lead.email}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lead.company || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{lead.title || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status] || "bg-gray-100 text-gray-600"}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteLead(lead.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs px-3 py-1.5">Previous</button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-xs px-3 py-1.5">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
