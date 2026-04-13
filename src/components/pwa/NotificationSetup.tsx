"use client";

import { useEffect, useState } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function NotificationSetup() {
  const [perm, setPerm] = useState<NotificationPermission | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setPerm(Notification.permission);

    if (messaging) {
      onMessage(messaging as any, (payload) => {
        console.log("Foreground message received:", payload);
        // Optionally show an in-app toast
      });
    }
  }, []);

  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPerm(permission);
      if (permission === "granted") {
        await retrieveToken();
      }
    } catch (err) {
      console.error("Notification permission error:", err);
    }
  };

  const retrieveToken = async () => {
    if (!messaging) {
      console.warn("Messaging is not available on server side.");
      return;
    }
    const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
    if (!vapidKey) {
      console.warn("NEXT_PUBLIC_FCM_VAPID_KEY not set. Set it in your environment.");
    }
    try {
      const currentToken = await getToken(messaging as any, { vapidKey: vapidKey || undefined });
      if (currentToken) {
        setToken(currentToken);
        // store token in Firestore for later server use
        try {
          await addDoc(collection(db, "fcmTokens"), { token: currentToken, createdAt: new Date().toISOString() });
        } catch (e) {
          console.warn("Failed to save token to Firestore:", e);
        }
      } else {
        console.warn('No registration token available. Request permission to generate one.');
      }
    } catch (err) {
      console.error('An error occurred while retrieving token. ', err);
    }
  };

  return (
    <div>
      <div>
        <p>Notification permission: {perm || 'unknown'}</p>
        {perm !== 'granted' ? (
          <button onClick={requestPermission} className="rounded bg-blue-600 text-white px-3 py-1">Enable Notifications</button>
        ) : (
          <div>
            <p>FCM Token: {token ? token.slice(0,24) + '...' : 'No token yet'}</p>
            <button onClick={retrieveToken} className="rounded bg-gray-600 text-white px-3 py-1">Refresh Token</button>
          </div>
        )}
      </div>
    </div>
  );
}
