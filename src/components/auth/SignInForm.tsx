"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { EyeIcon, EyeCloseIcon } from "@/icons";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Admin login credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  // Helper pesan error ramah pengguna
  const getFriendlyErrorMessage = (error: any) => {
    const code = error?.code || "";
    if (code === "auth/user-not-found") {
      return "❌ Akun admin dengan email tersebut tidak ditemukan di Firebase.";
    }
    if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
      return "❌ Password yang Anda masukkan salah. Silakan coba lagi.";
    }
    if (code === "auth/invalid-email") {
      return "❌ Format alamat email tidak valid.";
    }
    if (code === "auth/too-many-requests") {
      return "⚠️ Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat lagi.";
    }
    if (code === "auth/network-request-failed") {
      return "⚠️ Masalah koneksi internet. Periksa jaringan Anda.";
    }
    return error?.message || "❌ Gagal masuk. Pastikan email & password terdaftar di Firebase.";
  };

  // Handler Login Admin Email & Password
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      await setPersistence(
        auth,
        isChecked ? browserLocalPersistence : browserSessionPersistence
      );
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push("/");
    } catch (error: any) {
      console.error("Firebase Login Error:", error);
      setErrorMsg(getFriendlyErrorMessage(error));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white relative overflow-hidden">
      {/* Dynamic Background Glow Effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-600/15 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-300 space-y-6">
        {/* Header Logo & Brand */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-32 h-24 relative">
            <Image
              src="/images/logo/logo-rumah-etnik.png"
              alt="Logo Homestay ARUM"
              fill
              className="object-contain drop-shadow-lg"
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
              HOMESTAY ARUM
            </h1>
            <p className="text-xs text-blue-200/75 mt-1 font-semibold">
              Portal Akses Admin & Manajemen Reservasi
            </p>
          </div>
        </div>

        {/* Card Container Glassmorphism */}
        <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="border-b border-white/10 pb-4 text-center">
            <h2 className="text-base font-extrabold text-white flex items-center justify-center gap-2">
              <span>Masuk dengan Email Admin</span>
            </h2>
            <p className="text-xs text-gray-300 mt-1 font-medium">
              Gunakan akun admin yang terdaftar pada Firebase Authentication.
            </p>
          </div>

          {/* Alert Warning Error */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs text-center font-semibold animate-pulse">
              {errorMsg}
            </div>
          )}

          {/* Form Login Admin */}
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">
                Email Admin <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="admin@homestayanum.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl bg-black/40 border border-white/15 px-4 py-3 pl-11 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition font-medium"
                />
                <svg
                  className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">
                Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Masukkan password admin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl bg-black/40 border border-white/15 px-4 py-3 pl-11 pr-11 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition font-medium"
                />
                <svg
                  className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition p-1"
                >
                  {showPassword ? (
                    <EyeIcon className="w-5 h-5 fill-current" />
                  ) : (
                    <EyeCloseIcon className="w-5 h-5 fill-current" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-gray-300 select-none">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  className="rounded border-white/20 bg-black/30 text-primary focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Ingat Sesi Login Saya</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-sm font-bold text-white shadow-xl shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memverifikasi Akun...
                </span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign In Admin</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-blue-200/60 font-medium">
          Homestay ARUM • Sistem Informasi Manajemen & Reservasi
        </p>
      </div>
    </div>
  );
}
