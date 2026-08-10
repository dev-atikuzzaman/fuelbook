// src/components/DictionaryTab.js
// মোবাইল-অপটিমাইজড রেসপন্সিভ ডিজাইন সহ

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import EntryCard from './EntryCard';
import EntryEditor from './EntryEditor';
import DraggableEntryList from './DraggableEntryList';

export default function DictionaryTab({ type, label }) {
  const [entries, setEntries]         = useState([]);
  const [search, setSearch]           = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [showEditor, setShowEditor]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [isDragMode, setIsDragMode]     = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // ── Fetch entries ────────────────────────────────────────────
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dictionary_entries')
      .select('*')
      .eq('dict_type', type)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (!error) setEntries(data || []);
    setLoading(false);
  }, [type]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // ── Drag reorder handler ─────────────────────────────────────
  const handleReorder = async (reorderedEntries) => {
    setEntries(reorderedEntries);
    setIsSavingOrder(true);
    try {
      const updates = reorderedEntries.map((entry, index) =>
        supabase
          .from('dictionary_entries')
          .update({ sort_order: index })
          .eq('id', entry.id)
      );
      await Promise.all(updates);
    } catch (err) {
      console.error('sort_order save error:', err);
      fetchEntries();
    } finally {
      setIsSavingOrder(false);
    }
  };

  const toggleDragMode = () => {
    if (!isDragMode) setSearch('');
    setIsDragMode((prev) => !prev);
  };

  // ── Filtered entries ────────────────────────────────────────
  const filteredEntries = isDragMode
    ? entries
    : entries.filter((e) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          e.term?.toLowerCase().includes(q) ||
          e.meaning?.toLowerCase().includes(q);
        const matchTag = !selectedTag || e.tags?.includes(selectedTag);
        return matchSearch && matchTag;
      });

  const allTags = [...new Set(entries.flatMap((e) => e.tags || []))];

  const handleEdit   = (entry) => { setEditingEntry(entry); setShowEditor(true); };
  const handleNew    = () => { setEditingEntry(null); setShowEditor(true); };
  const handleClose  = () => { setShowEditor(false); fetchEntries(); };
  const handleDelete = async (id) => {
    await supabase.from('dictionary_entries').delete().eq('id', id);
    fetchEntries();
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="p-3 md:p-4 max-w-2xl mx-auto">

      {/* ── Toolbar (মোবাইল-অপটিমাইজড) ── */}
      <div className="space-y-2 mb-4">
        {/* সার্চ বার */}
        <input
          type="text"
          placeholder={`${label} খুঁজুন...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={isDragMode}
          className="
            w-full px-3 py-2 rounded bg-gray-800 text-gray-100 text-sm
            border border-gray-600 focus:outline-none focus:border-yellow-500
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        />

        {/* বাটন রো (ফ্লেক্স উইথ র্যাপ) */}
        <div className="flex flex-wrap gap-2 items-center">
          
          {/* ট্যাগ সিলেক্ট — drag mode এ হিডেন */}
          {!isDragMode && allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="
                px-2 py-1.5 rounded bg-gray-800 text-gray-200 text-xs md:text-sm
                border border-gray-600 flex-shrink-0
              "
            >
              <option value="">সব ট্যাগ</option>
              {allTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}

          {/* ড্র্যাগ মোড টগল */}
          <button
            onClick={toggleDragMode}
            title={isDragMode ? 'সাজানো শেষ' : 'এন্ট্রি সাজাও'}
            className={`
              px-2.5 py-1.5 rounded text-xs md:text-sm font-semibold 
              transition-all select-none flex-shrink-0 whitespace-nowrap
              ${isDragMode
                ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
            `}
          >
            {isDragMode
              ? isSavingOrder ? '⏳ সেভ...' : '✅ সম্পন্ন'
              : '↕️ সাজাও'}
          </button>

          {/* নতুন এন্ট্রি বাটন — drag mode এ হিডেন */}
          {!isDragMode && (
            <button
              onClick={handleNew}
              className="
                px-2.5 py-1.5 rounded bg-green-700 text-white text-xs md:text-sm 
                font-semibold hover:bg-green-600 flex-shrink-0 whitespace-nowrap
              "
            >
              + নতুন
            </button>
          )}
        </div>
      </div>

      {/* ── Drag mode info banner ── */}
      {isDragMode && (
        <div className="mb-3 px-3 py-2 rounded bg-yellow-900/40 border border-yellow-600/50 text-yellow-300 text-xs md:text-sm">
          ↕️ এন্ট্রি ধরে টেনে সাজিয়ে নিন। <strong>✅ সম্পন্ন</strong> চাপুন।
        </div>
      )}

      {/* ── Entry list ── */}
      {loading ? (
        <p className="text-center text-gray-500 py-8 text-sm">লোড হচ্ছে...</p>
      ) : filteredEntries.length === 0 ? (
        <p className="text-center text-gray-500 py-8 text-sm">কোনো এন্ট্রি নেই</p>
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
          dict_type={type}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
