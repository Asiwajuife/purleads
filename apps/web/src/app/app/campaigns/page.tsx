"use client";
import { useEffect, useState } from "react";
import { Plus, Play, Pause, ChevronRight, Megaphone, Trash2 } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: any) => void }) {
  const [form, setForm] = useState({ name: "", fromName: "", replyTo: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const wid = getWorkspaceId() || "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const campaign = await api.campaigns.create(wid, form) as any;
      onCreated(campaign);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-white mb-5">New Campaign</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 px-3.5 py-2.5 rounded-xl">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-white/45 uppercase tracking-wider mb-1.5">Campaign Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Q1 Outreach" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/45 uppercase tracking-wider mb-1.5">From Name</label>
            <input className="input" value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} placeholder="Jane from Acme" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/45 uppercase tracking-wider mb-1.5">Reply-To Email</label>
            <input type="email" className="input" value={form.replyTo} onChange={(e) => setForm({ ...form, replyTo: e.target.value })} placeholder="replies@company.com" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Creating…" : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const wid = getWorkspaceId() || "";

  async function load() {
    setLoading(true);
    try {
      const res = await api.campaigns.list(wid) as any[];
      setCampaigns(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (wid) load(); }, [wid]);

  async function launchCampaign(id: string) {
    try { await api.campaigns.launch(wid, id); load(); }
    catch (err: any) { alert(err.message); }
  }

  async function pauseCampaign(id: string) {
    await api.campaigns.pause(wid, id);
    load();
  }

  async function deleteCampaign(id: string, name: string) {
    if (!confirm(`Delete campaign "${name}"? This cannot be undone.`)) return;
    try { await api.campaigns.delete(wid, id); setCampaigns((prev) => prev.filter((c) => c.id !== id)); }
    catch (err: any) { alert(err.message); }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(c) => setCampaigns((prev) => [c, ...prev])}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Campaigns</h1>
          <p className="text-white/40 text-sm mt-1">Build and launch outbound sequences</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Campaign
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="px-6 py-14 flex items-center justify-center gap-3 text-white/30 text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-brand-400 animate-spin" />
            Loading…
          </div>
        ) : campaigns.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <Megaphone size={24} className="text-white/20" />
            </div>
            <p className="text-white/50 font-medium">No campaigns yet</p>
            <p className="text-sm text-white/25 mt-1">Create your first campaign to start sending</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="px-6 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Leads</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Steps</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Emails</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.04] transition-colors">
                  <td className="px-6 py-3.5 font-medium text-white/80">{c.name}</td>
                  <td className="px-6 py-3.5">
                    <span className={`badge-${c.status.toLowerCase()}`}>{c.status}</span>
                  </td>
                  <td className="px-6 py-3.5 text-white/50">{c._count?.leads ?? 0}</td>
                  <td className="px-6 py-3.5 text-white/50">{c._count?.sequences ?? 0}</td>
                  <td className="px-6 py-3.5 text-white/50">{c._count?.emailLogs ?? 0}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      {(c.status === "DRAFT" || c.status === "PAUSED") && (
                        <button
                          onClick={() => launchCampaign(c.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30 border border-emerald-400/20 font-semibold transition-colors"
                        >
                          <Play size={11} />
                          Launch
                        </button>
                      )}
                      {c.status === "RUNNING" && (
                        <button
                          onClick={() => pauseCampaign(c.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-500/20 text-amber-300 rounded-lg hover:bg-amber-500/30 border border-amber-400/20 font-semibold transition-colors"
                        >
                          <Pause size={11} />
                          Pause
                        </button>
                      )}
                      <Link
                        href={`/app/campaigns/${c.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white/[0.08] text-white/60 rounded-lg hover:bg-white/[0.14] hover:text-white transition-colors font-medium"
                      >
                        Edit
                        <ChevronRight size={11} />
                      </Link>
                      {c.status !== "RUNNING" && (
                        <button
                          onClick={() => deleteCampaign(c.id, c.name)}
                          className="p-1.5 text-white/20 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
