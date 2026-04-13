"use client";
import { useEffect, useState } from "react";
import { Mail, Users, MessageSquare, AlertCircle, TrendingUp, CheckCircle, Eye, Download, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";

function MetricCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value ?? "—"}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  SENT: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  BOUNCED: "bg-orange-100 text-orange-700",
  PENDING: "bg-gray-100 text-gray-600",
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
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
    Promise.all([api.emails.stats(wid), api.emails.logs(wid, 1)])
      .then(([s, l]: any) => {
        setStats(s);
        setLogs(l.logs || []);
        setTotal(l.total || 0);
      })
      .finally(() => setLoading(false));
  }, [wid]);

  useEffect(() => {
    if (wid) loadLogs(page);
  }, [page]);

  function exportLogs() {
    const rows = [
      ["To", "Subject", "Status", "Sent At", "Opens", "Error"],
      ...logs.map((l) => [
        l.to, l.subject, l.status,
        l.sentAt ? new Date(l.sentAt).toLocaleString() : "",
        l.openCount ?? 0,
        l.error || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "email-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = statusFilter === "ALL" ? logs : logs.filter((l) => l.status === statusFilter);
  const totalPages = Math.ceil(total / 50);

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Workspace-wide performance overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <MetricCard label="Emails Sent" value={stats?.totalSent?.toLocaleString()} icon={CheckCircle} color="bg-blue-500" />
        <MetricCard label="Total Leads" value={stats?.totalLeads?.toLocaleString()} icon={Users} color="bg-purple-500" />
        <MetricCard label="Reply Rate" value={`${stats?.replyRate}%`} icon={TrendingUp} color="bg-green-500" sub={`${stats?.totalReplies} total replies`} />
        <MetricCard label="Open Rate" value={`${stats?.openRate}%`} icon={Eye} color="bg-indigo-500" sub={`${stats?.totalOpens} opens`} />
        <MetricCard label="Failed Sends" value={stats?.totalFailed} icon={AlertCircle} color="bg-red-500" />
        <MetricCard label="Active Campaigns" value={stats?.totalCampaigns} icon={Mail} color="bg-brand-600" />
      </div>

      {/* Email log table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Email Activity</h2>
          <div className="flex items-center gap-3">
            <select
              className="input py-1.5 text-xs pr-7"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
              <option value="BOUNCED">Bounced</option>
              <option value="PENDING">Pending</option>
            </select>
            <button onClick={exportLogs} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5">
              <Download size={13} />
              Export
            </button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">No email activity yet</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left font-medium">To</th>
                  <th className="px-6 py-3 text-left font-medium">Subject</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                  <th className="px-6 py-3 text-left font-medium">Opens</th>
                  <th className="px-6 py-3 text-left font-medium">Sent At</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((log: any) => (
                  <>
                    <tr
                      key={log.id}
                      className={`hover:bg-gray-50 cursor-pointer ${expandedLog === log.id ? "bg-gray-50" : ""}`}
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      <td className="px-6 py-3 text-gray-900 font-medium">{log.to}</td>
                      <td className="px-6 py-3 text-gray-600 max-w-[200px] truncate">{log.subject}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[log.status] || "bg-gray-100 text-gray-600"}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{log.openCount ?? 0}</td>
                      <td className="px-6 py-3 text-gray-500 text-xs">
                        {log.sentAt ? new Date(log.sentAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-400">
                        {expandedLog === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </td>
                    </tr>
                    {expandedLog === log.id && (
                      <tr key={`${log.id}-detail`} className="bg-gray-50">
                        <td colSpan={6} className="px-6 py-4 text-sm">
                          <div className="space-y-2">
                            {log.openedAt && (
                              <p className="text-gray-600"><span className="font-medium text-gray-700">First opened:</span> {new Date(log.openedAt).toLocaleString()}</p>
                            )}
                            {log.error && (
                              <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                                <p className="text-xs font-medium text-red-700 mb-1">Error details:</p>
                                <p className="text-xs text-red-600 font-mono">{log.error}</p>
                              </div>
                            )}
                            <p className="text-gray-600 text-xs"><span className="font-medium text-gray-700">Created:</span> {new Date(log.createdAt).toLocaleString()}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">Page {page} of {totalPages} ({total} total)</span>
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
