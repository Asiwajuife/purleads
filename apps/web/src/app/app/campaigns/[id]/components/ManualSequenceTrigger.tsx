"use client";
import { useState } from "react";
import { Zap } from "lucide-react";
import LeadSearchCombobox, { type LeadOption } from "./LeadSearchCombobox";
import SequenceStepper from "./SequenceStepper";

interface Sequence {
  id: string;
  step: number;
  subject: string;
  body: string;
  delayDays: number;
  subjectB?: string | null;
}

interface Props {
  sequences: Sequence[];
  campaignId: string;
  wid: string;
  campaignFromName?: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/25",
  UNSUBSCRIBED: "bg-gray-400/15 text-gray-300 ring-gray-400/25",
  BOUNCED: "bg-red-400/15 text-red-300 ring-red-400/25",
  REPLIED: "bg-blue-400/15 text-blue-300 ring-blue-400/25",
};

function LeadCard({ lead }: { lead: LeadOption }) {
  const initials = [lead.firstName?.[0], lead.lastName?.[0]].filter(Boolean).join("").toUpperCase() || (lead.email?.[0] ?? "?").toUpperCase();
  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "—";
  const badgeClass = STATUS_BADGE[lead.status] ?? STATUS_BADGE.ACTIVE;

  return (
    <div className="flex items-center gap-3 mt-3 px-3.5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600/50 to-brand-800/30 border border-brand-400/20 flex items-center justify-center text-sm font-bold text-brand-300 shrink-0">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white/85 truncate">{fullName}</p>
        <p className="text-xs text-white/40 truncate">{lead.email}{lead.company ? ` · ${lead.company}` : ""}</p>
      </div>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${badgeClass} shrink-0`}>
        {lead.status.toLowerCase()}
      </span>
    </div>
  );
}

export default function ManualSequenceTrigger({ sequences, campaignId, wid, campaignFromName }: Props) {
  const [lead, setLead] = useState<LeadOption | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="card p-5 relative overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
        style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.35), transparent)" }}
      />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2.5">
          <Zap size={15} className="text-brand-400" />
          <span className="text-sm font-semibold text-white/80">Manual Fire</span>
          <span className="text-xs text-white/30 font-normal">send a sequence step to any lead right now</span>
        </div>
        <span className={`text-xs text-white/30 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
              Pick a Lead
            </label>
            <LeadSearchCombobox wid={wid} selected={lead} onSelect={setLead} />
            {lead && <LeadCard lead={lead} />}
          </div>

          {lead && (
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                Sequence Steps
              </label>
              <SequenceStepper
                sequences={sequences}
                lead={lead}
                campaignId={campaignId}
                wid={wid}
                campaignFromName={campaignFromName}
              />
            </div>
          )}

          {!lead && (
            <p className="text-xs text-white/25 italic">Select a lead above to see the sequence steps.</p>
          )}
        </div>
      )}
    </div>
  );
}
