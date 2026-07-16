import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import EntryCard from "./EntryCard";
import EntryEditor from "./EntryEditor";

const TITLES = {
  general: { title: "সাধারণ ডিকশনারি", icon: "📖", desc: "রোজকার শব্দ, প্রবাদ, নতুন কিছু শেখা টার্ম" },
  technical: { title: "টেকনিক্যাল ডিকশনারি", icon: "⚙️", desc: "প্রযুক্তি, ইঞ্জিনিয়ারিং, প্রোগ্রামিং টার্ম" },
  government: { title: "সরকারি / দাপ্তরিক ডিকশনারি", icon: "🏛️", desc: "সরকারি নথি, আইন, দাপ্তরিক পরিভাষা" },
};

export default function DictionaryTab({ dictType, onToast }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("সব");
  const [editing, setEditing] = useState(null); // entry or null
  const [showEditor, setShowEditor] = useState(false);

  const meta = TITLES[dictType];

  useEffect(() => {
    let active = true;
    if (!supabase) {
      setLoading(false);
      return;
    }
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("dictionary_entries")
        .select("*")
        .eq("dict_type", dictType)
        .order("term", { ascending: true });
      if (active && !error) setEntries(data || []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel(`dict_${dictType}_changes`)
      .on(
        "postgres_changes",
        // ⚠️ dict_type দিয়ে সার্ভার-সাইড ফিল্টার করা হচ্ছে না ইচ্ছাকৃতভাবে —
        // কোনো এন্ট্রি অন্য ডিকশনারিতে "সরানো" হলে dict_type বদলে যায়, তখন
        // সার্ভার-সাইড ফিল্টার দিয়ে পুরনো ট্যাব থেকে সেটা সরানোর ইভেন্ট আসে না।
        // তাই পুরো টেবিলের changes শুনে ক্লায়েন্ট-সাইডে dict_type চেক করা হচ্ছে।
        { event: "*", schema: "public", table: "dictionary_entries" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            if (payload.new.dict_type !== dictType) return;
            setEntries((prev) =>
              prev.some((e) => e.id === payload.new.id)
                ? prev
                : [...prev, payload.new].sort((a, b) => a.term.localeCompare(b.term, "bn"))
            );
          } else if (payload.eventType === "UPDATE") {
            const belongsHere = payload.new.dict_type === dictType;
            setEntries((prev) => {
              const existed = prev.some((e) => e.id === payload.new.id);
              if (belongsHere) {
                if (existed) return prev.map((e) => (e.id === payload.new.id ? payload.new : e));
                return [...prev, payload.new].sort((a, b) => a.term.localeCompare(b.term, "bn"));
              }
              // অন্য ডিকশনারিতে সরে গেছে — এখান থেকে বাদ দাও
              return existed ? prev.filter((e) => e.id !== payload.new.id) : prev;
            });
          } else if (payload.eventType === "DELETE") {
            setEntries((prev) => prev.filter((e) => e.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [dictType]);

  const allTags = useMemo(() => {
    const s = new Set();
    entries.forEach((e) => (e.tags || []).forEach((t) => s.add(t)));
    return ["সব", ...Array.from(s)];
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      const matchesSearch =
        !q ||
        e.term.toLowerCase().includes(q) ||
        (e.meaning || "").toLowerCase().includes(q) ||
        (e.explanation || "").toLowerCase().includes(q) ||
        (e.tags || []).some((t) => t.toLowerCase().includes(q));
      const matchesTag = activeTag === "সব" || (e.tags || []).includes(activeTag);
      return matchesSearch && matchesTag;
    });
  }, [entries, search, activeTag]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 pb-24 md:pb-8">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-2xl text-gold-400 flex items-center gap-2">
            {meta.icon} {meta.title}
          </h2>
          <p className="text-cream/50 text-sm mt-0.5">{meta.desc}</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowEditor(true);
          }}
          className="shrink-0 bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 py-2.5 rounded-xl shadow-glow text-sm"
        >
          + নতুন শব্দ
        </button>
      </div>

      <div className="glass-card rounded-xl p-3 mb-4 flex flex-col gap-2.5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 শব্দ, অর্থ বা ট্যাগ দিয়ে খুঁজো..."
          className="w-full bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2 text-cream placeholder:text-cream/30 focus:border-gold-500/50"
        />
        {allTags.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTag(t)}
                className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-all ${
                  activeTag === t
                    ? "bg-gold-500 text-ink-950 border-gold-500"
                    : "border-gold-500/20 text-cream/60 hover:text-cream"
                }`}
              >
                {t === "সব" ? "সব" : `#${t}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-cream/40 text-center py-10">লোড হচ্ছে...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-cream/40">
          <p className="text-3xl mb-2">🗒️</p>
          <p>কোনো এন্ট্রি পাওয়া যায়নি। উপরের "+ নতুন শব্দ" থেকে যোগ করো।</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((e) => (
            <EntryCard
              key={e.id}
              entry={e}
              onClick={() => {
                setEditing(e);
                setShowEditor(true);
              }}
            />
          ))}
        </div>
      )}

      {showEditor && (
        <EntryEditor
          dictType={dictType}
          entry={editing}
          onClose={() => setShowEditor(false)}
          onToast={onToast}
        />
      )}
    </div>
  );
}
