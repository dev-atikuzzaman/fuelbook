import React, { useEffect, useState } from "react";
import TopNav from "./components/TopNav";
import DictionaryTab from "./components/DictionaryTab";
import FilesTab from "./components/FilesTab";
import CustomTab from "./components/CustomTab";
import Toast from "./components/Toast";
import { supabase } from "./lib/supabase";

export default function App() {
  const [active, setActive] = useState("general");
  const [toast, setToast] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  function showToast(t) {
    setToast(t);
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="min-h-screen bg-ink-950 bg-radial-fade relative overflow-x-hidden">
      {/* decorative blobs, inspired by reference design */}
      <div className="blob w-96 h-96 bg-gold-500 -top-20 -left-20" />
      <div className="blob w-[28rem] h-[28rem] bg-ink-600 top-1/3 -right-32" />
      <div className="blob w-72 h-72 bg-emerald-700 bottom-0 left-1/4" />

      <div className="relative z-10">
        <TopNav active={active} onChange={setActive} isOnline={isOnline} />

        {!supabase && (
          <div className="max-w-4xl mx-auto mt-4 mx-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
            ⚠️ Supabase কনফিগার করা নেই। Vercel Project Settings → Environment Variables এ{" "}
            <code className="bg-black/30 px-1 rounded">REACT_APP_SUPABASE_URL</code> ও{" "}
            <code className="bg-black/30 px-1 rounded">REACT_APP_SUPABASE_ANON_KEY</code> বসিয়ে আবার deploy করো।
          </div>
        )}

        {active === "general" && <DictionaryTab dictType="general" onToast={showToast} />}
        {active === "technical" && <DictionaryTab dictType="technical" onToast={showToast} />}
        {active === "government" && <DictionaryTab dictType="government" onToast={showToast} />}
        {active === "files" && <FilesTab onToast={showToast} />}
        {active === "custom" && <CustomTab onToast={showToast} />}
      </div>

      <Toast toast={toast} />
    </div>
  );
}
