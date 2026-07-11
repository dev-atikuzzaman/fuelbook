import React from "react";

export default function EntryCard({ entry, onClick }) {
  const preview = entry.meaning || entry.explanation || "এখনো কোনো তথ্য যোগ করা হয়নি...";
  const filled = ["meaning", "explanation", "analogy", "application", "example", "misc"].filter(
    (f) => (entry[f] || "").trim().length > 0
  ).length;

  return (
    <button
      onClick={onClick}
      className="anim-in text-left glass-card rounded-xl p-3.5 hover:border-gold-500/40 hover:-translate-y-0.5 transition-all flex gap-3 items-start"
    >
      <div className="w-12 h-12 rounded-lg bg-ink-800 border border-gold-500/15 shrink-0 overflow-hidden flex items-center justify-center">
        {entry.term_image_url ? (
          <img src={entry.term_image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gold-400/50">📘</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
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
