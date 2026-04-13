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
    <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 99999 }}>
      <button
        onClick={handleInstall}
        style={{
          background: "#465fff",
          color: "#fff",
          border: "none",
          padding: "10px 14px",
          borderRadius: 10,
          boxShadow: "0 4px 14px rgba(70,95,255,0.24)",
          fontWeight: 600,
        }}
      >
        Install App
      </button>
    </div>
  );
}
