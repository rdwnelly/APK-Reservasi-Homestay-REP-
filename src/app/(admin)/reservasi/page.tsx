"use client";

import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, getDocs, where, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { checkAndUpdateReservationStatus, getStatusReservasiLabel, formatDate } from "@/utils/reservationUtils";

interface ReservationData {
  id?: string;
  nama_tamu: string;
  jumlah_tamu?: string | number;
  no_hp: string;
  sumber_booking: string;
  id_kamar: string;
  tgl_checkin: string;
  tgl_checkout: string;
  jam_kedatangan: string;
  kamar_siap: boolean;
  status_bayar: string;
  total_tagihan: string;
  status_kebersihan?: "siap" | "dipakai" | "perlu_bersih";
  status_reservasi?: "Aktif" | "DP" | "Selesai" | "Batal";
  updated_at?: string;
  catatan?: string;
}

const ReservasiPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // State baru untuk menampung daftar reservasi dari Database
  const [reservasiList, setReservasiList] = useState<ReservationData[]>([]);
  const [reminderMessages, setReminderMessages] = useState<string[]>([]);

  const [formData, setFormData] = useState<ReservationData>({
    nama_tamu: "", jumlah_tamu: "", no_hp: "", sumber_booking: "Langsung", id_kamar: "Double Room with AC",
    tgl_checkin: "", tgl_checkout: "", jam_kedatangan: "", kamar_siap: false, status_bayar: "Belum Bayar", total_tagihan: "",
    status_kebersihan: "siap", status_reservasi: "Aktif", catatan: ""
  });
  // Fungsi pembantu status kebersihan
  const getKebersihanLabel = (status?: string) => {
    if (status === "siap") return { label: "🟢 Siap Huni", color: "bg-green-100 text-green-800 border-green-200" };
    if (status === "dipakai") return { label: "🔴 Sedang Dipakai", color: "bg-red-100 text-red-800 border-red-200" };
    if (status === "perlu_bersih") return { label: "🟡 Perlu Dibersihkan", color: "bg-yellow-100 text-yellow-800 border-yellow-200" };
    return { label: "-", color: "bg-gray-100 text-gray-800 border-gray-200" };
  };

  const handleEditClick = (item: ReservationData) => {
    setEditingId(item.id || null);
    setFormData({ ...item, status_kebersihan: item.status_kebersihan || "siap" });
    setIsModalOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingId(null);
    setFormData({
      nama_tamu: "", jumlah_tamu: "", no_hp: "", sumber_booking: "Langsung", id_kamar: "Double Room with AC",
      tgl_checkin: "", tgl_checkout: "", jam_kedatangan: "", kamar_siap: false, status_bayar: "Belum Bayar", total_tagihan: "",
      status_kebersihan: "siap", status_reservasi: "Aktif", catatan: ""
    });
    setIsModalOpen(true);
  };

  // 1. EFEK "MATA SISTEM": Menarik data secara Real-Time dari Firebase
  const sendCheckInReminders = (items: ReservationData[]) => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    const now = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const notifiedIds = new Set<string>(
      JSON.parse(localStorage.getItem("checkInReminderIds") || "[]") || []
    );
    const newMessages: string[] = [];
    const newNotifiedIds = new Set(notifiedIds);

    items.forEach((item) => {
      if (!item.id || !item.tgl_checkin) return;
      const checkInTime = new Date(item.tgl_checkin).getTime();
      const diff = checkInTime - now;

      if (diff > 0 && diff <= oneDayMs) {
        if (!notifiedIds.has(item.id)) {
          const arrivalText = item.jam_kedatangan ? ` pada jam ${item.jam_kedatangan}` : "";
          const message = `Pengingat: Tamu ${item.nama_tamu} akan check-in besok${arrivalText}.`; 
          newMessages.push(message);
          newNotifiedIds.add(item.id);

          try {
            new Notification("Reminder Check-In Besok", {
              body: message,
              icon: "/favicon.ico",
            });
          } catch (error) {
            console.error("Notification error:", error);
          }
        }
      }
    });

    if (newMessages.length > 0) {
      setReminderMessages((prev) => [...prev, ...newMessages]);
      localStorage.setItem(
        "checkInReminderIds",
        JSON.stringify(Array.from(newNotifiedIds))
      );
    }
  };

  useEffect(() => {
    // Jalankan auto-update status terlebih dahulu saat page load
    checkAndUpdateReservationStatus();

    const q = query(collection(db, "reservasi"));
    // onSnapshot membuat data langsung ter-update tanpa perlu refresh browser
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as ReservationData }));
      
      // Filter hanya yang Aktif, DP, atau yang belum memiliki field status_reservasi (data lama)
      data = data.filter(item => 
        !item.status_reservasi || 
        item.status_reservasi === "Aktif" || 
        item.status_reservasi === "DP"
      );

      // Urutkan berdasarkan tanggal check-in (opsional, untuk kerapian)
      data.sort((a, b) => new Date(a.tgl_checkin).getTime() - new Date(b.tgl_checkin).getTime());
      setReservasiList(data as ReservationData[]);
      sendCheckInReminders(data as ReservationData[]);
    }, (error) => {
      console.warn("Firestore onSnapshot error:", error.message);
    });
    return () => unsubscribe();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setFormData({ ...formData, [target.name]: value });
  };

  // 2. OTAK SISTEM: Fungsi Simpan & Logika Pencegah Double Booking
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // --- VALIDASI TANGGAL DASAR ---
      const newIn = new Date(formData.tgl_checkin);
      const newOut = new Date(formData.tgl_checkout);

      // Pastikan tanggal valid
      if (isNaN(newIn.getTime()) || isNaN(newOut.getTime())) {
        alert("⚠️ Tanggal check-in atau check-out tidak valid!");
        setIsLoading(false);
        return;
      }

      // Pastikan check-out setelah check-in
      if (newOut <= newIn) {
        alert("⚠️ Tanggal check-out harus setelah tanggal check-in!");
        setIsLoading(false);
        return;
      }

      // --- LOGIKA PENCEGAH BENTROK (ALGORITMA OVERLAP) ---
      // a. Ambil semua data tamu lama yang menyewa kamar yang sama
      const qKamar = query(collection(db, "reservasi"), where("id_kamar", "==", formData.id_kamar));
      const querySnapshot = await getDocs(qKamar);
      let isOverlap = false;
      let conflictingReservation: ReservationData | null = null;

      // b. Cek satu per satu jadwal tamu lama
      querySnapshot.forEach((doc) => {
        if (doc.id === editingId) return; // Lewati pengecekan dengan dirinya sendiri saat edit

        const data = doc.data() as ReservationData;
        const oldIn = new Date(data.tgl_checkin);
        const oldOut = new Date(data.tgl_checkout);

        // c. Rumus Overlap: (Tanggal Mulai Baru < Tanggal Selesai Lama) DAN (Tanggal Selesai Baru > Tanggal Mulai Lama)
        if (newIn < oldOut && newOut > oldIn) {
          isOverlap = true;
          conflictingReservation = data;
        }
      });

      // d. Jika bentrok, hentikan proses dan tolak!
      if (isOverlap && conflictingReservation) {
        const conflict = conflictingReservation as ReservationData;
        const conflictInfo = `\n\nDetail Konflik:\n• Tamu: ${conflict.nama_tamu}\n• Check-in: ${formatDate(conflict.tgl_checkin)}\n• Check-out: ${formatDate(conflict.tgl_checkout)}`;

        alert(`🚫 DOUBLE-BOOKING TERDETEKSI!\n\nKamar "${formData.id_kamar}" sudah dipesan oleh tamu lain pada rentang tanggal tersebut.\n\n${conflictInfo}\n\nSilakan pilih:\n• Kamar yang berbeda\n• Tanggal check-in/check-out yang berbeda`);
        setIsLoading(false);
        return; // Kode berhenti di sini, data batal disimpan.
      }
      // ----------------------------------------------------

      // Jika aman (tidak bentrok), sistem lanjut menyimpan ke Cloud
      if (editingId) {
        await updateDoc(doc(db, "reservasi", editingId), formData as any);
        alert("✅ Reservasi berhasil diperbarui.");
      } else {
        await addDoc(collection(db, "reservasi"), formData);
        alert("✅ Puji Tuhan! Reservasi berhasil disimpan tanpa konflik.");
      }
      
      setIsModalOpen(false);
      setFormData({
        nama_tamu: "", jumlah_tamu: "", no_hp: "", sumber_booking: "Langsung", id_kamar: "Double Room with AC",
        tgl_checkin: "", tgl_checkout: "", jam_kedatangan: "", kamar_siap: false, status_bayar: "Belum Bayar", total_tagihan: "",
        status_kebersihan: "siap", status_reservasi: "Aktif", catatan: ""
      });
    } catch (error) {
      console.error("Error menambah data: ", error);
      alert("❌ Maaf, terjadi kesalahan pada jaringan/sistem. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi pembantu warna status bayar
  const getStatusColor = (status: string) => {
    if (status === "Lunas") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (status === "DP" || status === "DP/Uang Muka") return "bg-amber-100 text-amber-800 border-amber-200";
    if (status === "Batal") return "bg-rose-100 text-rose-800 border-rose-200";
    return "bg-rose-100 text-rose-800 border-rose-200"; // Belum Bayar
  };

  const getJumlahMalam = (inDate: string, outDate: string) => {
    if (!inDate || !outDate) return "-";
    const diff = new Date(outDate).getTime() - new Date(inDate).getTime();
    const days = diff / (1000 * 3600 * 24);
    return days > 0 ? `${days} Malam` : "-";
  };

  const handleToggleKamarSiap = async (id: string | undefined, currentStatus: boolean) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, "reservasi", id), {
        kamar_siap: !currentStatus
      });
    } catch (error) {
      console.error("Error updating kamar_siap:", error);
      alert("❌ Gagal memperbarui status kamar.");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      
      {/* Header Halaman */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Kelola Reservasi
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Daftar tamu, jadwal Rumsram, dan Homestay ARUM.
          </p>
        </div>
        <button onClick={handleAddNewClick} className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 px-5 text-xs sm:text-sm font-bold text-white shadow-sm shadow-primary/30 hover:bg-primary/90 transition-all active:scale-95">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          + Tambah Reservasi Baru
        </button>
      </div>

      <div className="flex flex-col gap-6 relative">
        
        {/* Reminder Box */}
        {reminderMessages.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 text-sm text-amber-900 shadow-sm dark:border-amber-800/30 dark:from-amber-900/20 dark:to-orange-900/10 dark:text-amber-200 flex gap-4 items-start transition-all">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <div>
              <p className="font-bold text-base mb-1">Reminder Check-In Besok</p>
              <ul className="list-disc space-y-1 pl-4 text-amber-800/80 dark:text-amber-200/70">
                {reminderMessages.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          
          {/* TAMPILAN MOBILE (KARTU KHUSUS HP) */}
          <div className="space-y-3.5 lg:hidden p-3.5 sm:p-5">
            {reservasiList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
                Memuat data dari Cloud... (Atau belum ada reservasi)
              </div>
            ) : (
              reservasiList.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-primary">Tamu Homestay</p>
                      <h3 className="mt-0.5 text-base font-bold text-gray-900 dark:text-white">{item.nama_tamu}</h3>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 font-medium">#{item.id?.slice(0, 6).toUpperCase()} • {item.no_hp || "-"}</p>
                    </div>
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase border ${getStatusColor(item.status_bayar)}`}>{item.status_bayar}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-gray-50/80 p-2.5 dark:bg-gray-800/50">
                      <p className="text-[9px] uppercase font-bold text-gray-400">Kamar</p>
                      <p className="mt-0.5 font-bold text-gray-900 dark:text-white truncate">{item.id_kamar}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50/80 p-2.5 dark:bg-gray-800/50">
                      <p className="text-[9px] uppercase font-bold text-gray-400">Sumber (OTA)</p>
                      <p className="mt-0.5 font-bold text-gray-900 dark:text-white truncate">{item.sumber_booking}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50/80 p-2.5 dark:bg-gray-800/50">
                      <p className="text-[9px] uppercase font-bold text-gray-400">Check-in / Out</p>
                      <p className="mt-0.5 font-semibold text-gray-900 dark:text-white text-[11px] truncate">{formatDate(item.tgl_checkin)} – {formatDate(item.tgl_checkout)}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50/80 p-2.5 dark:bg-gray-800/50">
                      <p className="text-[9px] uppercase font-bold text-gray-400">Durasi</p>
                      <p className="mt-0.5 font-bold text-blue-600 dark:text-blue-400">{getJumlahMalam(item.tgl_checkin, item.tgl_checkout)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50/80 p-2.5 dark:bg-gray-800/50">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Reservasi</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border ${getStatusReservasiLabel(item.status_reservasi).color}`}>{getStatusReservasiLabel(item.status_reservasi).label}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50/80 p-2.5 dark:bg-gray-800/50">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Kebersihan</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border ${getKebersihanLabel(item.status_kebersihan).color}`}>{getKebersihanLabel(item.status_kebersihan).label}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800 gap-2">
                    <div className="flex gap-1.5">
                      <Link
                        href={`/reservasi/${item.id}`}
                        className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                      >
                        Detail
                      </Link>
                      <button
                        type="button"
                        className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-600 transition hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
                        onClick={() => handleEditClick(item)}
                      >
                        Ubah
                      </button>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/60 p-1 rounded-lg">
                      <button type="button" title="Siap Huni" className="rounded-md px-1.5 py-0.5 text-xs hover:bg-green-100 transition" onClick={() => updateDoc(doc(db, "reservasi", item.id!), { status_kebersihan: "siap" })}>🟢</button>
                      <button type="button" title="Perlu Bersih" className="rounded-md px-1.5 py-0.5 text-xs hover:bg-yellow-100 transition" onClick={() => updateDoc(doc(db, "reservasi", item.id!), { status_kebersihan: "perlu_bersih" })}>🟡</button>
                      <button type="button" title="Sedang Dipakai" className="rounded-md px-1.5 py-0.5 text-xs hover:bg-red-100 transition" onClick={() => updateDoc(doc(db, "reservasi", item.id!), { status_kebersihan: "dipakai" })}>🔴</button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* TAMPILAN DESKTOP (TABEL) */}
          <div className="hidden lg:block w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400 border-collapse">
              <thead className="bg-gray-50/50 text-[11px] uppercase tracking-wider text-gray-500 dark:bg-gray-800/30 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">ID & Tamu</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Menginap</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Booking Info</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Jadwal</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap text-center">Status Tagihan</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap text-center">Status Kamar</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {reservasiList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm font-medium text-gray-500">
                      Memuat data dari Cloud... (Atau belum ada reservasi)
                    </td>
                  </tr>
                ) : (
                  reservasiList.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-[10px] font-bold text-gray-400">#{item.id?.slice(0, 6).toUpperCase()}</p>
                        <p className="font-bold text-gray-900 dark:text-white mt-0.5">{item.nama_tamu}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.no_hp}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.jumlah_tamu ? `${item.jumlah_tamu} Orang` : "-"}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{getJumlahMalam(item.tgl_checkin, item.tgl_checkout)}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.id_kamar}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.sumber_booking}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-xs font-medium text-gray-900 dark:text-white">{formatDate(item.tgl_checkin)} – {formatDate(item.tgl_checkout)}</p>
                        <p className="text-xs text-primary mt-0.5">{item.jam_kedatangan ? `Jam: ${item.jam_kedatangan}` : "-"}</p>
                      </td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(item.status_bayar)}`}>
                            {item.status_bayar}
                          </span>
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {item.total_tagihan ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(item.total_tagihan)) : "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-2">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide border ${getStatusReservasiLabel(item.status_reservasi).color}`}>
                            {getStatusReservasiLabel(item.status_reservasi).label}
                          </span>
                          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-1">
                            <button type="button" title="Siap Huni" className="rounded-md px-1.5 py-0.5 text-xs hover:bg-green-100 transition" onClick={() => updateDoc(doc(db, "reservasi", item.id!), { status_kebersihan: "siap" })}>🟢</button>
                            <button type="button" title="Perlu Bersih" className="rounded-md px-1.5 py-0.5 text-xs hover:bg-yellow-100 transition" onClick={() => updateDoc(doc(db, "reservasi", item.id!), { status_kebersihan: "perlu_bersih" })}>🟡</button>
                            <button type="button" title="Sedang Dipakai" className="rounded-md px-1.5 py-0.5 text-xs hover:bg-red-100 transition" onClick={() => updateDoc(doc(db, "reservasi", item.id!), { status_kebersihan: "dipakai" })}>🔴</button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-600 transition hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                            onClick={() => handleEditClick(item)}
                          >
                            Ubah
                          </button>
                          <Link
                            href={`/reservasi/${item.id}`}
                            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                          >
                            Detail
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL FORMULIR (MOBILE OPTIMIZED) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 transition-all">
            <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in fade-in zoom-in duration-200">
              
              {/* Header Modal */}
              <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 py-3.5 px-4 sm:px-6 flex justify-between items-center sticky top-0 z-10">
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
                    {editingId ? "Ubah Data Reservasi" : "Formulir Reservasi Baru"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Lengkapi form di bawah ini untuk menyimpan data pemesanan.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)} 
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 dark:bg-gray-800 dark:hover:bg-red-900/30 transition-colors"
                >
                  <span className="text-xl leading-none">&times;</span>
                </button>
              </div>

              {/* Body Form */}
              <div className="overflow-y-auto p-4 sm:p-6 flex-1 custom-scrollbar">
                <form id="reservation-form" onSubmit={handleSubmit} className="space-y-8">
                  
                  {/* Section: Data Tamu */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                      1. Informasi Tamu
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Nama Tamu <span className="text-red-500">*</span></label>
                        <input type="text" name="nama_tamu" required value={formData.nama_tamu} onChange={handleInputChange} placeholder="Masukkan nama lengkap" className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Jumlah Tamu</label>
                        <input type="number" name="jumlah_tamu" value={formData.jumlah_tamu} onChange={handleInputChange} placeholder="Misal: 2" min="1" className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">No. WhatsApp</label>
                        <input type="text" name="no_hp" value={formData.no_hp} onChange={handleInputChange} placeholder="Contoh: 081234..." className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Section: Jadwal */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                      2. Jadwal Menginap
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Check-in <span className="text-red-500">*</span></label>
                        <input type="date" name="tgl_checkin" required value={formData.tgl_checkin} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Check-out <span className="text-red-500">*</span></label>
                        <input type="date" name="tgl_checkout" required value={formData.tgl_checkout} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Jam Kedatangan</label>
                        <input type="time" name="jam_kedatangan" value={formData.jam_kedatangan} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Section: Rincian Homestay & Pembayaran */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                      3. Kamar & Pembayaran
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-5">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Pilih Kamar Homestay <span className="text-red-500">*</span></label>
                          <select name="id_kamar" value={formData.id_kamar} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                            <option value="Double Room with AC">Double Room with AC</option>
                            <option value="Double Room with Fan">Double Room with Fan</option>
                            <option value="Single Room with Fan">Single Room with Fan</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Sumber (OTA)</label>
                          <select name="sumber_booking" value={formData.sumber_booking} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                            <option value="Langsung">Langsung (WA)</option>
                            <option value="Traveloka">Traveloka</option>
                            <option value="Tiket.com">Tiket.com</option>
                            <option value="Agoda">Agoda</option>
                            <option value="Airbnb">Airbnb</option>
                            <option value="Booking.com">Booking.com</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Catatan Khusus Tamu</label>
                          <input type="text" name="catatan" value={formData.catatan || ""} onChange={handleInputChange} placeholder="Contoh: Minta extra bed..." className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                        </div>
                      </div>
                      
                      <div className="space-y-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-5 dark:border-blue-900/30 dark:bg-blue-900/10">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Total Tagihan (Rp)</label>
                          <input type="number" name="total_tagihan" value={formData.total_tagihan} onChange={handleInputChange} placeholder="Misal: 1100000" className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Status Pembayaran</label>
                          <select name="status_bayar" value={formData.status_bayar} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                            <option value="Belum Bayar">Belum Bayar</option>
                            <option value="DP">DP (Uang Muka)</option>
                            <option value="Lunas">Lunas</option>
                            <option value="Batal">Batal</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Status Manajemen */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                      4. Manajemen & Operasional
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Status Reservasi</label>
                        <select name="status_reservasi" value={formData.status_reservasi || "Aktif"} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                          <option value="Aktif">🟢 Aktif (Sedang/akan menginap)</option>
                          <option value="DP">🟡 DP (Sudah bayar DP)</option>
                          <option value="Selesai">✅ Selesai (Checked-out)</option>
                          <option value="Batal">❌ Batal</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Status Kebersihan Kamar</label>
                        <select name="status_kebersihan" value={formData.status_kebersihan} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                          <option value="siap">🟢 Siap Huni</option>
                          <option value="dipakai">🔴 Sedang Dipakai</option>
                          <option value="perlu_bersih">🟡 Perlu Dibersihkan</option>
                        </select>
                      </div>
                      <div className="md:col-span-2 pt-2">
                        <label className="flex cursor-pointer items-center gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 transition">
                          <input
                            type="checkbox"
                            name="kamar_siap"
                            checked={formData.kamar_siap}
                            onChange={handleInputChange}
                            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="font-medium text-gray-900 dark:text-white">Kamar sudah dikonfirmasi siap (Fisik)</span>
                        </label>
                      </div>
                    </div>
                  </div>

                </form>
              </div>

              {/* Footer Form */}
              <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 py-4 px-6 flex justify-end gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  form="reservation-form"
                  disabled={isLoading} 
                  className="rounded-lg px-6 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:bg-primary/50 shadow-sm shadow-primary/30 transition-all flex items-center justify-center min-w-[160px]"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Menyimpan...
                    </span>
                  ) : (
                    editingId ? "Simpan Perubahan" : "Simpan Reservasi"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReservasiPage;