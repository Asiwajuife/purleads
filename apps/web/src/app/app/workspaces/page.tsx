"use client";
import { useEffect, useState } from "react";
import { Building2, Plus, Check } from "lucide-react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const currentId = getWorkspaceId();

  async function load() {
    const ws = await api.workspaces.list() as any[];
    setWorkspaces(ws);
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try { await api.workspaces.create(newName.trim()); setNewName(""); load(); }
    finally { setCreating(false); }
  }

  function switchTo(id: string) {
    localStorage.setItem("purleads_workspace", id);
    window.location.href = "/app";
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Workspaces</h1>
        <p className="text-white/40 text-sm mt-1">Manage companies and team environments</p>
      </div>

      <form onSubmit={create} className="flex gap-3 mb-8">
        <input
          className="input flex-1"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New workspace name"
        />
        <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2">
          <Plus size={15} />
          {creating ? "Creating…" : "Create"}
        </button>
      </form>

      <div className="space-y-3">
        {workspaces.map((ws) => (
          <div
            key={ws.id}
            className={`card p-5 flex items-center justify-between transition-all ${
              currentId === ws.id ? "border-brand-400/30" : ""
            }`}
            style={currentId === ws.id ? { background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(255,255,255,0.04))" } : {}}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", boxShadow: "0 0 16px rgba(139,92,246,0.15)" }}>
                <Building2 size={18} className="text-brand-400" />
              </div>
              <div>
                <p className="font-semibold text-white/85">{ws.name}</p>
                <p className="text-xs text-white/35 font-mono">{ws.slug}</p>
              </div>
            </div>
            {currentId === ws.id ? (
              <div className="flex items-center gap-2 text-brand-400 text-xs font-semibold">
                <Check size={14} />
                Active
              </div>
            ) : (
              <button onClick={() => switchTo(ws.id)} className="btn-secondary text-sm">Switch</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
