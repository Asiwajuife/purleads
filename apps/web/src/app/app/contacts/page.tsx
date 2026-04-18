"use client";
import { useEffect, useState } from "react";
import { Users, Search, Linkedin, Building2, Star, RefreshCw, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";

function scoreColor(score: number) {
  if (score >= 9) return "bg-purple-400/20 text-purple-300 ring-1 ring-purple-400/30";
  if (score >= 7) return "bg-blue-400/20 text-blue-300 ring-1 ring-blue-400/30";
  if (score >= 5) return "bg-indigo-400/20 text-indigo-300 ring-1 ring-indigo-400/30";
  return "bg-white/[0.08] text-white/40";
}

function scoreLabel(score: number) {
  if (score >= 9) return "C-Suite";
  if (score >= 7) return "VP / C-Level";
  if (score >= 5) return "Director";
  if (score >= 3) return "Manager";
  return "IC";
}

function initials(first?: string | null, last?: string | null, email?: string | null) {
  if (first) return (first[0] + (last?.[0] || "")).toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [triggerDomain, setTriggerDomain] = useState("");
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);
  const wid = getWorkspaceId() || "";

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  async function load() {
    if (!wid) return;
    setLoading(true);
    try {
      const [res, s] = await Promise.all([
        api.contacts.list(wid, page, 50, debouncedSearch || undefined) as any,
        api.contacts.stats(wid) as any,
      ]);
      setContacts(res.contacts || []);
      setTotal(res.total || 0);
      setStats(s);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, debouncedSearch, wid]);

  async function handleTrigger(e: React.FormEvent) {
    e.preventDefault();
    if (!triggerDomain.trim()) return;
    setTriggering(true);
    setTriggerMsg(null);
    try {
      const res = await api.enrichment.trigger(wid, triggerDomain.trim()) as any;
      setTriggerMsg(`✅ Enrichment queued for ${res.domain} (${res.leadsTagged} leads tagged)`);
      setTriggerDomain("");
      setTimeout(() => load(), 1000);
    } catch (err: any) {
      setTriggerMsg(`❌ ${err.message}`);
    } finally {
      setTriggering(false);
    }
  }

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Contacts</h1>
        <p className="text-white/40 text-sm mt-1">Decision-makers discovered via enrichment</p>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Contacts", value: stats.totalContacts, color: "#8b5cf6" },
            { label: "Companies Enriched", value: stats.totalCompanies, color: "#3b82f6" },
            { label: "Leads Enriched", value: stats.enrichedLeads, color: "#10b981" },
            { label: "Pending", value: stats.pendingLeads, color: "#f59e0b" },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl" style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
              <p className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-2">{label}</p>
              <p className="text-2xl font-bold text-white tabular-nums">{value?.toLocaleString() ?? "0"}</p>
            </div>
          ))}
        </div>
      )}

      {/* Manual enrichment */}
      <div className="card p-5 mb-6">
        <p className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
          <Zap size={15} className="text-brand-400" />
          Trigger Manual Enrichment
        </p>
        <form onSubmit={handleTrigger} className="flex gap-3">
          <input
            type="text"
            className="input flex-1"
            placeholder="e.g. stripe.com"
            value={triggerDomain}
            onChange={(e) => setTriggerDomain(e.target.value)}
          />
          <button type="submit" disabled={triggering || !triggerDomain.trim()} className="btn-primary text-sm">
            {triggering ? "Queuing…" : "Enrich Domain"}
          </button>
        </form>
        {triggerMsg && (
          <p className={`mt-2.5 text-xs font-medium ${triggerMsg.startsWith("❌") ? "text-red-400" : "text-emerald-400"}`}>
            {triggerMsg}
          </p>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
        <input
          type="text"
          className="input pl-10"
          placeholder="Search by name, email, title, or company…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="px-6 py-14 flex items-center justify-center gap-3 text-white/30 text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-brand-400 animate-spin" />
            Loading contacts…
          </div>
        ) : contacts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <Users size={24} className="text-white/20" />
            </div>
            <p className="text-white/50 font-medium">
              {debouncedSearch ? "No contacts match your search" : "No contacts yet"}
            </p>
            <p className="text-sm text-white/25 mt-1">
              {debouncedSearch ? "Try a different search term" : "Upload leads or trigger enrichment to discover decision-makers"}
            </p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Contact</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Title</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Company</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Seniority</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Confidence</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {contacts.map((c: any) => {
                  const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.04] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600/60 to-brand-800/40 border border-brand-400/20 flex items-center justify-center text-xs font-bold text-white/80 shrink-0">
                            {initials(c.firstName, c.lastName, c.email)}
                          </div>
                          <div>
                            <div className="font-medium text-white/80">{name}</div>
                            <div className="text-xs text-white/35 font-mono">{c.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-white/55">{c.jobTitle || "—"}</td>
                      <td className="px-5 py-3.5">
                        {c.company ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0">
                              <Building2 size={11} className="text-white/40" />
                            </div>
                            <div>
                              <div className="text-white/70 font-medium text-xs">{c.company.name || c.company.domain}</div>
                              {c.company.industry && <div className="text-xs text-white/30">{c.company.industry}</div>}
                            </div>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${scoreColor(c.score)}`}>
                          <Star size={9} />
                          {scoreLabel(c.score)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {c.confidenceScore != null ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-16 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                style={{ width: `${Math.round(c.confidenceScore * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-white/45 tabular-nums">{Math.round(c.confidenceScore * 100)}%</span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {c.linkedinUrl ? (
                          <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400/60 hover:text-blue-300 transition-colors">
                            <Linkedin size={15} />
                          </a>
                        ) : <span className="text-white/15">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-white/[0.07] flex items-center justify-between">
                <span className="text-sm text-white/35">{total.toLocaleString()} contacts · Page {page} of {totalPages}</span>
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
