import React, { useRef, useState } from "react";
import { uploadMultipleImages, deleteImageByUrl } from "../lib/storage";
import useBackButtonClose from "../hooks/useBackButtonClose";

function Lightbox({ list, index, setIndex, onClose }) {
  useBackButtonClose(onClose);
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button className="absolute top-4 right-4 text-cream text-2xl" onClick={onClose}>
        ✕
      </button>
      {index > 0 && (
        <button
          className="absolute left-2 sm:left-6 text-cream text-3xl px-3"
          onClick={(e) => {
            e.stopPropagation();
            setIndex(index - 1);
          }}
        >
          ‹
        </button>
      )}
      {index < list.length - 1 && (
        <button
          className="absolute right-2 sm:right-6 text-cream text-3xl px-3"
          onClick={(e) => {
            e.stopPropagation();
            setIndex(index + 1);
          }}
        >
          ›
        </button>
      )}
      <img
        src={list[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full rounded-lg object-contain"
      />
    </div>
  );
}

export default function ImageGallery({ images, onChange, folder, onToast, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  async function handlePick(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls = await uploadMultipleImages(files, folder, (done, total) => setProgress(`${done}/${total} আপলোড হচ্ছে...`));
      onChange([...(images || []), ...urls]);
      onToast({ type: "success", message: `${urls.length}টি ছবি যোগ হয়েছে ✅` });
    } catch (err) {
      onToast({ type: "error", message: "ছবি আপলোড ব্যর্থ: " + err.message });
    } finally {
      setUploading(false);
      setProgress("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(idx) {
    const url = images[idx];
    onChange(images.filter((_, i) => i !== idx));
    deleteImageByUrl(url);
  }

  const list = images || [];

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-xs text-gold-400/80 hover:text-gold-300 py-1"
      >
        <span>🖼️ গ্যালারি ছবি {list.length > 0 && `(${list.length})`}</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-1.5">
          {list.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-2">
              {list.map((url, idx) => (
                <div key={url + idx} className="relative aspect-square rounded-lg overflow-hidden border border-gold-500/15 group">
                  <img
                    src={url}
                    alt=""
                    onClick={() => setPreview(idx)}
                    className="w-full h-full object-cover cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="absolute top-0.5 right-0.5 bg-black/60 text-red-300 hover:text-red-200 rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    title="মুছে ফেলো"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-xs border border-gold-500/30 text-gold-400 hover:bg-gold-500/10 px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {uploading ? progress || "আপলোড হচ্ছে..." : "+ ছবি যোগ করো (একসাথে অনেকগুলো)"}
          </button>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePick} />
        </div>
      )}

      {preview !== null && list[preview] && (
        <Lightbox list={list} index={preview} setIndex={setPreview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
