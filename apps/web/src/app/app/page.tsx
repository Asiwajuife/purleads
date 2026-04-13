"use client";
import { useEffect, useState } from "react";
import { Mail, Users, Megaphone, MessageSquare, TrendingUp, AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";
import Link from "next/link";

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value ?? "—"}</p>
    </div>
  );
}

function OnboardingChecklist({ stats, campaigns, inboxes }: { stats: any; campaigns: any[]; inboxes: any[] }) {
  const steps = [
    {
      label: "Add a sending inbox",
      done: inboxes.length > 0,
      href: "/app/settings",
      hint: "Connect an SMTP account to start sending emails",
    },
    {
      label: "Import leads",
      done: stats?.totalLeads > 0,
      href: "/app/leads",
      hint: "Upload a CSV with your target contacts",
    },
    {
      label: "Create a campaign",
      done: campaigns.length > 0,
      href: "/app/campaigns",
      hint: "Set up email sequences for your leads",
    },
    {
      label: "Launch your first campaign",
      done: campaigns.some((c: any) => c.status === "RUNNING" || c.status === "COMPLETED"),
      href: "/app/campaigns",
      hint: "Send your first emails and track replies",
    },
  ];

  const allDone = steps.every((s) => s.done);
  if (allDone) return null;

  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="card p-6 mb-8 border-brand-200 border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900">Getting started</h2>
          <p className="text-sm text-gray-500 mt-0.5">{completed} of {steps.length} steps complete</p>
        </div>
        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all"
            style={{ width: `${(completed / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <div className="space-y-3">
        {steps.map((step) => (
          <Link key={step.label} href={step.href} className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${step.done ? "opacity-60" : "hover:bg-gray-50"}`}>
            {step.done
              ? <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
              : <Circle size={18} className="text-gray-300 shrink-0 mt-0.5" />
            }
            <div>
              <p className={`text-sm font-medium ${step.done ? "line-through text-gray-400" : "text-gray-900"}`}>{step.label}</p>
              {!step.done && <p className="text-xs text-gray-500 mt-0.5">{step.hint}</p>}
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wid = getWorkspaceId();
    if (!wid) return;
    Promise.all([api.emails.stats(wid), api.campaigns.list(wid), api.inboxes.list(wid)])
      .then(([s, c, i]: any) => {
        setStats(s);
        setCampaigns(c);
        setInboxes(i);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Your outbound performance at a glance</p>
      </div>

      <OnboardingChecklist stats={stats} campaigns={campaigns} inboxes={inboxes} />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Emails Sent" value={stats?.totalSent?.toLocaleString()} icon={Mail} color="bg-blue-500" />
        <StatCard label="Total Leads" value={stats?.totalLeads?.toLocaleString()} icon={Users} color="bg-purple-500" />
        <StatCard label="Campaigns" value={stats?.totalCampaigns} icon={Megaphone} color="bg-brand-600" />
        <StatCard label="Replies" value={stats?.totalReplies} icon={MessageSquare} color="bg-green-500" />
      </div>

      {/* Reply rate card */}
      <div className="card p-6 mb-8 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
          <TrendingUp size={22} className="text-green-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">Reply Rate</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.replyRate ?? "0"}%</p>
        </div>
        {stats?.totalFailed > 0 && (
          <div className="ml-auto flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle size={16} />
            {stats.totalFailed} failed deliveries
          </div>
        )}
      </div>

      {/* Recent Campaigns */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Campaigns</h2>
          <Link href="/app/campaigns" className="text-sm text-brand-600 hover:underline">View all</Link>
        </div>
        {campaigns.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            No campaigns yet. <Link href="/app/campaigns" className="text-brand-600 hover:underline">Create your first</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="px-6 py-3 text-left font-medium">Name</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-left font-medium">Leads</th>
                <th className="px-6 py-3 text-left font-medium">Steps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.slice(0, 5).map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">
                    <Link href={`/app/campaigns/${c.id}`} className="hover:text-brand-600">{c.name}</Link>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`badge-${c.status.toLowerCase()}`}>{c.status}</span>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{c._count?.leads ?? 0}</td>
                  <td className="px-6 py-3 text-gray-600">{c._count?.sequences ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
