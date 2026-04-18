"use client";
import { useEffect, useState, useRef } from "react";
import { Upload, Trash2, Search, Download, Zap, RefreshCw, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";

const STATUS_PILL: Record<string, string> = {
  ACTIVE: "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/25",
  REPLIED: "bg-blue-400/15 text-blue-300 ring-1 ring-blue-400/25",
  BOUNCED: "bg-red-400/15 text-red-300 ring-1 ring-red-400/25",
  UNSUBSCRIBED: "bg-white/[0.08] text-white/40 ring-1 ring-white/10",
};

const ENRICH_PILL: Record<string, string> = {
  NONE: "bg-white/[0.06] text-white/30",
  PENDING: "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/25",
  ENRICHED: "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/25",
  FAILED: "bg-red-400/15 text-red-300 ring-1 ring-red-400/25",
};

const ENRICH_LABELS: Record<string, string> = {
  NONE: "—", PENDING: "Enriching…", ENRICHED: "Enriched", FAILED: "Failed",
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
  const [enrichingDomain, setEnrichingDomain] = useState<string | null>(null);
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
      const enrichMsg = res.domainsQueued > 0
        ? ` · ${res.domainsQueued} domain${res.domainsQueued !== 1 ? "s" : ""} queued for enrichment`
        : "";
      setUploadResult(`✅ Imported ${res.imported} leads (${res.skipped} skipped)${enrichMsg}`);
      load();
    } catch (err: any) {
      setUploadResult(`❌ ${err.message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function triggerEnrich(domain: string) {
    if (!domain || enrichingDomain) return;
    setEnrichingDomain(domain);
    try {
      const res = await api.enrichment.trigger(wid, domain) as any;
      setUploadResult(`🔍 Enrichment queued for ${domain} (${res.leadsTagged} leads tagged)`);
      setTimeout(() => load(), 800);
    } catch (err: any) {
      setUploadResult(`❌ Enrichment failed: ${err.message}`);
    } finally {
      setEnrichingDomain(null);
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
      ["Email", "First Name", "Last Name", "Company", "Title", "Website", "Phone", "Status", "Enrichment"],
      ...filtered.map((l) => [l.email, l.firstName || "", l.lastName || "", l.company || "", l.title || "", l.website || "", l.phone || "", l.status, l.enrichmentStatus || "NONE"]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "leads.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleSelectAll() {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((l) => l.id)));
  }

  function getDomain(lead: any): string | null {
    if (lead.website) {
      try {
        const url = lead.website.startsWith("http") ? lead.website : `https://${lead.website}`;
        return new URL(url).hostname.replace(/^www\./, "");
      } catch {}
    }
    if (lead.email?.includes("@")) {
      const d = lead.email.split("@")[1];
      const pub = new Set(["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"]);
      if (d && !pub.has(d)) return d;
    }
    return null;
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Leads</h1>
          <p className="text-white/40 text-sm mt-1">{total.toLocaleString()} total leads</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCsv} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={15} /> Export
          </button>
          {selected.size > 0 && (
            <button onClick={bulkDelete} disabled={bulkDeleting} className="btn-danger flex items-center gap-2 text-sm">
              <Trash2 size={14} />
              {bulkDeleting ? "Deleting…" : `Delete ${selected.size}`}
            </button>
          )}
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {uploading ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? "Importing…" : "Import CSV"}
          </button>
        </div>
      </div>

      {/* CSV hint */}
      <div className="mb-5 px-4 py-3 rounded-xl bg-blue-500/[0.1] border border-blue-400/20 text-xs text-blue-300">
        <strong>Required CSV column:</strong> <code className="font-mono bg-blue-400/20 px-1.5 py-0.5 rounded text-blue-200">company_url</code>
        &nbsp;·&nbsp;Decision makers are automatically discovered and enriched. Emails are sent to DM1 with DM2 CC'd.
      </div>

      {uploadResult && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${
          uploadResult.startsWith("❌")
            ? "bg-red-500/10 border-red-400/20 text-red-300"
            : "bg-emerald-500/10 border-emerald-400/20 text-emerald-300"
        }`}>
          {uploadResult}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            type="text"
            className="input pl-10 text-sm"
            placeholder="Search leads…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="REPLIED">Replied</option>
          <option value="BOUNCED">Bounced</option>
          <option value="UNSUBSCRIBED">Unsubscribed</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="px-6 py-14 flex items-center justify-center gap-3 text-white/30 text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-brand-400 animate-spin" />
            Loading leads…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <Upload size={24} className="text-white/20" />
            </div>
            <p className="text-white/50 font-medium">No leads found</p>
            <p className="text-sm text-white/25 mt-1">Upload a CSV to get started</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  <th className="px-5 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="rounded border-white/20 bg-white/[0.06]"
                    />
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Company / Lead</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Enrichment</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filtered.map((lead) => {
                  const domain = getDomain(lead);
                  return (
                    <tr key={lead.id} className={`hover:bg-white/[0.04] transition-colors ${selected.has(lead.id) ? "bg-brand-500/[0.06]" : ""}`}>
                      <td className="px-5 py-3.5">
                        <input
                          type="checkbox"
                          checked={selected.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded border-white/20 bg-white/[0.06]"
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-white/80">
                          {lead.company || lead.website || "—"}
                        </div>
                        {lead.firstName && (
                          <div className="text-xs text-white/35 mt-0.5">
                            {[lead.firstName, lead.lastName].filter(Boolean).join(" ")}
                            {lead.title ? ` · ${lead.title}` : ""}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-white/50 text-xs font-mono">{lead.email || "—"}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_PILL[lead.status] || "bg-white/[0.08] text-white/40"}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ENRICH_PILL[lead.enrichmentStatus || "NONE"]}`}>
                          {ENRICH_LABELS[lead.enrichmentStatus || "NONE"]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 justify-end">
                          {domain && lead.enrichmentStatus === "NONE" && (
                            <button
                              onClick={() => triggerEnrich(domain)}
                              disabled={enrichingDomain === domain}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-brand-500/20 text-brand-300 rounded-lg hover:bg-brand-500/30 transition-colors font-medium border border-brand-400/20"
                              title={`Enrich ${domain}`}
                            >
                              <Zap size={11} />
                              {enrichingDomain === domain ? "Queuing…" : "Enrich"}
                            </button>
                          )}
                          <button
                            onClick={() => deleteLead(lead.id)}
                            className="p-1.5 text-white/20 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-white/[0.07] flex items-center justify-between">
                <span className="text-sm text-white/35">{total.toLocaleString()} leads · Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs px-3 py-1.5">Prev</button>
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
