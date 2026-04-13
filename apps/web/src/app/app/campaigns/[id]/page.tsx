"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Play, Pause, Eye, X, Copy, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";

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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Email Preview <span className="text-xs text-gray-400 font-normal ml-2">(sample lead: John Smith, Acme Corp)</span></h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Subject</p>
            <p className="text-gray-900 font-medium">{applyVars(seq.subject)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Body</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{applyVars(seq.body)}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 text-xs text-blue-700">
            <p className="font-medium mb-1">What AI will add per lead:</p>
            <p>A personalized icebreaker sentence will be generated based on each lead&apos;s company, title, and website — replacing the <code className="bg-blue-100 px-1 rounded">&#123;&#123;icebreaker&#125;&#125;</code> placeholder or prepended to the body.</p>
          </div>
          <div className="text-xs text-gray-400 border-t pt-3">
            <p className="font-medium mb-1 text-gray-500">Footer added automatically:</p>
            <p>If you&apos;d prefer not to receive emails like this, you can <span className="underline">unsubscribe here</span>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    setCampaign(c);
    setSequences(seqs);
    setStats(s);
    setLoading(false);
  }

  useEffect(() => { if (wid && id) load(); }, [wid, id]);

  async function addStep(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.sequences.create(wid, id, {
        subject: newStep.subject,
        body: newStep.body,
        step: sequences.length + 1,
        delayDays: Number(newStep.delayDays),
        ...(newStep.abTest && newStep.subjectB ? { subjectB: newStep.subjectB, bodyB: newStep.bodyB } : {}),
      });
      setNewStep({ subject: "", body: "", delayDays: 0, subjectB: "", bodyB: "", abTest: false });
      setAddingStep(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteStep(seqId: string) {
    await api.sequences.delete(wid, id, seqId);
    load();
  }

  async function launch() {
    try {
      const res = await api.campaigns.launch(wid, id) as any;
      alert(`Campaign launched! ${res.queued} emails queued.`);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function pause() {
    await api.campaigns.pause(wid, id);
    load();
  }

  async function scheduleCampaign() {
    if (!scheduleAt) return;
    setScheduling(true);
    try {
      await api.campaigns.schedule(wid, id, new Date(scheduleAt).toISOString());
      setShowSchedule(false);
      alert(`Campaign scheduled for ${new Date(scheduleAt).toLocaleString()}`);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setScheduling(false);
    }
  }

  async function cloneCampaign() {
    setCloning(true);
    try {
      const newCampaign = await api.campaigns.create(wid, {
        name: `${campaign.name} (copy)`,
        fromName: campaign.fromName,
        replyTo: campaign.replyTo,
      }) as any;
      for (const seq of sequences) {
        await api.sequences.create(wid, newCampaign.id, {
          subject: seq.subject,
          body: seq.body,
          step: seq.step,
          delayDays: seq.delayDays,
          ...(seq.subjectB ? { subjectB: seq.subjectB, bodyB: seq.bodyB } : {}),
        });
      }
      router.push(`/app/campaigns/${newCampaign.id}`);
    } finally {
      setCloning(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-gray-400 text-sm">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {previewSeq && <PreviewModal seq={previewSeq} onClose={() => setPreviewSeq(null)} />}

      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft size={16} />
        Back to Campaigns
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{campaign?.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`badge-${campaign?.status?.toLowerCase()}`}>{campaign?.status}</span>
            <span className="text-sm text-gray-500">
              {campaign?.fromName && `From: ${campaign.fromName}`}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={cloneCampaign}
            disabled={cloning}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Copy size={14} />
            {cloning ? "Cloning..." : "Clone"}
          </button>
          {(campaign?.status === "DRAFT" || campaign?.status === "PAUSED") && (
            <>
              <div className="relative">
                <button onClick={() => setShowSchedule(!showSchedule)} className="btn-secondary flex items-center gap-2 text-sm">
                  <Clock size={14} />
                  Schedule
                </button>
                {showSchedule && (
                  <div className="absolute right-0 top-10 z-20 bg-white rounded-xl shadow-xl border border-gray-100 p-4 w-72">
                    <p className="text-sm font-medium text-gray-900 mb-3">Schedule launch</p>
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
                        {scheduling ? "Scheduling..." : "Confirm"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={launch} className="btn-primary flex items-center gap-2">
                <Play size={15} />
                Launch Now
              </button>
            </>
          )}
          {campaign?.status === "RUNNING" && (
            <button onClick={pause} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium text-sm">
              <Pause size={15} />
              Pause
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Leads", value: stats.totalLeads },
              { label: "Sent", value: stats.sent },
              { label: "Failed", value: stats.failed },
              { label: "Replies", value: stats.replies },
            ].map(({ label, value }) => (
              <div key={label} className="card p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
          {stats.ab?.length > 0 && (
            <div className="card p-4 mb-8">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">A/B Test Results</p>
              <div className="grid grid-cols-2 gap-4">
                {stats.ab.map((v: any) => (
                  <div key={v.variant} className={`rounded-lg px-4 py-3 border ${v.variant === "A" ? "bg-blue-50 border-blue-100" : "bg-purple-50 border-purple-100"}`}>
                    <p className={`text-xs font-bold mb-1 ${v.variant === "A" ? "text-blue-700" : "text-purple-700"}`}>Variant {v.variant}</p>
                    <p className="text-sm text-gray-700">{v.sent} sent · {v.opens} opens</p>
                    <p className="text-xs text-gray-500">{v.sent > 0 ? Math.round((v.opens / v.sent) * 100) : 0}% open rate</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(!stats.ab || stats.ab.length === 0) && <div className="mb-8" />}
        </>
      )}

      {/* Sequence Builder */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Email Sequence</h2>
          <button
            onClick={() => setAddingStep(!addingStep)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Plus size={15} />
            Add Step
          </button>
        </div>

        {sequences.length === 0 && !addingStep && (
          <div className="card p-8 text-center text-gray-400">
            <p className="font-medium">No steps yet</p>
            <p className="text-sm mt-1">Add email steps to build your sequence</p>
          </div>
        )}

        <div className="space-y-4">
          {sequences.map((seq, i) => (
            <div key={seq.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{seq.subject}</p>
                      {seq.subjectB && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">A/B</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {seq.delayDays === 0
                        ? "Send immediately"
                        : `Wait ${seq.delayDays} day${seq.delayDays !== 1 ? "s" : ""} after previous`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewSeq(seq)}
                    className="text-gray-400 hover:text-brand-600 flex items-center gap-1 text-xs"
                  >
                    <Eye size={14} />
                    Preview
                  </button>
                  <button onClick={() => deleteStep(seq.id)} className="text-gray-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                {seq.body}
              </p>
            </div>
          ))}
        </div>

        {addingStep && (
          <form onSubmit={addStep} className="card p-5 mt-4 space-y-4">
            <h3 className="font-semibold text-gray-900 text-sm">New Step (Step {sequences.length + 1})</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
              <input
                className="input"
                value={newStep.subject}
                onChange={(e) => setNewStep({ ...newStep, subject: e.target.value })}
                placeholder="Quick question about {{company}}"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Email Body * (use &#123;&#123;name&#125;&#125;, &#123;&#123;company&#125;&#125;, &#123;&#123;icebreaker&#125;&#125;)
              </label>
              <textarea
                className="input min-h-[140px] resize-none"
                value={newStep.body}
                onChange={(e) => setNewStep({ ...newStep, body: e.target.value })}
                placeholder="Hi {{name}},&#10;&#10;{{icebreaker}}&#10;&#10;I noticed {{company}} is doing great work in...&#10;&#10;Best,&#10;[Your name]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Delay (days after previous step)
              </label>
              <input
                type="number"
                min={0}
                max={30}
                className="input w-32"
                value={newStep.delayDays}
                onChange={(e) => setNewStep({ ...newStep, delayDays: parseInt(e.target.value) || 0 })}
              />
            </div>
            {/* A/B Test toggle */}
            <div className="border-t border-gray-100 pt-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 font-medium">
                <input
                  type="checkbox"
                  checked={newStep.abTest}
                  onChange={(e) => setNewStep({ ...newStep, abTest: e.target.checked })}
                />
                A/B test this step <span className="text-xs font-normal text-gray-500">(split leads 50/50 between two variants)</span>
              </label>
            </div>
            {newStep.abTest && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subject — Variant B</label>
                  <input
                    className="input"
                    value={newStep.subjectB}
                    onChange={(e) => setNewStep({ ...newStep, subjectB: e.target.value })}
                    placeholder="Different subject line for B group"
                    required={newStep.abTest}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email Body — Variant B</label>
                  <textarea
                    className="input min-h-[140px] resize-none"
                    value={newStep.bodyB}
                    onChange={(e) => setNewStep({ ...newStep, bodyB: e.target.value })}
                    placeholder="Alternative email body for B group..."
                  />
                </div>
              </>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={() => setAddingStep(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Saving..." : "Add Step"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
