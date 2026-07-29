import React, { useEffect, useState } from "react";

export default function Clock({ variant = "desktop" }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = now.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  if (variant === "mobile") {
    return (
      <div className="w-full flex items-center justify-center gap-2 px-4 py-1.5 bg-ink-950/40 border-b border-gold-500/10 text-[11px]">
        <span className="text-gold-400 font-medium tracking-wide">{weekday}</span>
        <span className="text-cream/30">•</span>
        <span className="text-cream/70">{dateStr}</span>
        <span className="text-cream/30">•</span>
        <span className="text-gold-300 font-display tabular-nums">{timeStr}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-ink-950/50 border border-gold-500/15">
      <span className="text-gold-400 text-xs font-semibold tracking-wide">{weekday}</span>
      <span className="w-1 h-1 rounded-full bg-gold-500/40" />
      <span className="text-cream/70 text-xs">{dateStr}</span>
      <span className="w-1 h-1 rounded-full bg-gold-500/40" />
      <span className="text-gold-300 text-xs font-display tabular-nums">{timeStr}</span>
    </div>
  );
}
