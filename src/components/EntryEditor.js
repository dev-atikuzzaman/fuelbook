import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { uploadImage } from "../lib/storage";

const SUBTABS = [
  { key: "meaning", label: "অর্থ", field: "meaning", icon: "🔤" },
  { key: "explanation", label: "ব্যাখ্যা", field: "explanation", icon: "📝" },
  { key: "analogy", label: "সহজ এনালজি", field: "analogy", icon: "💡" },
  { key: "application", label: "প্রয়োগক্ষেত্র", field: "application", icon: "🎯" },
  { key: "example", label: "উদাহরণ", field: "example", icon: "✨" },
  { key: "misc", label: "বিবিধ", field: "misc", icon: "🗂️" },
];

const DICT_LABELS = {
  general: { label: "সাধারণ", icon: "📖" },
  technical: { label: "টেকনিক্যাল", icon: "⚙️" },
  government: { label: "সরকারি", icon: "🏛️" },
};

const emptyForm = {
  term: "",
  term_image_url: "",
  meaning: "",
  explanation: "",
  analogy: "",
  application: "",
  example: "",
  misc: "",
  tags: [],
};

export default function EntryEditor({ dictType, entry, onClose, onToast }) {
  const [form, setForm] = useState(entry ? { ...emptyForm, ...entry } : emptyForm);
  const [activeSub, setActiveSub] = useState("meaning");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const scrollerRef = useRef(null);
  const isNew = !entry;
  const otherDicts = Object.keys(DICT_LABELS).filter((d) => d !== dictType);

  useEffect(() => {
    setForm(entry ? { ...emptyForm, ...entry } : emptyForm);
  }, [entry]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  async function handleImagePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, `dictionary/${dictType}`);
      update("term_image_url", url);
    } catch (err) {
      onToast({ type: "error", message: "ছবি আপলোড ব্যর্থ: " + err.message });
    } finally {
      setUploading(false);
    }
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    if (!form.tags.includes(t)) update("tags", [...form.tags, t]);
    setTagInput("");
  }
  function removeTag(t) {
    update("tags", form.tags.filter((x) => x !== t));
  }

  async function handleSave() {
    if (!form.term.trim()) {
      onToast({ type: "error", message: "শব্দ/টার্ম লিখো আগে" });
      return;
    }
    if (!supabase) {
      onToast({ type: "error", message: "Supabase কনফিগার করা নেই" });
      return;
    }
    setSaving(true);
    const payload = {
      dict_type: dictType,
      term: form.term.trim(),
      term_image_url: form.term_image_url || null,
      meaning: form.meaning,
      explanation: form.explanation,
      analogy: form.analogy,
      application: form.application,
      example: form.example,
      misc: form.misc,
      tags: form.tags,
    };
    try {
      if (isNew) {
        const { error } = await supabase.from("dictionary_entries").insert(payload);
        if (error) throw error;
        onToast({ type: "success", message: "নতুন এন্ট্রি যোগ হয়েছে ✅" });
      } else {
        const { error } = await supabase
          .from("dictionary_entries")
          .update(payload)
          .eq("id", entry.id);
        if (error) throw error;
        onToast({ type: "success", message: "সেভ হয়েছে ✅" });
      }
      onClose();
    } catch (err) {
      onToast({ type: "error", message: "সেভ ব্যর্থ: " + err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entry) return;
    if (!window.confirm(`"${entry.term}" এন্ট্রিটা মুছে ফেলবে?`)) return;
    try {
      const { error } = await supabase.from("dictionary_entries").delete().eq("id", entry.id);
      if (error) throw error;
      onToast({ type: "success", message: "মুছে ফেলা হয়েছে" });
      onClose();
    } catch (err) {
      onToast({ type: "error", message: "ডিলিট ব্যর্থ: " + err.message });
    }
  }

  async function handleTransfer(targetDict, mode) {
    if (!entry || !supabase) return;
    if (!form.term.trim()) {
      onToast({ type: "error", message: "শব্দ/টার্ম লিখো আগে" });
      return;
    }
    setTransferring(true);
    // বর্তমান ফর্মের সব ডাটা (কোনো আনসেভড এডিটসহ) হুবহু নতুন ডিকশনারিতে যাবে —
    // কোনো কিছু বাদ পড়বে না বা হাত দিয়ে আবার লিখতে হবে না
    const payload = {
      term: form.term.trim(),
      term_image_url: form.term_image_url || null,
      meaning: form.meaning,
      explanation: form.explanation,
      analogy: form.analogy,
      application: form.application,
      example: form.example,
      misc: form.misc,
      tags: form.tags,
    };
    try {
      if (mode === "move") {
        const { error } = await supabase
          .from("dictionary_entries")
          .update({ ...payload, dict_type: targetDict })
          .eq("id", entry.id);
        if (error) throw error;
        onToast({
          type: "success",
          message: `"${DICT_LABELS[dictType].label}" থেকে "${DICT_LABELS[targetDict].label}" ডিকশনারিতে সরানো হয়েছে ✅`,
        });
      } else {
        const { error } = await supabase.from("dictionary_entries").insert({ ...payload, dict_type: targetDict });
        if (error) throw error;
        onToast({
          type: "success",
          message: `"${DICT_LABELS[targetDict].label}" ডিকশনারিতে কপি হয়েছে ✅ (মূল এন্ট্রি এখানেই আছে)`,
        });
      }
      onClose();
    } catch (err) {
      onToast({ type: "error", message: "ট্রান্সফার ব্যর্থ: " + err.message });
    } finally {
      setTransferring(false);
      setTransferOpen(false);
    }
  }

  const activeIndex = SUBTABS.findIndex((s) => s.key === activeSub);
  function goSub(dir) {
    const next = activeIndex + dir;
    if (next >= 0 && next < SUBTABS.length) setActiveSub(SUBTABS[next].key);
  }

  const activeField = SUBTABS.find((s) => s.key === activeSub).field;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-6">
      <div className="anim-in w-full md:max-w-2xl max-h-[92vh] md:max-h-[85vh] bg-ink-900 md:rounded-2xl rounded-t-2xl border border-gold-500/20 shadow-card flex flex-col overflow-hidden">
        {/* header */}
        <div className="flex items-start justify-between p-4 border-b border-gold-500/10">
          <div className="flex-1 flex gap-3">
            <div className="relative shrink-0">
              <label className="w-16 h-16 rounded-xl bg-ink-800 border border-gold-500/20 flex items-center justify-center overflow-hidden cursor-pointer">
                {form.term_image_url ? (
                  <img src={form.term_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl text-gold-400/60">🖼️</span>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
              </label>
              {uploading && (
                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center text-[10px]">
                  ...
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                autoFocus
                value={form.term}
                onChange={(e) => update("term", e.target.value)}
                placeholder="শব্দ / টার্ম লেখো..."
                className="w-full bg-transparent font-display text-lg text-cream placeholder:text-cream/30 border-b border-gold-500/20 pb-1 focus:border-gold-500"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((t) => (
                  <span
                    key={t}
                    onClick={() => removeTag(t)}
                    className="text-[11px] bg-gold-500/15 text-gold-400 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-500/20 hover:text-red-300"
                    title="মুছতে ক্লিক করো"
                  >
                    #{t} ✕
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  onBlur={addTag}
                  placeholder="+ ট্যাগ"
                  className="text-[11px] bg-transparent border-b border-dashed border-cream/20 w-16 text-cream/70 placeholder:text-cream/30"
                />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-cream/50 hover:text-cream text-xl px-2">
            ✕
          </button>
        </div>

        {/* slidable subtabs */}
        <div
          ref={scrollerRef}
          className="flex gap-1.5 px-4 py-2 overflow-x-auto scrollbar-none border-b border-gold-500/10 bg-ink-950/40"
        >
          {SUBTABS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSub(s.key)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                activeSub === s.key
                  ? "bg-gold-500 text-ink-950"
                  : "bg-white/5 text-cream/60 hover:text-cream"
              }`}
            >
              <span>{s.icon}</span> {s.label}
              {form[s.field] && activeSub !== s.key && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          ))}
        </div>

        {/* active subtab content, swipe with arrows */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-cream/40 text-xs">
            <button onClick={() => goSub(-1)} disabled={activeIndex === 0} className="disabled:opacity-20 px-2">
              ← আগেরটা
            </button>
            <span>
              {activeIndex + 1} / {SUBTABS.length}
            </span>
            <button
              onClick={() => goSub(1)}
              disabled={activeIndex === SUBTABS.length - 1}
              className="disabled:opacity-20 px-2"
            >
              পরেরটা →
            </button>
          </div>
          <textarea
            key={activeSub}
            value={form[activeField]}
            onChange={(e) => update(activeField, e.target.value)}
            placeholder={`${SUBTABS[activeIndex].label} লেখো এখানে...`}
            className="flex-1 min-h-[220px] w-full bg-ink-950/50 border border-gold-500/10 rounded-xl p-3 text-cream placeholder:text-cream/25 resize-none focus:border-gold-500/50"
          />
        </div>

        {/* move/copy to another dictionary */}
        {!isNew && (
          <div className="border-t border-gold-500/10">
            <button
              onClick={() => setTransferOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gold-400/80 hover:text-gold-300"
            >
              <span>🔀 অন্য ডিকশনারিতে সরাও/কপি করো</span>
              <span>{transferOpen ? "▲" : "▼"}</span>
            </button>
            {transferOpen && (
              <div className="px-4 pb-3 flex flex-col gap-2">
                {otherDicts.map((d) => (
                  <div key={d} className="flex items-center justify-between glass-card rounded-lg px-3 py-2">
                    <span className="text-sm text-cream/80 flex items-center gap-1.5">
                      {DICT_LABELS[d].icon} {DICT_LABELS[d].label}
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={transferring}
                        onClick={() => handleTransfer(d, "copy")}
                        className="text-xs border border-gold-500/30 text-gold-400 hover:bg-gold-500/10 px-2.5 py-1 rounded-lg disabled:opacity-50"
                        title="দুই জায়গাতেই থাকবে"
                      >
                        📄 কপি
                      </button>
                      <button
                        disabled={transferring}
                        onClick={() => handleTransfer(d, "move")}
                        className="text-xs bg-gold-500 hover:bg-gold-400 text-ink-950 font-medium px-2.5 py-1 rounded-lg disabled:opacity-50"
                        title="এখান থেকে সরে যাবে"
                      >
                        ➡️ সরাও
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* footer actions */}
        <div className="flex items-center justify-between gap-2 p-4 border-t border-gold-500/10">
          {!isNew ? (
            <button
              onClick={handleDelete}
              className="text-red-400 hover:text-red-300 text-sm px-3 py-2"
            >
              🗑️ মুছে ফেলো
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-5 py-2.5 rounded-xl shadow-glow disabled:opacity-60"
          >
            {saving ? "সেভ হচ্ছে..." : "💾 সেভ করো"}
          </button>
        </div>
      </div>
    </div>
  );
}
