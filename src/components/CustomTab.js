import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { uploadImage } from "../lib/storage";

// ── Dynamic field row editor ──────────────────────────────────────
function FieldRow({ field, onChange, onDelete, onMove }) {
  return (
    <div className="flex items-start gap-2 glass-card rounded-lg p-2.5">
      <div className="flex flex-col gap-1 pt-1">
        <button onClick={() => onMove(-1)} className="text-cream/30 hover:text-gold-400 text-xs leading-none">▲</button>
        <button onClick={() => onMove(1)} className="text-cream/30 hover:text-gold-400 text-xs leading-none">▼</button>
      </div>
      <div className="flex-1 grid gap-1.5">
        <input
          value={field.field_name}
          onChange={(e) => onChange({ ...field, field_name: e.target.value })}
          placeholder="ফিল্ডের নাম (যেমন: রঙ, ব্যাখ্যা, তারিখ...)"
          className="bg-ink-950/50 border border-gold-500/10 rounded-md px-2.5 py-1.5 text-sm text-gold-400 placeholder:text-cream/25 font-medium"
        />
        <textarea
          value={field.field_value}
          onChange={(e) => onChange({ ...field, field_value: e.target.value })}
          placeholder="মান লেখো..."
          rows={2}
          className="bg-ink-950/50 border border-gold-500/10 rounded-md px-2.5 py-1.5 text-sm text-cream placeholder:text-cream/25 resize-none"
        />
      </div>
      <button onClick={onDelete} className="text-red-400/70 hover:text-red-300 px-1 pt-1">
        ✕
      </button>
    </div>
  );
}

