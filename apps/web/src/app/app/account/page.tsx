"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { clearSession, getWorkspaceId } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { User, Lock, LogOut, Trash2 } from "lucide-react";

function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-8 h-8 rounded-xl bg-white/[0.08] flex items-center justify-center">
        <Icon size={15} className="text-white/50" />
      </div>
      <h2 className="font-semibold text-white">{title}</h2>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    api.auth.me().then((u: any) => { setUser(u); setName(u.name || ""); });
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const updated = await api.auth.updateProfile({ name }) as any;
      setUser(updated);
      setProfileMsg({ type: "success", text: "Profile updated successfully" });
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message });
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match" }); return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "Password must be at least 8 characters" }); return;
    }
    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      await api.auth.updateProfile({ currentPassword, newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPasswordMsg({ type: "success", text: "Password changed successfully" });
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err.message });
    } finally {
      setSavingPassword(false);
    }
  }

  function logout() { clearSession(); router.replace("/auth/login"); }

  async function deleteWorkspace() {
    const wid = getWorkspaceId();
    if (!wid) return;
    const confirmed = prompt('Type "DELETE" to permanently delete this workspace and all its data:');
    if (confirmed !== "DELETE") return;
    try { await api.workspaces.delete(wid); clearSession(); router.replace("/auth/login"); }
    catch (err: any) { alert(err.message); }
  }

  function Msg({ msg }: { msg: { type: "success" | "error"; text: string } | null }) {
    if (!msg) return null;
    return (
      <p className={`text-sm font-medium ${msg.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
        {msg.text}
      </p>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Account</h1>
        <p className="text-white/40 text-sm mt-1">Manage your profile and security settings</p>
      </div>

      {/* Profile */}
      <section className="card p-6">
        <SectionHeader icon={User} title="Profile" />
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Email</label>
            <input className="input opacity-50 cursor-not-allowed" value={user?.email || ""} disabled />
            <p className="text-xs text-white/25 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Display Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
          </div>
          <Msg msg={profileMsg} />
          <button type="submit" disabled={savingProfile} className="btn-primary">
            {savingProfile ? "Saving…" : "Save Profile"}
          </button>
        </form>
      </section>

      {/* Password */}
      <section className="card p-6">
        <SectionHeader icon={Lock} title="Change Password" />
        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Current Password</label>
            <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">New Password</label>
            <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Confirm New Password</label>
            <input type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <Msg msg={passwordMsg} />
          <button type="submit" disabled={savingPassword} className="btn-primary">
            {savingPassword ? "Changing…" : "Change Password"}
          </button>
        </form>
      </section>

      {/* Sign out */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Sign Out</h2>
            <p className="text-sm text-white/40 mt-0.5">Sign out of your account on this device</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] border border-white/[0.12] text-white/60 rounded-xl hover:bg-white/[0.1] hover:text-white transition-all text-sm font-medium"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="card p-6" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
        <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl" style={{ background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)" }} />
        <h2 className="font-semibold text-red-400 mb-1">Danger Zone</h2>
        <p className="text-sm text-white/35 mb-4">
          Permanently delete this workspace and all its data. This cannot be undone.
        </p>
        <button
          onClick={deleteWorkspace}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/15 border border-red-400/25 text-red-400 rounded-xl hover:bg-red-500/25 hover:text-red-300 transition-all text-sm font-medium"
        >
          <Trash2 size={15} />
          Delete Workspace
        </button>
      </section>
    </div>
  );
}
