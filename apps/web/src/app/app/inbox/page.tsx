"use client";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";

const SENTIMENT_STYLES: Record<string, string> = {
  INTERESTED: "bg-green-100 text-green-700",
  OBJECTION: "bg-yellow-100 text-yellow-700",
  NOT_INTERESTED: "bg-red-100 text-red-700",
  UNSUBSCRIBE: "bg-gray-100 text-gray-600",
  OTHER: "bg-blue-50 text-blue-600",
};

const SENTIMENT_LABELS: Record<string, string> = {
  INTERESTED: "Interested",
  OBJECTION: "Objection",
  NOT_INTERESTED: "Not interested",
  UNSUBSCRIBE: "Unsubscribe",
  OTHER: "Other",
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

  const filtered = sentimentFilter === "ALL"
    ? replies
    : replies.filter((r) => r.sentiment === sentimentFilter);

  const counts = replies.reduce((acc, r) => {
    acc[r.sentiment || "OTHER"] = (acc[r.sentiment || "OTHER"] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
        <p className="text-sm text-gray-500 mt-1">{total} reply{total !== 1 ? "s" : ""} received</p>
      </div>

      {/* Sentiment summary */}
      {total > 0 && (
        <div className="grid grid-cols-5 gap-2 mb-5">
          {(["INTERESTED", "OBJECTION", "NOT_INTERESTED", "UNSUBSCRIBE", "OTHER"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSentimentFilter(sentimentFilter === s ? "ALL" : s)}
              className={`rounded-lg p-3 text-center border transition-all ${
                sentimentFilter === s ? "ring-2 ring-brand-500 " : ""
              }${SENTIMENT_STYLES[s]} border-transparent`}
            >
              <p className="text-lg font-bold">{counts[s] || 0}</p>
              <p className="text-xs mt-0.5">{SENTIMENT_LABELS[s]}</p>
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
        AI automatically classifies each reply. Connect your IMAP or use the webhook endpoint to enable auto-detection.
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <MessageSquare size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">
              {sentimentFilter !== "ALL" ? `No ${SENTIMENT_LABELS[sentimentFilter]?.toLowerCase()} replies` : "No replies yet"}
            </p>
            <p className="text-sm text-gray-400 mt-1">Replies from your leads will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((reply) => (
              <div key={reply.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(expanded === reply.id ? null : reply.id)}>
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">{reply.fromEmail}</span>
                    {reply.lead && (
                      <span className="text-xs text-gray-500">
                        {[reply.lead.firstName, reply.lead.lastName].filter(Boolean).join(" ")}
                        {reply.lead.company && ` · ${reply.lead.company}`}
                      </span>
                    )}
                    {reply.sentiment && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SENTIMENT_STYLES[reply.sentiment]}`}>
                        {SENTIMENT_LABELS[reply.sentiment]}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">
                    {new Date(reply.receivedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">{reply.subject}</p>
                {expanded === reply.id ? (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">{reply.body}</p>
                ) : (
                  <p className="text-sm text-gray-500 line-clamp-2">{reply.body}</p>
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
