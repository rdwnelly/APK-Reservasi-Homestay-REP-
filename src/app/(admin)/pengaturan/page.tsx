"use client";

import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getToken } from "firebase/messaging";
import { messaging, db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";

type TabType = "Notifikasi" | "Kebijakan" | "Akun Staf";

interface StaffMember {
  id?: string;
  nama: string;
  role: string;
  pin: string;
  no_hp: string;
  status: "Aktif" | "Nonaktif";
}

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

  // State untuk Manajemen Akun Staf
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState<StaffMember>({
    nama: "",
    role: "Resepsionis",
    pin: "1234",
    no_hp: "",
    status: "Aktif",
  });

  // State untuk Push Notification
  const [perm, setPerm] = useState<NotificationPermission | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPerm(Notification.permission);
    }
  }, []);

  // Fetch daftar staf dari Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "staf"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember));
      setStaffList(data);
    }, (err) => {
      console.warn("Firestore staff load error:", err.message);
    });
    return () => unsub();
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

  const tabs: TabType[] = ["Notifikasi", "Kebijakan", "Akun Staf"];

  const handleSave = () => {
    alert("Pengaturan berhasil disimpan ke sistem!");
  };

  // Handler Simpan Staf
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.nama || !staffForm.pin) {
      alert("⚠️ Nama Staf dan PIN wajib diisi!");
      return;
    }
    try {
      if (editingStaffId) {
        await updateDoc(doc(db, "staf", editingStaffId), staffForm as any);
        alert("✅ Akun Staf berhasil diperbarui.");
      } else {
        await addDoc(collection(db, "staf"), staffForm);
        alert("✅ Akun Staf baru berhasil ditambahkan.");
      }
      setIsStaffModalOpen(false);
      setEditingStaffId(null);
      setStaffForm({ nama: "", role: "Resepsionis", pin: "1234", no_hp: "", status: "Aktif" });
    } catch (err) {
      console.error("Save staff error:", err);
      alert("❌ Gagal menyimpan data staf.");
    }
  };

  const handleDeleteStaff = async (id: string, nama: string) => {
    if (confirm(`Hapus akun staf "${nama}"?`)) {
      try {
        await deleteDoc(doc(db, "staf", id));
        alert("✅ Akun staf berhasil dihapus.");
      } catch (err) {
        console.error("Delete staff error:", err);
      }
    }
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
              Atur preferensi notifikasi, kebijakan properti, dan akun staf karyawan.
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
              {tab === "Akun Staf" ? "👤 Akun Staf & PIN" : tab}
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

          {/* TAB 3: AKUN STAF & PIN KARYAWAN */}
          {activeTab === "Akun Staf" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    👤 Manajemen Akun Staf & PIN Karyawan
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Kelola akun login staf, role jabatan, dan PIN 4-digit akses cepat aplikasi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingStaffId(null);
                    setStaffForm({ nama: "", role: "Resepsionis", pin: "1234", no_hp: "", status: "Aktif" });
                    setIsStaffModalOpen(true);
                  }}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
                >
                  + Tambah Staf Baru
                </button>
              </div>

              {/* Daftar Staf */}
              <div className="space-y-3">
                {staffList.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-gray-200 rounded-2xl dark:border-gray-800 text-gray-500 text-xs">
                    Belum ada akun staf terdaftar. Klik "+ Tambah Staf Baru" untuk menambahkan staf karyawan.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {staffList.map((staf) => (
                      <div
                        key={staf.id}
                        className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">{staf.nama}</h4>
                            <p className="text-xs text-gray-500 font-medium">💼 {staf.role}</p>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            staf.status === "Aktif" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-gray-100 text-gray-600 border-gray-300"
                          }`}>
                            {staf.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                          <div>
                            <span className="text-[10px] text-gray-400 font-semibold uppercase block">PIN Cepat</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">•••• ({staf.pin})</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 font-semibold uppercase block">No. WA</span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{staf.no_hp || "-"}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStaffId(staf.id || null);
                              setStaffForm(staf);
                              setIsStaffModalOpen(true);
                            }}
                            className="px-3 py-1 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-bold"
                          >
                            Ubah
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(staf.id!, staf.nama)}
                            className="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal Form Staf */}
          {isStaffModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
                  <h3 className="font-bold text-base text-gray-900 dark:text-white">
                    {editingStaffId ? "Ubah Akun Staf" : "Tambah Akun Staf Baru"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsStaffModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveStaff} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap Staf *</label>
                    <input
                      type="text"
                      required
                      value={staffForm.nama}
                      onChange={(e) => setStaffForm({ ...staffForm, nama: e.target.value })}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 p-2.5 text-xs text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Role / Jabatan *</label>
                    <select
                      value={staffForm.role}
                      onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 p-2.5 text-xs text-gray-900 dark:text-white"
                    >
                      <option value="Admin / Pemilik">Admin / Pemilik</option>
                      <option value="Resepsionis">Resepsionis (Shift Pagi)</option>
                      <option value="Resepsionis Malam">Resepsionis (Shift Malam)</option>
                      <option value="Staf Kebersihan">Staf Kebersihan / Housekeeping</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">PIN Cepat (4 Digit) *</label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={staffForm.pin}
                      onChange={(e) => setStaffForm({ ...staffForm, pin: e.target.value })}
                      placeholder="Contoh: 1234"
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 p-2.5 text-xs text-gray-900 dark:text-white font-bold tracking-widest"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">No. WhatsApp</label>
                    <input
                      type="text"
                      value={staffForm.no_hp}
                      onChange={(e) => setStaffForm({ ...staffForm, no_hp: e.target.value })}
                      placeholder="Contoh: 08123456789"
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 p-2.5 text-xs text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Status Akun</label>
                    <select
                      value={staffForm.status}
                      onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value as any })}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 p-2.5 text-xs text-gray-900 dark:text-white"
                    >
                      <option value="Aktif">🟢 Aktif</option>
                      <option value="Nonaktif">🔴 Nonaktif</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => setIsStaffModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
                    >
                      Simpan Staf
                    </button>
                  </div>
                </form>
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
