// src/components/DictionaryTab.js
// ড্র্যাগ-ড্রপ সিকোয়েন্সিং সাপোর্টসহ আপডেটেড ভার্সন
// নোট: তোমার বিদ্যমান DictionaryTab.js এর বাকি সব লজিক অপরিবর্তিত রেখে
// নিচের পরিবর্তনগুলো মার্জ করো।

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import EntryCard from './EntryCard';
import EntryEditor from './EntryEditor';
import DraggableEntryList from './DraggableEntryList'; // ← নতুন import

export default function DictionaryTab({ type, label }) {
  const [entries, setEntries]         = useState([]);
  const [search, setSearch]           = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [showEditor, setShowEditor]   = useState(false);
  const [loading, setLoading]         = useState(false);

  // ── নতুন state ────────────────────────────────────────────────
  const [isDragMode, setIsDragMode]     = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  // ─────────────────────────────────────────────────────────────

  // ── Fetch entries ────────────────────────────────────────────
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dictionary_entries')
      .select('*')
      .eq('type', type)
      .order('sort_order', { ascending: true }) // ← sort_order অনুযায়ী
      .order('created_at', { ascending: true }); // secondary fallback

    if (!error) setEntries(data || []);
    setLoading(false);
  }, [type]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // ── Drag reorder handler ─────────────────────────────────────
  const handleReorder = async (reorderedEntries) => {
    // Optimistic UI update
    setEntries(reorderedEntries);

    setIsSavingOrder(true);
    try {
      // প্রতিটা এন্ট্রির নতুন sort_order Supabase এ সেভ করো
      const updates = reorderedEntries.map((entry, index) =>
        supabase
          .from('dictionary_entries')
          .update({ sort_order: index })
          .eq('id', entry.id)
      );
      await Promise.all(updates);
    } catch (err) {
      console.error('sort_order save error:', err);
      // error হলে আবার fetch করো
      fetchEntries();
    } finally {
      setIsSavingOrder(false);
    }
  };

  // ── Drag mode toggle ─────────────────────────────────────────
  const toggleDragMode = () => {
    // drag mode বন্ধ করার সময় search/filter clear করো
    if (!isDragMode) setSearch('');
    setIsDragMode((prev) => !prev);
  };

  // ── Filtered entries (drag mode এ filter বন্ধ) ───────────────
  const filteredEntries = isDragMode
    ? entries
    : entries.filter((e) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          e.word?.toLowerCase().includes(q) ||
          e.meaning?.toLowerCase().includes(q);
        const matchTag = !selectedTag || e.tags?.includes(selectedTag);
        return matchSearch && matchTag;
      });

  // ── All unique tags ──────────────────────────────────────────
  const allTags = [...new Set(entries.flatMap((e) => e.tags || []))];

  // ── Handlers ─────────────────────────────────────────────────
  const handleEdit   = (entry) => { setEditingEntry(entry); setShowEditor(true); };
  const handleNew    = () => { setEditingEntry(null); setShowEditor(true); };
  const handleClose  = () => { setShowEditor(false); fetchEntries(); };
  const handleDelete = async (id) => {
    await supabase.from('dictionary_entries').delete().eq('id', id);
    fetchEntries();
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="p-4 max-w-2xl mx-auto">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">

        {/* Search — drag mode এ disabled */}
        <input
          type="text"
          placeholder={`${label} খুঁজুন...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={isDragMode}
          className="
            flex-1 min-w-0 px-3 py-2 rounded bg-gray-800 text-gray-100
            border border-gray-600 focus:outline-none focus:border-yellow-500
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        />

        {/* Tag filter — drag mode এ hidden */}
        {!isDragMode && allTags.length > 0 && (
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-2 py-2 rounded bg-gray-800 text-gray-200 border border-gray-600"
          >
            <option value="">সব ট্যাগ</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}

        {/* ── Drag mode toggle button ── */}
        <button
          onClick={toggleDragMode}
          title={isDragMode ? 'সাজানো শেষ' : 'এন্ট্রি সাজাও'}
          className={`
            px-3 py-2 rounded text-sm font-semibold transition-all select-none
            ${isDragMode
              ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
          `}
        >
          {isDragMode
            ? isSavingOrder ? '⏳ সেভ হচ্ছে...' : '✅ সম্পন্ন'
            : '↕️ সাজাও'}
        </button>

        {/* New entry button — drag mode এ hidden */}
        {!isDragMode && (
          <button
            onClick={handleNew}
            className="px-3 py-2 rounded bg-green-700 text-white text-sm font-semibold hover:bg-green-600"
          >
            + নতুন
          </button>
        )}
      </div>

      {/* ── Drag mode info banner ── */}
      {isDragMode && (
        <div className="mb-3 px-3 py-2 rounded bg-yellow-900/40 border border-yellow-600/50 text-yellow-300 text-sm">
          ↕️ এন্ট্রি ধরে টেনে সাজিয়ে নিন। সম্পন্ন হলে <strong>✅ সম্পন্ন</strong> চাপুন।
        </div>
      )}

      {/* ── Entry list ── */}
      {loading ? (
        <p className="text-center text-gray-500 py-8">লোড হচ্ছে...</p>
      ) : filteredEntries.length === 0 ? (
        <p className="text-center text-gray-500 py-8">কোনো এন্ট্রি নেই</p>
      ) : (
        <DraggableEntryList
          entries={filteredEntries}
          onReorder={handleReorder}
          isDragMode={isDragMode}
          renderEntry={(entry) => (
            <EntryCard
              entry={entry}
              onEdit={isDragMode ? undefined : handleEdit}
              onDelete={isDragMode ? undefined : handleDelete}
            />
          )}
        />
      )}

      {/* ── Entry editor modal ── */}
      {showEditor && (
        <EntryEditor
          entry={editingEntry}
          type={type}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
