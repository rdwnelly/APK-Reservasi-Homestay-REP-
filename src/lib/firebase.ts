// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBMyjQstPcM-rWLxij2suE3c6o_VcIG3pY",
  authDomain: "reservasi-homestay-rep.firebaseapp.com",
  projectId: "reservasi-homestay-rep",
  storageBucket: "reservasi-homestay-rep.firebasestorage.app",
  messagingSenderId: "22298583984",
  appId: "1:22298583984:web:bf7cb02c9e78313a98ac75",
  measurementId: "G-HDT5GQ9N0T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

export { db };
export { messaging };