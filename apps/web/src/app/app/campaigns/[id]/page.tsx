"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Play, Pause, Eye, X, Copy, Clock, Upload, UserPlus, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";
import RichField from "@/components/RichField";
import EmailBodyEditor from "@/components/EmailBodyEditor";
import ManualSequenceTrigger from "./components/ManualSequenceTrigger";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function buildPreviewHtml(body: string, unsubscribeUrl = "#"): string {
  const isHtml = body.trim().startsWith("<");
  const htmlBody = isHtml
    ? body
    : body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px">
  <div style="margin-bottom:32px">${htmlBody}</div>
  <div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:16px;font-size:12px;color:#9ca3af">
    <p style="margin:0">If you'd prefer not to receive emails like this, you can <a href="${unsubscribeUrl}" style="color:#6b7280">unsubscribe here</a>.</p>
  </div>
</body></html>`;
}

function PreviewModal({ seq, onClose }: { seq: any; onClose: () => void }) {
  const sampleLead = { name: "John Smith", firstName: "John", company: "Acme Corp", title: "CEO" };
  function applyVars(text: string) {
    return text
      .replace(/\{\{name\}\}/gi, sampleLead.name)
      .replace(/\{\{firstName\}\}/gi, sampleLead.firstName)
      .replace(/\{\{company\}\}/gi, sampleLead.company)
      .replace(/\{\{title\}\}/gi, sampleLead.title)
      .replace(/\{\{icebreaker\}\}/gi, "I noticed Acme Corp recently expanded into new markets — impressive growth.");
  }
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <h3 className="font-semibold text-white">
            Email Preview{" "}
            <span className="text-xs text-white/30 font-normal ml-1">(sample: John Smith, Acme Corp)</span>
          </h3>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-white/[0.05] rounded-xl p-4 border border-white/[0.08]">
            <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-1.5">Subject</p>
            <p className="text-white/80 font-medium">{applyVars(seq.subject)}</p>
          </div>
          <div className="rounded-xl overflow-hidden border border-white/[0.08]">
            <p className="text-xs font-semibold text-white/30 uppercase tracking-wider px-4 pt-3 pb-2 bg-white/[0.05]">Body</p>
            <iframe
              srcDoc={buildPreviewHtml(applyVars(seq.body))}
              className="w-full border-0"
              style={{ height: 420 }}
              sandbox="allow-same-origin"
              title="Email body preview"
            />
          </div>
          <div className="rounded-xl bg-blue-500/[0.1] border border-blue-400/20 p-4 text-xs text-blue-300">
            <p className="font-semibold mb-1">What AI will add per lead:</p>
            <p>A personalized icebreaker sentence will be generated based on each lead's company, title, and website — replacing the <code className="bg-blue-400/20 px-1 rounded">&#123;&#123;icebreaker&#125;&#125;</code> placeholder.</p>
          </div>
          <div className="text-xs text-white/25 border-t border-white/[0.07] pt-3">
            <p className="font-semibold mb-1 text-white/35">Footer added automatically:</p>
            <p>If you'd prefer not to receive emails like this, you can <span className="underline">unsubscribe here</span>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Add Leads Panel ──────────────────────────────────────────────────────────

const EMPTY_MANUAL = { company: "", firstName: "", lastName: "", email: "", cc: "" };

function AddLeadsPanel({ campaignId, wid, onAdded }: { campaignId: string; wid: string; onAdded: () => void }) {
  const [mode, setMode] = useState<"csv" | "manual">("csv");

  // CSV state
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);

  // Manual state
  const [form, setForm] = useState(EMPTY_MANUAL);
  const [submitting, setSubmitting] = useState(false);
  const [manualResult, setManualResult] = useState<string | null>(null);

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setCsvResult(null);
    try {
      const res = await api.leads.uploadCsv(wid, file) as any;
      if (res.leadIds?.length) {
        await api.campaigns.addLeads(wid, campaignId, res.leadIds);
      }
      const enrichMsg = res.domainsQueued > 0
        ? ` · ${res.domainsQueued} domain${res.domainsQueued !== 1 ? "s" : ""} queued for enrichment`
        : "";
      setCsvResult(`✅ Imported ${res.imported} leads and added to campaign${enrichMsg}`);
      onAdded();
    } catch (err: any) {
      setCsvResult(`❌ ${err.message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim()) {
      setManualResult("❌ Contact email is required");
      return;
    }
    setSubmitting(true);
    setManualResult(null);
    try {
      const lead = await api.leads.create(wid, {
        company: form.company.trim() || undefined,
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim(),
        customData: form.cc.trim() ? { cc: form.cc.trim() } : undefined,
      }) as any;
      await api.campaigns.addLeads(wid, campaignId, [lead.id]);
      setManualResult(`✅ Lead added to campaign`);
      setForm(EMPTY_MANUAL);
      onAdded();
    } catch (err: any) {
      setManualResult(`❌ ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const tabBase = "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all";
  const tabActive = "bg-brand-600/30 text-white border border-brand-400/30";
  const tabInactive = "text-white/40 hover:text-white/70 hover:bg-white/[0.05]";

  return (
    <div className="card p-5 mb-8">
      <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl" style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)" }} />

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-white">Add Leads</h2>
        <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.08]">
          <button className={`${tabBase} ${mode === "csv" ? tabActive : tabInactive}`} onClick={() => setMode("csv")}>
            <Upload size={14} /> Upload CSV
          </button>
          <button className={`${tabBase} ${mode === "manual" ? tabActive : tabInactive}`} onClick={() => setMode("manual")}>
            <UserPlus size={14} /> Enter Manually
          </button>
        </div>
      </div>

      {mode === "csv" && (
        <div>
          <p className="text-xs text-blue-300 bg-blue-500/[0.1] border border-blue-400/20 rounded-xl px-4 py-3 mb-4">
            <strong>Required CSV column:</strong> <code className="font-mono bg-blue-400/20 px-1.5 py-0.5 rounded">company_url</code>
            &nbsp;·&nbsp;Decision makers are auto-discovered and enriched. Emails go to DM1, CC to DM2.
          </p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? "Uploading…" : "Choose CSV File"}
          </button>
          {csvResult && (
            <p className={`mt-3 text-sm font-medium ${csvResult.startsWith("❌") ? "text-red-400" : "text-emerald-400"}`}>
              {csvResult}
            </p>
          )}
        </div>
      )}

      {mode === "manual" && (
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Company Name</label>
              <RichField
                value={form.company}
                onChange={(v) => setForm((f) => ({ ...f, company: v }))}
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">First Name</label>
              <RichField
                value={form.firstName}
                onChange={(v) => setForm((f) => ({ ...f, firstName: v }))}
                placeholder="Jane"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Surname</label>
              <RichField
                value={form.lastName}
                onChange={(v) => setForm((f) => ({ ...f, lastName: v }))}
                placeholder="Smith"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Contact Email *</label>
              <RichField
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                placeholder="jane@acme.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
              CC Emails <span className="normal-case font-normal text-white/25">(comma-separated)</span>
            </label>
            <RichField
              value={form.cc}
              onChange={(v) => setForm((f) => ({ ...f, cc: v }))}
              placeholder="cto@acme.com, cfo@acme.com"
            />
            <p className="text-xs text-white/25 mt-1">Multiple addresses separated by commas</p>
          </div>
          {manualResult && (
            <p className={`text-sm font-medium ${manualResult.startsWith("❌") ? "text-red-400" : "text-emerald-400"}`}>
              {manualResult}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
              {submitting ? "Adding…" : "Add Lead to Campaign"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const wid = getWorkspaceId() || "";

  const [campaign, setCampaign] = useState<any>(null);
  const [sequences, setSequences] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newStep, setNewStep] = useState({ subject: "", body: "", delayDays: 0, subjectB: "", bodyB: "", abTest: false });
  const [addingStep, setAddingStep] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewSeq, setPreviewSeq] = useState<any>(null);
  const [cloning, setCloning] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduling, setScheduling] = useState(false);

  async function load() {
    const [c, seqs, s] = await Promise.all([
      api.campaigns.get(wid, id),
      api.sequences.list(wid, id),
      api.campaigns.stats(wid, id),
    ]) as any[];
    setCampaign(c); setSequences(seqs); setStats(s); setLoading(false);
  }

  useEffect(() => { if (wid && id) load(); }, [wid, id]);

  async function addStep(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.sequences.create(wid, id, {
        subject: newStep.subject, body: newStep.body,
        step: sequences.length + 1, delayDays: Number(newStep.delayDays),
        ...(newStep.abTest && newStep.subjectB ? { subjectB: newStep.subjectB, bodyB: newStep.bodyB } : {}),
      });
      setNewStep({ subject: "", body: "", delayDays: 0, subjectB: "", bodyB: "", abTest: false });
      setAddingStep(false);
      load();
    } finally { setSaving(false); }
  }

  async function deleteStep(seqId: string) {
    await api.sequences.delete(wid, id, seqId);
    load();
  }

  async function launch() {
    try { const res = await api.campaigns.launch(wid, id) as any; alert(`Campaign launched! ${res.queued} emails queued.`); load(); }
    catch (err: any) { alert(err.message); }
  }

  async function pause() { await api.campaigns.pause(wid, id); load(); }

  async function scheduleCampaign() {
    if (!scheduleAt) return;
    setScheduling(true);
    try {
      await api.campaigns.schedule(wid, id, new Date(scheduleAt).toISOString());
      setShowSchedule(false); alert(`Campaign scheduled for ${new Date(scheduleAt).toLocaleString()}`); load();
    } catch (err: any) { alert(err.message); }
    finally { setScheduling(false); }
  }

  async function cloneCampaign() {
    setCloning(true);
    try {
      const newCampaign = await api.campaigns.create(wid, { name: `${campaign.name} (copy)`, fromName: campaign.fromName, replyTo: campaign.replyTo }) as any;
      for (const seq of sequences) {
        await api.sequences.create(wid, newCampaign.id, { subject: seq.subject, body: seq.body, step: seq.step, delayDays: seq.delayDays, ...(seq.subjectB ? { subjectB: seq.subjectB, bodyB: seq.bodyB } : {}) });
      }
      router.push(`/app/campaigns/${newCampaign.id}`);
    } finally { setCloning(false); }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-white/30 text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-brand-400 animate-spin" />
          Loading campaign…
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {previewSeq && <PreviewModal seq={previewSeq} onClose={() => setPreviewSeq(null)} />}

      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-white/35 hover:text-white/70 mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Campaigns
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{campaign?.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`badge-${campaign?.status?.toLowerCase()}`}>{campaign?.status}</span>
            {campaign?.fromName && (
              <span className="text-sm text-white/35">From: {campaign.fromName}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={cloneCampaign} disabled={cloning} className="btn-secondary flex items-center gap-2 text-sm">
            <Copy size={14} />
            {cloning ? "Cloning…" : "Clone"}
          </button>
          {(campaign?.status === "DRAFT" || campaign?.status === "PAUSED") && (
            <>
              <div className="relative">
                <button onClick={() => setShowSchedule(!showSchedule)} className="btn-secondary flex items-center gap-2 text-sm">
                  <Clock size={14} /> Schedule
                </button>
                {showSchedule && (
                  <div className="absolute right-0 top-11 z-20 card p-4 w-72 shadow-2xl">
                    <p className="text-sm font-semibold text-white mb-3">Schedule launch</p>
                    <input
                      type="datetime-local"
                      className="input mb-3 text-sm"
                      value={scheduleAt}
                      onChange={(e) => setScheduleAt(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setShowSchedule(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
                      <button onClick={scheduleCampaign} disabled={scheduling || !scheduleAt} className="btn-primary flex-1 text-sm">
                        {scheduling ? "Scheduling…" : "Confirm"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={launch} className="btn-primary flex items-center gap-2">
                <Play size={15} /> Launch Now
              </button>
            </>
          )}
          {campaign?.status === "RUNNING" && (
            <button
              onClick={pause}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-400/25 rounded-xl hover:bg-amber-500/30 font-semibold text-sm transition-all"
            >
              <Pause size={15} /> Pause
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Leads", value: stats.totalLeads, glow: "#8b5cf6" },
              { label: "Sent", value: stats.sent, glow: "#3b82f6" },
              { label: "Failed", value: stats.failed, glow: "#ef4444" },
              { label: "Replies", value: stats.replies, glow: "#10b981" },
            ].map(({ label, value, glow }) => (
              <div key={label} className="card p-4 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl" style={{ background: `linear-gradient(90deg, transparent, ${glow}50, transparent)` }} />
                <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
                <p className="text-xs text-white/35 mt-1 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
          {stats.ab?.length > 0 && (
            <div className="card p-5 mb-8">
              <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">A/B Test Results</p>
              <div className="grid grid-cols-2 gap-4">
                {stats.ab.map((v: any) => (
                  <div
                    key={v.variant}
                    className="rounded-xl px-4 py-3 border"
                    style={v.variant === "A"
                      ? { background: "rgba(59,130,246,0.08)", borderColor: "rgba(59,130,246,0.2)" }
                      : { background: "rgba(139,92,246,0.08)", borderColor: "rgba(139,92,246,0.2)" }}
                  >
                    <p className={`text-xs font-bold mb-1 ${v.variant === "A" ? "text-blue-400" : "text-purple-400"}`}>Variant {v.variant}</p>
                    <p className="text-sm text-white/70">{v.sent} sent · {v.opens} opens</p>
                    <p className="text-xs text-white/35">{v.sent > 0 ? Math.round((v.opens / v.sent) * 100) : 0}% open rate</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(!stats.ab || stats.ab.length === 0) && <div className="mb-6" />}
        </>
      )}

      {/* Add Leads */}
      <AddLeadsPanel campaignId={id} wid={wid} onAdded={load} />

      {/* Manual Fire */}
      <div className="mb-8">
        <ManualSequenceTrigger
          sequences={sequences}
          campaignId={id}
          wid={wid}
          campaignFromName={campaign?.fromName}
        />
      </div>

      {/* Sequence Builder */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Email Sequence</h2>
            <p className="text-xs text-white/30 mt-0.5">{sequences.length} / 4 steps — 1 initial + up to 3 follow-ups</p>
          </div>
          {sequences.length < 4 && (
            <button onClick={() => setAddingStep(!addingStep)} className="btn-secondary flex items-center gap-2 text-sm">
              <Plus size={15} /> Add Step
            </button>
          )}
        </div>

        {sequences.length === 0 && !addingStep && (
          <div className="card p-10 text-center text-white/25">
            <p className="font-medium">No steps yet</p>
            <p className="text-sm mt-1">Add email steps to build your sequence</p>
          </div>
        )}

        <div className="space-y-4">
          {sequences.map((seq, i) => (
            <div key={seq.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600/50 to-brand-800/30 border border-brand-400/20 flex items-center justify-center text-sm font-bold text-brand-300">
                    {i + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white/80 text-sm">{seq.subject}</p>
                      {seq.subjectB && (
                        <span className="text-xs bg-purple-400/15 text-purple-300 ring-1 ring-purple-400/25 px-2 py-0.5 rounded-full font-semibold">A/B</span>
                      )}
                    </div>
                    <p className="text-xs text-white/35 mt-0.5">
                      {seq.delayDays === 0 ? "Send immediately" : `Wait ${seq.delayDays} day${seq.delayDays !== 1 ? "s" : ""} after previous`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPreviewSeq(seq)}
                    className="flex items-center gap-1 text-xs text-white/30 hover:text-brand-400 transition-colors font-medium"
                  >
                    <Eye size={13} /> Preview
                  </button>
                  <button onClick={() => deleteStep(seq.id)} className="text-white/20 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-white/45 line-clamp-3 bg-white/[0.04] rounded-xl px-4 py-3 border border-white/[0.07] leading-relaxed">
                {stripHtml(seq.body)}
              </p>
            </div>
          ))}
        </div>

        {addingStep && (
          <form onSubmit={addStep} className="card p-5 mt-4 space-y-4">
            <h3 className="font-semibold text-white text-sm">New Step (Step {sequences.length + 1})</h3>
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Subject *</label>
              <input
                className="input"
                value={newStep.subject}
                onChange={(e) => setNewStep({ ...newStep, subject: e.target.value })}
                placeholder="Quick question about {{company}}"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                Email Body * — use &#123;&#123;name&#125;&#125;, &#123;&#123;company&#125;&#125;, &#123;&#123;icebreaker&#125;&#125;
              </label>
              <EmailBodyEditor
                value={newStep.body}
                onChange={(html) => setNewStep({ ...newStep, body: html })}
                placeholder="Hi {{name}},&#10;&#10;{{icebreaker}}&#10;&#10;I noticed {{company}} is doing great work in..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Delay (days after previous step)</label>
              <input
                type="number" min={0} max={30} className="input w-32"
                value={newStep.delayDays}
                onChange={(e) => setNewStep({ ...newStep, delayDays: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="border-t border-white/[0.07] pt-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-sm text-white/60 font-medium">
                <input
                  type="checkbox"
                  checked={newStep.abTest}
                  onChange={(e) => setNewStep({ ...newStep, abTest: e.target.checked })}
                  className="rounded border-white/20"
                />
                A/B test this step <span className="text-xs font-normal text-white/30">(split leads 50/50 between two variants)</span>
              </label>
            </div>
            {newStep.abTest && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Subject — Variant B</label>
                  <input className="input" value={newStep.subjectB} onChange={(e) => setNewStep({ ...newStep, subjectB: e.target.value })} placeholder="Different subject line for B group" required={newStep.abTest} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Email Body — Variant B</label>
                  <EmailBodyEditor
                    value={newStep.bodyB}
                    onChange={(html) => setNewStep({ ...newStep, bodyB: html })}
                    placeholder="Alternative email body for B group…"
                  />
                </div>
              </>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={() => setAddingStep(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : "Add Step"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
