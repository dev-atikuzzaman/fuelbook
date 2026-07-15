import React, { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে।");
      return;
    }
    if (password !== confirm) {
      setError("দুইটা পাসওয়ার্ড মিলছে না।");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError("পাসওয়ার্ড সেট করা ব্যর্থ: " + err.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="min-h-screen bg-ink-950 bg-radial-fade relative flex items-center justify-center px-4">
      <div className="blob w-96 h-96 bg-gold-500 -top-20 -left-20" />
      <div className="blob w-[28rem] h-[28rem] bg-ink-600 top-1/3 -right-32" />

      <div className="relative z-10 w-full max-w-sm glass-card rounded-2xl p-6 shadow-card anim-in">
        <div className="text-center mb-6">
          <p className="text-3xl mb-1">🔑</p>
          <h1 className="font-display text-xl text-gold-400">নতুন পাসওয়ার্ড সেট করো</h1>
        </div>

        {done ? (
          <div className="text-center">
            <p className="text-emerald-400 text-sm mb-4">পাসওয়ার্ড পরিবর্তন হয়েছে ✅</p>
            <button
              onClick={onDone}
              className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-5 py-2.5 rounded-xl shadow-glow w-full"
            >
              অ্যাপে ঢুকো
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-cream/50 mb-1 block">নতুন পাসওয়ার্ড</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2.5 text-cream placeholder:text-cream/25 focus:border-gold-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-cream/50 mb-1 block">আবার লেখো</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2.5 text-cream placeholder:text-cream/25 focus:border-gold-500/50"
              />
            </div>
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold py-2.5 rounded-xl shadow-glow disabled:opacity-60"
            >
              {loading ? "সেভ হচ্ছে..." : "পাসওয়ার্ড সেভ করো"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
