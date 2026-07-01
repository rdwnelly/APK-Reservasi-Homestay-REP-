"use client";

import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getStatusReservasiLabel, checkAndUpdateReservationStatus, formatDate } from "@/utils/reservationUtils";

interface RiwayatReservasi {
  id: string;
  nama_tamu: string;
  no_hp: string;
  id_kamar: string;
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

  // Filter data berdasarkan bulan yang dipilih
  const filteredRiwayat = riwayatList.filter((item) => {
    const itemMonth = item.tgl_checkout.slice(0, 7); // YYYY-MM
    return itemMonth === selectedMonth;
  });

  const getStatusColor = (status: string) => {
    if (status === "Lunas")
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (status === "DP" || status === "DP/Uang Muka")
      return "bg-amber-100 text-amber-800 border-amber-200";
    if (status === "Batal")
      return "bg-rose-100 text-rose-800 border-rose-200";
    return "bg-rose-100 text-rose-800 border-rose-200";
  };

  const getJumlahMalam = (inDate: string, outDate: string) => {
    if (!inDate || !outDate) return "-";
    const diff = new Date(outDate).getTime() - new Date(inDate).getTime();
    const days = diff / (1000 * 3600 * 24);
    return days > 0 ? `${Math.ceil(days)} Malam` : "-";
  };

  const totalRevenue = filteredRiwayat.reduce((sum, item) => {
    return sum + (Number(item.total_tagihan) || 0);
  }, 0);

  const totalGuests = filteredRiwayat.reduce((sum, item) => {
    return sum + (Number(item.jumlah_tamu) || 1);
  }, 0);

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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Riwayat Kunjungan Tamu
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Data tamu yang sudah checkout atau reservasi dibatalkan. Tersimpan untuk keperluan pelaporan.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 relative">
        {/* FILTER & STATS SECTION */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Filter Bulan */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
            <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Pilih Bulan & Tahun
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-gray-50/50 py-2.5 px-4 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            {availableMonths.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-wider">Bulan tersedia:</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableMonths.map((month) => (
                    <button
                      key={month}
                      onClick={() => setSelectedMonth(month)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        selectedMonth === month
                          ? "bg-primary text-white shadow-sm shadow-primary/30"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      }`}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Total Revenue */}
          <div className="group rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-emerald-800/30 dark:from-emerald-900/20 dark:to-teal-900/10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Total Penerimaan
                </p>
                <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 mt-2">
                  {formatRupiah(totalRevenue)}
                </h3>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">Pada bulan {selectedMonth}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-800/50 dark:text-emerald-300 transition-transform group-hover:scale-110">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
          </div>

          {/* Total Guests */}
          <div className="group rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50/50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-blue-800/30 dark:from-blue-900/20 dark:to-cyan-900/10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  Total Tamu & Reservasi
                </p>
                <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-2">
                  {totalGuests} <span className="text-base font-medium">Orang</span>
                </h3>
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">Dari {filteredRiwayat.length} reservasi di {selectedMonth}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-800/50 dark:text-blue-300 transition-transform group-hover:scale-110">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
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
                    <th className="px-4 py-4 font-semibold whitespace-nowrap">Check-in</th>
                    <th className="px-4 py-4 font-semibold whitespace-nowrap">Check-out</th>
                    <th className="px-4 py-4 font-semibold whitespace-nowrap">Durasi</th>
                    <th className="px-4 py-4 font-semibold whitespace-nowrap text-center">Tagihan</th>
                    <th className="px-4 py-4 font-semibold whitespace-nowrap text-center">Status</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Pembayaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredRiwayat.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
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
                  Ringkasan Bulan {selectedMonth}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Total Tamu</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{totalGuests} Orang</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Total Pendapatan</p>
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(totalRevenue)}</p>
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
              <li>Semua data tetap tersimpan di database secara permanen untuk keperluan pelaporan keuangan dan audit operasional.</li>
              <li>Gunakan filter bulan di atas untuk melihat ringkasan pendapatan dan kunjungan per bulan dengan mudah.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
