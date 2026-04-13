"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Server, Globe, Webhook, Users, Copy, Check } from "lucide-react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";

export default function SettingsPage() {
  const wid = getWorkspaceId() || "";
  const [inboxes, setInboxes] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [showInboxForm, setShowInboxForm] = useState(false);
  const [inboxForm, setInboxForm] = useState({
    name: "", email: "", smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "", dailyLimit: 50,
    warmupEnabled: false, warmupStartLimit: 5, warmupIncrement: 5, warmupMaxLimit: 50,
  });
  const [domainName, setDomainName] = useState("");
  const [saving, setSaving] = useState(false);
  const [calendlyUrl, setCalendlyUrl] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("purleads_calendly") || "" : ""
  );
  const [calendlySaved, setCalendlySaved] = useState(false);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["reply.received"]);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [inviteLink, setInviteLink] = useState("");
  const [copiedInvite, setCopiedInvite] = useState("");

  const EVENTS = ["reply.received", "email.sent", "email.bounced", "campaign.launched"];

  async function load() {
    if (!wid) return;
    const [i, d, w, m, inv] = await Promise.all([
      api.inboxes.list(wid),
      api.domains.list(wid),
      api.webhooks.list(wid),
      api.workspaces.members.list(wid),
      api.workspaces.invites.list(wid),
    ]) as any[];
    setInboxes(i);
    setDomains(d);
    setWebhooks(w || []);
    setMembers(m || []);
    setPendingInvites(inv || []);
  }

  useEffect(() => { load(); }, [wid]);

  async function addInbox(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.inboxes.create(wid, {
        ...inboxForm,
        smtpPort: Number(inboxForm.smtpPort),
        dailyLimit: Number(inboxForm.dailyLimit),
      });
      setShowInboxForm(false);
      setInboxForm({ name: "", email: "", smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "", dailyLimit: 50, warmupEnabled: false, warmupStartLimit: 5, warmupIncrement: 5, warmupMaxLimit: 50 });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      const invite = await api.workspaces.invites.create(wid, inviteEmail.trim(), inviteRole) as any;
      const link = `${window.location.origin}/invite/${invite.token}`;
      setInviteLink(link);
      setInviteEmail("");
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  function copyLink(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedInvite(id);
    setTimeout(() => setCopiedInvite(""), 2000);
  }

  async function deleteInbox(id: string) {
    if (!confirm("Delete this inbox?")) return;
    await api.inboxes.delete(wid, id);
    load();
  }

  async function addDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!domainName.trim()) return;
    await api.domains.create(wid, domainName.trim());
    setDomainName("");
    load();
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage inboxes and sending domains</p>
      </div>

      {/* Inboxes */}
      <section className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Email Inboxes</h2>
          </div>
          <button onClick={() => setShowInboxForm(!showInboxForm)} className="btn-secondary flex items-center gap-2 text-sm">
            <Plus size={15} />
            Add Inbox
          </button>
        </div>

        {showInboxForm && (
          <form onSubmit={addInbox} className="p-6 border-b border-gray-100 bg-gray-50 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Display Name *</label>
              <input className="input" value={inboxForm.name} onChange={(e) => setInboxForm({ ...inboxForm, name: e.target.value })} placeholder="Outreach Inbox" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From Email *</label>
              <input type="email" className="input" value={inboxForm.email} onChange={(e) => setInboxForm({ ...inboxForm, email: e.target.value })} placeholder="outreach@company.com" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SMTP Host *</label>
              <input className="input" value={inboxForm.smtpHost} onChange={(e) => setInboxForm({ ...inboxForm, smtpHost: e.target.value })} placeholder="smtp.gmail.com" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SMTP Port</label>
              <input type="number" className="input" value={inboxForm.smtpPort} onChange={(e) => setInboxForm({ ...inboxForm, smtpPort: parseInt(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SMTP Username *</label>
              <input className="input" value={inboxForm.smtpUser} onChange={(e) => setInboxForm({ ...inboxForm, smtpUser: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SMTP Password *</label>
              <input type="password" className="input" value={inboxForm.smtpPass} onChange={(e) => setInboxForm({ ...inboxForm, smtpPass: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Daily Send Limit</label>
              <input type="number" className="input" min={1} max={1000} value={inboxForm.dailyLimit} onChange={(e) => setInboxForm({ ...inboxForm, dailyLimit: parseInt(e.target.value) })} disabled={inboxForm.warmupEnabled} />
            </div>
            <div className="col-span-2 border-t border-gray-100 pt-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 font-medium mb-2">
                <input type="checkbox" checked={inboxForm.warmupEnabled} onChange={(e) => setInboxForm({ ...inboxForm, warmupEnabled: e.target.checked })} />
                Enable Email Warmup <span className="text-xs font-normal text-gray-500">(gradually increase daily limit)</span>
              </label>
              {inboxForm.warmupEnabled && (
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Start (emails/day)</label>
                    <input type="number" className="input" min={1} value={inboxForm.warmupStartLimit} onChange={(e) => setInboxForm({ ...inboxForm, warmupStartLimit: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">+Per day</label>
                    <input type="number" className="input" min={1} value={inboxForm.warmupIncrement} onChange={(e) => setInboxForm({ ...inboxForm, warmupIncrement: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Max (emails/day)</label>
                    <input type="number" className="input" min={1} value={inboxForm.warmupMaxLimit} onChange={(e) => setInboxForm({ ...inboxForm, warmupMaxLimit: parseInt(e.target.value) })} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-end gap-3">
              <button type="button" onClick={() => setShowInboxForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Saving..." : "Add Inbox"}</button>
            </div>
          </form>
        )}

        {inboxes.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">No inboxes configured</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-left font-medium">Name</th>
                <th className="px-6 py-3 text-left font-medium">Email</th>
                <th className="px-6 py-3 text-left font-medium">SMTP</th>
                <th className="px-6 py-3 text-left font-medium">Usage</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {inboxes.map((inbox) => (
                <tr key={inbox.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{inbox.name}</td>
                  <td className="px-6 py-3 text-gray-600">{inbox.email}</td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{inbox.smtpHost}:{inbox.smtpPort}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${Math.min((inbox.sentToday / inbox.dailyLimit) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{inbox.sentToday}/{inbox.dailyLimit}</span>
                      {inbox.warmupEnabled && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
                          warmup day {inbox.warmupDay}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => deleteInbox(inbox.id)} className="text-gray-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Domains */}
      <section className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Globe size={18} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Sending Domains</h2>
        </div>
        <div className="p-6">
          <form onSubmit={addDomain} className="flex gap-3 mb-6">
            <input
              className="input flex-1"
              value={domainName}
              onChange={(e) => setDomainName(e.target.value)}
              placeholder="company.com"
            />
            <button type="submit" className="btn-primary whitespace-nowrap">Add Domain</button>
          </form>

          {domains.length === 0 ? (
            <p className="text-sm text-gray-400">No domains added yet</p>
          ) : (
            <div className="space-y-2">
              {domains.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-sm font-medium text-gray-900">{d.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.verified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {d.verified ? "Verified" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Webhooks */}
      <section className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Webhooks</h2>
          </div>
          <button onClick={() => setShowWebhookForm(!showWebhookForm)} className="btn-secondary flex items-center gap-2 text-sm">
            <Plus size={15} />
            Add Webhook
          </button>
        </div>

        {showWebhookForm && (
          <div className="p-6 border-b border-gray-100 bg-gray-50 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Endpoint URL *</label>
              <input className="input" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://your-server.com/webhook" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Events to send</label>
              <div className="space-y-1.5">
                {EVENTS.map((ev) => (
                  <label key={ev} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookEvents.includes(ev)}
                      onChange={(e) => setWebhookEvents(e.target.checked ? [...webhookEvents, ev] : webhookEvents.filter((x) => x !== ev))}
                    />
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{ev}</code>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowWebhookForm(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={async () => {
                  if (!webhookUrl || !webhookEvents.length) return;
                  await api.webhooks.create(wid, { url: webhookUrl, events: webhookEvents });
                  setWebhookUrl("");
                  setWebhookEvents(["reply.received"]);
                  setShowWebhookForm(false);
                  load();
                }}
                className="btn-primary"
              >
                Add Webhook
              </button>
            </div>
          </div>
        )}

        {webhooks.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">No webhooks configured</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {webhooks.map((hook) => (
              <div key={hook.id} className="px-6 py-4 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 font-mono">{hook.url}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {hook.events.map((ev: string) => (
                      <span key={ev} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{ev}</span>
                    ))}
                  </div>
                  {hook.secret && (
                    <p className="text-xs text-gray-400 mt-1.5">Secret: <code className="bg-gray-100 px-1 rounded">{hook.secret}</code></p>
                  )}
                </div>
                <button onClick={async () => { await api.webhooks.delete(wid, hook.id); load(); }} className="text-gray-400 hover:text-red-600 ml-4">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Team Members */}
      <section className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users size={18} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Team Members</h2>
        </div>
        <div className="p-6 space-y-6">
          {/* Invite form */}
          <form onSubmit={sendInvite} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Email address</label>
              <input className="input" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <select className="input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}>
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <button type="submit" className="btn-primary whitespace-nowrap">Generate Invite Link</button>
          </form>

          {inviteLink && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <p className="text-sm text-green-800 font-mono flex-1 truncate">{inviteLink}</p>
              <button onClick={() => copyLink(inviteLink, "new")} className="shrink-0 text-green-700 hover:text-green-900">
                {copiedInvite === "new" ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          )}

          {/* Members table */}
          {members.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Current members</p>
              <div className="space-y-2">
                {members.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
                      <p className="text-xs text-gray-500">{m.user.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.role === "ADMIN" ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-600"}`}>
                        {m.role}
                      </span>
                      <button onClick={async () => { if (!confirm("Remove this member?")) return; await api.workspaces.members.remove(wid, m.user.id); load(); }} className="text-gray-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending invites */}
          {pendingInvites.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Pending invites</p>
              <div className="space-y-2">
                {pendingInvites.map((inv: any) => {
                  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inv.token}`;
                  return (
                    <div key={inv.id} className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                        <p className="text-xs text-gray-500">Expires {new Date(inv.expiresAt).toLocaleDateString()} · {inv.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => copyLink(link, inv.id)} className="text-gray-400 hover:text-gray-700">
                          {copiedInvite === inv.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        <button onClick={async () => { await api.workspaces.invites.revoke(wid, inv.id); load(); }} className="text-gray-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Calendly Integration */}
      <section className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Meeting Booking</h2>
        <p className="text-sm text-gray-500 mb-4">
          Add your Calendly link to your email sequences to let leads book meetings directly.
        </p>
        <div className="flex gap-3">
          <input
            className="input flex-1"
            value={calendlyUrl}
            onChange={(e) => { setCalendlyUrl(e.target.value); setCalendlySaved(false); }}
            placeholder="https://calendly.com/your-link"
          />
          <button
            className="btn-primary"
            onClick={() => {
              localStorage.setItem("purleads_calendly", calendlyUrl);
              setCalendlySaved(true);
            }}
          >
            {calendlySaved ? "Saved!" : "Save"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Use <code className="bg-gray-100 px-1 rounded">&#123;&#123;calendly&#125;&#125;</code> in your email body to insert the booking link.
        </p>
      </section>
    </div>
  );
}
