"use client";
import { useState, useEffect } from "react";
import { ChevronDown, Plus, Building2 } from "lucide-react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";

export function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    api.workspaces.list().then((ws: any) => {
      setWorkspaces(ws);
      const storedId = getWorkspaceId();
      setCurrent(ws.find((w: any) => w.id === storedId) || ws[0]);
    }).catch(() => {});
  }, []);

  function switchWorkspace(ws: any) {
    localStorage.setItem("purleads_workspace", ws.id);
    setCurrent(ws);
    setOpen(false);
    window.location.reload();
  }

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const ws = await api.workspaces.create(newName) as any;
      setWorkspaces((prev) => [...prev, ws]);
      switchWorkspace(ws);
      setCreating(false);
      setNewName("");
    } catch {}
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-gray-800 transition-colors text-left"
      >
        <Building2 size={16} className="text-gray-400 shrink-0" />
        <span className="text-sm font-medium text-white truncate flex-1">
          {current?.name || "Select Workspace"}
        </span>
        <ChevronDown size={14} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => switchWorkspace(ws)}
                className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-gray-700 transition-colors ${
                  current?.id === ws.id ? "text-brand-400" : "text-gray-300"
                }`}
              >
                <Building2 size={14} />
                <span className="truncate">{ws.name}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-700">
            {creating ? (
              <form onSubmit={createWorkspace} className="p-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Workspace name"
                  className="w-full bg-gray-700 text-white text-sm rounded px-2 py-1.5 outline-none border border-gray-600 focus:border-brand-500 mb-2"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 text-xs bg-brand-600 text-white py-1.5 rounded hover:bg-brand-700">
                    Create
                  </button>
                  <button type="button" onClick={() => setCreating(false)} className="flex-1 text-xs bg-gray-600 text-white py-1.5 rounded hover:bg-gray-500">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <Plus size={14} />
                New Workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
