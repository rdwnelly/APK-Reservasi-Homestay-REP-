"use client";

import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getToken } from "firebase/messaging";
import { messaging, db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

type TabType = "Notifikasi" | "Kebijakan" | "Harga";

export default function PengaturanPage() {
  const [activeTab, setActiveTab] = useState<TabType>("Notifikasi");

  // State untuk Pengaturan Notifikasi
  const [notifyReminder, setNotifyReminder] = useState(true);
  const [notifyNewBooking, setNotifyNewBooking] = useState(true);
  const [notifyDailyReport, setNotifyDailyReport] = useState(false);

  // State untuk Kebijakan Properti
  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("12:00");
  const [taxPercentage, setTaxPercentage] = useState("11");
  const [cancellationPolicy, setCancellationPolicy] = useState("bebas-48");

  // State untuk Manajemen Harga
  const [weekendMultiplier, setWeekendMultiplier] = useState("15");
  const [longStayDiscount, setLongStayDiscount] = useState("10");

  // State untuk Push Notification
  const [perm, setPerm] = useState<NotificationPermission | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPerm(Notification.permission);
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
    if (!messaging) return;
    const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
    try {
      const currentToken = await getToken(messaging as any, { vapidKey: vapidKey || undefined });
      if (currentToken) {
        setToken(currentToken);
        try {
          await addDoc(collection(db, "fcmTokens"), { token: currentToken, createdAt: new Date().toISOString() });
        } catch (e) {
          console.warn("Failed to save token to Firestore:", e);
        }
      }
    } catch (err) {
      console.error('An error occurred while retrieving token. ', err);
    }
  };

  const tabs: TabType[] = ["Notifikasi", "Kebijakan", "Harga"];

  const handleSave = () => {
    alert("Pengaturan berhasil disimpan ke sistem!");
  };

  return (
    <>
      <PageBreadcrumb pageTitle="Pengaturan Homestay" />

      <div className="flex flex-col gap-6 relative z-10">
        <div className="flex justify-between items-center bg-white p-5 rounded-lg border border-gray-200 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div>
            <h2 className="text-title-md2 font-lora font-bold text-brand-500 dark:text-warning-500">
              Konfigurasi Sistem
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Atur preferensi notifikasi, kebijakan properti, harga otomatis, dan sinkronisasi OTA.
            </p>
          </div>
          <button 
            onClick={handleSave}
            className="hidden sm:inline-flex items-center justify-center rounded-lg bg-warning-500 px-6 py-2.5 text-sm font-bold text-brand-900 shadow-sm hover:bg-warning-400 transition-colors"
          >
            Simpan Perubahan
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-t-lg shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "border-b-2 border-brand-500 text-brand-500 dark:border-warning-500 dark:text-warning-500 bg-brand-50/50 dark:bg-brand-900/20"
                  : "text-gray-500 hover:text-brand-500 dark:hover:text-warning-500 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content Container */}
        <div className="bg-white dark:bg-gray-900 rounded-b-lg shadow-sm border border-t-0 border-gray-200 dark:border-gray-800 p-6 md:p-8">
          
          {/* TAB 1: NOTIFIKASI */}
          {activeTab === "Notifikasi" && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white border-b border-gray-100 pb-2">
                Pengaturan Notifikasi & Peringatan
              </h3>
              
              <div className="flex flex-col gap-4">
                <ToggleSwitch 
                  id="notifyReminder" 
                  label="Aktifkan Pengingat Reservasi" 
                  description="Kirim notifikasi ke admin dan tamu H-1 sebelum check-in." 
                  checked={notifyReminder} 
                  onChange={setNotifyReminder} 
                />
                <ToggleSwitch 
                  id="notifyNewBooking" 
                  label="Notifikasi Booking Baru" 
                  description="Terima peringatan seketika saat ada pemesanan baru dari OTA atau manual." 
                  checked={notifyNewBooking} 
                  onChange={setNotifyNewBooking} 
                />
                <ToggleSwitch 
                  id="notifyDailyReport" 
                  label="Laporan Harian" 
                  description="Kirim ringkasan okupansi dan pendapatan ke email setiap jam 23:59." 
                  checked={notifyDailyReport} 
                  onChange={setNotifyDailyReport} 
                />
              </div>

              {/* Push Notification Setup */}
              <div className="mt-8 p-5 rounded-lg border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-2">Izin Notifikasi Sistem (Push Notifications)</h4>
                <p className="text-xs text-gray-500 mb-4">
                  Izinkan browser untuk menampilkan pop-up notifikasi reservasi meskipun aplikasi sedang tidak dibuka. 
                  Status saat ini: <strong className="uppercase">{perm || 'unknown'}</strong>
                </p>
                {perm !== 'granted' ? (
                  <button 
                    onClick={requestPermission} 
                    className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-600 transition-colors"
                  >
                    Berikan Izin Notifikasi
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-green-600 font-semibold">✅ Izin Notifikasi Diberikan</p>
                    <button 
                      onClick={retrieveToken} 
                      className="w-fit rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Perbarui Token (Refresh)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: KEBIJAKAN */}
          {activeTab === "Kebijakan" && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white border-b border-gray-100 pb-2">
                Kebijakan Properti
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Waktu Check-in</label>
                  <input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-black focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Waktu Check-out</label>
                  <input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-black focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Pajak Layanan (%)</label>
                  <input type="number" value={taxPercentage} onChange={(e) => setTaxPercentage(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-black focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Contoh: 11" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Kebijakan Pembatalan</label>
                  <select value={cancellationPolicy} onChange={(e) => setCancellationPolicy(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-black focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                    <option value="bebas-48">Bebas Biaya (Sebelum 48 Jam)</option>
                    <option value="bebas-24">Bebas Biaya (Sebelum 24 Jam)</option>
                    <option value="non-refundable">Non-Refundable</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HARGA */}
          {activeTab === "Harga" && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white border-b border-gray-100 pb-2">
                Manajemen Harga Dinamis
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Kenaikan Harga Akhir Pekan (%)</label>
                  <div className="relative">
                    <input type="number" value={weekendMultiplier} onChange={(e) => setWeekendMultiplier(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-black focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                    <span className="absolute right-4 top-2.5 text-gray-400">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Diterapkan otomatis untuk malam Sabtu dan Minggu.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Diskon Long-Stay (%)</label>
                  <div className="relative">
                    <input type="number" value={longStayDiscount} onChange={(e) => setLongStayDiscount(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-black focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                    <span className="absolute right-4 top-2.5 text-gray-400">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Diterapkan jika tamu menginap lebih dari 7 malam.</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Tombol Simpan Mobile */}
          <div className="mt-8 pt-4 border-t border-gray-100 sm:hidden">
            <button 
              onClick={handleSave}
              className="w-full items-center justify-center rounded-lg bg-warning-500 px-6 py-3 text-sm font-bold text-brand-900 shadow-sm hover:bg-warning-400 transition-colors"
            >
              Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Komponen Toggle Switch Custom
function ToggleSwitch({ 
  id, 
  label, 
  description, 
  checked, 
  onChange 
}: { 
  id: string, 
  label: string, 
  description: string, 
  checked: boolean, 
  onChange: (checked: boolean) => void 
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex flex-col">
        <label htmlFor={id} className="text-sm font-semibold text-gray-800 dark:text-white cursor-pointer">
          {label}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      </div>
      <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
        <input 
          type="checkbox" 
          id={id} 
          className="sr-only peer" 
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-warning-500/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-success-500"></div>
      </div>
    </div>
  );
}
