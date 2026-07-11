import React, { useEffect, useState } from "react";
import TopNav from "./components/TopNav";
import DictionaryTab from "./components/DictionaryTab";
import FilesTab from "./components/FilesTab";
import CustomTab from "./components/CustomTab";
import Toast from "./components/Toast";
import Login from "./components/Login";
import { supabase } from "./lib/supabase";

export default function App() {
  const [active, setActive] = useState("general");
  const [toast, setToast] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [session, setSession] = useState(undefined); // undefined = checking, null = logged out, obj = logged in

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

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  function showToast(t) {
    setToast(t);
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => setToast(null), 3000);
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
  }

  // Supabase কনফিগার করা নেই — সরাসরি এরর দেখাও, লগইন স্ক্রিন লাগবে না
  if (supabase && session === undefined) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center text-cream/40">
        লোড হচ্ছে...
      </div>
    );
  }

  if (supabase && !session) {
    return <Login onLoggedIn={setSession} />;
  }

  return (
    <div className="min-h-screen bg-ink-950 bg-radial-fade relative overflow-x-hidden">
      {/* decorative blobs, inspired by reference design */}
      <div className="blob w-96 h-96 bg-gold-500 -top-20 -left-20" />
      <div className="blob w-[28rem] h-[28rem] bg-ink-600 top-1/3 -right-32" />
      <div className="blob w-72 h-72 bg-emerald-700 bottom-0 left-1/4" />

      <div className="relative z-10">
        <TopNav active={active} onChange={setActive} isOnline={isOnline} onLogout={handleLogout} />

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
