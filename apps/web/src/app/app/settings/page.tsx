"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Server, Globe, Webhook, Users, Copy, Check, Zap, ExternalLink, ChevronUp, Palette, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";
import { useTheme, type Theme } from "@/components/ThemeProvider";

interface ProviderField { key: string; label: string; type: "text" | "password"; placeholder: string; }
interface ProviderDef { name: string; displayName: string; description: string; color: string; initial: string; fields: ProviderField[]; docsUrl: string; }

const PROVIDER_DEFS: ProviderDef[] = [
  { name: "apollo", displayName: "Apollo.io", description: "200M+ verified contacts with LinkedIn profiles and org data", color: "bg-orange-500", initial: "A", fields: [{ key: "apiKey", label: "API Key", type: "password", placeholder: "sk-..." }], docsUrl: "https://app.apollo.io/#/settings/integrations/api" },
  { name: "snov", displayName: "Snov.io", description: "Email finder, verifier, and domain-based contact discovery", color: "bg-sky-500", initial: "S", fields: [{ key: "clientId", label: "Client ID", type: "text", placeholder: "Your Snov Client ID" }, { key: "clientSecret", label: "Client Secret", type: "password", placeholder: "Your Snov Client Secret" }], docsUrl: "https://app.snov.io/account?settings=api" },
  { name: "hunter", displayName: "Hunter.io", description: "Domain email search with deliverability confidence scores", color: "bg-amber-500", initial: "H", fields: [{ key: "apiKey", label: "API Key", type: "password", placeholder: "Your Hunter API Key" }], docsUrl: "https://hunter.io/api-keys" },
];

const CUSTOM_INITIAL_FORM = { name: "", displayName: "", apiKey: "", apiSecret: "" };

// ── Theme preview mini-mockups ─────────────────────────────────────────────────

