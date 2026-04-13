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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">New Campaign</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Q1 Outreach" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
            <input className="input" value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} placeholder="Jane from Acme" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reply-To Email</label>
            <input type="email" className="input" value={form.replyTo} onChange={(e) => setForm({ ...form, replyTo: e.target.value })} placeholder="replies@company.com" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Creating..." : "Create Campaign"}
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
    try {
      await api.campaigns.launch(wid, id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function pauseCampaign(id: string) {
    await api.campaigns.pause(wid, id);
    load();
  }

  async function deleteCampaign(id: string, name: string) {
    if (!confirm(`Delete campaign "${name}"? This cannot be undone.`)) return;
    try {
      await api.campaigns.delete(wid, id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Build and launch outbound sequences</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Campaign
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">Loading...</div>
        ) : campaigns.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Megaphone size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No campaigns yet</p>
            <p className="text-sm text-gray-400 mt-1">Create your first campaign to start sending</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left font-medium">Name</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-left font-medium">Leads</th>
                <th className="px-6 py-3 text-left font-medium">Steps</th>
                <th className="px-6 py-3 text-left font-medium">Emails</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-6 py-3">
                    <span className={`badge-${c.status.toLowerCase()}`}>{c.status}</span>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{c._count?.leads ?? 0}</td>
                  <td className="px-6 py-3 text-gray-600">{c._count?.sequences ?? 0}</td>
                  <td className="px-6 py-3 text-gray-600">{c._count?.emailLogs ?? 0}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {c.status === "DRAFT" || c.status === "PAUSED" ? (
                        <button
                          onClick={() => launchCampaign(c.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          <Play size={12} />
                          Launch
                        </button>
                      ) : c.status === "RUNNING" ? (
                        <button
                          onClick={() => pauseCampaign(c.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                        >
                          <Pause size={12} />
                          Pause
                        </button>
                      ) : null}
                      <Link
                        href={`/app/campaigns/${c.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Edit
                        <ChevronRight size={12} />
                      </Link>
                      {c.status !== "RUNNING" && (
                        <button
                          onClick={() => deleteCampaign(c.id, c.name)}
                          className="p-1.5 text-gray-400 hover:text-red-600"
                          title="Delete campaign"
                        >
                          <Trash2 size={14} />
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
