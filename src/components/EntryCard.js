import React from "react";
import { supabase } from "../lib/supabase";

export default function EntryCard({ entry, onClick }) {
  const preview = entry.meaning || entry.explanation || "এখনো কোনো তথ্য যোগ করা হয়নি...";
  const filled = ["meaning", "explanation", "analogy", "application", "example", "misc"].filter(
    (f) => (entry[f] || "").trim().length > 0
  ).length;

  async function togglePin(e) {
    e.stopPropagation();
    if (!supabase) return;
    await supabase.from("dictionary_entries").update({ pinned: !entry.pinned }).eq("id", entry.id);
  }

  return (
    <button
      onClick={onClick}
      className={`anim-in text-left glass-card rounded-xl p-3.5 hover:border-gold-500/40 hover:-translate-y-0.5 transition-all flex gap-3 items-start relative ${
        entry.pinned ? "border-gold-500/40" : ""
      }`}
    >
      <button
        onClick={togglePin}
        className="absolute top-2 right-2 text-sm z-10"
        title={entry.pinned ? "পিন সরাও" : "পিন করো"}
      >
        {entry.pinned ? "⭐" : <span className="text-cream/20 hover:text-gold-400/60">☆</span>}
      </button>
      <div className="w-12 h-12 rounded-lg bg-ink-800 border border-gold-500/15 shrink-0 overflow-hidden flex items-center justify-center relative">
        {entry.term_image_url || entry.gallery_images?.[0] ? (
          <img src={entry.term_image_url || entry.gallery_images[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gold-400/50">📘</span>
        )}
        {entry.gallery_images?.length > 0 && (
          <span className="absolute bottom-0 right-0 bg-black/70 text-gold-300 text-[9px] px-1 rounded-tl-md">
            🖼️{entry.gallery_images.length}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 pr-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-cream font-semibold truncate">{entry.term}</h3>
          <span className="text-[10px] text-gold-400/70 shrink-0">{filled}/6</span>
        </div>
        <p className="text-cream/50 text-xs mt-1 line-clamp-2">{preview}</p>
        {entry.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {entry.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] bg-gold-500/10 text-gold-400/80 px-1.5 py-0.5 rounded-full">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
