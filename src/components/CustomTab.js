import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { uploadImage } from "../lib/storage";

const FIELD_TYPES = [
  { value: "text", label: "টেক্সট (এক লাইন)", icon: "🔤" },
  { value: "textarea", label: "বড় টেক্সট", icon: "📝" },
  { value: "number", label: "সংখ্যা", icon: "🔢" },
  { value: "date", label: "তারিখ", icon: "📅" },
  { value: "dropdown", label: "ড্রপডাউন", icon: "📋" },
  { value: "radio", label: "রেডিও (একটা বাছাই)", icon: "🔘" },
  { value: "checkbox", label: "চেকবক্স (হ্যাঁ/না)", icon: "☑️" },
  { value: "image", label: "ছবি", icon: "🖼️" },
];
const typeIcon = (t) => FIELD_TYPES.find((f) => f.value === t)?.icon || "🔤";

// ── options editor for dropdown/radio field builder rows ──────────
function OptionsEditor({ options, onChange }) {
  const [input, setInput] = useState("");
  function addOption() {
    const v = input.trim();
    if (!v || options.includes(v)) {
      setInput("");
      return;
    }
    onChange([...options, v]);
    setInput("");
  }
  function removeOption(v) {
    onChange(options.filter((o) => o !== v));
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
      {options.map((o) => (
        <span
          key={o}
          onClick={() => removeOption(o)}
          className="text-[11px] bg-ink-800 text-cream/80 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-500/20 hover:text-red-300 border border-cream/10"
        >
          {o} ✕
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption())}
        onBlur={addOption}
        placeholder="+ অপশন লিখে Enter"
        className="text-[11px] bg-transparent border-b border-dashed border-cream/20 flex-1 min-w-[90px] text-cream/70 placeholder:text-cream/30"
      />
    </div>
  );
}

// ── one field row inside the template builder ──────────────────────
function FieldBuilderRow({ field, onChange, onDelete, onMove }) {
  const needsOptions = field.field_type === "dropdown" || field.field_type === "radio";
  return (
    <div className="glass-card rounded-lg p-2.5">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-1 pt-1">
          <button onClick={() => onMove(-1)} className="text-cream/30 hover:text-gold-400 text-xs leading-none">▲</button>
          <button onClick={() => onMove(1)} className="text-cream/30 hover:text-gold-400 text-xs leading-none">▼</button>
        </div>
        <div className="flex-1 grid gap-1.5 sm:grid-cols-2">
          <input
            value={field.label}
            onChange={(e) => onChange({ ...field, label: e.target.value })}
            placeholder="ফিল্ডের নাম (যেমন: রঙ, সাইজ, ইস্যু তারিখ...)"
            className="bg-ink-950/50 border border-gold-500/10 rounded-md px-2.5 py-1.5 text-sm text-gold-400 placeholder:text-cream/25 font-medium"
          />
          <select
            value={field.field_type}
            onChange={(e) => onChange({ ...field, field_type: e.target.value, options: [] })}
            className="bg-ink-950/50 border border-gold-500/10 rounded-md px-2.5 py-1.5 text-sm text-cream"
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>
        </div>
        <button onClick={onDelete} className="text-red-400/70 hover:text-red-300 px-1 pt-1">✕</button>
      </div>
      {needsOptions && (
        <div className="ml-6 mt-1.5">
          <p className="text-[10px] text-cream/40 mb-0.5">অপশনগুলো লেখো:</p>
          <OptionsEditor options={field.options || []} onChange={(opts) => onChange({ ...field, options: opts })} />
        </div>
      )}
    </div>
  );
}

// ── template create/edit modal: name + description + field schema ──
function TemplateEditor({ template, onClose, onToast }) {
  const isNew = !template;
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [fields, setFields] = useState([]);
  const [deletedIds, setDeletedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingFields, setLoadingFields] = useState(!isNew);

  useEffect(() => {
    if (isNew || !supabase) {
      setFields([{ _key: crypto.randomUUID(), label: "", field_type: "text", options: [], field_order: 0 }]);
      return;
    }
    supabase
      .from("custom_template_fields")
      .select("*")
      .eq("template_id", template.id)
      .order("field_order", { ascending: true })
      .then(({ data }) => {
        setFields((data || []).map((f) => ({ ...f, _key: f.id })));
        setLoadingFields(false);
      });
  }, [isNew, template]);

  function addField() {
    setFields((prev) => [
      ...prev,
      { _key: crypto.randomUUID(), label: "", field_type: "text", options: [], field_order: prev.length },
    ]);
  }
  function updateField(idx, updated) {
    setFields((prev) => prev.map((f, i) => (i === idx ? updated : f)));
  }
  function deleteField(idx) {
    setFields((prev) => {
      const f = prev[idx];
      if (f.id) setDeletedIds((d) => [...d, f.id]);
      return prev.filter((_, i) => i !== idx);
    });
  }
  function moveField(idx, dir) {
    setFields((prev) => {
      const next = [...prev];
      const t = idx + dir;
      if (t < 0 || t >= next.length) return prev;
      [next[idx], next[t]] = [next[t], next[idx]];
      return next;
    });
  }

  async function handleSave() {
    if (!name.trim()) {
      onToast({ type: "error", message: "টেমপ্লেটের নাম দাও" });
      return;
    }
    if (!supabase) return;
    setSaving(true);
    try {
      let templateId = template?.id;
      if (isNew) {
        const { data, error } = await supabase
          .from("custom_templates")
          .insert({ name: name.trim(), description: description.trim() })
          .select()
          .single();
        if (error) throw error;
        templateId = data.id;
      } else {
        const { error } = await supabase
          .from("custom_templates")
          .update({ name: name.trim(), description: description.trim() })
          .eq("id", templateId);
        if (error) throw error;
      }

      const cleanFields = fields.filter((f) => f.label.trim());
      const fieldsPayload = cleanFields.map((f, i) => ({
        id: f.id || crypto.randomUUID(),
        template_id: templateId,
        label: f.label.trim(),
        field_type: f.field_type,
        options: f.field_type === "dropdown" || f.field_type === "radio" ? f.options || [] : [],
        field_order: i,
      }));
      if (fieldsPayload.length > 0) {
        const { error: fErr } = await supabase.from("custom_template_fields").upsert(fieldsPayload, { onConflict: "id" });
        if (fErr) throw fErr;
      }
      if (deletedIds.length > 0) {
        await supabase.from("custom_template_fields").delete().in("id", deletedIds);
      }

      onToast({ type: "success", message: isNew ? "নতুন টেমপ্লেট তৈরি হয়েছে ✅" : "টেমপ্লেট আপডেট হয়েছে ✅" });
      onClose();
    } catch (err) {
      onToast({ type: "error", message: "সেভ ব্যর্থ: " + err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!template) return;
    if (!window.confirm(`"${template.name}" টেমপ্লেট ও এর সব এন্ট্রি মুছে ফেলবে?`)) return;
    try {
      const { error } = await supabase.from("custom_templates").delete().eq("id", template.id);
      if (error) throw error;
      onToast({ type: "success", message: "মুছে ফেলা হয়েছে" });
      onClose(true);
    } catch (err) {
      onToast({ type: "error", message: "ডিলিট ব্যর্থ: " + err.message });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-6">
      <div className="anim-in w-full md:max-w-2xl max-h-[92vh] md:max-h-[85vh] bg-ink-900 md:rounded-2xl rounded-t-2xl border border-gold-500/20 shadow-card flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gold-500/10">
          <h2 className="font-display text-lg text-gold-400">{isNew ? "🧩 নতুন টেমপ্লেট" : "✏️ টেমপ্লেট এডিট করো"}</h2>
          <button onClick={() => onClose(false)} className="text-cream/50 hover:text-cream text-xl px-2">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="টেমপ্লেটের নাম (যেমন: পাসপোর্ট ফরম)"
            className="bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2 text-cream placeholder:text-cream/30"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ছোট বিবরণ (ঐচ্ছিক)"
            className="bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2 text-cream placeholder:text-cream/30 text-sm"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-cream/50">এই টেমপ্লেটের ফিল্ড বানাও — যেকোনো টাইপ বেছে নাও</label>
              <button onClick={addField} className="text-xs text-gold-400 hover:text-gold-300">+ ফিল্ড যোগ করো</button>
            </div>
            {loadingFields ? (
              <p className="text-cream/40 text-sm">লোড হচ্ছে...</p>
            ) : (
              <div className="flex flex-col gap-2">
                {fields.map((f, i) => (
                  <FieldBuilderRow
                    key={f._key}
                    field={f}
                    onChange={(u) => updateField(i, u)}
                    onDelete={() => deleteField(i)}
                    onMove={(dir) => moveField(i, dir)}
                  />
                ))}
                {fields.length === 0 && (
                  <p className="text-cream/30 text-xs">এখনো কোনো ফিল্ড নেই — "+ ফিল্ড যোগ করো" চাপো</p>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 p-4 border-t border-gold-500/10">
          {!isNew ? (
            <button onClick={handleDeleteTemplate} className="text-red-400 hover:text-red-300 text-sm px-3 py-2">
              🗑️ টেমপ্লেট মুছে ফেলো
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

// ── renders the correct input control for a template field's type ──
function DynamicFieldInput({ field, value, onChange, onUploadImage, uploading }) {
  switch (field.field_type) {
    case "textarea":
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={`${field.label} লেখো...`}
          className="w-full bg-ink-950/50 border border-gold-500/10 rounded-lg p-2.5 text-cream placeholder:text-cream/25 resize-none"
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2 text-cream"
        />
      );
    case "date":
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2 text-cream"
        />
      );
    case "dropdown":
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2 text-cream"
        >
          <option value="">নির্বাচন করো...</option>
          {(field.options || []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "radio":
      return (
        <div className="flex flex-wrap gap-3">
          {(field.options || []).map((o) => (
            <label key={o} className="flex items-center gap-1.5 text-sm text-cream/80">
              <input type="radio" checked={value === o} onChange={() => onChange(o)} className="accent-[#f5b400]" />
              {o}
            </label>
          ))}
          {(field.options || []).length === 0 && <p className="text-cream/30 text-xs">কোনো অপশন সেট করা নেই</p>}
        </div>
      );
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm text-cream/80">
          <input
            type="checkbox"
            checked={value === "true"}
            onChange={(e) => onChange(e.target.checked ? "true" : "false")}
            className="accent-[#f5b400] w-4 h-4"
          />
          হ্যাঁ
        </label>
      );
    case "image":
      return (
        <div className="flex items-center gap-3">
          <label className="w-16 h-16 rounded-lg bg-ink-800 border border-gold-500/20 flex items-center justify-center overflow-hidden cursor-pointer relative shrink-0">
            {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <span className="text-gold-400/50 text-lg">🖼️</span>}
            <input type="file" accept="image/*" className="hidden" onChange={onUploadImage} />
            {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-[10px]">...</div>}
          </label>
          {value && (
            <button type="button" onClick={() => onChange("")} className="text-red-400/70 hover:text-red-300 text-xs">
              মুছে ফেলো
            </button>
          )}
        </div>
      );
    default:
      return (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${field.label} লেখো...`}
          className="w-full bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2 text-cream placeholder:text-cream/25"
        />
      );
  }
}

// ── entry editor: title + main text/image + tags + dynamic typed fields ──
function CustomEntryEditor({ template, entry, onClose, onToast }) {
  const isNew = !entry;
  const [title, setTitle] = useState(entry?.title || "");
  const [mainText, setMainText] = useState(entry?.main_text || "");
  const [mainImage, setMainImage] = useState(entry?.main_image_url || "");
  const [tags, setTags] = useState(entry?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [templateFields, setTemplateFields] = useState([]);
  const [values, setValues] = useState({});
  const [loadingFields, setLoadingFields] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingFieldId, setUploadingFieldId] = useState(null);

  useEffect(() => {
    async function load() {
      setLoadingFields(true);
      const { data: fieldsData } = await supabase
        .from("custom_template_fields")
        .select("*")
        .eq("template_id", template.id)
        .order("field_order", { ascending: true });
      setTemplateFields(fieldsData || []);
      const initial = {};
      (fieldsData || []).forEach((f) => (initial[f.id] = ""));
      if (entry) {
        const { data: valuesData } = await supabase
          .from("custom_field_values")
          .select("*")
          .eq("entry_id", entry.id);
        (valuesData || []).forEach((v) => (initial[v.template_field_id] = v.value || ""));
      }
      setValues(initial);
      setLoadingFields(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, entry]);

  function addTag() {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) {
      setTagInput("");
      return;
    }
    setTags([...tags, t]);
    setTagInput("");
  }
  function removeTag(t) {
    setTags(tags.filter((x) => x !== t));
  }

  async function handleMainImagePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMain(true);
    try {
      const url = await uploadImage(file, `custom/${template.id}`);
      setMainImage(url);
    } catch (err) {
      onToast({ type: "error", message: "ছবি আপলোড ব্যর্থ: " + err.message });
    } finally {
      setUploadingMain(false);
    }
  }

  async function handleFieldImagePick(fieldId, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFieldId(fieldId);
    try {
      const url = await uploadImage(file, `custom/${template.id}`);
      setValues((v) => ({ ...v, [fieldId]: url }));
    } catch (err) {
      onToast({ type: "error", message: "ছবি আপলোড ব্যর্থ: " + err.message });
    } finally {
      setUploadingFieldId(null);
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
      const payload = { title: title.trim(), main_text: mainText, main_image_url: mainImage || null, tags };
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
      }

      const valuePayload = templateFields.map((f) => ({
        entry_id: entryId,
        template_field_id: f.id,
        value: values[f.id] || "",
      }));
      if (valuePayload.length > 0) {
        const { error: vErr } = await supabase
          .from("custom_field_values")
          .upsert(valuePayload, { onConflict: "entry_id,template_field_id" });
        if (vErr) throw vErr;
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
              <input type="file" accept="image/*" className="hidden" onChange={handleMainImagePick} />
              {uploadingMain && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-[10px]">...</div>}
            </label>
            <div className="flex-1">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="শিরোনাম / টপিক লেখো..."
                className="w-full bg-transparent font-display text-lg text-cream placeholder:text-cream/30 border-b border-gold-500/20 pb-1 focus:border-gold-500"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    onClick={() => removeTag(t)}
                    className="text-[11px] bg-gold-500/15 text-gold-400 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-500/20 hover:text-red-300"
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

          {loadingFields ? (
            <p className="text-cream/40 text-sm">ফিল্ড লোড হচ্ছে...</p>
          ) : templateFields.length === 0 ? (
            <p className="text-cream/30 text-xs">
              এই টেমপ্লেটে এখনো কোনো কাস্টম ফিল্ড নেই। টেমপ্লেট এডিট থেকে ফিল্ড যোগ করতে পারো।
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {templateFields.map((f) => (
                <div key={f.id}>
                  <label className="text-xs text-cream/50 mb-1 flex items-center gap-1.5">
                    <span>{typeIcon(f.field_type)}</span> {f.label}
                  </label>
                  <DynamicFieldInput
                    field={f}
                    value={values[f.id] || ""}
                    onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))}
                    onUploadImage={(e) => handleFieldImagePick(f.id, e)}
                    uploading={uploadingFieldId === f.id}
                  />
                </div>
              ))}
            </div>
          )}
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

// ── main CustomTab: templates → entries (with search/tag filter) → editor ──
export default function CustomTab({ onToast }) {
  const [templates, setTemplates] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loadingT, setLoadingT] = useState(true);
  const [loadingE, setLoadingE] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateEditorOpen, setTemplateEditorOpen] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("সব");
  const [editingEntry, setEditingEntry] = useState(undefined);

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

  async function deleteTemplate(t) {
    if (!window.confirm(`"${t.name}" টেমপ্লেট ও এর সব এন্ট্রি মুছে ফেলবে?`)) return;
    const { error } = await supabase.from("custom_templates").delete().eq("id", t.id);
    if (error) onToast({ type: "error", message: "ডিলিট ব্যর্থ: " + error.message });
    else {
      if (selectedTemplate?.id === t.id) setSelectedTemplate(null);
      onToast({ type: "success", message: "মুছে ফেলা হয়েছে" });
    }
  }

  const allTags = useMemo(() => {
    const s = new Set();
    entries.forEach((e) => (e.tags || []).forEach((t) => s.add(t)));
    return ["সব", ...Array.from(s)];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      const matchesSearch = !q || e.title.toLowerCase().includes(q) || (e.main_text || "").toLowerCase().includes(q);
      const matchesTag = activeTag === "সব" || (e.tags || []).includes(activeTag);
      return matchesSearch && matchesTag;
    });
  }, [entries, search, activeTag]);

  // ── VIEW: entries inside a selected template ──
  if (selectedTemplate) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-5 pb-24 md:pb-8">
        <button
          onClick={() => {
            setSelectedTemplate(null);
            setActiveTag("সব");
            setSearch("");
          }}
          className="text-cream/50 hover:text-gold-400 text-sm mb-3"
        >
          ← সব টেমপ্লেটে ফিরে যাও
        </button>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-2xl text-gold-400 flex items-center gap-2">🧩 {selectedTemplate.name}</h2>
            {selectedTemplate.description && <p className="text-cream/50 text-sm mt-0.5">{selectedTemplate.description}</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setTemplateEditorOpen(selectedTemplate)}
              className="border border-gold-500/30 text-gold-400 hover:bg-gold-500/10 px-3 py-2.5 rounded-xl text-sm"
            >
              ✏️ ফিল্ড এডিট
            </button>
            <button
              onClick={() => setEditingEntry(null)}
              className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 py-2.5 rounded-xl shadow-glow text-sm"
            >
              + নতুন এন্ট্রি
            </button>
          </div>
        </div>

        <div className="glass-card rounded-xl p-3 mb-4 flex flex-col gap-2.5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 এই টেমপ্লেটের এন্ট্রি খুঁজো..."
            className="w-full bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2 text-cream placeholder:text-cream/30 focus:border-gold-500/50"
          />
          {allTags.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTag(t)}
                  className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-all ${
                    activeTag === t
                      ? "bg-gold-500 text-ink-950 border-gold-500"
                      : "border-gold-500/20 text-cream/60 hover:text-cream"
                  }`}
                >
                  {t === "সব" ? "সব" : `#${t}`}
                </button>
              ))}
            </div>
          )}
        </div>

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
                  <p className="text-cream/50 text-xs mt-1 line-clamp-2">{e.main_text || "বিস্তারিত দেখতে ক্লিক করো"}</p>
                  {e.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {e.tags.slice(0, 3).map((t) => (
                        <span key={t} className="text-[10px] bg-gold-500/10 text-gold-400/80 px-1.5 py-0.5 rounded-full">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
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

        {templateEditorOpen !== undefined && (
          <TemplateEditor
            template={templateEditorOpen}
            onClose={(deleted) => {
              setTemplateEditorOpen(undefined);
              if (deleted) setSelectedTemplate(null);
            }}
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
          <p className="text-cream/50 text-sm mt-0.5">নিজের টপিক বানাও, ইচ্ছামতো টাইপের ফিল্ড দিয়ে তথ্য সংরক্ষণ করো</p>
        </div>
        <button
          onClick={() => setTemplateEditorOpen(null)}
          className="shrink-0 bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 py-2.5 rounded-xl shadow-glow text-sm"
        >
          + নতুন টেমপ্লেট
        </button>
      </div>

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
              <button
                onClick={() => {
                  setSelectedTemplate(t);
                  setSearch("");
                  setActiveTag("সব");
                }}
                className="text-left w-full"
              >
                <h3 className="font-display text-cream font-semibold text-lg">{t.name}</h3>
                {t.description && <p className="text-cream/50 text-sm mt-1">{t.description}</p>}
              </button>
              <div className="flex justify-end gap-3 mt-2">
                <button onClick={() => setTemplateEditorOpen(t)} className="text-gold-400/80 hover:text-gold-300 text-xs">
                  ✏️ ফিল্ড এডিট
                </button>
                <button onClick={() => deleteTemplate(t)} className="text-red-400/70 hover:text-red-300 text-xs">
                  🗑️ মুছে ফেলো
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {templateEditorOpen !== undefined && (
        <TemplateEditor
          template={templateEditorOpen}
          onClose={() => setTemplateEditorOpen(undefined)}
          onToast={onToast}
        />
      )}
    </div>
  );
}
