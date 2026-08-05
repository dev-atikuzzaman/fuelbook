import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const DICT_META = {
  general: { label: "সাধারণ", icon: "📖" },
  technical: { label: "টেকনিক্যাল", icon: "⚙️" },
  government: { label: "সরকারি", icon: "🏛️" },
};

export default function GlobalSearch({ onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ dict: [], files: [], custom: [] });
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults({ dict: [], files: [], custom: [] });
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(q), 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function runSearch(q) {
    if (!supabase) return;
    setLoading(true);
    const like = `%${q}%`;
    try {
      const [dictRes, filesRes, customRes] = await Promise.all([
        supabase
          .from("dictionary_entries")
          .select("id,dict_type,term,meaning,tags")
          .or(
            `term.ilike.${like},meaning.ilike.${like},explanation.ilike.${like},analogy.ilike.${like},application.ilike.${like},example.ilike.${like},misc.ilike.${like}`
          )
          .limit(12),
        supabase.from("files").select("id,name,folder_path,mime_type").ilike("name", like).limit(10),
        supabase
          .from("custom_entries")
          .select("id,title,main_text,template_id,custom_templates(name)")
          .or(`title.ilike.${like},main_text.ilike.${like}`)
          .limit(10),
      ]);
      setResults({
        dict: dictRes.data || [],
        files: filesRes.data || [],
        custom: customRes.data || [],
      });
      setSearched(true);
    } catch {
      // নীরবে ব্যর্থ হলে খালি ফলাফল দেখাবে
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  const totalCount = results.dict.length + results.files.length + results.custom.length;

  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-start justify-center p-0 md:p-6 md:pt-20">
      <div className="anim-in w-full md:max-w-xl bg-ink-900 md:rounded-2xl border border-gold-500/20 shadow-card flex flex-col max-h-screen md:max-h-[75vh] overflow-hidden">
        <div className="flex items-center gap-2 p-3.5 border-b border-gold-500/10">
          <span className="text-gold-400 text-lg pl-1">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="সব ট্যাব জুড়ে খুঁজো — শব্দ, ফাইল, কাস্টম এন্ট্রি..."
            className="flex-1 bg-transparent text-cream placeholder:text-cream/30 py-1.5"
          />
          <button onClick={onClose} className="text-cream/50 hover:text-cream text-xl px-2">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {query.trim().length < 2 ? (
            <p className="text-cream/30 text-sm text-center py-14">কমপক্ষে ২ অক্ষর লেখো খোঁজা শুরু করতে</p>
          ) : loading ? (
            <p className="text-cream/40 text-sm text-center py-14">খোঁজা হচ্ছে...</p>
          ) : searched && totalCount === 0 ? (
            <p className="text-cream/30 text-sm text-center py-14">কিছু পাওয়া যায়নি</p>
          ) : (
            <div className="flex flex-col gap-4 p-3">
              {results.dict.length > 0 && (
                <ResultGroup title="ডিকশনারি">
                  {results.dict.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => onSelect({ type: "dictionary", dictType: e.dict_type, entryId: e.id })}
                      className="w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5"
                    >
                      <span className="text-lg shrink-0">{DICT_META[e.dict_type]?.icon || "📘"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-cream text-sm font-medium truncate">{e.term}</p>
                        <p className="text-cream/40 text-xs truncate">
                          {DICT_META[e.dict_type]?.label} {e.meaning ? `· ${e.meaning}` : ""}
                        </p>
                      </div>
                    </button>
                  ))}
                </ResultGroup>
              )}

              {results.files.length > 0 && (
                <ResultGroup title="ফাইল">
                  {results.files.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => onSelect({ type: "files", fileId: f.id })}
                      className="w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5"
                    >
                      <span className="text-lg shrink-0">📄</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-cream text-sm font-medium truncate">{f.name}</p>
                        <p className="text-cream/40 text-xs truncate">{f.folder_path ? f.folder_path : "🏠 হোম"}</p>
                      </div>
                    </button>
                  ))}
                </ResultGroup>
              )}

              {results.custom.length > 0 && (
                <ResultGroup title="কাস্টম">
                  {results.custom.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => onSelect({ type: "custom", templateId: e.template_id, entryId: e.id })}
                      className="w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5"
                    >
                      <span className="text-lg shrink-0">🧩</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-cream text-sm font-medium truncate">{e.title}</p>
                        <p className="text-cream/40 text-xs truncate">{e.custom_templates?.name || ""}</p>
                      </div>
                    </button>
                  ))}
                </ResultGroup>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultGroup({ title, children }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gold-400/60 px-2.5 mb-1">{title}</p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}
