"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { clearSession, getWorkspaceId } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { User, Lock, LogOut, Trash2 } from "lucide-react";

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
    api.auth.me().then((u: any) => {
      setUser(u);
      setName(u.name || "");
    });
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
      setPasswordMsg({ type: "error", text: "Passwords do not match" });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "Password must be at least 8 characters" });
      return;
    }
    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      await api.auth.updateProfile({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({ type: "success", text: "Password changed successfully" });
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err.message });
    } finally {
      setSavingPassword(false);
    }
  }

  function logout() {
    clearSession();
    router.replace("/auth/login");
  }

  async function deleteWorkspace() {
    const wid = getWorkspaceId();
    if (!wid) return;
    const confirmed = prompt('Type "DELETE" to permanently delete this workspace and all its data:');
    if (confirmed !== "DELETE") return;
    try {
      await api.workspaces.delete(wid);
      clearSession();
      router.replace("/auth/login");
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your profile and security settings</p>
      </div>

      {/* Profile */}
      <section className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <User size={17} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Profile</h2>
        </div>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input className="input bg-gray-50 text-gray-500" value={user?.email || ""} disabled />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
          </div>
          {profileMsg && (
            <p className={`text-sm ${profileMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>{profileMsg.text}</p>
          )}
          <button type="submit" disabled={savingProfile} className="btn-primary">
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </section>

      {/* Password */}
      <section className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock size={17} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Change Password</h2>
        </div>
        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
            <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
            <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
            <input type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          {passwordMsg && (
            <p className={`text-sm ${passwordMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>{passwordMsg.text}</p>
          )}
          <button type="submit" disabled={savingPassword} className="btn-primary">
            {savingPassword ? "Changing..." : "Change Password"}
          </button>
        </form>
      </section>

      {/* Logout */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Sign Out</h2>
            <p className="text-sm text-gray-500 mt-0.5">Sign out of your account on this device</p>
          </div>
          <button onClick={logout} className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium">
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="card p-6 border border-red-100">
        <h2 className="font-semibold text-red-700 mb-1">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">
          Permanently delete this workspace and all its data — leads, campaigns, emails, replies. This cannot be undone.
        </p>
        <button
          onClick={deleteWorkspace}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          <Trash2 size={15} />
          Delete Workspace
        </button>
      </section>
    </div>
  );
}