function LightPreview() {
  return (
    <div className="w-full h-[72px] rounded-xl overflow-hidden border border-gray-200 bg-white flex">
      <div className="w-9 bg-gray-50 border-r border-gray-200 flex flex-col gap-1.5 p-1.5 pt-2.5">
        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 mb-1" />
        {[70, 90, 55, 80].map((w, i) => <div key={i} className="h-1.5 bg-gray-300 rounded-full" style={{ width: `${w}%` }} />)}
      </div>
      <div className="flex-1 p-2 space-y-1.5">
        <div className="h-2.5 bg-gray-800 rounded w-2/3" />
        <div className="h-8 bg-gray-100 rounded-lg border border-gray-200" />
        <div className="flex gap-1">
          <div className="h-1.5 bg-gray-300 rounded w-1/3" />
          <div className="h-1.5 bg-violet-400 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}

function DarkPreview() {
  return (
    <div className="w-full h-[72px] rounded-xl overflow-hidden flex" style={{ background: "#0f0e1a" }}>
      <div className="w-9 border-r flex flex-col gap-1.5 p-1.5 pt-2.5" style={{ background: "#0b0a16", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 mb-1" />
        {[70, 90, 55, 80].map((w, i) => <div key={i} className="h-1.5 rounded-full" style={{ width: `${w}%`, background: "rgba(255,255,255,0.2)" }} />)}
      </div>
      <div className="flex-1 p-2 space-y-1.5">
        <div className="h-2.5 rounded w-2/3" style={{ background: "rgba(255,255,255,0.8)" }} />
        <div className="h-8 rounded-lg border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }} />
        <div className="flex gap-1">
          <div className="h-1.5 rounded w-1/3" style={{ background: "rgba(255,255,255,0.25)" }} />
          <div className="h-1.5 rounded w-1/4 bg-violet-500/60" />
        </div>
      </div>
    </div>
  );
}

function GalaxyPreview() {
  const stars = [[12,15],[28,8],[45,20],[62,6],[78,18],[20,35],[50,30],[72,40],[35,45],[88,25],[15,50]];
  return (
    <div className="w-full h-[72px] rounded-xl overflow-hidden relative flex" style={{ background: "#06041a" }}>
      {stars.map(([x, y], i) => (
        <div key={i} className="absolute rounded-full" style={{ left: `${x}%`, top: `${y}%`, width: i % 3 === 0 ? 2 : 1, height: i % 3 === 0 ? 2 : 1, background: `rgba(200,185,255,${0.4 + (i % 4) * 0.15})` }} />
      ))}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(80,40,160,0.15) 0%, transparent 60%)" }} />
      <div className="w-9 border-r flex flex-col gap-1.5 p-1.5 pt-2.5 relative z-10" style={{ background: "rgba(8,5,32,0.85)", borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 mb-1" />
        {[70, 90, 55, 80].map((w, i) => <div key={i} className="h-1.5 rounded-full" style={{ width: `${w}%`, background: "rgba(255,255,255,0.2)" }} />)}
      </div>
      <div className="flex-1 p-2 space-y-1.5 relative z-10">
        <div className="h-2.5 rounded w-2/3" style={{ background: "rgba(255,255,255,0.75)" }} />
        <div className="h-8 rounded-lg border" style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" }} />
        <div className="flex gap-1">
          <div className="h-1.5 rounded w-1/3" style={{ background: "rgba(200,185,255,0.35)" }} />
          <div className="h-1.5 rounded w-1/4 bg-violet-500/70" />
        </div>
      </div>
    </div>
  );
}

const THEME_OPTIONS: { id: Theme; label: string; description: string; preview: React.ReactNode }[] = [
  { id: "light",  label: "Light",  description: "Clean white interface",       preview: <LightPreview /> },
  { id: "dark",   label: "Dark",   description: "Sleek solid dark interface",  preview: <DarkPreview /> },
  { id: "galaxy", label: "Galaxy", description: "Animated star field",         preview: <GalaxyPreview /> },
];

// ── Shared sub-components ──────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, subtitle, action, children }: { icon: any; title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/[0.08] flex items-center justify-center shrink-0">
            <Icon size={15} className="text-white/50" />
          </div>
          <div>
            <h2 className="font-semibold text-white">{title}</h2>
            {subtitle && <p className="text-xs text-white/35 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">{children}</label>;
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const wid = getWorkspaceId() || "";
  const { theme, setTheme } = useTheme();

  const [inboxes, setInboxes] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [showInboxForm, setShowInboxForm] = useState(false);
  const [inboxForm, setInboxForm] = useState({ name: "", email: "", smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "", dailyLimit: 50, warmupEnabled: false, warmupStartLimit: 5, warmupIncrement: 5, warmupMaxLimit: 50 });
  const [domainName, setDomainName] = useState("");
  const [saving, setSaving] = useState(false);
  const [calendlyUrl, setCalendlyUrl] = useState(() => typeof window !== "undefined" ? localStorage.getItem("purleads_calendly") || "" : "");
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
  const [providers, setProviders] = useState<any[]>([]);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [credForm, setCredForm] = useState<Record<string, string>>({});
  const [savingProvider, setSavingProvider] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState(CUSTOM_INITIAL_FORM);

  const EVENTS = ["reply.received", "email.sent", "email.bounced", "campaign.launched"];

  async function load() {
    if (!wid) return;
    const [i, d, w, m, inv, prov] = await Promise.all([
      api.inboxes.list(wid), api.domains.list(wid), api.webhooks.list(wid),
      api.workspaces.members.list(wid), api.workspaces.invites.list(wid), api.enrichment.providers.list(wid),
    ]) as any[];
    setInboxes(i); setDomains(d); setWebhooks(w || []); setMembers(m || []); setPendingInvites(inv || []); setProviders(prov || []);
  }

  useEffect(() => { load(); }, [wid]);

  async function addInbox(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await api.inboxes.create(wid, { ...inboxForm, smtpPort: Number(inboxForm.smtpPort), dailyLimit: Number(inboxForm.dailyLimit) }); setShowInboxForm(false); setInboxForm({ name: "", email: "", smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "", dailyLimit: 50, warmupEnabled: false, warmupStartLimit: 5, warmupIncrement: 5, warmupMaxLimit: 50 }); load(); }
    finally { setSaving(false); }
  }

  async function addDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!domainName.trim()) return;
    await api.domains.create(wid, domainName.trim()); setDomainName(""); load();
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try { const invite = await api.workspaces.invites.create(wid, inviteEmail.trim(), inviteRole) as any; setInviteLink(`${window.location.origin}/invite/${invite.token}`); setInviteEmail(""); load(); }
    catch (err: any) { alert(err.message); }
  }

  function copyLink(text: string, id: string) { navigator.clipboard.writeText(text); setCopiedInvite(id); setTimeout(() => setCopiedInvite(""), 2000); }

  function connectedProvider(name: string) { return providers.find((p) => p.name === name) || null; }
  function startConnect(name: string) { setConnectingProvider(name); setCredForm({}); setShowCustomForm(false); }

  async function saveProvider(def: ProviderDef) {
    if (def.fields.some((f) => !credForm[f.key]?.trim())) return;
    setSavingProvider(true);
    try { await api.enrichment.providers.upsert(wid, { name: def.name, displayName: def.displayName, credentials: credForm }); await load(); setConnectingProvider(null); setCredForm({}); }
    finally { setSavingProvider(false); }
  }

  async function saveCustomProvider() {
    if (!customForm.name.trim() || !customForm.displayName.trim() || !customForm.apiKey.trim()) return;
    setSavingProvider(true);
    try {
      const credentials: Record<string, string> = { apiKey: customForm.apiKey };
      if (customForm.apiSecret.trim()) credentials.apiSecret = customForm.apiSecret;
      await api.enrichment.providers.upsert(wid, { name: customForm.name.trim().toLowerCase().replace(/\s+/g, "_"), displayName: customForm.displayName.trim(), credentials });
      await load(); setShowCustomForm(false); setCustomForm(CUSTOM_INITIAL_FORM);
    } finally { setSavingProvider(false); }
  }

  async function disconnectProvider(name: string) {
    if (!confirm(`Remove ${name} credentials?`)) return;
    await api.enrichment.providers.delete(wid, name); load();
  }

  const knownNames = new Set(PROVIDER_DEFS.map((d) => d.name));
  const customProviders = providers.filter((p) => !knownNames.has(p.name));

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-white/40 text-sm mt-1">Manage your workspace, appearance, and integrations</p>
      </div>

      {/* ── Appearance ── */}
      <SectionCard icon={Palette} title="Appearance" subtitle="Choose how the app looks and feels">
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            {THEME_OPTIONS.map(({ id, label, description, preview }) => {
              const active = theme === id;
              return (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={`group relative rounded-2xl p-3 text-left transition-all duration-200 border-2 ${
                    active
                      ? "border-brand-400/70 bg-brand-400/[0.08] shadow-lg shadow-brand-600/15"
                      : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.18] hover:bg-white/[0.06]"
                  }`}
                >
                  {active && (
                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-600/40">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                  {preview}
                  <div className="mt-3 pl-0.5">
                    <p className={`text-sm font-semibold ${active ? "text-white" : "text-white/60 group-hover:text-white/80"} transition-colors`}>{label}</p>
                    <p className="text-xs text-white/30 mt-0.5">{description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* ── Team Members ── */}
      <SectionCard icon={Users} title="Team" subtitle="Invite colleagues to collaborate in this workspace">
        <div className="p-6 space-y-6">
          <form onSubmit={sendInvite} className="flex gap-3 items-end">
            <div className="flex-1"><FieldLabel>Email address</FieldLabel><input className="input" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" required /></div>
            <div><FieldLabel>Role</FieldLabel><select className="input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select></div>
            <button type="submit" className="btn-primary flex items-center gap-2 whitespace-nowrap"><UserPlus size={14} /> Invite</button>
          </form>
          {inviteLink && (
            <div className="flex items-center gap-2 bg-emerald-400/[0.08] border border-emerald-400/20 rounded-xl px-4 py-3">
              <p className="text-sm text-emerald-300 font-mono flex-1 truncate">{inviteLink}</p>
              <button onClick={() => copyLink(inviteLink, "new")} className="shrink-0 text-emerald-400 hover:text-emerald-300 transition-colors">
                {copiedInvite === "new" ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          )}
          {members.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">Current members</p>
              <div className="space-y-2">
                {members.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between py-2.5 px-4 bg-white/[0.04] rounded-xl border border-white/[0.08]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500/40 to-brand-700/40 border border-brand-400/20 flex items-center justify-center text-xs font-bold text-brand-300">
                        {(m.user.name || m.user.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white/75">{m.user.name}</p>
                        <p className="text-xs text-white/35">{m.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${m.role === "ADMIN" ? "bg-brand-400/15 text-brand-300 ring-1 ring-brand-400/25" : "bg-white/[0.08] text-white/40"}`}>{m.role}</span>
                      <button onClick={async () => { if (!confirm("Remove this member?")) return; await api.workspaces.members.remove(wid, m.user.id); load(); }} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {pendingInvites.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">Pending invites</p>
              <div className="space-y-2">
                {pendingInvites.map((inv: any) => {
                  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inv.token}`;
                  return (
                    <div key={inv.id} className="flex items-center justify-between py-2.5 px-4 bg-white/[0.04] rounded-xl border border-white/[0.08]">
                      <div>
                        <p className="text-sm font-medium text-white/75">{inv.email}</p>
                        <p className="text-xs text-white/35">Expires {new Date(inv.expiresAt).toLocaleDateString()} · {inv.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => copyLink(link, inv.id)} className="text-white/30 hover:text-white/70 transition-colors">{copiedInvite === inv.id ? <Check size={14} /> : <Copy size={14} />}</button>
                        <button onClick={async () => { await api.workspaces.invites.revoke(wid, inv.id); load(); }} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {members.length === 0 && pendingInvites.length === 0 && !inviteLink && (
            <p className="text-sm text-white/25 text-center py-4">No team members yet — invite someone above</p>
          )}
        </div>
      </SectionCard>

      {/* ── Enrichment Providers ── */}
      <SectionCard icon={Zap} title="Enrichment Providers" subtitle="Auto-discover decision-makers at your leads' companies">
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PROVIDER_DEFS.map((def) => {
              const connected = connectedProvider(def.name);
              const isEditing = connectingProvider === def.name;
              return (
                <div
                  key={def.name}
                  className={`rounded-xl border p-4 transition-all ${
                    connected ? "border-emerald-400/25 bg-emerald-400/[0.07]"
                      : isEditing ? "border-brand-400/30 bg-brand-400/[0.07]"
                      : "border-white/[0.09] bg-white/[0.03] hover:border-white/[0.15] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl ${def.color} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                      {def.initial}
                    </div>
                    {connected ? (
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-400/15 px-2 py-0.5 rounded-full ring-1 ring-emerald-400/25">Connected</span>
                    ) : (
                      <a href={def.docsUrl} target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white/50 transition-colors">
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                  <p className="font-semibold text-sm text-white/80">{def.displayName}</p>
                  <p className="text-xs text-white/35 mt-0.5 leading-relaxed">{def.description}</p>
                  <div className="mt-3 flex gap-2">
                    {connected ? (
                      <>
                        <button onClick={() => startConnect(def.name)} className="flex-1 text-xs py-1.5 rounded-lg border border-white/[0.12] text-white/50 hover:bg-white/[0.08] hover:text-white/80 transition-colors font-medium">
                          Reconfigure
                        </button>
                        <button onClick={() => disconnectProvider(def.name)} className="text-xs px-3 py-1.5 rounded-lg border border-red-400/20 text-red-400/70 hover:bg-red-400/10 hover:text-red-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => isEditing ? setConnectingProvider(null) : startConnect(def.name)}
                        className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 ${
                          isEditing ? "bg-white/[0.08] text-white/50 hover:bg-white/[0.12]" : "bg-brand-600 text-white hover:bg-brand-500 shadow-lg shadow-brand-600/20"
                        }`}
                      >
                        {isEditing ? <><ChevronUp size={12} /> Cancel</> : <><Plus size={12} /> Connect</>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {connectingProvider && PROVIDER_DEFS.find((d) => d.name === connectingProvider) && (() => {
            const def = PROVIDER_DEFS.find((d) => d.name === connectingProvider)!;
            return (
              <div className="rounded-xl border border-brand-400/20 bg-brand-400/[0.06] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white/80">Configure {def.displayName}</p>
                  <a href={def.docsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-400 hover:underline flex items-center gap-1">
                    Get credentials <ExternalLink size={11} />
                  </a>
                </div>
                <div className={`grid gap-3 ${def.fields.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {def.fields.map((field) => (
                    <div key={field.key}>
                      <FieldLabel>{field.label}</FieldLabel>
                      <input type={field.type} className="input" placeholder={field.placeholder} value={credForm[field.key] || ""} onChange={(e) => setCredForm({ ...credForm, [field.key]: e.target.value })} autoComplete="off" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setConnectingProvider(null); setCredForm({}); }} className="btn-secondary text-sm px-4">Cancel</button>
                  <button onClick={() => saveProvider(def)} disabled={savingProvider || def.fields.some((f) => !credForm[f.key]?.trim())} className="btn-primary text-sm px-6">
                    {savingProvider ? "Saving…" : "Save & Connect"}
                  </button>
                </div>
              </div>
            );
          })()}

          {customProviders.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">Custom Providers</p>
              {customProviders.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03]">
                  <div>
                    <p className="text-sm font-medium text-white/75">{p.displayName}</p>
                    <p className="text-xs text-white/30 mt-0.5">API Key: <code className="bg-white/[0.08] px-1 rounded">{p.credentials?.apiKey ?? "••••••••"}</code></p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-400/15 px-2 py-0.5 rounded-full ring-1 ring-emerald-400/25">Connected</span>
                    <button onClick={() => disconnectProvider(p.name)} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showCustomForm ? (
            <button onClick={() => { setShowCustomForm(true); setConnectingProvider(null); }} className="flex items-center gap-2 text-sm text-white/35 hover:text-brand-400 transition-colors font-medium">
              <Plus size={14} /> Add custom provider
            </button>
          ) : (
            <div className="rounded-xl border border-white/[0.09] bg-white/[0.04] p-5 space-y-4">
              <p className="text-sm font-semibold text-white/80">Add Custom Provider</p>
              <div className="grid grid-cols-2 gap-3">
                <div><FieldLabel>Provider Name (slug) *</FieldLabel><input className="input" placeholder="e.g. clearbit" value={customForm.name} onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })} /></div>
                <div><FieldLabel>Display Name *</FieldLabel><input className="input" placeholder="e.g. Clearbit" value={customForm.displayName} onChange={(e) => setCustomForm({ ...customForm, displayName: e.target.value })} /></div>
                <div><FieldLabel>API Key *</FieldLabel><input type="password" className="input" placeholder="Your API key" value={customForm.apiKey} onChange={(e) => setCustomForm({ ...customForm, apiKey: e.target.value })} autoComplete="off" /></div>
                <div><FieldLabel>API Secret (optional)</FieldLabel><input type="password" className="input" placeholder="If required" value={customForm.apiSecret} onChange={(e) => setCustomForm({ ...customForm, apiSecret: e.target.value })} autoComplete="off" /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowCustomForm(false); setCustomForm(CUSTOM_INITIAL_FORM); }} className="btn-secondary text-sm px-4">Cancel</button>
                <button onClick={saveCustomProvider} disabled={savingProvider || !customForm.name.trim() || !customForm.displayName.trim() || !customForm.apiKey.trim()} className="btn-primary text-sm px-6">
                  {savingProvider ? "Saving…" : "Save Provider"}
                </button>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Email Inboxes ── */}
      <SectionCard
        icon={Server} title="Email Inboxes"
        action={<button onClick={() => setShowInboxForm(!showInboxForm)} className="btn-secondary flex items-center gap-2 text-sm"><Plus size={14} /> Add Inbox</button>}
      >
        {showInboxForm && (
          <form onSubmit={addInbox} className="p-6 border-b border-white/[0.07] grid grid-cols-2 gap-4 bg-white/[0.03]">
            <div><FieldLabel>Display Name *</FieldLabel><input className="input" value={inboxForm.name} onChange={(e) => setInboxForm({ ...inboxForm, name: e.target.value })} placeholder="Outreach Inbox" required /></div>
            <div><FieldLabel>From Email *</FieldLabel><input type="email" className="input" value={inboxForm.email} onChange={(e) => setInboxForm({ ...inboxForm, email: e.target.value })} placeholder="outreach@company.com" required /></div>
            <div><FieldLabel>SMTP Host *</FieldLabel><input className="input" value={inboxForm.smtpHost} onChange={(e) => setInboxForm({ ...inboxForm, smtpHost: e.target.value })} placeholder="smtp.gmail.com" required /></div>
            <div><FieldLabel>SMTP Port</FieldLabel><input type="number" className="input" value={inboxForm.smtpPort} onChange={(e) => setInboxForm({ ...inboxForm, smtpPort: parseInt(e.target.value) })} /></div>
            <div><FieldLabel>SMTP Username *</FieldLabel><input className="input" value={inboxForm.smtpUser} onChange={(e) => setInboxForm({ ...inboxForm, smtpUser: e.target.value })} required /></div>
            <div><FieldLabel>SMTP Password *</FieldLabel><input type="password" className="input" value={inboxForm.smtpPass} onChange={(e) => setInboxForm({ ...inboxForm, smtpPass: e.target.value })} required /></div>
            <div><FieldLabel>Daily Send Limit</FieldLabel><input type="number" className="input" min={1} max={1000} value={inboxForm.dailyLimit} onChange={(e) => setInboxForm({ ...inboxForm, dailyLimit: parseInt(e.target.value) })} disabled={inboxForm.warmupEnabled} /></div>
            <div className="col-span-2 border-t border-white/[0.07] pt-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-sm text-white/60 font-medium mb-2">
                <input type="checkbox" checked={inboxForm.warmupEnabled} onChange={(e) => setInboxForm({ ...inboxForm, warmupEnabled: e.target.checked })} className="rounded border-white/20" />
                Enable Email Warmup <span className="text-xs font-normal text-white/30">(gradually increase daily limit)</span>
              </label>
              {inboxForm.warmupEnabled && (
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div><FieldLabel>Start (emails/day)</FieldLabel><input type="number" className="input" min={1} value={inboxForm.warmupStartLimit} onChange={(e) => setInboxForm({ ...inboxForm, warmupStartLimit: parseInt(e.target.value) })} /></div>
                  <div><FieldLabel>+Per day</FieldLabel><input type="number" className="input" min={1} value={inboxForm.warmupIncrement} onChange={(e) => setInboxForm({ ...inboxForm, warmupIncrement: parseInt(e.target.value) })} /></div>
                  <div><FieldLabel>Max (emails/day)</FieldLabel><input type="number" className="input" min={1} value={inboxForm.warmupMaxLimit} onChange={(e) => setInboxForm({ ...inboxForm, warmupMaxLimit: parseInt(e.target.value) })} /></div>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowInboxForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Saving…" : "Add Inbox"}</button>
            </div>
          </form>
        )}
        {inboxes.length === 0 ? (
          <div className="px-6 py-10 text-center text-white/25 text-sm">No inboxes configured</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="px-6 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">SMTP</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white/35 uppercase tracking-wider">Usage</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {inboxes.map((inbox) => (
                <tr key={inbox.id} className="hover:bg-white/[0.04] transition-colors">
                  <td className="px-6 py-3.5 font-medium text-white/80">{inbox.name}</td>
                  <td className="px-6 py-3.5 text-white/50">{inbox.email}</td>
                  <td className="px-6 py-3.5 text-white/35 text-xs font-mono">{inbox.smtpHost}:{inbox.smtpPort}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-20 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full" style={{ width: `${Math.min((inbox.sentToday / inbox.dailyLimit) * 100, 100)}%` }} />
                      </div>
                      <span className="text-xs text-white/40 tabular-nums">{inbox.sentToday}/{inbox.dailyLimit}</span>
                      {inbox.warmupEnabled && <span className="text-xs bg-orange-400/15 text-orange-300 px-1.5 py-0.5 rounded font-medium">warmup day {inbox.warmupDay}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button onClick={async () => { if (!confirm("Delete this inbox?")) return; await api.inboxes.delete(wid, inbox.id); load(); }} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* ── Sending Domains ── */}
      <SectionCard icon={Globe} title="Sending Domains">
        <div className="p-6">
          <form onSubmit={addDomain} className="flex gap-3 mb-5">
            <input className="input flex-1" value={domainName} onChange={(e) => setDomainName(e.target.value)} placeholder="company.com" />
            <button type="submit" className="btn-primary whitespace-nowrap">Add Domain</button>
          </form>
          {domains.length === 0 ? (
            <p className="text-sm text-white/25">No domains added yet</p>
          ) : (
            <div className="space-y-2">
              {domains.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2.5 px-4 bg-white/[0.04] rounded-xl border border-white/[0.08]">
                  <span className="text-sm font-medium text-white/75">{d.name}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${d.verified ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/25" : "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/25"}`}>
                    {d.verified ? "Verified" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Webhooks ── */}
      <SectionCard
        icon={Webhook} title="Webhooks"
        action={<button onClick={() => setShowWebhookForm(!showWebhookForm)} className="btn-secondary flex items-center gap-2 text-sm"><Plus size={14} /> Add Webhook</button>}
      >
        {showWebhookForm && (
          <div className="p-6 border-b border-white/[0.07] bg-white/[0.03] space-y-4">
            <div><FieldLabel>Endpoint URL *</FieldLabel><input className="input" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://your-server.com/webhook" /></div>
            <div>
              <FieldLabel>Events to send</FieldLabel>
              <div className="space-y-2">
                {EVENTS.map((ev) => (
                  <label key={ev} className="flex items-center gap-2.5 text-sm text-white/55 cursor-pointer hover:text-white/75 transition-colors">
                    <input type="checkbox" checked={webhookEvents.includes(ev)} onChange={(e) => setWebhookEvents(e.target.checked ? [...webhookEvents, ev] : webhookEvents.filter((x) => x !== ev))} className="rounded border-white/20" />
                    <code className="bg-white/[0.08] px-1.5 py-0.5 rounded text-xs text-white/60">{ev}</code>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowWebhookForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={async () => { if (!webhookUrl || !webhookEvents.length) return; await api.webhooks.create(wid, { url: webhookUrl, events: webhookEvents }); setWebhookUrl(""); setWebhookEvents(["reply.received"]); setShowWebhookForm(false); load(); }} className="btn-primary">Add Webhook</button>
            </div>
          </div>
        )}
        {webhooks.length === 0 ? (
          <div className="px-6 py-10 text-center text-white/25 text-sm">No webhooks configured</div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {webhooks.map((hook) => (
              <div key={hook.id} className="px-6 py-4 flex items-start justify-between hover:bg-white/[0.03] transition-colors">
                <div>
                  <p className="text-sm font-medium text-white/70 font-mono">{hook.url}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {hook.events.map((ev: string) => <span key={ev} className="bg-white/[0.08] text-white/45 text-xs px-2 py-0.5 rounded font-mono">{ev}</span>)}
                  </div>
                  {hook.secret && <p className="text-xs text-white/25 mt-1.5">Secret: <code className="bg-white/[0.08] px-1 rounded">{hook.secret}</code></p>}
                </div>
                <button onClick={async () => { await api.webhooks.delete(wid, hook.id); load(); }} className="text-white/20 hover:text-red-400 transition-colors ml-4"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Meeting Booking ── */}
      <section className="card p-6">
        <h2 className="font-semibold text-white mb-1">Meeting Booking</h2>
        <p className="text-sm text-white/40 mb-4">Add your Calendly link so leads can book meetings directly from email sequences.</p>
        <div className="flex gap-3">
          <input className="input flex-1" value={calendlyUrl} onChange={(e) => { setCalendlyUrl(e.target.value); setCalendlySaved(false); }} placeholder="https://calendly.com/your-link" />
          <button className="btn-primary" onClick={() => { localStorage.setItem("purleads_calendly", calendlyUrl); setCalendlySaved(true); }}>
            {calendlySaved ? "Saved!" : "Save"}
          </button>
        </div>
        <p className="text-xs text-white/25 mt-2">
          Use <code className="bg-white/[0.08] px-1.5 py-0.5 rounded text-white/40">&#123;&#123;calendly&#125;&#125;</code> in your email body to insert the booking link.
        </p>
      </section>
    </div>
  );
}
