"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { EyeIcon, EyeCloseIcon } from "@/icons";

interface StaffMember {
  id?: string;
  nama: string;
  role: string;
  pin: string;
  no_hp: string;
  status: "Aktif" | "Nonaktif";
}

export default function SignInForm() {
  const [loginMode, setLoginMode] = useState<"pin" | "admin">("pin");
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Admin login states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Staff PIN login states
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const router = useRouter();

  // Load active staff members from Firestore
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const q = query(collection(db, "staf"), where("status", "==", "Aktif"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember));
        setStaffList(data);
        if (data.length > 0) {
          setSelectedStaffId(data[0].id || "");
        }
      } catch (err) {
        console.warn("Failed to load staff list for login:", err);
      }
    };
    fetchStaff();
  }, []);

  // Handler Numpad PIN
  const handleNumpadPress = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    }
  };

  const handleNumpadDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  // Handler Login PIN Staf
  const handleStaffPinLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length !== 4) {
      setErrorMsg("⚠️ Masukkan 4 digit PIN Anda!");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // Find selected staff or check against Firestore PIN
      const matchedStaff = staffList.find((s) => s.id === selectedStaffId && s.pin === pin);

      if (matchedStaff) {
        // Store logged in staff profile to localStorage
        localStorage.setItem("activeStaff", JSON.stringify(matchedStaff));
        router.push("/");
      } else {
        // Try fallback query directly to Firestore in case list was cached
        const q = query(collection(db, "staf"), where("pin", "==", pin), where("status", "==", "Aktif"));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const staffData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as StaffMember;
          localStorage.setItem("activeStaff", JSON.stringify(staffData));
          router.push("/");
        } else {
          setErrorMsg("❌ PIN 4-Digit salah atau akun staf nonaktif!");
          setPin("");
        }
      }
    } catch (err) {
      console.error("Staff PIN login error:", err);
      setErrorMsg("❌ Terjadi kesalahan saat verifikasi PIN.");
    } finally {
      setLoading(false);
    }
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
      await signInWithEmailAndPassword(auth, email, password);
      localStorage.removeItem("activeStaff"); // Clear staff session on admin login
      router.push("/");
    } catch (error: any) {
      setErrorMsg(error?.message || "❌ Gagal masuk. Periksa email & password Anda.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white relative overflow-hidden">
      
      {/* Dynamic Background Glow Effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-600/15 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-300">
        
        {/* Header Logo & Title */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 w-40 h-28 relative">
            <Image
              src="/images/logo/logo-rumah-etnik.png"
              alt="Logo Homestay ARUM"
              fill
              className="object-contain drop-shadow-md"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
            HOMESTAY ARUM
          </h1>
          <p className="text-xs text-blue-200/80 mt-1 font-medium">
            Sistem Operasional & Reservasi Rumsram
          </p>
        </div>

        {/* Card Container Glassmorphism */}
        <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          {/* Tab Switcher Mode Login */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-black/30 border border-white/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setLoginMode("pin");
                setErrorMsg(null);
              }}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                loginMode === "pin"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/40"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <span>📱 PIN Staf HP</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode("admin");
                setErrorMsg(null);
              }}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                loginMode === "admin"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/40"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <span>🔑 Email Admin</span>
            </button>
          </div>

          {/* Alert Warning Error */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs text-center font-semibold animate-pulse">
              {errorMsg}
            </div>
          )}

          {/* MODE 1: LOGIN PIN STAF */}
          {loginMode === "pin" && (
            <form onSubmit={handleStaffPinLogin} className="space-y-5 animate-in fade-in duration-200">
              
              {/* Pilih Akun Staf */}
              <div>
                <label className="block text-xs font-semibold text-blue-200 mb-2">
                  Pilih Akun Staf / Shift Karyawan
                </label>
                {staffList.length > 0 ? (
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full rounded-xl bg-black/40 border border-white/15 px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:border-blue-400 transition"
                  >
                    {staffList.map((staf) => (
                      <option key={staf.id} value={staf.id} className="bg-slate-900 text-white">
                        👤 {staf.nama} ({staf.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-blue-200/70 text-center">
                    Gunakan PIN 4-digit yang telah dibuat di Pengaturan Staf.
                  </div>
                )}
              </div>

              {/* Indikator Lingkaran PIN 4-Digit */}
              <div className="text-center space-y-2">
                <label className="block text-xs font-semibold text-blue-200 uppercase tracking-wider">
                  Masukkan PIN 4-Digit
                </label>
                <div className="flex justify-center items-center gap-3 py-2">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        pin.length > index
                          ? "border-blue-400 bg-blue-500 text-white font-extrabold text-lg shadow-lg shadow-blue-500/50 scale-105"
                          : "border-white/20 bg-black/20"
                      }`}
                    >
                      {pin.length > index ? "●" : ""}
                    </div>
                  ))}
                </div>
              </div>

              {/* Touch Numpad Keyboard */}
              <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleNumpadPress(digit)}
                    className="h-12 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-blue-600/80 border border-white/10 text-lg font-bold text-white transition-all active:scale-95 shadow-sm"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPin("")}
                  className="h-12 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-bold text-gray-300 transition-all active:scale-95"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => handleNumpadPress("0")}
                  className="h-12 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-lg font-bold text-white transition-all active:scale-95 shadow-sm"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleNumpadDelete}
                  className="h-12 rounded-2xl bg-white/5 hover:bg-rose-500/30 border border-white/10 text-sm font-bold text-rose-300 transition-all active:scale-95"
                >
                  ⌫
                </button>
              </div>

              {/* Button Masuk */}
              <button
                type="submit"
                disabled={loading || pin.length !== 4}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-sm font-bold text-white shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? "Memverifikasi PIN..." : "🔓 Masuk Aplikasi"}
              </button>
            </form>
          )}

          {/* MODE 2: LOGIN ADMIN EMAIL */}
          {loginMode === "admin" && (
            <form onSubmit={handleAdminLogin} className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold text-blue-200 mb-1.5">
                  Email Admin <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@arum.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-white/15 px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-200 mb-1.5">
                  Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Masukkan password admin"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl bg-black/40 border border-white/15 px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 transition pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
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
                <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => setIsChecked(e.target.checked)}
                    className="rounded border-white/20 bg-black/30 text-blue-500 focus:ring-0"
                  />
                  <span>Tetap Masuk (Ingat Saya)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-sm font-bold text-white shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? "Memproses Login..." : "🔑 Sign In Admin"}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-blue-200/60 mt-6 font-medium">
          Homestay ARUM • Sistem Informasi Reservasi & Keuangan
        </p>
      </div>
    </div>
  );
}

