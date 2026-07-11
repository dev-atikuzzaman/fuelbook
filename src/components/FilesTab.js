import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { uploadGenericFile, getFilePublicUrl, deleteGenericFile, deleteFilesBulk } from "../lib/storage";

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

export default function FilesTab({ onToast }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState(""); // '' = root
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [newFolderInput, setNewFolderInput] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

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

  // derive subfolders visible at currentFolder level
  const { subfolders, filesHere } = useMemo(() => {
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
    let list = here;
    const q = search.trim().toLowerCase();
    if (q) list = files.filter((f) => f.name.toLowerCase().includes(q));
    return { subfolders: Array.from(folderSet).sort(), filesHere: list };
  }, [files, currentFolder, search]);

  async function handleFilesSelected(fileList, isFolder) {
    const arr = Array.from(fileList || []);
    if (arr.length === 0) return;
    setUploading(true);
    let done = 0;
    for (const file of arr) {
      let folderPath = currentFolder;
      if (isFolder && file.webkitRelativePath) {
        const parts = file.webkitRelativePath.split("/");
        parts.pop(); // remove filename
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
    // "virtual" folder — will appear once a file is placed inside; we simulate
    // by just navigating in; folders only persist once they contain a file.
    enterFolder(name);
    setNewFolderInput("");
    setShowNewFolder(false);
    onToast({ type: "info", message: "ফোল্ডারে ঢুকেছো — এখন এখানে ফাইল আপলোড করো" });
  }

  const crumbs = currentFolder.split("/").filter(Boolean);

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

      {/* breadcrumb */}
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

      {loading ? (
        <p className="text-cream/40 text-center py-10">লোড হচ্ছে...</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {subfolders.map((f) => (
            <div
              key={f}
              className="glass-card rounded-xl p-3.5 flex items-center gap-3 hover:border-gold-500/40 relative"
            >
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
            <div key={f.id} className="glass-card rounded-xl p-3.5 flex items-center gap-3">
              <span className="text-2xl shrink-0">{iconFor(f.mime_type, f.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-cream text-sm font-medium truncate">{f.name}</p>
                <p className="text-cream/40 text-xs">{humanSize(f.size)}</p>
              </div>
              <a
                href={getFilePublicUrl(f.path)}
                target="_blank"
                rel="noreferrer"
                download={f.name}
                className="text-gold-400 hover:text-gold-300 text-lg px-1"
                title="ডাউনলোড"
              >
                ⬇️
              </a>
              <button
                onClick={() => handleDelete(f)}
                className="text-red-400 hover:text-red-300 text-lg px-1"
                title="মুছে ফেলো"
              >
                🗑️
              </button>
            </div>
          ))}
          {subfolders.length === 0 && filesHere.length === 0 && (
            <div className="col-span-2 text-center py-14 text-cream/40">
              <p className="text-3xl mb-2">📭</p>
              <p>এই ফোল্ডারে এখনো কিছু নেই।</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
