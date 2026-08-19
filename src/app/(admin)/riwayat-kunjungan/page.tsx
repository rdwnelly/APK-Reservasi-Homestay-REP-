"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, deleteDoc, doc } from "firebase/firestore";
import { getStatusReservasiLabel, checkAndUpdateReservationStatus, formatDate, getTutupBukuRange } from "@/utils/reservationUtils";
import { exportRiwayatTutupBukuPDF } from "@/utils/pdfExportUtils";

interface RiwayatReservasi {
  id: string;
  nama_tamu: string;
  no_hp: string;
  id_kamar: string;
  sumber_booking?: string;
  tgl_checkin: string;
  tgl_checkout: string;
  jam_kedatangan?: string;
  status_reservasi?: "Selesai" | "Batal";
  status_bayar: string;
  total_tagihan: string;
  jumlah_tamu?: string | number;
  updated_at?: string;
}

export default function RiwayatKunjunganPage() {
  const [riwayatList, setRiwayatList] = useState<RiwayatReservasi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  // State Fitur Filter Tutup Buku (Tanggal 18 - Tanggal 17)
  const [filterMode, setFilterMode] = useState<"tutup_buku" | "bulanan" | "kustom">("tutup_buku");

  // Hitung rentang tanggal Tutup Buku secara otomatis berdasarkan bulan acuan terpilih
  const defaultTutupBuku = useMemo(() => {
    const [yStr, mStr] = selectedMonth.split("-");
    const now = new Date();
    const y = Number(yStr) || now.getFullYear();
    const m = Number(mStr) || (now.getMonth() + 1);
    return getTutupBukuRange(y, m);
  }, [selectedMonth]);

  const [startDate, setStartDate] = useState<string>(defaultTutupBuku.startDate);
  const [endDate, setEndDate] = useState<string>(defaultTutupBuku.endDate);

  // Sinkronisasi input tanggal saat bulan acuan atau mode filter berubah
  useEffect(() => {
    if (filterMode === "tutup_buku") {
      setStartDate(defaultTutupBuku.startDate);
      setEndDate(defaultTutupBuku.endDate);
    } else if (filterMode === "bulanan") {
      const [y, m] = selectedMonth.split("-");
      if (y && m) {
        const lastDay = new Date(Number(y), Number(m), 0).getDate();
        setStartDate(`${y}-${m}-01`);
        setEndDate(`${y}-${m}-${String(lastDay).padStart(2, "0")}`);
      }
    }
  }, [selectedMonth, filterMode, defaultTutupBuku]);

  // State untuk Fitur Tahan Tekan Lama (Long Press) & Hapus
  const [selectedItemToDelete, setSelectedItemToDelete] = useState<RiwayatReservasi | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pressingId, setPressingId] = useState<string | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startLongPress = (item: RiwayatReservasi) => {
    setPressingId(item.id);
    longPressTimerRef.current = setTimeout(() => {
      if (typeof window !== "undefined" && navigator.vibrate) {
        navigator.vibrate(60);
      }
      setSelectedItemToDelete(item);
      setPressingId(null);
    }, 600);
  };

  const cancelLongPress = () => {
    setPressingId(null);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "reservasi", selectedItemToDelete.id));
      setSelectedItemToDelete(null);
    } catch (error) {
      console.error("Error deleting document: ", error);
      alert("❌ Gagal menghapus data riwayat kunjungan. Silakan coba lagi.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Ambil data tamu dengan status "Selesai" atau "Batal" dari Firebase
  useEffect(() => {
    // Panggil auto-update terlebih dahulu
    checkAndUpdateReservationStatus();

    const q = query(
      collection(db, "reservasi"),
      where("status_reservasi", "in", ["Selesai", "Batal"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as RiwayatReservasi));

      // Urutkan berdasarkan tanggal check-out (terbaru dulu)
      data.sort(
        (a, b) =>
          new Date(b.tgl_checkout).getTime() -
          new Date(a.tgl_checkout).getTime()
      );

      setRiwayatList(data);
      setIsLoading(false);
    }, (error) => {
      console.warn("Firestore onSnapshot error:", error.message);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter data berdasarkan rentang Tanggal Mulai dan Tanggal Akhir (Tutup Buku 18-17 / Bulanan / Kustom)
  const filteredRiwayat = useMemo(() => {
    return riwayatList.filter((item) => {
      const dateToCheck = item.tgl_checkout || item.tgl_checkin;
      if (!dateToCheck) return false;
      return dateToCheck >= startDate && dateToCheck <= endDate;
    });
  }, [riwayatList, startDate, endDate]);

  const getStatusColor = (status: string) => {
    if (status === "Lunas")
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (status === "DP" || status === "DP/Uang Muka")
      return "bg-amber-100 text-amber-800 border-amber-200";
    if (status === "Batal")
      return "bg-rose-100 text-rose-800 border-rose-200";
    return "bg-rose-100 text-rose-800 border-rose-200";
  };

  const getSumberBadge = (sumber?: string) => {
    const name = sumber || "Langsung";
    const lower = name.toLowerCase();
    if (lower.includes("traveloka"))
      return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800";
    if (lower.includes("tiket"))
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
    if (lower.includes("agoda"))
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
    if (lower.includes("airbnb"))
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
    if (lower.includes("booking"))
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
    return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800";
  };

  const getJumlahMalam = (inDate: string, outDate: string) => {
    if (!inDate || !outDate) return "-";
    const diff = new Date(outDate).getTime() - new Date(inDate).getTime();
    const days = diff / (1000 * 3600 * 24);
    return days > 0 ? `${Math.ceil(days)} Malam` : "-";
  };

  // Rekap Finansial Tutup Buku (Pemasukan, DP, Piutang, Total Tamu)
  const totals = useMemo(() => {
    return filteredRiwayat.reduce(
      (acc, item) => {
        const amount = Number(item.total_tagihan?.replace?.(/[^0-9-]/g, "") || item.total_tagihan) || 0;
        const status = item.status_bayar?.toLowerCase() || "";
        
        if (status === "lunas") {
          acc.pemasukanLunas += amount;
          acc.totalCash += amount;
        } else if (status.includes("dp")) {
          acc.totalDP += amount;
          acc.totalCash += amount;
        } else if (status === "batal") {
          acc.totalBatal += amount;
        } else {
          acc.piutangBelumBayar += amount;
        }

        acc.totalGuests += Number(item.jumlah_tamu) || 1;
        return acc;
      },
      { pemasukanLunas: 0, totalDP: 0, piutangBelumBayar: 0, totalCash: 0, totalBatal: 0, totalGuests: 0 }
    );
  }, [filteredRiwayat]);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  // Get available months from data
  const availableMonths = Array.from(
    new Set(riwayatList.map((item) => item.tgl_checkout.slice(0, 7)))
  ).sort()
    .reverse();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-xl font-bold text-amber-900 animate-pulse">
          Memuat riwayat kunjungan...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* Header Halaman */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Riwayat Kunjungan Tamu & Tutup Buku
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Data kunjungan & rekapitulasi keuangan (Pemasukan, DP, Piutang) periode Tutup Buku (Tgl 18 s/d 17).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => exportRiwayatTutupBukuPDF(filteredRiwayat, startDate, endDate, totals)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-rose-500/30 hover:bg-rose-700 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            📄 Download PDF Tutup Buku
          </button>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            💡 Tahan tekan lama baris untuk hapus
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:gap-6 relative">
        {/* PANEL FILTER PERIODE TUTUP BUKU (TGL 18 S/D 17) */}
        <div className="rounded-2xl border border-blue-100 bg-white p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3.5">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>📘 Filter Periode Laporan Tutup Buku</span>
                {filterMode === "tutup_buku" && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] sm:text-xs font-extrabold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    Otomatis 18 - 17
                  </span>
                )}
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                Menyaring data kunjungan & keuangan pada rentang Tanggal Mulai (18) sampai Tanggal Akhir (17).
              </p>
            </div>
            
            {/* Mode Switcher */}
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFilterMode("tutup_buku")}
                className={`rounded-lg py-1.5 px-2 text-[11px] sm:text-xs font-bold transition text-center truncate ${
                  filterMode === "tutup_buku"
                    ? "bg-white text-blue-700 shadow dark:bg-gray-700 dark:text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
                }`}
              >
                📘 Tutup Buku
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("bulanan")}
                className={`rounded-lg py-1.5 px-2 text-[11px] sm:text-xs font-bold transition text-center truncate ${
                  filterMode === "bulanan"
                    ? "bg-white text-blue-700 shadow dark:bg-gray-700 dark:text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
                }`}
              >
                📆 Bulanan
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("kustom")}
                className={`rounded-lg py-1.5 px-2 text-[11px] sm:text-xs font-bold transition text-center truncate ${
                  filterMode === "kustom"
                    ? "bg-white text-blue-700 shadow dark:bg-gray-700 dark:text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
                }`}
              >
                ⚙️ Custom
              </button>
            </div>
          </div>

          {/* Form Inputs Filter */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 items-end">
            <div>
              <label className="mb-1 block text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300">
                Pilih Bulan Periode Tutup Buku
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-gray-50/50 py-2 px-3 text-xs outline-none transition focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300">
                Tanggal Mulai (Tgl 18)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setFilterMode("kustom");
                }}
                className="w-full rounded-xl border border-gray-300 bg-gray-50/50 py-2 px-3 text-xs outline-none transition focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300">
                Tanggal Akhir (Tgl 17)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setFilterMode("kustom");
                }}
                className="w-full rounded-xl border border-gray-300 bg-gray-50/50 py-2 px-3 text-xs outline-none transition focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white font-medium"
              />
            </div>
          </div>

          {/* Banner Status Periode Aktif */}
          <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50/50 p-3 dark:from-blue-950/40 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-blue-950 dark:text-blue-200 gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs">
              <span className="font-bold text-blue-700 dark:text-blue-400">📅 Rentang Tutup Buku:</span>
              <span className="font-semibold bg-white dark:bg-gray-800 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
                {formatDate(startDate)} <span className="text-blue-500 font-bold">s/d</span> {formatDate(endDate)}
              </span>
            </div>
            <span className="font-bold text-[11px] bg-blue-600 text-white px-2.5 py-0.5 rounded-full shadow-sm shadow-blue-500/20 self-start sm:self-auto">
              {filteredRiwayat.length} Reservasi Ditemukan
            </span>
          </div>
        </div>

        {/* SUMMARY FINANCIAL CARDS (2x2 Grid on Mobile) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {/* Pemasukan Lunas */}
          <div className="group rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-3.5 sm:p-6 shadow-sm transition-all duration-300 dark:border-emerald-800/30 dark:from-emerald-900/20 dark:to-teal-900/10">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
                  Pemasukan (Lunas)
                </p>
                <h3 className="text-base sm:text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-1 truncate">
                  {formatRupiah(totals.pemasukanLunas)}
                </h3>
                <p className="text-[9px] sm:text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5 truncate">
                  Status Lunas 18-17
                </p>
              </div>
              <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-800/50 dark:text-emerald-300 flex-shrink-0">
                <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
          </div>

          {/* DP (Uang Muka) */}
          <div className="group rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50/50 p-3.5 sm:p-6 shadow-sm transition-all duration-300 dark:border-amber-800/30 dark:from-amber-900/20 dark:to-orange-900/10">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">
                  DP (Uang Muka)
                </p>
                <h3 className="text-base sm:text-2xl font-extrabold text-amber-900 dark:text-amber-200 mt-1 truncate">
                  {formatRupiah(totals.totalDP)}
                </h3>
                <p className="text-[9px] sm:text-[11px] text-amber-600/70 dark:text-amber-400/70 mt-0.5 truncate">
                  Uang muka masuk
                </p>
              </div>
              <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-800/50 dark:text-amber-300 flex-shrink-0">
                <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
          </div>

          {/* Piutang (Belum Bayar) */}
          <div className="group rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-pink-50/50 p-3.5 sm:p-6 shadow-sm transition-all duration-300 dark:border-rose-800/30 dark:from-rose-900/20 dark:to-pink-900/10">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 truncate">
                  Piutang (Belum Bayar)
                </p>
                <h3 className="text-base sm:text-2xl font-extrabold text-rose-900 dark:text-rose-200 mt-1 truncate">
                  {formatRupiah(totals.piutangBelumBayar)}
                </h3>
                <p className="text-[9px] sm:text-[11px] text-rose-600/70 dark:text-rose-400/70 mt-0.5 truncate">
                  Sisa tagihan tamu
                </p>
              </div>
              <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-800/50 dark:text-rose-300 flex-shrink-0">
                <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
            </div>
          </div>

          {/* Total Guests */}
          <div className="group rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50/50 p-3.5 sm:p-6 shadow-sm transition-all duration-300 dark:border-blue-800/30 dark:from-blue-900/20 dark:to-cyan-900/10">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 truncate">
                  Total Tamu & Reservasi
                </p>
                <h3 className="text-base sm:text-2xl font-extrabold text-blue-900 dark:text-blue-200 mt-1 truncate">
                  {totals.totalGuests} <span className="text-xs font-medium">Orang</span>
                </h3>
                <p className="text-[9px] sm:text-[11px] text-blue-600/70 dark:text-blue-400/70 mt-0.5 truncate">
                  {filteredRiwayat.length} Reservasi
                </p>
              </div>
              <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-800/50 dark:text-blue-300 flex-shrink-0">
                <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <div className="w-full overflow-x-auto custom-scrollbar">
            {filteredRiwayat.length === 0 ? (
              <div className="py-16 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-400 mb-4 dark:bg-gray-800">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                </div>
                <p className="text-base font-semibold text-gray-900 dark:text-white">Tidak ada data kunjungan</p>
                <p className="text-sm text-gray-500 mt-1">Belum ada tamu yang checkout pada bulan ini.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400 border-collapse">
                <thead className="bg-gray-50/50 text-[11px] uppercase tracking-wider text-gray-500 dark:bg-gray-800/30 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">ID & Nama Tamu</th>
                    <th className="px-4 py-4 font-semibold whitespace-nowrap">No. HP</th>
                    <th className="px-4 py-4 font-semibold whitespace-nowrap">Kamar</th>
                    <th className="px-4 py-4 font-semibold whitespace-nowrap">Sumber (OTA)</th>
                    <th className="px-4 py-4 font-semibold whitespace-nowrap">Check-in</th>
                    <th className="px-4 py-4 font-semibold whitespace-nowrap">Check-out</th>
                    <th className="px-4 py-4 font-semibold whitespace-nowrap">Durasi</th>
                    <th className="px-4 py-4 font-semibold whitespace-nowrap text-center">Tagihan</th>
                    <th className="px-4 py-4 font-semibold whitespace-nowrap text-center">Status</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Pembayaran</th>
                    <th className="px-4 py-4 font-semibold whitespace-nowrap text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredRiwayat.map((item) => (
                    <tr
                      key={item.id}
                      onTouchStart={() => startLongPress(item)}
                      onTouchEnd={cancelLongPress}
                      onTouchMove={cancelLongPress}
                      onMouseDown={() => startLongPress(item)}
                      onMouseUp={cancelLongPress}
                      onMouseLeave={cancelLongPress}
                      className={`select-none cursor-pointer transition-all duration-200 ${
                        pressingId === item.id
                          ? "bg-rose-100/80 dark:bg-rose-950/50 scale-[0.99] ring-2 ring-rose-500/50"
                          : "hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-[10px] font-bold text-gray-400">
                          #{item.id?.slice(0, 6).toUpperCase()}
                        </p>
                        <p className="font-bold text-gray-900 dark:text-white mt-0.5">
                          {item.nama_tamu}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.jumlah_tamu ? `${item.jumlah_tamu} orang` : "-"}
                        </p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {item.no_hp}
                        </p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.id_kamar}
                        </p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide border ${getSumberBadge(item.sumber_booking)}`}
                        >
                          {item.sumber_booking || "Langsung"}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-xs font-medium text-gray-900 dark:text-white">
                          {formatDate(item.tgl_checkin)}
                        </p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-xs font-medium text-gray-900 dark:text-white">
                          {formatDate(item.tgl_checkout)}
                        </p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 tracking-wide">
                          {getJumlahMalam(item.tgl_checkin, item.tgl_checkout)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {item.total_tagihan
                            ? formatRupiah(Number(item.total_tagihan))
                            : "-"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide border ${getStatusReservasiLabel(item.status_reservasi).color}`}
                        >
                          {getStatusReservasiLabel(item.status_reservasi).label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(item.status_bayar)}`}
                        >
                          {item.status_bayar}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          title="Klik atau Tahan Tekan Lama baris ini untuk menghapus"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemToDelete(item);
                          }}
                          className="inline-flex items-center justify-center p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary Row */}
          {filteredRiwayat.length > 0 && (
            <div className="bg-gray-50/50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800 p-4 px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Ringkasan Tutup Buku ({formatDate(startDate)} - {formatDate(endDate)})
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Total Tamu</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{totals.totalGuests} Orang</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Pemasukan (Lunas + DP)</p>
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(totals.totalCash)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* INFORMASI TAMBAHAN */}
        <div className="mt-2 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/50 p-6 shadow-sm border border-blue-100/50 dark:from-blue-900/20 dark:to-indigo-900/10 dark:border-blue-800/30 flex gap-4 items-start transition-all hover:shadow-md">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-blue-900 dark:text-blue-400 mb-2">Tentang Riwayat Kunjungan</h3>
            <ul className="text-sm text-blue-800/80 dark:text-blue-200/70 list-disc list-outside ml-4 space-y-1.5 leading-relaxed">
              <li>Data di halaman ini merupakan arsip tamu yang sudah checkout atau reservasi dibatalkan.</li>
              <li>Sistem secara otomatis memindahkan tamu ke status <span className="font-semibold">Selesai</span> ketika tanggal checkout sudah lewat.</li>
              <li><span className="font-semibold text-rose-700 dark:text-rose-300">Tahan tekan lama</span> pada baris tabel (atau klik ikon sampah) untuk menghapus riwayat kunjungan.</li>
              <li>Semua data tersimpan di database untuk keperluan pelaporan keuangan dan audit operasional.</li>
              <li>Gunakan filter bulan di atas untuk melihat ringkasan pendapatan dan kunjungan per bulan dengan mudah.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* MODAL KONFIRMASI HAPUS (LONG PRESS ACTION) */}
      {selectedItemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Hapus Riwayat Kunjungan</h3>
                <p className="text-xs text-gray-500">Apakah Anda yakin ingin menghapus data ini?</p>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50 space-y-2 mb-6 border border-gray-100 dark:border-gray-800 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Nama Tamu:</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedItemToDelete.nama_tamu}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Kamar:</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedItemToDelete.id_kamar}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Check-in / Check-out:</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatDate(selectedItemToDelete.tgl_checkin)} - {formatDate(selectedItemToDelete.tgl_checkout)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sumber Booking:</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedItemToDelete.sumber_booking || "Langsung"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Tagihan:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedItemToDelete.total_tagihan ? formatRupiah(Number(selectedItemToDelete.total_tagihan)) : "-"}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setSelectedItemToDelete(null)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteItem}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition shadow-md shadow-rose-600/20"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
