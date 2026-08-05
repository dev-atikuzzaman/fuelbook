import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  uploadGenericFile,
  getFilePublicUrl,
  deleteGenericFile,
  deleteFilesBulk,
  renameGenericFile,
  moveGenericFile,
  copyGenericFile,
} from "../lib/storage";

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

function iconFor(mime, name) {
  if (mime?.startsWith("image/")) return "🖼️";
  if (mime?.startsWith("video/")) return "🎬";
  if (mime?.startsWith("audio/")) return "🎵";
  if (mime === "application/pdf" || name?.endsWith(".pdf")) return "📕";
  if (/\.(zip|rar|7z)$/i.test(name || "")) return "🗜️";
  if (/\.(doc|docx)$/i.test(name || "")) return "📘";
  if (/\.(xls|xlsx|csv)$/i.test(name || "")) return "📗";
  if (/\.(ppt|pptx)$/i.test(name || "")) return "📙";
  return "📄";
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function allFolderPaths(files) {
  const set = new Set([""]);
  files.forEach((f) => {
    const fp = f.folder_path || "";
    if (!fp) return;
    const parts = fp.split("/");
    let acc = "";
    parts.forEach((p) => {
      acc = acc ? `${acc}/${p}` : p;
      set.add(acc);
    });
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "bn"));
}

function TagEditor({ file, onToast }) {
  const [tagInput, setTagInput] = useState("");
  const tags = file.tags || [];

  async function saveTags(next) {
    const { error } = await supabase.from("files").update({ tags: next }).eq("id", file.id);
    if (error) onToast({ type: "error", message: "ট্যাগ সেভ ব্যর্থ: " + error.message });
  }
  function addTag() {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) {
      setTagInput("");
      return;
    }
    saveTags([...tags, t]);
    setTagInput("");
  }
  function removeTag(t) {
    saveTags(tags.filter((x) => x !== t));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
      {tags.map((t) => (
        <span
          key={t}
          onClick={() => removeTag(t)}
          className="text-[10px] bg-gold-500/15 text-gold-400 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-500/20 hover:text-red-300"
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
        className="text-[10px] bg-transparent border-b border-dashed border-cream/20 w-14 text-cream/70 placeholder:text-cream/30"
      />
    </div>
  );
}

// ── bottom sheet: all actions for one file ──────────────────────
function FileActionSheet({ file, onClose, onAction }) {
  const items = [
    { key: "view", label: "ভিউ করো", icon: "👁️" },
    { key: "details", label: "ডিটেইলস", icon: "ℹ️" },
    { key: "rename", label: "রিনেম করো", icon: "✏️" },
    { key: "copy", label: "কপি করো", icon: "📋" },
    { key: "move", label: "মুভ করো", icon: "📁" },
    { key: "download", label: "ডাউনলোড", icon: "⬇️" },
    { key: "delete", label: "ডিলিট করো", icon: "🗑️", danger: true },
  ];
  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="anim-in w-full max-w-md bg-ink-900 rounded-t-2xl border border-gold-500/20 shadow-card overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gold-500/10">
          <p className="text-cream font-medium truncate">{file.name}</p>
          <p className="text-cream/40 text-xs">{humanSize(file.size)}</p>
        </div>
        <div className="p-2">
          {items.map((it) => (
            <button
              key={it.key}
              onClick={() => onAction(it.key)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm hover:bg-white/5 ${
                it.danger ? "text-red-400" : "text-cream/90"
              }`}
            >
              <span className="text-lg">{it.icon}</span> {it.label}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full text-center py-3 text-cream/40 text-sm border-t border-gold-500/10">
          বাতিল করো
        </button>
      </div>
    </div>
  );
}

// ── details modal ──────────────────────────────────────────────
function FileDetailsModal({ file, onClose }) {
  const [copied, setCopied] = useState(false);
  const url = getFilePublicUrl(file.path);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard permission না থাকলেও সমস্যা নেই
    }
  }

  const rows = [
    ["নাম", file.name],
    ["সাইজ", humanSize(file.size)],
    ["টাইপ", file.mime_type || "অজানা"],
    ["ফোল্ডার", file.folder_path ? file.folder_path : "🏠 হোম"],
    ["আপলোড হয়েছে", formatDate(file.created_at)],
    ["ট্যাগ", file.tags?.length ? file.tags.map((t) => `#${t}`).join(" ") : "—"],
  ];

  return (
    <div className="fixed inset-0 z-[55] flex items-end md:items-center justify-center bg-black/70 p-0 md:p-6" onClick={onClose}>
      <div
        className="anim-in w-full md:max-w-md bg-ink-900 md:rounded-2xl rounded-t-2xl border border-gold-500/20 shadow-card overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gold-500/10">
          <h2 className="font-display text-lg text-gold-400 flex items-center gap-2">ℹ️ ডিটেইলস</h2>
          <button onClick={onClose} className="text-cream/50 hover:text-cream text-xl px-2">✕</button>
        </div>
        <div className="p-4 flex flex-col gap-2.5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 text-sm">
              <span className="text-cream/40 shrink-0">{label}</span>
              <span className="text-cream text-right break-all">{value}</span>
            </div>
          ))}
          <button
            onClick={copyLink}
            className="mt-2 bg-gold-500 hover:bg-gold-400 text-ink-950 font-medium px-4 py-2 rounded-lg text-sm"
          >
            {copied ? "কপি হয়েছে ✅" : "🔗 লিংক কপি করো"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── view / preview modal ────────────────────────────────────────
function FileViewModal({ file, onClose }) {
  const url = getFilePublicUrl(file.path);
  const mime = file.mime_type || "";

  return (
    <div className="fixed inset-0 z-[55] bg-black/90 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between p-4 text-cream" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm truncate">{file.name}</p>
        <button onClick={onClose} className="text-2xl px-2">✕</button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto" onClick={(e) => e.stopPropagation()}>
        {mime.startsWith("image/") ? (
          <img src={url} alt={file.name} className="max-w-full max-h-full object-contain rounded-lg" />
        ) : mime.startsWith("video/") ? (
          <video src={url} controls className="max-w-full max-h-full rounded-lg" />
        ) : mime.startsWith("audio/") ? (
          <audio src={url} controls className="w-full max-w-md" />
        ) : mime === "application/pdf" ? (
          <iframe title={file.name} src={url} className="w-full h-full bg-white rounded-lg" />
        ) : (
          <div className="text-center text-cream/70">
            <p className="text-4xl mb-3">{iconFor(mime, file.name)}</p>
            <p className="mb-4">এই ফাইলের ধরন সরাসরি দেখানো যাচ্ছে না।</p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="bg-gold-500 text-ink-950 font-medium px-4 py-2 rounded-lg text-sm"
            >
              নতুন ট্যাবে খোলো
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── rename modal ─────────────────────────────────────────────────
function RenameModal({ file, onClose, onToast, onDone }) {
  const [name, setName] = useState(file.name);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await renameGenericFile(file, name.trim());
      onToast({ type: "success", message: "নাম পরিবর্তন হয়েছে ✅" });
      onDone();
    } catch (err) {
      onToast({ type: "error", message: "রিনেম ব্যর্থ: " + err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="anim-in w-full max-w-sm bg-ink-900 rounded-2xl border border-gold-500/20 shadow-card p-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg text-gold-400 mb-3">✏️ রিনেম করো</h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          className="w-full bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2 text-cream mb-3"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-cream/50 px-3 py-2 text-sm">বাতিল</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-medium px-4 py-2 rounded-lg text-sm disabled:opacity-60"
          >
            {saving ? "সেভ হচ্ছে..." : "সেভ করো"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── folder picker (shared by move & copy) ─────────────────────────
function FolderPickerModal({ files, title, actionLabel, onPick, onClose }) {
  const [customPath, setCustomPath] = useState("");
  const paths = allFolderPaths(files);

  return (
    <div className="fixed inset-0 z-[55] flex items-end md:items-center justify-center bg-black/70 p-0 md:p-6" onClick={onClose}>
      <div
        className="anim-in w-full md:max-w-sm max-h-[80vh] bg-ink-900 md:rounded-2xl rounded-t-2xl border border-gold-500/20 shadow-card flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gold-500/10">
          <h2 className="font-display text-lg text-gold-400">{title}</h2>
          <button onClick={onClose} className="text-cream/50 hover:text-cream text-xl px-2">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {paths.map((p) => (
            <button
              key={p || "root"}
              onClick={() => onPick(p)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-white/5 text-left text-sm text-cream/90"
            >
              <span>{p ? "📂" : "🏠"}</span>
              <span className="truncate">{p || "হোম (রুট)"}</span>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-gold-500/10 flex gap-2">
          <input
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            placeholder="নতুন ফোল্ডার পাথ লেখো..."
            className="flex-1 bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2 text-cream text-sm"
          />
          <button
            onClick={() => customPath.trim() && onPick(customPath.trim())}
            className="bg-gold-500 text-ink-950 font-medium px-3 py-2 rounded-lg text-sm"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FilesTab({ onToast, focusFileId, onFocusHandled }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState("");
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("সব");
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [newFolderInput, setNewFolderInput] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // context menu / modal state
  const [sheetFile, setSheetFile] = useState(null);
  const [viewFile, setViewFile] = useState(null);
  const [detailsFile, setDetailsFile] = useState(null);
  const [renameFile, setRenameFile] = useState(null);
  const [transfer, setTransfer] = useState(null); // { file, mode: 'move' | 'copy' }

  // গ্লোবাল সার্চ থেকে সরাসরি একটা ফাইলের ডিটেইলস খুলতে চাইলে
  useEffect(() => {
    if (!focusFileId || loading) return;
    const found = files.find((f) => f.id === focusFileId);
    if (found) {
      setDetailsFile(found);
      onFocusHandled && onFocusHandled();
    }
  }, [focusFileId, files, loading, onFocusHandled]);

  useEffect(() => {
    let active = true;
    if (!supabase) {
      setLoading(false);
      return;
    }
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .order("created_at", { ascending: false });
      if (active && !error) setFiles(data || []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("files_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "files" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setFiles((prev) => (prev.some((f) => f.id === payload.new.id) ? prev : [payload.new, ...prev]));
        } else if (payload.eventType === "UPDATE") {
          setFiles((prev) => prev.map((f) => (f.id === payload.new.id ? payload.new : f)));
        } else if (payload.eventType === "DELETE") {
          setFiles((prev) => prev.filter((f) => f.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const allTags = useMemo(() => {
    const s = new Set();
    files.forEach((f) => (f.tags || []).forEach((t) => s.add(t)));
    return ["সব", ...Array.from(s)];
  }, [files]);

  const { subfolders, filesHere } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const tagActive = activeTag !== "সব";

    if (q || tagActive || onlyPinned) {
      const list = files
        .filter((f) => {
          const matchesSearch = !q || f.name.toLowerCase().includes(q);
          const matchesTag = !tagActive || (f.tags || []).includes(activeTag);
          const matchesPinned = !onlyPinned || f.pinned;
          return matchesSearch && matchesTag && matchesPinned;
        })
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
      return { subfolders: [], filesHere: list };
    }

    const prefix = currentFolder ? currentFolder + "/" : "";
    const folderSet = new Set();
    const here = [];
    files.forEach((f) => {
      const fp = f.folder_path || "";
      if (!fp.startsWith(prefix)) return;
      const rest = fp.slice(prefix.length);
      if (rest === "") {
        here.push(f);
      } else {
        const next = rest.split("/")[0];
        folderSet.add(next);
      }
    });
    here.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    return { subfolders: Array.from(folderSet).sort(), filesHere: here };
  }, [files, currentFolder, search, activeTag, onlyPinned]);

  async function handleFilesSelected(fileList, isFolder) {
    const arr = Array.from(fileList || []);
    if (arr.length === 0) return;
    setUploading(true);
    let done = 0;
    for (const file of arr) {
      let folderPath = currentFolder;
      if (isFolder && file.webkitRelativePath) {
        const parts = file.webkitRelativePath.split("/");
        parts.pop();
        folderPath = [currentFolder, ...parts].filter(Boolean).join("/");
      }
      setProgressText(`আপলোড হচ্ছে ${done + 1}/${arr.length}: ${file.name}`);
      try {
        await uploadGenericFile(file, folderPath);
      } catch (err) {
        onToast({ type: "error", message: `${file.name} আপলোড ব্যর্থ: ${err.message}` });
      }
      done++;
    }
    setProgressText("");
    setUploading(false);
    onToast({ type: "success", message: `${arr.length}টি ফাইল আপলোড সম্পন্ন ✅` });
  }

  async function togglePin(row) {
    if (!supabase) return;
    const { error } = await supabase.from("files").update({ pinned: !row.pinned }).eq("id", row.id);
    if (error) onToast({ type: "error", message: "পিন ব্যর্থ: " + error.message });
  }

  async function handleDelete(row) {
    if (!window.confirm(`"${row.name}" ফাইলটা মুছে ফেলবে?`)) return;
    try {
      await deleteGenericFile(row);
      onToast({ type: "success", message: "মুছে ফেলা হয়েছে" });
    } catch (err) {
      onToast({ type: "error", message: "ডিলিট ব্যর্থ: " + err.message });
    }
  }

  async function handleDeleteFolder(name, e) {
    e.stopPropagation();
    const prefix = currentFolder ? `${currentFolder}/${name}` : name;
    const rows = files.filter((f) => f.folder_path === prefix || f.folder_path.startsWith(prefix + "/"));
    const confirmMsg =
      rows.length > 0
        ? `"${name}" ফোল্ডার ও এর ভেতরের ${rows.length}টি ফাইল সম্পূর্ণ মুছে ফেলবে? এটা আর ফিরিয়ে আনা যাবে না।`
        : `"${name}" ফোল্ডারটা মুছে ফেলবে?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      if (rows.length > 0) await deleteFilesBulk(rows);
      onToast({ type: "success", message: "ফোল্ডার মুছে ফেলা হয়েছে" });
    } catch (err) {
      onToast({ type: "error", message: "ফোল্ডার ডিলিট ব্যর্থ: " + err.message });
    }
  }

  function enterFolder(name) {
    setCurrentFolder((prev) => (prev ? `${prev}/${name}` : name));
    setSearch("");
  }
  function goBreadcrumb(idx) {
    const parts = currentFolder.split("/").filter(Boolean);
    setCurrentFolder(parts.slice(0, idx).join("/"));
  }
  function createEmptyFolder() {
    const name = newFolderInput.trim();
    if (!name) return;
    enterFolder(name);
    setNewFolderInput("");
    setShowNewFolder(false);
    onToast({ type: "info", message: "ফোল্ডারে ঢুকেছো — এখন এখানে ফাইল আপলোড করো" });
  }

  // ── action-sheet routing ──
  function handleSheetAction(key) {
    const file = sheetFile;
    setSheetFile(null);
    if (key === "view") setViewFile(file);
    else if (key === "details") setDetailsFile(file);
    else if (key === "rename") setRenameFile(file);
    else if (key === "move") setTransfer({ file, mode: "move" });
    else if (key === "copy") setTransfer({ file, mode: "copy" });
    else if (key === "download") {
      const a = document.createElement("a");
      a.href = getFilePublicUrl(file.path);
      a.download = file.name;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.click();
    } else if (key === "delete") handleDelete(file);
  }

  async function handleTransferPick(targetPath) {
    if (!transfer) return;
    const { file, mode } = transfer;
    try {
      if (mode === "move") {
        await moveGenericFile(file, targetPath);
        onToast({ type: "success", message: `"${file.name}" সরানো হয়েছে ✅` });
      } else {
        await copyGenericFile(file, targetPath);
        onToast({ type: "success", message: `"${file.name}" কপি হয়েছে ✅` });
      }
    } catch (err) {
      onToast({ type: "error", message: (mode === "move" ? "মুভ" : "কপি") + " ব্যর্থ: " + err.message });
    } finally {
      setTransfer(null);
    }
  }

  const crumbs = currentFolder.split("/").filter(Boolean);
  const browsingFiltered = search.trim() !== "" || activeTag !== "সব" || onlyPinned;

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 pb-24 md:pb-8">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-2xl text-gold-400 flex items-center gap-2">📁 ফাইল ম্যানেজার</h2>
          <p className="text-cream/50 text-sm mt-0.5">যেকোনো ফরম্যাটের ফাইল বা পুরো ফোল্ডার আপলোড করো</p>
        </div>
      </div>

      <div className="glass-card rounded-xl p-3 mb-4 flex flex-col gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 ফাইলের নাম দিয়ে খুঁজো..."
          className="w-full bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-2 text-cream placeholder:text-cream/30 focus:border-gold-500/50"
        />
        {allTags.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setOnlyPinned((v) => !v)}
              className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-all ${
                onlyPinned
                  ? "bg-gold-500 text-ink-950 border-gold-500"
                  : "border-gold-500/20 text-cream/60 hover:text-cream"
              }`}
            >
              ⭐ শুধু পিন করা
            </button>
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
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 py-2 rounded-xl text-sm shadow-glow"
          >
            + ফাইল আপলোড
          </button>
          <button
            onClick={() => folderInputRef.current?.click()}
            className="border border-gold-500/30 text-gold-400 hover:bg-gold-500/10 px-4 py-2 rounded-xl text-sm"
          >
            + ফোল্ডার আপলোড
          </button>
          <button
            onClick={() => setShowNewFolder((v) => !v)}
            className="border border-cream/15 text-cream/70 hover:bg-white/5 px-4 py-2 rounded-xl text-sm"
          >
            📂 নতুন ফোল্ডার
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFilesSelected(e.target.files, false)} />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            webkitdirectory=""
            directory=""
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files, true)}
          />
        </div>
        {showNewFolder && (
          <div className="flex gap-2">
            <input
              value={newFolderInput}
              onChange={(e) => setNewFolderInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createEmptyFolder()}
              placeholder="ফোল্ডারের নাম..."
              className="flex-1 bg-ink-950/50 border border-gold-500/10 rounded-lg px-3 py-1.5 text-cream text-sm"
            />
            <button onClick={createEmptyFolder} className="bg-gold-500 text-ink-950 px-3 py-1.5 rounded-lg text-sm font-medium">
              ঢুকো
            </button>
          </div>
        )}
        {uploading && <p className="text-xs text-gold-400 animate-pulse">{progressText || "আপলোড হচ্ছে..."}</p>}
      </div>

      {!browsingFiltered && (
        <div className="flex items-center gap-1 text-sm mb-3 text-cream/60 flex-wrap">
          <button onClick={() => setCurrentFolder("")} className="hover:text-gold-400">
            🏠 হোম
          </button>
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              <span>/</span>
              <button onClick={() => goBreadcrumb(i + 1)} className="hover:text-gold-400">
                {c}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-cream/40 text-center py-10">লোড হচ্ছে...</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {subfolders.map((f) => (
            <div key={f} className="glass-card rounded-xl p-3.5 flex items-center gap-3 hover:border-gold-500/40 relative">
              <button onClick={() => enterFolder(f)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <span className="text-2xl">📂</span>
                <span className="text-cream font-medium truncate">{f}</span>
              </button>
              <button
                onClick={(e) => handleDeleteFolder(f, e)}
                className="text-red-400/70 hover:text-red-300 text-lg px-1 shrink-0"
                title="ফোল্ডার মুছে ফেলো"
              >
                🗑️
              </button>
            </div>
          ))}
          {filesHere.map((f) => (
            <div key={f.id} className={`glass-card rounded-xl p-3.5 ${f.pinned ? "border-gold-500/40" : ""}`}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewFile(f)}
                  className="text-2xl shrink-0"
                  title="ভিউ করো"
                >
                  {iconFor(f.mime_type, f.name)}
                </button>
                <button onClick={() => setViewFile(f)} className="min-w-0 flex-1 text-left">
                  <p className="text-cream text-sm font-medium truncate">{f.name}</p>
                  <p className="text-cream/40 text-xs">{humanSize(f.size)}</p>
                </button>
                <button
                  onClick={() => togglePin(f)}
                  className="text-sm px-1"
                  title={f.pinned ? "পিন সরাও" : "পিন করো"}
                >
                  {f.pinned ? "⭐" : <span className="text-cream/20 hover:text-gold-400/60">☆</span>}
                </button>
                <button
                  onClick={() => setSheetFile(f)}
                  className="text-cream/60 hover:text-gold-400 text-lg px-2"
                  title="আরও অপশন"
                >
                  ⋮
                </button>
              </div>
              <TagEditor file={f} onToast={onToast} />
            </div>
          ))}
          {subfolders.length === 0 && filesHere.length === 0 && (
            <div className="col-span-2 text-center py-14 text-cream/40">
              <p className="text-3xl mb-2">📭</p>
              <p>{browsingFiltered ? "কোনো ফাইল পাওয়া যায়নি।" : "এই ফোল্ডারে এখনো কিছু নেই।"}</p>
            </div>
          )}
        </div>
      )}

      {sheetFile && (
        <FileActionSheet file={sheetFile} onClose={() => setSheetFile(null)} onAction={handleSheetAction} />
      )}
      {viewFile && <FileViewModal file={viewFile} onClose={() => setViewFile(null)} />}
      {detailsFile && <FileDetailsModal file={detailsFile} onClose={() => setDetailsFile(null)} />}
      {renameFile && (
        <RenameModal
          file={renameFile}
          onClose={() => setRenameFile(null)}
          onToast={onToast}
          onDone={() => setRenameFile(null)}
        />
      )}
      {transfer && (
        <FolderPickerModal
          files={files}
          title={transfer.mode === "move" ? "📁 কোথায় সরাবে?" : "📋 কোথায় কপি করবে?"}
          actionLabel={transfer.mode === "move" ? "এখানে সরাও" : "এখানে কপি করো"}
          onPick={handleTransferPick}
          onClose={() => setTransfer(null)}
        />
      )}
    </div>
  );
}
