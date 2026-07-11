import React from "react";

const TABS = [
  { key: "general", label: "সাধারণ", icon: "📖" },
  { key: "technical", label: "টেকনিক্যাল", icon: "⚙️" },
  { key: "government", label: "সরকারি", icon: "🏛️" },
  { key: "files", label: "ফাইল", icon: "📁" },
  { key: "custom", label: "কাস্টম", icon: "🧩" },
];

export default function TopNav({ active, onChange, isOnline, onLogout }) {
  return (
    <>
      {/* Desktop top bar */}
      <header className="hidden md:flex items-center justify-between px-8 py-4 glass-card border-b border-gold-500/10 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📚</span>
          <h1 className="font-display text-xl text-gold-400 tracking-wide">
            আমার <span className="text-cream">অভিধান</span>
          </h1>
        </div>
        <nav className="flex items-center gap-1 bg-ink-900/60 rounded-2xl p-1.5 border border-gold-500/10">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                active === t.key
                  ? "bg-gold-500 text-ink-950 shadow-glow"
                  : "text-cream/70 hover:text-cream hover:bg-white/5"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-xs">
          <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-red-400"}`} />
          <span className="text-cream/60">{isOnline ? "লাইভ সিঙ্ক" : "অফলাইন"}</span>
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-cream/50 hover:text-red-300 border border-cream/15 hover:border-red-400/40 rounded-lg px-2.5 py-1"
              title="লগআউট"
            >
              🚪 লগআউট
            </button>
          )}
        </div>
      </header>

      {/* Mobile top title bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 glass-card border-b border-gold-500/10 sticky top-0 z-40">
        <h1 className="font-display text-lg text-gold-400">
          আমার <span className="text-cream">অভিধান</span>
        </h1>
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-red-400"}`} />
          {onLogout && (
            <button onClick={onLogout} className="text-cream/50 text-lg" title="লগআউট">
              🚪
            </button>
          )}
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-card border-t border-gold-500/10 flex justify-around py-2 px-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-medium min-w-[56px] ${
              active === t.key ? "text-gold-400" : "text-cream/50"
            }`}
          >
            <span className="text-lg">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  );
}
