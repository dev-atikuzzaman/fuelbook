import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function humanSize(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function AdminPanel({ onClose, onToast, onLogout }) {
  const [email, setEmail] = useState("");
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [tagCounts, setTagCounts] = useState([]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setEmail(data?.user?.email || ""));
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStats() {
    setLoadingStats(true);
    try {
      const [gen, tech, gov, filesRes, templates, entries] = await Promise.all([
        supabase.from("dictionary_entries").select("id", { count: "exact", head: true }).eq("dict_type", "general"),
        supabase.from("dictionary_entries").select("id", { count: "exact", head: true }).eq("dict_type", "technical"),
        supabase.from("dictionary_entries").select("id", { count: "exact", head: true }).eq("dict_type", "government"),
        supabase.from("files").select("size, tags"),
        supabase.from("custom_templates").select("id", { count: "exact", head: true }),
        supabase.from("custom_entries").select("id, tags"),
      ]);

      const totalFileBytes = (filesRes.data || []).reduce((sum, f) => sum + (f.size || 0), 0);

      // tag aggregation across files, custom_entries, and the three dictionaries
      const dictTagsRes = await supabase.from("dictionary_entries").select("tags");
      const tagMap = {};
      const addTags = (rows) =>
        (rows || []).forEach((r) => (r.tags || []).forEach((t) => (tagMap[t] = (tagMap[t] || 0) + 1)));
      addTags(dictTagsRes.data);
      addTags(filesRes.data);
      addTags(entries.data);
      const sortedTags = Object.entries(tagMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12);
      setTagCounts(sortedTags);

      setStats({
        general: gen.count || 0,
        technical: tech.count || 0,
        government: gov.count || 0,
        filesCount: (filesRes.data || []).length,
        filesBytes: totalFileBytes,
        templates: templates.count || 0,
        customEntries: (entries.data || []).length,
      });
    } catch (err) {
      onToast({ type: "error", message: "পরিসংখ্যান লোড ব্যর্থ: " + err.message });
    } finally {
      setLoadingStats(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (newPassword.length < 6) {
      setPwError("পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে।");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("দুইটা পাসওয়ার্ড মিলছে না।");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPwError("পরিবর্তন ব্যর্থ: " + error.message);
      return;
    }
    setPwSuccess("পাসওয়ার্ড পরিবর্তন হয়েছে ✅");
    setNewPassword("");
    setConfirmPassword("");
  }

  const totalEntries =
    (stats?.general || 0) + (stats?.technical || 0) + (stats?.government || 0) + (stats?.customEntries || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-6">
      <div className="anim-in w-full md:max-w-2xl max-h-[92vh] md:max-h-[85vh] bg-ink-900 md:rounded-2xl rounded-t-2xl border border-gold-500/20 shadow-card flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gold-500/10">
          <h2 className="font-display text-lg text-gold-400 flex items-center gap-2">👤 এডমিন প্যানেল</h2>
          <button onClick={onClose} className="text-cream/50 hover:text-cream text-xl px-2">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          {/* profile */}
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs text-cream/50 mb-1">লগইন করা আছে</p>
            <p className="text-cream font-medium">{email || "..."}</p>
            <button
              onClick={onLogout}
              className="mt-3 text-red-400 hover:text-red-300 text-sm border border-red-400/30 rounded-lg px-3 py-1.5"
            >
              🚪 লগআউট করো
            </button>
          </div>

          {/* stats */}
          <div>
            <h3 className="text-sm text-gold-400 font-medium mb-2">📊 অ্যাপ পরিসংখ্যান</h3>
            {loadingStats ? (
              <p className="text-cream/40 text-sm">লোড হচ্ছে...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <StatCard label="সাধারণ শব্দ" value={stats.general} icon="📖" />
                <StatCard label="টেকনিক্যাল শব্দ" value={stats.technical} icon="⚙️" />
                <StatCard label="সরকারি শব্দ" value={stats.government} icon="🏛️" />
                <StatCard label="ফাইল" value={stats.filesCount} icon="📁" />
                <StatCard label="টেমপ্লেট" value={stats.templates} icon="🧩" />
                <StatCard label="কাস্টম এন্ট্রি" value={stats.customEntries} icon="🗂️" />
              </div>
            )}
            {!loadingStats && (
              <div className="glass-card rounded-xl p-3 mt-2.5 flex items-center justify-between text-sm">
                <span className="text-cream/60">মোট এন্ট্রি + ফাইল স্টোরেজ ব্যবহার</span>
                <span className="text-gold-400 font-medium">
                  {totalEntries} এন্ট্রি · {humanSize(stats.filesBytes)}
                </span>
              </div>
            )}
          </div>

          {/* tag overview */}
          {tagCounts.length > 0 && (
            <div>
              <h3 className="text-sm text-gold-400 font-medium mb-2">🏷️ বেশি ব্যবহৃত ট্যাগ</h3>
              <div className="flex flex-wrap gap-1.5">
                {tagCounts.map(([tag, count]) => (
                  <span key={tag} className="text-xs bg-gold-500/10 text-gold-400/90 px-2.5 py-1 rounded-full">
                    #{tag} <span className="text-cream/40">×{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* change password */}
          <div>
            <h3 className="text-sm text-gold-400 font-medium mb-2">🔑 পাসওয়ার্ড পরিবর্তন করো</h3>
            <form onSubmit={handleChangePassword} className="glass-card rounded-xl p-4 flex flex-col gap-2.5">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="নতুন পাসওয়ার্ড"
                className="bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2 text-cream placeholder:text-cream/30 text-sm"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="আবার লেখো"
                className="bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2 text-cream placeholder:text-cream/30 text-sm"
              />
              {pwError && <p className="text-red-400 text-xs">{pwError}</p>}
              {pwSuccess && <p className="text-emerald-400 text-xs">{pwSuccess}</p>}
              <button
                type="submit"
                disabled={savingPassword}
                className="self-start bg-gold-500 hover:bg-gold-400 text-ink-950 font-medium px-4 py-2 rounded-lg text-sm disabled:opacity-60"
              >
                {savingPassword ? "সেভ হচ্ছে..." : "পাসওয়ার্ড আপডেট করো"}
              </button>
            </form>
          </div>

          <p className="text-cream/30 text-[11px] text-center">আমার অভিধান · v1.0 · Supabase + React PWA</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="glass-card rounded-xl p-3 text-center">
      <p className="text-xl">{icon}</p>
      <p className="text-gold-400 font-display text-lg mt-0.5">{value}</p>
      <p className="text-cream/50 text-[11px]">{label}</p>
    </div>
  );
}
