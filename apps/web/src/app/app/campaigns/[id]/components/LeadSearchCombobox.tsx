"use client";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { api } from "@/lib/api";

export interface LeadOption {
  id: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  email: string | null;
  status: string;
}

interface Props {
  wid: string;
  selected: LeadOption | null;
  onSelect: (lead: LeadOption | null) => void;
}

export default function LeadSearchCombobox({ wid, selected, onSelect }: Props) {
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

  if (selected) {
    return (
      <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-brand-400/40 bg-brand-500/10">
        <Search size={14} className="text-brand-400 shrink-0" />
        <span className="flex-1 text-sm text-white/80 truncate">
          {[selected.firstName, selected.lastName].filter(Boolean).join(" ") || selected.email}
          {selected.company && <span className="text-white/40 ml-1">· {selected.company}</span>}
        </span>
        <button onClick={() => { onSelect(null); setQuery(""); }} className="text-white/30 hover:text-white/70 transition-colors">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
        <input
          className="input pl-9"
          placeholder="Search leads by name, email or company…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-brand-400 animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1.5 w-full card py-1 shadow-xl max-h-56 overflow-y-auto">
          {results.map((lead) => {
            const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
            return (
              <button
                key={lead.id}
                type="button"
                className="w-full text-left px-3.5 py-2.5 hover:bg-white/[0.08] transition-colors"
                onMouseDown={(e) => { e.preventDefault(); onSelect(lead); setQuery(""); setOpen(false); }}
              >
                <p className="text-sm text-white/85 font-medium truncate">{name || lead.email}</p>
                <p className="text-xs text-white/40 truncate">
                  {lead.email}{lead.company ? ` · ${lead.company}` : ""}
                </p>
              </button>
            );
          })}
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
