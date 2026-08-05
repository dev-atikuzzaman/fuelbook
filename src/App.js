import React, { useEffect, useState } from "react";
import TopNav from "./components/TopNav";
import DictionaryTab from "./components/DictionaryTab";
import FilesTab from "./components/FilesTab";
import CustomTab from "./components/CustomTab";
import Toast from "./components/Toast";
import Login from "./components/Login";
import ResetPassword from "./components/ResetPassword";
import AdminPanel from "./components/AdminPanel";
import GlobalSearch from "./components/GlobalSearch";
import { supabase } from "./lib/supabase";

export default function App() {
  const [active, setActive] = useState("general");
  const [toast, setToast] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [session, setSession] = useState(undefined);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [focusTarget, setFocusTarget] = useState(null);

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
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
      setSession(s);
    });
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
    setShowAdmin(false);
  }

  function handleSearchSelect(target) {
    setShowSearch(false);
    if (target.type === "dictionary") setActive(target.dictType);
    else if (target.type === "files") setActive("files");
    else if (target.type === "custom") setActive("custom");
    setFocusTarget(target);
  }

  if (supabase && session === undefined) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center text-cream/40">
        লোড হচ্ছে...
      </div>
    );
  }

  if (supabase && recoveryMode && session) {
    return <ResetPassword onDone={() => setRecoveryMode(false)} />;
  }

  if (supabase && !session) {
    return <Login onLoggedIn={setSession} />;
  }

  return (
    <div className="min-h-screen bg-ink-950 bg-radial-fade relative overflow-x-hidden">
      <div className="blob w-96 h-96 bg-gold-500 -top-20 -left-20" />
      <div className="blob w-[28rem] h-[28rem] bg-ink-600 top-1/3 -right-32" />
      <div className="blob w-72 h-72 bg-emerald-700 bottom-0 left-1/4" />

      <div className="relative z-10">
        <TopNav
          active={active}
          onChange={setActive}
          isOnline={isOnline}
          onLogout={handleLogout}
          onOpenAdmin={() => setShowAdmin(true)}
          onOpenSearch={() => setShowSearch(true)}
        />

        {!supabase && (
          <div className="max-w-4xl mx-auto mt-4 mx-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
            ⚠️ Supabase কনফিগার করা নেই। Vercel Project Settings → Environment Variables এ{" "}
            <code className="bg-black/30 px-1 rounded">REACT_APP_SUPABASE_URL</code> ও{" "}
            <code className="bg-black/30 px-1 rounded">REACT_APP_SUPABASE_ANON_KEY</code> বসিয়ে আবার deploy করো।
          </div>
        )}

        {active === "general" && (
          <DictionaryTab
            dictType="general"
            onToast={showToast}
            focusEntryId={focusTarget?.type === "dictionary" && focusTarget.dictType === "general" ? focusTarget.entryId : null}
            onFocusHandled={() => setFocusTarget(null)}
          />
        )}
        {active === "technical" && (
          <DictionaryTab
            dictType="technical"
            onToast={showToast}
            focusEntryId={focusTarget?.type === "dictionary" && focusTarget.dictType === "technical" ? focusTarget.entryId : null}
            onFocusHandled={() => setFocusTarget(null)}
          />
        )}
        {active === "government" && (
          <DictionaryTab
            dictType="government"
            onToast={showToast}
            focusEntryId={focusTarget?.type === "dictionary" && focusTarget.dictType === "government" ? focusTarget.entryId : null}
            onFocusHandled={() => setFocusTarget(null)}
          />
        )}
        {active === "files" && (
          <FilesTab
            onToast={showToast}
            focusFileId={focusTarget?.type === "files" ? focusTarget.fileId : null}
            onFocusHandled={() => setFocusTarget(null)}
          />
        )}
        {active === "custom" && (
          <CustomTab
            onToast={showToast}
            focusTemplateId={focusTarget?.type === "custom" ? focusTarget.templateId : null}
            focusEntryId={focusTarget?.type === "custom" ? focusTarget.entryId : null}
            onFocusHandled={() => setFocusTarget(null)}
          />
        )}
      </div>

      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} onSelect={handleSearchSelect} />}

      {showAdmin && (
        <AdminPanel onClose={() => setShowAdmin(false)} onToast={showToast} onLogout={handleLogout} />
      )}

      <Toast toast={toast} />
    </div>
  );
}
