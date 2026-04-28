"use client";
import { useEffect, useRef, useState } from "react";
import { Send, CheckCircle2, RefreshCw, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  fromName: string | null;
  replyTo: string | null;
  inbox: { id: string; name: string; email: string } | null;
  sequences: Sequence[];
}

interface Sequence {
  id: string;
  step: number;
  subject: string;
  body: string;
  delayDays: number;
}

interface LeadOption {
  id: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  email: string | null;
  status: string;
}

// ─── Template variable substitution ──────────────────────────────────────────

function applyVars(text: string, firstName: string, lastName: string, company: string): string {
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "there";
  return text
    .replace(/\{\{firstName\}\}/gi, firstName || fullName)
    .replace(/\{\{name\}\}/gi, fullName)
    .replace(/\{\{company\}\}/gi, company)
    .replace(/\{\{company_name\}\}/gi, company)
    .replace(/\{\{title\}\}/gi, "")
    .replace(/\{\{icebreaker\}\}/gi, "");
}

// ─── HTML preview builder (mirrors API buildHtml) ─────────────────────────────

function buildPreviewHtml(body: string): string {
  const htmlBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px">
  <div style="margin-bottom:32px">${htmlBody}</div>
  <div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:16px;font-size:12px;color:#9ca3af">
    <p style="margin:0">If you'd prefer not to receive emails like this, you can <a href="#" style="color:#6b7280">unsubscribe here</a>.</p>
  </div>
</body>
</html>`;
}

// ─── Lead Search Combobox ─────────────────────────────────────────────────────

function LeadSearchCombobox({
  wid,
  onSelect,
}: {
  wid: string;
  onSelect: (lead: LeadOption) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LeadOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.leads.search(wid, query) as any;
        setResults(res.leads ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, wid]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
        <input
          className="input pl-9"
          placeholder="Search existing leads to auto-fill…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-brand-400 animate-spin" />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1.5 w-full card py-1 shadow-xl max-h-48 overflow-y-auto">
          {results.map((lead) => (
            <button
              key={lead.id}
              type="button"
              className="w-full text-left px-3.5 py-2.5 hover:bg-white/[0.08] transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(lead);
                setQuery("");
                setOpen(false);
              }}
            >
              <p className="text-sm text-white/85 font-medium truncate">
                {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email}
              </p>
              <p className="text-xs text-white/40 truncate">
                {lead.email}{lead.company ? ` · ${lead.company}` : ""}
              </p>
            </button>
          ))}
        </div>
      )}
      {open && !loading && results.length === 0 && query.trim() && (
        <div className="absolute z-30 mt-1.5 w-full card px-4 py-3 text-sm text-white/35">
          No leads found for "{query}"
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  email: "",
  cc: "",
  firstName: "",
  lastName: "",
  company: "",
};

export default function SendEmailPage() {
  const wid = getWorkspaceId() || "";

  // Campaign + sequence selection
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedSequenceId, setSelectedSequenceId] = useState("");
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  // Recipient fields
  const [form, setForm] = useState(EMPTY_FORM);
  const [leadSelected, setLeadSelected] = useState(false);

  // Send state
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!wid) return;
    api.campaigns.list(wid).then((res: any) => {
      const withSeqs: Campaign[] = [];
      // Fetch full detail for each campaign to get sequences
      Promise.all(
        (res as any[]).map((c: any) =>
          api.campaigns.get(wid, c.id).then((full: any) => ({
            id: full.id,
            name: full.name,
            fromName: full.fromName,
            replyTo: full.replyTo,
            inbox: full.inbox ?? null,
            sequences: full.sequences ?? [],
          }))
        )
      ).then((all) => {
        setCampaigns(all.filter((c) => c.sequences.length > 0));
        setLoadingCampaigns(false);
      });
    }).catch(() => setLoadingCampaigns(false));
  }, [wid]);

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) ?? null;
  const sequences = selectedCampaign?.sequences ?? [];
  const selectedSequence = sequences.find((s) => s.id === selectedSequenceId) ?? null;

  // Auto-select first sequence when campaign changes
  useEffect(() => {
    if (sequences.length > 0) {
      setSelectedSequenceId(sequences[0].id);
    } else {
      setSelectedSequenceId("");
    }
  }, [selectedCampaignId]);

  function handleLeadSelect(lead: LeadOption) {
    setForm({
      email: lead.email || "",
      cc: "",
      firstName: lead.firstName || "",
      lastName: lead.lastName || "",
      company: lead.company || "",
    });
    setLeadSelected(true);
  }

  function clearLead() {
    setForm(EMPTY_FORM);
    setLeadSelected(false);
  }

  const previewSubject = selectedSequence
    ? applyVars(selectedSequence.subject, form.firstName, form.lastName, form.company)
    : "";
  const previewBody = selectedSequence
    ? applyVars(selectedSequence.body, form.firstName, form.lastName, form.company)
    : "";
  const previewHtml = selectedSequence ? buildPreviewHtml(previewBody) : "";

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCampaignId) { setError("Select a campaign"); return; }
    if (!selectedSequenceId) { setError("Select a template step"); return; }
    if (!form.email.trim()) { setError("Recipient email is required"); return; }

    setSending(true);
    setError("");
    setSuccess(false);

    try {
      await api.emails.sendCompose(wid, {
        campaignId: selectedCampaignId,
        sequenceId: selectedSequenceId,
        email: form.email.trim(),
        cc: form.cc.trim() || undefined,
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        company: form.company.trim() || undefined,
      });
      setSuccess(true);
      setForm(EMPTY_FORM);
      setLeadSelected(false);
    } catch (err: any) {
      setError(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Send Email</h1>
        <p className="text-sm text-white/35 mt-1">Compose and send a one-off email using a campaign template</p>
      </div>

      {/* Top row: Campaign + Template + Subject */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div>
          <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
            Campaign
          </label>
          {loadingCampaigns ? (
            <div className="input flex items-center gap-2 text-white/30">
              <RefreshCw size={13} className="animate-spin" /> Loading…
            </div>
          ) : (
            <select
              className="input"
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
            >
              <option value="">Select campaign…</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
            Template
          </label>
          <select
            className="input"
            value={selectedSequenceId}
            onChange={(e) => setSelectedSequenceId(e.target.value)}
            disabled={sequences.length === 0}
          >
            {sequences.length === 0
              ? <option value="">— pick a campaign first —</option>
              : sequences.map((s) => (
                <option key={s.id} value={s.id}>
                  Step {s.step}{s.delayDays > 0 ? ` · Day ${s.delayDays}` : " · Day 0"} — {s.subject.slice(0, 40)}{s.subject.length > 40 ? "…" : ""}
                </option>
              ))
            }
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
            Subject
          </label>
          <input
            className="input bg-white/[0.03] text-white/50 cursor-default"
            readOnly
            value={previewSubject}
            placeholder="Auto-filled from template"
          />
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-[400px_1fr] gap-6 items-start">
        {/* Left: Recipient form */}
        <form onSubmit={handleSend} className="card p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
              Search Existing Lead
            </label>
            {leadSelected ? (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-brand-400/40 bg-brand-500/10">
                <Search size={14} className="text-brand-400 shrink-0" />
                <span className="flex-1 text-sm text-white/70 truncate">
                  {[form.firstName, form.lastName].filter(Boolean).join(" ") || form.email}
                </span>
                <button type="button" onClick={clearLead} className="text-white/30 hover:text-white/70 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <LeadSearchCombobox wid={wid} onSelect={handleLeadSelect} />
            )}
          </div>

          <div className="border-t border-white/[0.06] pt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                Email *
              </label>
              <input
                className="input"
                type="email"
                placeholder="recipient@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                CC Email
              </label>
              <input
                className="input"
                type="email"
                placeholder="cc@example.com"
                value={form.cc}
                onChange={(e) => setForm((f) => ({ ...f, cc: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                  First Name
                </label>
                <input
                  className="input"
                  placeholder="John"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                  Last Name
                </label>
                <input
                  className="input"
                  placeholder="Smith"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                Company
              </label>
              <input
                className="input"
                placeholder="Acme Corp"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 px-3.5 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 px-3.5 py-2.5 rounded-xl">
              <CheckCircle2 size={15} />
              Email sent successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={sending || !selectedCampaignId || !selectedSequenceId}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-brand-600/80 text-white border border-brand-400/30 hover:bg-brand-500/80 disabled:opacity-40 transition-colors"
          >
            {sending ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send size={14} />
                Send Email
              </>
            )}
          </button>
        </form>

        {/* Right: Live preview */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Preview</span>
            {previewSubject && (
              <span className="text-xs text-white/30 truncate max-w-xs">{previewSubject}</span>
            )}
          </div>
          {selectedSequence ? (
            <iframe
              key={previewHtml}
              srcDoc={previewHtml}
              className="w-full border-0"
              style={{ height: "600px" }}
              sandbox="allow-same-origin"
              title="Email preview"
            />
          ) : (
            <div className="flex items-center justify-center h-[600px] text-white/20 text-sm">
              Select a campaign and template to see a preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
