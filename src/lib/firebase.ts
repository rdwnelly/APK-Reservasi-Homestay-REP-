// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBMyjQstPcM-rWLxij2suE3c6o_VcIG3pY",
  authDomain: "reservasi-homestay-rep.firebaseapp.com",
  projectId: "reservasi-homestay-rep",
  storageBucket: "reservasi-homestay-rep.firebasestorage.app",
  messagingSenderId: "22298583984",
  appId: "1:22298583984:web:bf7cb02c9e78313a98ac75",
  measurementId: "G-HDT5GQ9N0T"
};

// Initialize Firebase (Singleton pattern to prevent duplicate instances during Next.js Hot Reload)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let db: ReturnType<typeof getFirestore>;
try {
  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  });
} catch {
  db = getFirestore(app);
}

const messaging = typeof window !== "undefined" ? getMessaging(app) : null;
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

export { db, messaging, app };