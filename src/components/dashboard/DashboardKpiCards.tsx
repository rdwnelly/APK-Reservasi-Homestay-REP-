"use client";

import React from "react";

interface KpiStats {
  totalReservasi: number;
  totalPendapatan: number;
  menungguPembayaran: number;
  kamarTerisiHariIni: number;
  totalKamar: number;
  checkInHariIni: number;
  checkOutHariIni: number;
  checkInBesok: number;
}

interface DashboardKpiCardsProps {
  stats: KpiStats;
}

export default function DashboardKpiCards({ stats }: DashboardKpiCardsProps) {
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(angka);
  };

  const occupancyRate =
    stats.totalKamar > 0
      ? Math.round((stats.kamarTerisiHariIni / stats.totalKamar) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
      {/* KPI 1: TINGKAT OKUPANSI HARI INI */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Tingkat Okupansi
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                {occupancyRate}%
              </h3>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                ({stats.kamarTerisiHariIni}/{stats.totalKamar} Kamar)
              </span>
            </div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 shadow-inner group-hover:scale-105 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>

        {/* Progress Bar Okupansi */}
        <div className="mt-3.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
            <span>Kapasitas Homestay</span>
            <span className={occupancyRate >= 70 ? "text-emerald-600 font-bold" : "text-gray-600"}>
              {occupancyRate === 100 ? "Penuh 🔥" : occupancyRate > 0 ? "Tersedia Kamar" : "Kosong"}
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                occupancyRate === 100
                  ? "bg-emerald-500"
                  : occupancyRate > 0
                  ? "bg-teal-500"
                  : "bg-gray-300 dark:bg-gray-700"
              }`}
              style={{ width: `${Math.max(occupancyRate, 5)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* KPI 2: KEDATANGAN & KEPULANGAN HARI INI */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Operasional Hari Ini
            </span>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                  {stats.checkInHariIni}
                </span>
                <span className="text-[11px] font-medium text-gray-500">In</span>
              </div>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                <span className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                  {stats.checkOutHariIni}
                </span>
                <span className="text-[11px] font-medium text-gray-500">Out</span>
              </div>
            </div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 shadow-inner group-hover:scale-105 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <div className="mt-3.5 flex items-center justify-between text-[11px] pt-2 border-t border-gray-100 dark:border-gray-800">
          <span className="text-gray-500 dark:text-gray-400">Check-in Besok:</span>
          <span className="font-bold text-gray-800 dark:text-gray-200 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
            {stats.checkInBesok} Tamu
          </span>
        </div>
      </div>

      {/* KPI 3: PEMASUKAN DITERIMA */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-emerald-600"></div>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Pemasukan Diterima
            </span>
            <div className="mt-2">
              <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white truncate">
                {formatRupiah(stats.totalPendapatan)}
              </h3>
            </div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400 shadow-inner group-hover:scale-105 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="mt-3.5 flex items-center justify-between text-[11px] pt-2 border-t border-gray-100 dark:border-gray-800">
          <span className="text-gray-500 dark:text-gray-400">Total Transaksi:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {stats.totalReservasi} Reservasi
          </span>
        </div>
      </div>

      {/* KPI 4: SISA TAGIHAN / MENUNGGU PELUNASAN */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Menunggu Pelunasan
            </span>
            <div className="mt-2">
              <h3 className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 truncate">
                {formatRupiah(stats.menungguPembayaran)}
              </h3>
            </div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 shadow-inner group-hover:scale-105 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="mt-3.5 flex items-center justify-between text-[11px] pt-2 border-t border-gray-100 dark:border-gray-800">
          <span className="text-gray-500 dark:text-gray-400">Status Keuangan:</span>
          <span className="font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
            {stats.menungguPembayaran > 0 ? "Perlu Follow-up" : "Semua Lunas ✅"}
          </span>
        </div>
      </div>
    </div>
  );
}
