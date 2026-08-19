"use client";

import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler as EventListener);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler as EventListener);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice && choice.outcome === "accepted") {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed right-3 bottom-24 lg:bottom-6 z-50 flex items-center gap-1 bg-brand-600 text-white rounded-xl shadow-xl p-1.5 pl-3 border border-brand-400/30 backdrop-blur-md">
      <button
        onClick={handleInstall}
        className="flex items-center gap-1.5 text-xs font-bold text-white hover:opacity-90 transition"
      >
        <span>📲 Install App</span>
      </button>
      <button
        onClick={() => setVisible(false)}
        className="p-1 hover:bg-brand-700/50 rounded-lg text-white/80 hover:text-white transition text-xs font-bold ml-1"
        aria-label="Tutup prompt install"
      >
        ✕
      </button>
    </div>
  );
}

