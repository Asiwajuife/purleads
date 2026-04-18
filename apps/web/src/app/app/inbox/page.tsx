"use client";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";

const SENTIMENT_PILL: Record<string, string> = {
  INTERESTED: "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/25",
  OBJECTION: "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/25",
  NOT_INTERESTED: "bg-red-400/15 text-red-300 ring-1 ring-red-400/25",
  UNSUBSCRIBE: "bg-white/[0.08] text-white/40 ring-1 ring-white/10",
  OTHER: "bg-blue-400/15 text-blue-300 ring-1 ring-blue-400/25",
};

const SENTIMENT_LABELS: Record<string, string> = {
  INTERESTED: "Interested",
  OBJECTION: "Objection",
  NOT_INTERESTED: "Not interested",
  UNSUBSCRIBE: "Unsubscribe",
  OTHER: "Other",
};

const SENTIMENT_GLOW: Record<string, string> = {
  INTERESTED: "#10b981",
  OBJECTION: "#f59e0b",
  NOT_INTERESTED: "#ef4444",
  UNSUBSCRIBE: "#ffffff",
  OTHER: "#3b82f6",
};

export default function InboxPage() {
  const [replies, setReplies] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sentimentFilter, setSentimentFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const wid = getWorkspaceId() || "";

  async function load() {
    setLoading(true);
    try {
      const res = await api.replies.list(wid, page) as any;
      setReplies(res.replies);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (wid) load(); }, [wid, page]);

  const filtered = sentimentFilter === "ALL" ? replies : replies.filter((r) => r.sentiment === sentimentFilter);

  const counts = replies.reduce((acc, r) => {
    acc[r.sentiment || "OTHER"] = (acc[r.sentiment || "OTHER"] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Inbox</h1>
        <p className="text-white/40 text-sm mt-1">{total} repl{total !== 1 ? "ies" : "y"} received</p>
      </div>

      {/* Sentiment pills */}
      {total > 0 && (
        <div className="grid grid-cols-5 gap-2 mb-6">
          {(["INTERESTED", "OBJECTION", "NOT_INTERESTED", "UNSUBSCRIBE", "OTHER"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSentimentFilter(sentimentFilter === s ? "ALL" : s)}
              className={`relative card p-3.5 text-center transition-all duration-150 overflow-hidden ${
                sentimentFilter === s ? "ring-1 ring-brand-400/50" : "hover:bg-white/[0.09]"
              }`}
            >
              {sentimentFilter === s && (
                <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 50%, ${SENTIMENT_GLOW[s]}15, transparent 70%)` }} />
              )}
              <p className="text-xl font-bold text-white relative">{counts[s] || 0}</p>
              <p className="text-[10px] text-white/40 mt-0.5 relative leading-tight">{SENTIMENT_LABELS[s]}</p>
            </button>
          ))}
        </div>
      )}

      <div className="mb-5 px-4 py-3 rounded-xl bg-blue-500/[0.1] border border-blue-400/20 text-xs text-blue-300">
        AI automatically classifies each reply. Connect your IMAP or use the webhook endpoint to enable auto-detection.
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="px-6 py-14 flex items-center justify-center gap-3 text-white/30 text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-brand-400 animate-spin" />
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={24} className="text-white/20" />
            </div>
            <p className="text-white/50 font-medium">
              {sentimentFilter !== "ALL" ? `No ${SENTIMENT_LABELS[sentimentFilter]?.toLowerCase()} replies` : "No replies yet"}
            </p>
            <p className="text-sm text-white/25 mt-1">Replies from your leads will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filtered.map((reply) => (
              <div
                key={reply.id}
                className={`px-6 py-4 hover:bg-white/[0.04] cursor-pointer transition-colors ${expanded === reply.id ? "bg-white/[0.04]" : ""}`}
                onClick={() => setExpanded(expanded === reply.id ? null : reply.id)}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white/80 text-sm">{reply.fromEmail}</span>
                    {reply.lead && (
                      <span className="text-xs text-white/35">
                        {[reply.lead.firstName, reply.lead.lastName].filter(Boolean).join(" ")}
                        {reply.lead.company && ` · ${reply.lead.company}`}
                      </span>
                    )}
                    {reply.sentiment && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${SENTIMENT_PILL[reply.sentiment]}`}>
                        {SENTIMENT_LABELS[reply.sentiment]}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-white/25 shrink-0 ml-3">
                    {new Date(reply.receivedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm font-medium text-white/60 mb-1">{reply.subject}</p>
                {expanded === reply.id ? (
                  <p className="text-sm text-white/50 whitespace-pre-wrap mt-3 bg-white/[0.05] rounded-xl px-4 py-3 border border-white/[0.08]">
                    {reply.body}
                  </p>
                ) : (
                  <p className="text-sm text-white/35 line-clamp-2">{reply.body}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {Math.ceil(total / 50) > 1 && (
        <div className="flex justify-center gap-3 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs px-3 py-1.5">Previous</button>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / 50)} className="btn-secondary text-xs px-3 py-1.5">Next</button>
        </div>
      )}
    </div>
  );
}