// ── Entry editor modal: main text/image + dynamic fields ──────────
function CustomEntryEditor({ template, entry, onClose, onToast }) {
  const isNew = !entry;
  const [title, setTitle] = useState(entry?.title || "");
  const [mainText, setMainText] = useState(entry?.main_text || "");
  const [mainImage, setMainImage] = useState(entry?.main_image_url || "");
  const [fields, setFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!entry || !supabase) {
      setFields([{ field_name: "", field_value: "", field_order: 0, _tmpId: crypto.randomUUID() }]);
      return;
    }
    supabase
      .from("custom_fields")
      .select("*")
      .eq("entry_id", entry.id)
      .order("field_order", { ascending: true })
      .then(({ data }) => setFields(data && data.length ? data : [{ field_name: "", field_value: "", field_order: 0, _tmpId: crypto.randomUUID() }]));
  }, [entry]);

  function updateField(idx, updated) {
    setFields((prev) => prev.map((f, i) => (i === idx ? updated : f)));
  }
  function deleteField(idx) {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  }
  function addField() {
    setFields((prev) => [...prev, { field_name: "", field_value: "", field_order: prev.length, _tmpId: crypto.randomUUID() }]);
  }
  function moveField(idx, dir) {
    setFields((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function handleImagePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, `custom/${template.id}`);
      setMainImage(url);
    } catch (err) {
      onToast({ type: "error", message: "ছবি আপলোড ব্যর্থ: " + err.message });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      onToast({ type: "error", message: "একটা শিরোনাম দাও" });
      return;
    }
    if (!supabase) return;
    setSaving(true);
    try {
      let entryId = entry?.id;
      const payload = { title: title.trim(), main_text: mainText, main_image_url: mainImage || null };
      if (isNew) {
        const { data, error } = await supabase
          .from("custom_entries")
          .insert({ ...payload, template_id: template.id })
          .select()
          .single();
        if (error) throw error;
        entryId = data.id;
      } else {
        const { error } = await supabase.from("custom_entries").update(payload).eq("id", entryId);
        if (error) throw error;
        await supabase.from("custom_fields").delete().eq("entry_id", entryId);
      }

      const cleanFields = fields
        .filter((f) => f.field_name.trim())
        .map((f, i) => ({ entry_id: entryId, field_name: f.field_name.trim(), field_value: f.field_value, field_order: i }));
      if (cleanFields.length > 0) {
        const { error: fErr } = await supabase.from("custom_fields").insert(cleanFields);
        if (fErr) throw fErr;
      }
      onToast({ type: "success", message: "সেভ হয়েছে ✅" });
      onClose();
    } catch (err) {
      onToast({ type: "error", message: "সেভ ব্যর্থ: " + err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entry) return;
    if (!window.confirm(`"${entry.title}" এন্ট্রিটা মুছে ফেলবে?`)) return;
    try {
      const { error } = await supabase.from("custom_entries").delete().eq("id", entry.id);
      if (error) throw error;
      onToast({ type: "success", message: "মুছে ফেলা হয়েছে" });
      onClose();
    } catch (err) {
      onToast({ type: "error", message: "ডিলিট ব্যর্থ: " + err.message });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-6">
      <div className="anim-in w-full md:max-w-2xl max-h-[92vh] md:max-h-[85vh] bg-ink-900 md:rounded-2xl rounded-t-2xl border border-gold-500/20 shadow-card flex flex-col overflow-hidden">
        <div className="flex items-start justify-between p-4 border-b border-gold-500/10">
          <div className="flex-1 flex gap-3">
            <label className="w-16 h-16 rounded-xl bg-ink-800 border border-gold-500/20 flex items-center justify-center overflow-hidden cursor-pointer shrink-0 relative">
              {mainImage ? <img src={mainImage} alt="" className="w-full h-full object-cover" /> : <span className="text-xl text-gold-400/60">🖼️</span>}
              <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
              {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-[10px]">...</div>}
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="শিরোনাম / টপিক লেখো..."
              className="flex-1 bg-transparent font-display text-lg text-cream placeholder:text-cream/30 border-b border-gold-500/20 pb-1 focus:border-gold-500 self-center"
            />
          </div>
          <button onClick={onClose} className="text-cream/50 hover:text-cream text-xl px-2">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div>
            <label className="text-xs text-cream/50 mb-1 block">মূল টেক্সট (ঐচ্ছিক)</label>
            <textarea
              value={mainText}
              onChange={(e) => setMainText(e.target.value)}
              rows={3}
              placeholder="মূল বিবরণ, নোট বা প্রসঙ্গ লেখো..."
              className="w-full bg-ink-950/50 border border-gold-500/10 rounded-xl p-3 text-cream placeholder:text-cream/25 resize-none focus:border-gold-500/50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-cream/50">কাস্টম ফিল্ড — যা খুশি যোগ করো</label>
              <button onClick={addField} className="text-xs text-gold-400 hover:text-gold-300">+ ফিল্ড যোগ করো</button>
            </div>
            <div className="flex flex-col gap-2">
              {fields.map((f, i) => (
                <FieldRow
                  key={f.id || f._tmpId}
                  field={f}
                  onChange={(u) => updateField(i, u)}
                  onDelete={() => deleteField(i)}
                  onMove={(dir) => moveField(i, dir)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 p-4 border-t border-gold-500/10">
          {!isNew ? (
            <button onClick={handleDelete} className="text-red-400 hover:text-red-300 text-sm px-3 py-2">🗑️ মুছে ফেলো</button>
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

// ── Main CustomTab: templates → entries → editor ──────────────────
export default function CustomTab({ onToast }) {
  const [templates, setTemplates] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loadingT, setLoadingT] = useState(true);
  const [loadingE, setLoadingE] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTplName, setNewTplName] = useState("");
  const [newTplDesc, setNewTplDesc] = useState("");
  const [search, setSearch] = useState("");
  const [editingEntry, setEditingEntry] = useState(undefined); // undefined = closed, null = new, obj = edit

  useEffect(() => {
    if (!supabase) {
      setLoadingT(false);
      return;
    }
    supabase
      .from("custom_templates")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTemplates(data || []);
        setLoadingT(false);
      });

    const channel = supabase
      .channel("custom_templates_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_templates" }, (payload) => {
        if (payload.eventType === "INSERT") setTemplates((p) => [payload.new, ...p]);
        else if (payload.eventType === "DELETE") setTemplates((p) => p.filter((t) => t.id !== payload.old.id));
        else if (payload.eventType === "UPDATE") setTemplates((p) => p.map((t) => (t.id === payload.new.id ? payload.new : t)));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (!selectedTemplate || !supabase) return;
    setLoadingE(true);
    supabase
      .from("custom_entries")
      .select("*")
      .eq("template_id", selectedTemplate.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setEntries(data || []);
        setLoadingE(false);
      });

    const channel = supabase
      .channel(`custom_entries_${selectedTemplate.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "custom_entries", filter: `template_id=eq.${selectedTemplate.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") setEntries((p) => [payload.new, ...p]);
          else if (payload.eventType === "UPDATE") setEntries((p) => p.map((e) => (e.id === payload.new.id ? payload.new : e)));
          else if (payload.eventType === "DELETE") setEntries((p) => p.filter((e) => e.id !== payload.old.id));
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [selectedTemplate]);

  async function createTemplate() {
    const name = newTplName.trim();
    if (!name || !supabase) return;
    const { error } = await supabase.from("custom_templates").insert({ name, description: newTplDesc.trim() });
    if (error) {
      onToast({ type: "error", message: "টেমপ্লেট তৈরি ব্যর্থ: " + error.message });
      return;
    }
    setNewTplName("");
    setNewTplDesc("");
    setShowNewTemplate(false);
    onToast({ type: "success", message: "নতুন টেমপ্লেট তৈরি হয়েছে ✅" });
  }

  async function deleteTemplate(t) {
    if (!window.confirm(`"${t.name}" টেমপ্লেট ও এর সব এন্ট্রি মুছে ফেলবে?`)) return;
    const { error } = await supabase.from("custom_templates").delete().eq("id", t.id);
    if (error) onToast({ type: "error", message: "ডিলিট ব্যর্থ: " + error.message });
    else {
      if (selectedTemplate?.id === t.id) setSelectedTemplate(null);
      onToast({ type: "success", message: "মুছে ফেলা হয়েছে" });
    }
  }

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.title.toLowerCase().includes(q) || (e.main_text || "").toLowerCase().includes(q));
  }, [entries, search]);

  // ── VIEW: entries inside a selected template ──
  if (selectedTemplate) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-5 pb-24 md:pb-8">
        <button onClick={() => setSelectedTemplate(null)} className="text-cream/50 hover:text-gold-400 text-sm mb-3">
          ← সব টেমপ্লেটে ফিরে যাও
        </button>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-2xl text-gold-400 flex items-center gap-2">🧩 {selectedTemplate.name}</h2>
            {selectedTemplate.description && <p className="text-cream/50 text-sm mt-0.5">{selectedTemplate.description}</p>}
          </div>
          <button
            onClick={() => setEditingEntry(null)}
            className="shrink-0 bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 py-2.5 rounded-xl shadow-glow text-sm"
          >
            + নতুন এন্ট্রি
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 এই টেমপ্লেটের এন্ট্রি খুঁজো..."
          className="w-full bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2 text-cream placeholder:text-cream/30 focus:border-gold-500/50 mb-4"
        />

        {loadingE ? (
          <p className="text-cream/40 text-center py-10">লোড হচ্ছে...</p>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-14 text-cream/40">
            <p className="text-3xl mb-2">🧩</p>
            <p>এখনো কোনো এন্ট্রি নেই। "+ নতুন এন্ট্রি" থেকে যোগ করো।</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {filteredEntries.map((e) => (
              <button
                key={e.id}
                onClick={() => setEditingEntry(e)}
                className="anim-in text-left glass-card rounded-xl p-3.5 hover:border-gold-500/40 flex gap-3 items-start"
              >
                <div className="w-12 h-12 rounded-lg bg-ink-800 border border-gold-500/15 shrink-0 overflow-hidden flex items-center justify-center">
                  {e.main_image_url ? <img src={e.main_image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-gold-400/50">🧩</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-cream font-semibold truncate">{e.title}</h3>
                  <p className="text-cream/50 text-xs mt-1 line-clamp-2">{e.main_text || "কাস্টম ফিল্ড দেখতে ক্লিক করো"}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {editingEntry !== undefined && (
          <CustomEntryEditor
            template={selectedTemplate}
            entry={editingEntry}
            onClose={() => setEditingEntry(undefined)}
            onToast={onToast}
          />
        )}
      </div>
    );
  }

  // ── VIEW: template list ──
  return (
    <div className="max-w-4xl mx-auto px-4 py-5 pb-24 md:pb-8">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-2xl text-gold-400 flex items-center gap-2">🧩 কাস্টম টেমপ্লেট</h2>
          <p className="text-cream/50 text-sm mt-0.5">নিজের টপিক বানাও, তারপর ইচ্ছামতো কাস্টম ফিল্ড দিয়ে তথ্য সংরক্ষণ করো</p>
        </div>
        <button
          onClick={() => setShowNewTemplate((v) => !v)}
          className="shrink-0 bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 py-2.5 rounded-xl shadow-glow text-sm"
        >
          + নতুন টেমপ্লেট
        </button>
      </div>

      {showNewTemplate && (
        <div className="glass-card rounded-xl p-3.5 mb-4 flex flex-col gap-2">
          <input
            value={newTplName}
            onChange={(e) => setNewTplName(e.target.value)}
            placeholder="টেমপ্লেটের নাম (যেমন: পাসপোর্ট ফরম, প্রোডাক্ট রিভিউ...)"
            className="bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2 text-cream placeholder:text-cream/30"
          />
          <input
            value={newTplDesc}
            onChange={(e) => setNewTplDesc(e.target.value)}
            placeholder="ছোট বিবরণ (ঐচ্ছিক)"
            className="bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2 text-cream placeholder:text-cream/30 text-sm"
          />
          <button onClick={createTemplate} className="self-start bg-gold-500 text-ink-950 font-medium px-4 py-1.5 rounded-lg text-sm mt-1">
            তৈরি করো
          </button>
        </div>
      )}

      {loadingT ? (
        <p className="text-cream/40 text-center py-10">লোড হচ্ছে...</p>
      ) : templates.length === 0 ? (
        <div className="text-center py-14 text-cream/40">
          <p className="text-3xl mb-2">🗂️</p>
          <p>এখনো কোনো টেমপ্লেট নেই। একটা বানিয়ে শুরু করো।</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {templates.map((t) => (
            <div key={t.id} className="glass-card rounded-xl p-4 hover:border-gold-500/40 transition-all">
              <button onClick={() => setSelectedTemplate(t)} className="text-left w-full">
                <h3 className="font-display text-cream font-semibold text-lg">{t.name}</h3>
                {t.description && <p className="text-cream/50 text-sm mt-1">{t.description}</p>}
              </button>
              <div className="flex justify-end mt-2">
                <button onClick={() => deleteTemplate(t)} className="text-red-400/70 hover:text-red-300 text-xs">
                  🗑️ মুছে ফেলো
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
