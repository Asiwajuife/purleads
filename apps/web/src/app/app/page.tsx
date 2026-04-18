"use client";
import { useEffect, useState } from "react";
import { Mail, Users, Megaphone, MessageSquare, TrendingUp, AlertCircle, CheckCircle2, Circle, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";
import Link from "next/link";

function StatCard({ label, value, icon: Icon, glow }: any) {
  return (
    <div className="card p-6 relative overflow-hidden group">
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 15% 15%, ${glow}18, transparent 65%)` }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">{label}</p>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${glow}30`, boxShadow: `0 0 20px ${glow}25` }}>
            <Icon size={16} className="text-white/80" strokeWidth={2} />
          </div>
        </div>
        <p className="text-3xl font-bold text-white tabular-nums">{value ?? "—"}</p>
      </div>
    </div>
  );
}

function OnboardingChecklist({ stats, campaigns, inboxes, contactStats }: {
  stats: any; campaigns: any[]; inboxes: any[]; contactStats: any;
}) {
  const steps = [
    { label: "Add a sending inbox", done: inboxes.length > 0, href: "/app/settings", hint: "Connect an SMTP account to start sending emails" },
    { label: "Import leads", done: stats?.totalLeads > 0, href: "/app/leads", hint: "Upload a CSV with your target company URLs" },
    { label: "Enrich contacts", done: (contactStats?.enrichedLeads ?? 0) > 0, href: "/app/contacts", hint: "Connect Apollo, Snov, or Hunter in Settings → Enrichment Providers" },
    { label: "Create a campaign", done: campaigns.length > 0, href: "/app/campaigns", hint: "Set up email sequences for your leads" },
    { label: "Launch your first campaign", done: campaigns.some((c: any) => c.status === "RUNNING" || c.status === "COMPLETED"), href: "/app/campaigns", hint: "Send your first emails and track replies" },
  ];

  if (steps.every((s) => s.done)) return null;

  const completed = steps.filter((s) => s.done).length;
  const pct = (completed / steps.length) * 100;

  return (
    <div className="card p-6 mb-8" style={{ borderColor: "rgba(139,92,246,0.2)", background: "linear-gradient(135deg, rgba(139,92,246,0.07) 0%, rgba(255,255,255,0.04) 100%)" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-white">Getting started</h2>
          <p className="text-sm text-white/40 mt-0.5">{completed} of {steps.length} steps complete</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-28 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-bold text-brand-400 tabular-nums">{Math.round(pct)}%</span>
        </div>
      </div>
      <div className="space-y-0.5">
        {steps.map((step, i) => (
          <Link
            key={step.label}
            href={step.href}
            className={`flex items-start gap-3.5 p-3 rounded-xl transition-all ${
              step.done ? "opacity-40" : "hover:bg-white/[0.06]"
            }`}
          >
            {step.done ? (
              <CheckCircle2 size={18} className="text-brand-400 shrink-0 mt-0.5" />
            ) : (
              <div className="w-[18px] h-[18px] shrink-0 mt-0.5 rounded-full border-2 border-white/20 flex items-center justify-center">
                <span className="text-[9px] font-bold text-white/40 leading-none">{i + 1}</span>
              </div>
            )}
            <div>
              <p className={`text-sm font-medium ${step.done ? "line-through text-white/30" : "text-white/80"}`}>{step.label}</p>
              {!step.done && <p className="text-xs text-white/35 mt-0.5">{step.hint}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [inboxes, setInboxes] = useState<any[]>([]);
  const [contactStats, setContactStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wid = getWorkspaceId();
    if (!wid) return;
    Promise.all([api.emails.stats(wid), api.campaigns.list(wid), api.inboxes.list(wid), api.contacts.stats(wid)])
      .then(([s, c, i, cs]: any) => { setStats(s); setCampaigns(c); setInboxes(i); setContactStats(cs); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-white/30 text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-brand-400 animate-spin" />
          Loading dashboard…
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Your outbound performance at a glance</p>
      </div>

      <OnboardingChecklist stats={stats} campaigns={campaigns} inboxes={inboxes} contactStats={contactStats} />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Emails Sent" value={stats?.totalSent?.toLocaleString()} icon={Mail} glow="#3b82f6" />
        <StatCard label="Total Leads" value={stats?.totalLeads?.toLocaleString()} icon={Users} glow="#8b5cf6" />
        <StatCard label="Campaigns" value={stats?.totalCampaigns} icon={Megaphone} glow="#7c3aed" />
        <StatCard label="Replies" value={stats?.totalReplies} icon={MessageSquare} glow="#10b981" />
      </div>

      {/* Reply rate + enrichment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.15)", boxShadow: "0 0 24px rgba(16,185,129,0.15)" }}>
            <TrendingUp size={22} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Reply Rate</p>
            <p className="text-2xl font-bold text-white tabular-nums">{stats?.replyRate ?? "0"}%</p>
          </div>
          {stats?.totalFailed > 0 && (
            <div className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
              <AlertCircle size={14} />
              {stats.totalFailed} failed
            </div>
          )}
        </div>
        <div className="card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(139,92,246,0.15)", boxShadow: "0 0 24px rgba(139,92,246,0.15)" }}>
            <Zap size={22} className="text-brand-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Contacts Enriched</p>
            <p className="text-2xl font-bold text-white tabular-nums">{contactStats?.totalContacts?.toLocaleString() ?? "0"}</p>
          </div>
          {(contactStats?.pendingLeads ?? 0) > 0 && (
            <span className="text-xs text-amber-400 font-semibold">{contactStats.pendingLeads} pending</span>
          )}
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between">
          <h2 className="font-semibold text-white">Recent Campaigns</h2>
          <Link href="/app/campaigns" className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors tracking-wide uppercase">
            View all
          </Link>
        </div>
        {campaigns.length === 0 ? (
          <div className="px-6 py-14 text-center text-white/25 text-sm">
            No campaigns yet.{" "}
            <Link href="/app/campaigns" className="text-brand-400 hover:underline font-medium">Create your first</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="px-6 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Leads</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Steps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {campaigns.slice(0, 5).map((c: any) => (
                <tr key={c.id} className="hover:bg-white/[0.04] transition-colors">
                  <td className="px-6 py-3.5 font-medium text-white/80">
                    <Link href={`/app/campaigns/${c.id}`} className="hover:text-brand-400 transition-colors">{c.name}</Link>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`badge-${c.status.toLowerCase()}`}>{c.status}</span>
                  </td>
                  <td className="px-6 py-3.5 text-white/50">{c._count?.leads ?? 0}</td>
                  <td className="px-6 py-3.5 text-white/50">{c._count?.sequences ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
