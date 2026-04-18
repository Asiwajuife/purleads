"use client";
import { useEffect, useState } from "react";
import { Mail, Users, MessageSquare, AlertCircle, TrendingUp, CheckCircle, Eye, Download, ChevronDown, ChevronUp, Zap, Building2 } from "lucide-react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";

function MetricCard({ label, value, sub, icon: Icon, glow }: any) {
  return (
    <div className="card p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl" style={{ background: `linear-gradient(90deg, transparent, ${glow}60, transparent)` }} />
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${glow}25`, boxShadow: `0 0 16px ${glow}20` }}>
          <Icon size={16} className="text-white/80" strokeWidth={2} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white tabular-nums">{value ?? "—"}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

const STATUS_PILL: Record<string, string> = {
  SENT: "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/25",
  FAILED: "bg-red-400/15 text-red-300 ring-1 ring-red-400/25",
  BOUNCED: "bg-orange-400/15 text-orange-300 ring-1 ring-orange-400/25",
  PENDING: "bg-white/[0.08] text-white/40 ring-1 ring-white/10",
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [contactStats, setContactStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const wid = getWorkspaceId() || "";

  async function loadLogs(p = 1) {
    const l = await api.emails.logs(wid, p) as any;
    setLogs(l.logs || []);
    setTotal(l.total || 0);
  }

  useEffect(() => {
    if (!wid) return;
    Promise.all([api.emails.stats(wid), api.emails.logs(wid, 1), api.contacts.stats(wid)])
      .then(([s, l, cs]: any) => {
        setStats(s); setLogs(l.logs || []); setTotal(l.total || 0); setContactStats(cs);
      })
      .finally(() => setLoading(false));
  }, [wid]);

  useEffect(() => { if (wid) loadLogs(page); }, [page]);

  function exportLogs() {
    const rows = [
      ["To", "Subject", "Status", "Sent At", "Opens", "Error"],
      ...logs.map((l) => [l.to, l.subject, l.status, l.sentAt ? new Date(l.sentAt).toLocaleString() : "", l.openCount ?? 0, l.error || ""]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "email-logs.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = statusFilter === "ALL" ? logs : logs.filter((l) => l.status === statusFilter);
  const totalPages = Math.ceil(total / 50);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-white/30 text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-brand-400 animate-spin" />
          Loading analytics…
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
        <p className="text-white/40 text-sm mt-1">Workspace-wide performance overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <MetricCard label="Emails Sent" value={stats?.totalSent?.toLocaleString()} icon={CheckCircle} glow="#3b82f6" />
        <MetricCard label="Total Leads" value={stats?.totalLeads?.toLocaleString()} icon={Users} glow="#8b5cf6" />
        <MetricCard label="Reply Rate" value={`${stats?.replyRate}%`} icon={TrendingUp} glow="#10b981" sub={`${stats?.totalReplies} total replies`} />
        <MetricCard label="Open Rate" value={`${stats?.openRate}%`} icon={Eye} glow="#6366f1" sub={`${stats?.totalOpens} opens`} />
        <MetricCard label="Failed Sends" value={stats?.totalFailed} icon={AlertCircle} glow="#ef4444" />
        <MetricCard label="Active Campaigns" value={stats?.totalCampaigns} icon={Mail} glow="#7c3aed" />
      </div>

      {contactStats && (
        <div className="mb-8">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Enrichment</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Contacts Found" value={contactStats.totalContacts?.toLocaleString()} icon={Users} glow="#10b981" />
            <MetricCard label="Companies Enriched" value={contactStats.totalCompanies?.toLocaleString()} icon={Building2} glow="#14b8a6" />
            <MetricCard label="Leads Enriched" value={contactStats.enrichedLeads?.toLocaleString()} icon={Zap} glow="#8b5cf6" sub={`${contactStats.pendingLeads ?? 0} pending`} />
            <MetricCard label="Enrichment Failed" value={contactStats.failedLeads?.toLocaleString()} icon={AlertCircle} glow="#f97316" />
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between">
          <h2 className="font-semibold text-white">Email Activity</h2>
          <div className="flex items-center gap-3">
            <select className="input py-1.5 text-xs w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
              <option value="BOUNCED">Bounced</option>
              <option value="PENDING">Pending</option>
            </select>
            <button onClick={exportLogs} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5">
              <Download size={13} /> Export
            </button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-white/25 text-sm">No email activity yet</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">To</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Opens</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Sent At</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filtered.map((log: any) => (
                  <>
                    <tr
                      key={log.id}
                      className={`hover:bg-white/[0.04] cursor-pointer transition-colors ${expandedLog === log.id ? "bg-white/[0.04]" : ""}`}
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      <td className="px-6 py-3.5 text-white/80 font-medium">{log.to}</td>
                      <td className="px-6 py-3.5 text-white/50 max-w-[200px] truncate">{log.subject}</td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_PILL[log.status] || "bg-white/[0.08] text-white/40"}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-white/50 tabular-nums">{log.openCount ?? 0}</td>
                      <td className="px-6 py-3.5 text-white/30 text-xs">
                        {log.sentAt ? new Date(log.sentAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-6 py-3.5 text-right text-white/25">
                        {expandedLog === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </td>
                    </tr>
                    {expandedLog === log.id && (
                      <tr key={`${log.id}-detail`} className="bg-white/[0.03]">
                        <td colSpan={6} className="px-6 py-4 text-sm">
                          <div className="space-y-2">
                            {log.openedAt && (
                              <p className="text-white/50"><span className="font-semibold text-white/70">First opened:</span> {new Date(log.openedAt).toLocaleString()}</p>
                            )}
                            {log.error && (
                              <div className="bg-red-500/10 border border-red-400/20 rounded-xl px-4 py-3">
                                <p className="text-xs font-semibold text-red-400 mb-1">Error details</p>
                                <p className="text-xs text-red-300/80 font-mono">{log.error}</p>
                              </div>
                            )}
                            <p className="text-white/35 text-xs"><span className="font-semibold text-white/50">Created:</span> {new Date(log.createdAt).toLocaleString()}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-white/[0.07] flex items-center justify-between">
                <span className="text-sm text-white/35">Page {page} of {totalPages} ({total} total)</span>
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
