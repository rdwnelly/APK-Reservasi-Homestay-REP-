"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ('serviceWorker' in navigator) {
      // register main app SW
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service worker registered.', reg);
        })
        .catch((err) => {
          console.warn('Service worker registration failed:', err);
        });
      // register firebase messaging SW for background notifications
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .then((reg) => {
          console.log('FCM service worker registered.', reg);
        })
        .catch((err) => {
          console.warn('FCM service worker registration failed:', err);
        });
    }
  }, []);

  return null;
}
