"use client";
import { useEffect, useState } from "react";
import { Building2, Plus } from "lucide-react";
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
    try {
      await api.workspaces.create(newName.trim());
      setNewName("");
      load();
    } finally {
      setCreating(false);
    }
  }

  function switchTo(id: string) {
    localStorage.setItem("purleads_workspace", id);
    window.location.href = "/app";
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
        <p className="text-sm text-gray-500 mt-1">Manage companies and team environments</p>
      </div>

      <form onSubmit={create} className="flex gap-3 mb-6">
        <input
          className="input flex-1"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New workspace name"
        />
        <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2">
          <Plus size={15} />
          {creating ? "Creating..." : "Create"}
        </button>
      </form>

      <div className="space-y-3">
        {workspaces.map((ws) => (
          <div
            key={ws.id}
            className={`card p-5 flex items-center justify-between ${currentId === ws.id ? "ring-2 ring-brand-500" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                <Building2 size={18} className="text-brand-700" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{ws.name}</p>
                <p className="text-xs text-gray-400">{ws.slug}</p>
              </div>
            </div>
            {currentId === ws.id ? (
              <span className="text-xs font-medium text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full">Active</span>
            ) : (
              <button onClick={() => switchTo(ws.id)} className="btn-secondary text-sm">Switch</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
