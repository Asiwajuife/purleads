"use client";
import { useState, useEffect } from "react";
import { Send, CheckCircle2, ChevronDown, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { LeadOption } from "./LeadSearchCombobox";

interface Sequence {
  id: string;
  step: number;
  subject: string;
  body: string;
  delayDays: number;
  subjectB?: string | null;
}

interface Inbox {
  id: string;
  name: string;
  email: string;
}

interface Props {
  sequences: Sequence[];
  lead: LeadOption;
  campaignId: string;
  wid: string;
  campaignFromName?: string | null;
}

type StepState = "idle" | "confirming" | "sending" | "sent" | "error";

function applyVars(text: string, lead: LeadOption): string {
  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "there";
  return text
    .replace(/\{\{firstName\}\}/gi, lead.firstName || fullName)
    .replace(/\{\{name\}\}/gi, fullName)
    .replace(/\{\{company\}\}/gi, lead.company || "")
    .replace(/\{\{company_name\}\}/gi, lead.company || "")
    .replace(/\{\{title\}\}/gi, "")
    .replace(/\{\{icebreaker\}\}/gi, "");
}

export default function SequenceStepper({ sequences, lead, campaignId, wid }: Props) {
  const [stepStates, setStepStates] = useState<Record<string, StepState>>({});
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null); // sequence id or "all"
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState("");
  const [showInboxPicker, setShowInboxPicker] = useState(false);
  const [sendAllState, setSendAllState] = useState<"idle" | "confirming" | "sending" | "sent" | "error">("idle");
  const [sendAllError, setSendAllError] = useState("");

  useEffect(() => {
    api.inboxes.list(wid).then((res: any) => {
      const active = (res as Inbox[]).filter((i) => (i as any).isActive !== false);
      setInboxes(active);
      if (active.length > 0) setSelectedInboxId(active[0].id);
    });
  }, [wid]);

  const selectedInbox = inboxes.find((i) => i.id === selectedInboxId);

  function setStepState(seqId: string, state: StepState) {
    setStepStates((prev) => ({ ...prev, [seqId]: state }));
  }

  function setStepError(seqId: string, msg: string) {
    setStepErrors((prev) => ({ ...prev, [seqId]: msg }));
  }

  async function doSend(seqId: string): Promise<boolean> {
    try {
      await api.emails.sendManual(wid, { leadId: lead.id, campaignId, sequenceId: seqId, inboxId: selectedInboxId });
      return true;
    } catch (err: any) {
      throw err;
    }
  }

  async function handleConfirmStep(seqId: string) {
    setStepState(seqId, "sending");
    try {
      await doSend(seqId);
      setStepState(seqId, "sent");
      setConfirmingId(null);
    } catch (err: any) {
      setStepState(seqId, "error");
      setStepError(seqId, err.message || "Failed to send");
    }
  }

  async function handleConfirmAll() {
    setSendAllState("sending");
    const errors: string[] = [];
    for (const seq of sequences) {
      const id = seq.id;
      if (stepStates[id] === "sent") continue;
      setStepState(id, "sending");
      try {
        await doSend(id);
        setStepState(id, "sent");
      } catch (err: any) {
        setStepState(id, "error");
        setStepError(id, err.message || "Failed");
        errors.push(`Step ${seq.step}: ${err.message}`);
      }
    }
    if (errors.length === 0) {
      setSendAllState("sent");
    } else {
      setSendAllState("error");
      setSendAllError(errors.join("; "));
    }
    setConfirmingId(null);
  }

  if (sequences.length === 0) {
    return <p className="text-sm text-white/35 py-3">This campaign has no sequence steps yet.</p>;
  }

  const ConfirmArea = ({ seqId, seq }: { seqId: string | "all"; seq?: Sequence }) => {
    const subjectPreview = seq ? applyVars(seq.subject, lead) : null;
    return (
      <div className="mt-3 rounded-xl border border-brand-400/25 bg-brand-500/[0.08] px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/50">
            Sending as:{" "}
            <span className="text-white/80 font-medium">{selectedInbox?.name || "—"}</span>
            {" "}
            <button
              type="button"
              onClick={() => setShowInboxPicker((v) => !v)}
              className="text-brand-400 hover:text-brand-300 underline underline-offset-2 ml-0.5"
            >
              change
            </button>
          </span>
        </div>

        {showInboxPicker && (
          <div className="flex flex-col gap-1">
            {inboxes.map((inbox) => (
              <label key={inbox.id} className="flex items-center gap-2 text-xs cursor-pointer py-1">
                <input
                  type="radio"
                  name="inbox-select"
                  value={inbox.id}
                  checked={selectedInboxId === inbox.id}
                  onChange={() => { setSelectedInboxId(inbox.id); setShowInboxPicker(false); }}
                  className="accent-brand-500"
                />
                <span className="text-white/70">{inbox.name}</span>
                <span className="text-white/35">{inbox.email}</span>
              </label>
            ))}
          </div>
        )}

        {subjectPreview && (
          <div className="text-xs">
            <span className="text-white/40">Subject preview: </span>
            <span className="text-white/75 font-medium">{subjectPreview}</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            disabled={!selectedInboxId}
            onClick={() => seqId === "all" ? handleConfirmAll() : handleConfirmStep(seqId)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/25 hover:bg-emerald-500/30 disabled:opacity-40 transition-colors"
          >
            <Send size={11} />
            Confirm &amp; Send
          </button>
          <button
            type="button"
            onClick={() => setConfirmingId(null)}
            className="text-xs text-white/35 hover:text-white/60 transition-colors px-2"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {sequences.map((seq) => {
        const state = stepStates[seq.id] ?? "idle";
        const isSending = state === "sending";
        const isSent = state === "sent";
        const isError = state === "error";
        const isConfirming = confirmingId === seq.id;

        return (
          <div key={seq.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 shrink-0 rounded-lg bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-xs font-bold text-white/50">
                  {seq.step}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white/80 font-medium truncate">{seq.subject}</p>
                  <p className="text-xs text-white/35 mt-0.5">
                    {seq.delayDays === 0 ? "Day 0 · Send immediately" : `Day ${seq.delayDays}`}
                    {seq.subjectB && <span className="ml-2 text-purple-400/70">A/B</span>}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                {isSent ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                    <CheckCircle2 size={14} />
                    Sent
                  </span>
                ) : isSending ? (
                  <span className="flex items-center gap-1.5 text-xs text-white/40">
                    <RefreshCw size={12} className="animate-spin" />
                    Sending…
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={isConfirming}
                    onClick={() => setConfirmingId(seq.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/[0.07] text-white/60 border border-white/[0.1] hover:bg-white/[0.13] hover:text-white transition-colors disabled:opacity-40"
                  >
                    <Send size={11} />
                    Send now
                  </button>
                )}
              </div>
            </div>

            {isError && (
              <p className="mt-2 text-xs text-red-400">{stepErrors[seq.id]}</p>
            )}

            {isConfirming && <ConfirmArea seqId={seq.id} seq={seq} />}
          </div>
        );
      })}

      {/* Send all */}
      <div className="pt-2">
        {sendAllState === "sent" ? (
          <span className="flex items-center gap-2 text-sm text-emerald-400 font-semibold">
            <CheckCircle2 size={16} />
            All steps sent
          </span>
        ) : sendAllState === "sending" ? (
          <span className="flex items-center gap-2 text-sm text-white/40">
            <RefreshCw size={14} className="animate-spin" />
            Sending all steps…
          </span>
        ) : (
          <>
            <button
              type="button"
              disabled={confirmingId === "all"}
              onClick={() => { setSendAllState("idle"); setSendAllError(""); setConfirmingId("all"); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-brand-600/20 text-brand-300 border border-brand-400/25 hover:bg-brand-600/30 transition-colors disabled:opacity-40"
            >
              <Send size={13} />
              Send all steps
            </button>
            {sendAllState === "error" && (
              <p className="mt-2 text-xs text-red-400">{sendAllError}</p>
            )}
            {confirmingId === "all" && <ConfirmArea seqId="all" />}
          </>
        )}
      </div>
    </div>
  );
}
