// src/components/CustomTab.js
// মোবাইল-অপটিমাইজড রেসপন্সিভ ডিজাইন সহ

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import DraggableEntryList from './DraggableEntryList';

export default function CustomTab() {
  const [templates, setTemplates]         = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [entries, setEntries]             = useState([]);
  const [search, setSearch]               = useState('');
  const [selectedTag, setSelectedTag]     = useState('');
  const [loading, setLoading]             = useState(false);
  const [isDragMode, setIsDragMode]       = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // ── Fetch templates ──────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('custom_templates')
      .select('*, template_fields(*)')
      .order('created_at', { ascending: true });
    setTemplates(data || []);
    if (data?.length && !activeTemplate) setActiveTemplate(data[0]);
  }, [activeTemplate]);

  // ── Fetch entries for active template ────────────────────────
  const fetchEntries = useCallback(async () => {
    if (!activeTemplate) return;
    setLoading(true);
    const { data } = await supabase
      .from('custom_entries')
      .select('*, field_values(*)')
      .eq('template_id', activeTemplate.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setEntries(data || []);
    setLoading(false);
  }, [activeTemplate]);

  useEffect(() => { fetchTemplates(); }, []);
  useEffect(() => { fetchEntries(); setIsDragMode(false); }, [activeTemplate]);

  // ── Drag reorder handler ─────────────────────────────────────
  const handleReorder = async (reorderedEntries) => {
    setEntries(reorderedEntries);
    setIsSavingOrder(true);
    try {
      const updates = reorderedEntries.map((entry, index) =>
        supabase
          .from('custom_entries')
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

  // ── Filtered entries ─────────────────────────────────────────
  const filteredEntries = isDragMode
    ? entries
    : entries.filter((e) => {
        const q = search.toLowerCase();
        const matchSearch = !q || e.title?.toLowerCase().includes(q);
        const matchTag    = !selectedTag || e.tags?.includes(selectedTag);
        return matchSearch && matchTag;
      });

  const allTags = [...new Set(entries.flatMap((e) => e.tags || []))];

  // ── Custom entry card ────────────────────────────────────────
  const renderCustomEntry = (entry) => (
    <div
      key={entry.id}
      className="
        bg-gray-800 border border-gray-700 rounded-lg p-3
        hover:border-yellow-600/50 transition-colors
      "
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-gray-100 font-medium text-sm md:text-base">
          {entry.title || '(শিরোনাম নেই)'}
        </span>
        {!isDragMode && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => {/* তোমার edit handler */}}
              className="px-1.5 py-0.5 text-xs rounded bg-gray-700 text-yellow-400 hover:bg-gray-600"
            >✏️</button>
            <button
              onClick={async () => {
                await supabase.from('custom_entries').delete().eq('id', entry.id);
                fetchEntries();
              }}
              className="px-1.5 py-0.5 text-xs rounded bg-gray-700 text-red-400 hover:bg-gray-600"
            >🗑️</button>
          </div>
        )}
      </div>
      {entry.tags?.length > 0 && (
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {entry.tags.map((t) => (
            <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="p-3 md:p-4 max-w-2xl mx-auto">

      {/* Template selector (স্ক্রোলেবল) */}
      {templates.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-1 px-1">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setActiveTemplate(tpl)}
              className={`
                px-3 py-1.5 rounded-full text-xs md:text-sm whitespace-nowrap 
                transition-colors flex-shrink-0
                ${activeTemplate?.id === tpl.id
                  ? 'bg-yellow-500 text-gray-900 font-semibold'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
              `}
            >
              {tpl.name}
            </button>
          ))}
        </div>
      )}

      {activeTemplate && (
        <>
          {/* ── Toolbar (মোবাইল-অপটিমাইজড) ── */}
          <div className="space-y-2 mb-4">
            {/* সার্চ বার */}
            <input
              type="text"
              placeholder="এন্ট্রি খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={isDragMode}
              className="
                w-full px-3 py-2 rounded bg-gray-800 text-gray-100 text-sm
                border border-gray-600 focus:outline-none focus:border-yellow-500
                disabled:opacity-40 disabled:cursor-not-allowed
              "
            />

            {/* বাটন রো */}
            <div className="flex flex-wrap gap-2 items-center">
              
              {/* ট্যাগ ফিল্টার */}
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

              {/* নতুন এন্ট্রি বাটন */}
              {!isDragMode && (
                <button
                  onClick={() => {/* তোমার new entry handler */}}
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

          {/* Drag mode banner */}
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
              renderEntry={renderCustomEntry}
            />
          )}
        </>
      )}
    </div>
  );
}
