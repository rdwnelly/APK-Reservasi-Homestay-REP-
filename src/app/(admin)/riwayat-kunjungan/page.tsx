"use client";

import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getStatusReservasiLabel, checkAndUpdateReservationStatus } from "@/utils/reservationUtils";

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
    <>
      <PageBreadcrumb pageTitle="Riwayat Kunjungan Tamu" />

      <div className="flex flex-col gap-10 relative">
        {/* HEADER SECTION */}
        <div className="bg-white p-5 rounded-sm border border-stroke shadow-default dark:border-strokedark dark:bg-boxdark">
          <div>
            <h2 className="text-title-md2 font-semibold text-black dark:text-white">
              📜 Riwayat Kunjungan Tamu
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Data tamu yang sudah checkout atau reservasi dibatalkan. Data
              tersimpan selamanya untuk keperluan pelaporan keuangan.
            </p>
          </div>
        </div>

        {/* FILTER & STATS SECTION */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-1 lg:grid-cols-3">
          {/* Filter Bulan */}
          <div className="bg-white p-6 rounded-sm border border-stroke shadow-default dark:border-strokedark dark:bg-boxdark">
            <label className="mb-3 block text-sm font-medium text-black dark:text-white">
              Pilih Bulan & Tahun
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input text-black dark:text-white"
            />
            {availableMonths.length > 0 && (
              <div className="mt-4 pt-4 border-t border-stroke dark:border-strokedark">
                <p className="text-xs text-gray-500 mb-2">Bulan tersedia:</p>
                <div className="flex flex-wrap gap-2">
                  {availableMonths.map((month) => (
                    <button
                      key={month}
                      onClick={() => setSelectedMonth(month)}
                      className={`px-3 py-1 rounded text-xs font-medium transition ${
                        selectedMonth === month
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
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
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-6 rounded-sm border border-emerald-200 dark:border-emerald-800 shadow-default">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  💰 Total Penerimaan
                </p>
                <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 mt-2">
                  {formatRupiah(totalRevenue)}
                </h3>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>

          {/* Total Guests */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-sm border border-blue-200 dark:border-blue-800 shadow-default">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  👥 Total Tamu
                </p>
                <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-2">
                  {filteredRiwayat.length} Reservasi ({totalGuests} Orang)
                </h3>
              </div>
              <div className="text-4xl">👨‍👩‍👧‍👦</div>
            </div>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
          <div className="max-w-full overflow-x-auto">
            {filteredRiwayat.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
                  📭 Tidak ada data untuk bulan ini
                </p>
              </div>
            ) : (
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-left dark:bg-meta-4">
                    <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap">
                      ID & Nama Tamu
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap">
                      No. HP
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap">
                      Kamar
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap">
                      Check-in
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap">
                      Check-out
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap">
                      Durasi
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap text-center">
                      Tagihan
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap text-center">
                      Status
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap text-center">
                      Bayar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRiwayat.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors"
                    >
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="text-xs text-gray-500">
                          #{item.id?.slice(0, 6).toUpperCase()}
                        </p>
                        <p className="font-semibold text-black dark:text-white">
                          {item.nama_tamu}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.jumlah_tamu ? `${item.jumlah_tamu} orang` : "-"}
                        </p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="text-sm text-black dark:text-white">
                          {item.no_hp}
                        </p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="font-medium text-black dark:text-white">
                          {item.id_kamar}
                        </p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="text-sm text-black dark:text-white">
                          {item.tgl_checkin}
                        </p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="text-sm text-black dark:text-white">
                          {item.tgl_checkout}
                        </p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium border bg-blue-100 text-blue-800 border-blue-200">
                          {getJumlahMalam(item.tgl_checkin, item.tgl_checkout)}
                        </span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-center">
                        <p className="font-semibold text-black dark:text-white">
                          {item.total_tagihan
                            ? formatRupiah(Number(item.total_tagihan))
                            : "-"}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium border ${getStatusReservasiLabel(item.status_reservasi).color}`}
                        >
                          {getStatusReservasiLabel(item.status_reservasi).label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium border ${getStatusColor(item.status_bayar)}`}
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
            <div className="border-t border-stroke dark:border-strokedark mt-4 pt-4 px-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total untuk {selectedMonth}:
                  </p>
                </div>
                <div className="flex gap-8">
                  <div className="text-right">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Reservasi
                    </p>
                    <p className="text-lg font-bold text-black dark:text-white">
                      {filteredRiwayat.length}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Total Tamu
                    </p>
                    <p className="text-lg font-bold text-black dark:text-white">
                      {totalGuests}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Pendapatan
                    </p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatRupiah(totalRevenue)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* INFORMASI TAMBAHAN */}
        <div className="rounded-sm border border-blue-200 bg-blue-50 p-6 shadow-default dark:border-blue-800 dark:bg-blue-900/20">
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-200 mb-2">
            ℹ️ Tentang Riwayat Kunjungan
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 list-disc list-inside space-y-2">
            <li>
              Data di halaman ini merupakan arsip tamu yang sudah checkout atau
              reservasi dibatalkan.
            </li>
            <li>
              Sistem secara otomatis memindahkan tamu ke status "Selesai" ketika
              tanggal checkout sudah lewat.
            </li>
            <li>
              Semua data tetap tersimpan di database untuk keperluan pelaporan
              keuangan dan audit.
            </li>
            <li>
              Gunakan filter bulan untuk melihat ringkasan pendapatan per bulan
              dengan mudah.
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
