import React from "react";

export default function Toast({ toast }) {
  if (!toast) return null;
  const colors = {
    success: "bg-emerald-600/90 border-emerald-400",
    error: "bg-red-600/90 border-red-400",
    info: "bg-ink-700/95 border-gold-500",
  };
  return (
    <div
      className={`fixed top-4 left-1/2 z-[100] toast-in px-4 py-2.5 rounded-xl border text-sm font-medium text-cream shadow-card ${
        colors[toast.type] || colors.info
      }`}
    >
      {toast.message}
    </div>
  );
}
