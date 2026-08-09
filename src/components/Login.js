import React, { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login({ onLoggedIn }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase কনফিগার করা নেই।");
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError("লগইন ব্যর্থ — ইমেইল বা পাসওয়ার্ড ভুল।");
      return;
    }
    onLoggedIn(data.session);
  }

  async function handleForgot(e) {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase কনফিগার করা নেই।");
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (err) {
      setError("রিসেট লিংক পাঠানো ব্যর্থ: " + err.message);
      return;
    }
    setInfo("রিসেট লিংক ইমেইলে পাঠানো হয়েছে (ইনবক্স/স্প্যাম চেক করো)। লিংকে ক্লিক করে নতুন পাসওয়ার্ড সেট করো।");
  }

  return (
    <div className="min-h-screen bg-ink-950 bg-radial-fade relative flex items-center justify-center px-4">
      <div className="blob w-96 h-96 bg-gold-500 -top-20 -left-20" />
      <div className="blob w-[28rem] h-[28rem] bg-ink-600 top-1/3 -right-32" />

      <form
        onSubmit={mode === "login" ? handleSubmit : handleForgot}
        className="relative z-10 w-full max-w-sm glass-card rounded-2xl p-6 shadow-card anim-in"
      >
        <div className="text-center mb-6">
          <img src="/logo192.png" alt="" className="w-14 h-14 mx-auto mb-2 rounded-2xl shadow-glow" />
          <h1 className="font-display text-xl text-gold-400">আমার অভিধান</h1>
          <p className="text-cream/50 text-sm mt-1">
            {mode === "login" ? "শুধু এডমিন লগইন করে ব্যবহার করতে পারবে" : "ইমেইল দাও, রিসেট লিংক পাঠিয়ে দেবো"}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-cream/50 mb-1 block">ইমেইল</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2.5 text-cream placeholder:text-cream/25 focus:border-gold-500/50"
            />
          </div>

          {mode === "login" && (
            <div>
              <label className="text-xs text-cream/50 mb-1 block">পাসওয়ার্ড</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2.5 text-cream placeholder:text-cream/25 focus:border-gold-500/50"
              />
            </div>
          )}

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          {info && <p className="text-emerald-400 text-xs text-center">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold py-2.5 rounded-xl shadow-glow disabled:opacity-60"
          >
            {loading ? "অপেক্ষা করো..." : mode === "login" ? "লগইন করো" : "রিসেট লিংক পাঠাও"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "forgot" : "login");
              setError("");
              setInfo("");
            }}
            className="text-gold-400/80 hover:text-gold-300 text-xs text-center"
          >
            {mode === "login" ? "পাসওয়ার্ড ভুলে গেছেন?" : "← লগইনে ফিরে যাও"}
          </button>
        </div>

        <p className="text-cream/30 text-[11px] text-center mt-5 leading-relaxed">
          এডমিন অ্যাকাউন্ট Supabase Dashboard → Authentication → Users থেকে বানানো হয়।
          <br />
          নতুন কেউ নিজে সাইন-আপ করতে পারবে না।
        </p>
      </form>
    </div>
  );
}
