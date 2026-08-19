"use client";

import React, { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { db } from "@/lib/firebase";
import { formatDate, getTutupBukuRange } from "@/utils/reservationUtils";
import { exportRiwayatTutupBukuPDF } from "@/utils/pdfExportUtils";
import { collection, onSnapshot, query } from "firebase/firestore";

interface ReservationData {
  id?: string;
  nama_tamu: string;
  no_hp: string;
  sumber_booking: string;
  id_kamar: string;
  tgl_checkin: string;
  tgl_checkout: string;
  status_bayar: string;
  total_tagihan: string;
}

const toCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

const getMonthYear = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Unknown";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const monthYearToLabel = (monthYear: string) => {
  const [year, month] = monthYear.split("-");
  return `${year}-${month}`;
};

const LaporanPage = () => {
  const [reservasiList, setReservasiList] = useState<ReservationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State Filter Periode Tutup Buku (Tanggal 18 - Tanggal 17)
  const [filterMode, setFilterMode] = useState<"tutup_buku" | "bulanan" | "kustom">("tutup_buku");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  // Auto calculate range Tutup Buku (18 Bulan Lalu - 17 Bulan Terpilih)
  const defaultTutupBuku = useMemo(() => {
    const [yStr, mStr] = selectedMonth.split("-");
    const now = new Date();
    const y = Number(yStr) || now.getFullYear();
    const m = Number(mStr) || (now.getMonth() + 1);
    return getTutupBukuRange(y, m);
  }, [selectedMonth]);

  const [startDate, setStartDate] = useState<string>(defaultTutupBuku.startDate);
  const [endDate, setEndDate] = useState<string>(defaultTutupBuku.endDate);

  // Sync dates on month or filterMode change
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

  useEffect(() => {
    const q = query(collection(db, "reservasi"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as ReservationData));
        setReservasiList(data);
        setLoading(false);
      },
      (err) => {
        console.warn("Failed to load reservation data:", err.message);
        setError("Gagal memuat data. Coba refresh.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Group data by month-year for charts
  const monthlyData = useMemo(() => {
    const map: Record<string, ReservationData[]> = {};
    reservasiList.forEach((item) => {
      const monthYear = getMonthYear(item.tgl_checkin);
      if (!map[monthYear]) map[monthYear] = [];
      map[monthYear].push(item);
    });
    return map;
  }, [reservasiList]);

  // List of available months (sorted desc)
  const availableMonths = useMemo(() => {
    return Object.keys(monthlyData).sort((a, b) => b.localeCompare(a));
  }, [monthlyData]);

  // Data for selected date range (Tutup Buku 18-17 / Custom)
  const filteredList = useMemo(() => {
    return reservasiList.filter((item) => {
      const dateToCheck = item.tgl_checkout || item.tgl_checkin;
      if (!dateToCheck) return false;
      return dateToCheck >= startDate && dateToCheck <= endDate;
    });
  }, [reservasiList, startDate, endDate]);

  // Rekap pemasukan bulanan (khusus status lunas)
  const pemasukanBulanan = useMemo(() => {
    const map: Record<string, number> = {};
    reservasiList.forEach((item) => {
      if (item.status_bayar?.toLowerCase() === "lunas") {
        const monthYear = getMonthYear(item.tgl_checkin);
        const billed = Number(item.total_tagihan.replace(/[^0-9-]/g, "")) || 0;
        map[monthYear] = (map[monthYear] || 0) + billed;
      }
    });
    return map;
  }, [reservasiList]);

  // Totals for filtered data
  const totals = useMemo(() => {
    return filteredList.reduce(
      (
        acc,
        item
      ): { lunas: number; dp: number; belumBayar: number; totalKeseluruhan: number } => {
        const billed = Number(item.total_tagihan.replace(/[^0-9-]/g, "")) || 0;
        const target = item.status_bayar?.toLowerCase();
        if (target === "lunas") {
          acc.lunas += billed;
        } else if (target === "dp" || target === "dp/uang muka") {
          acc.dp += billed;
        } else if (target === "batal") {
          acc.belumBayar += billed;
        } else {
          acc.belumBayar += billed;
        }
        if (target !== "batal") {
            acc.totalKeseluruhan += billed;
        }
        return acc;
      },
      { lunas: 0, dp: 0, belumBayar: 0, totalKeseluruhan: 0 }
    );
  }, [filteredList]);

  const { kamarData, otaData } = useMemo(() => {
    const kData: Record<string, number> = {};
    const oData: Record<string, number> = {};
    filteredList.forEach((item) => {
      if (item.status_bayar?.toLowerCase() !== "batal") {
        const billed = Number(item.total_tagihan.replace(/[^0-9-]/g, "")) || 0;
        const kamar = item.id_kamar || "Lainnya";
        const ota = item.sumber_booking || "Lainnya";
        kData[kamar] = (kData[kamar] || 0) + billed;
        oData[ota] = (oData[ota] || 0) + billed;
      }
    });
    return { kamarData: kData, otaData: oData };
  }, [filteredList]);

  const chartOptions: ApexOptions = {
    chart: {
      type: "donut",
      toolbar: {
        show: true,
      },
    },
    labels: ["Lunas", "DP", "Belum Bayar"],
    legend: {
      position: "bottom",
    },
    colors: ["#10B981", "#F59E0B", "#EF4444"],
    dataLabels: {
      enabled: true,
      formatter: function (value) {
        return `${Math.round(Number(value))}%`;
      },
    },
  };

  const chartSeries = [totals.lunas, totals.dp, totals.belumBayar];

  const kamarChartOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
    dataLabels: { enabled: false },
    xaxis: { 
      categories: Object.keys(kamarData),
      labels: {
        formatter: (value) => {
          return new Intl.NumberFormat("id-ID", { notation: "compact" }).format(Number(value));
        }
      }
    },
    colors: ["#3C50E0"],
    tooltip: {
      y: {
        formatter: (val) => toCurrency(val)
      }
    }
  };
  const kamarChartSeries = [{ name: "Pemasukan", data: Object.values(kamarData) }];

  const otaChartOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, horizontal: false, columnWidth: '45%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: Object.keys(otaData) },
    yaxis: {
      labels: {
        formatter: (value) => {
          return new Intl.NumberFormat("id-ID", { notation: "compact" }).format(Number(value));
        }
      }
    },
    colors: ["#10B981"],
    tooltip: {
      y: {
        formatter: (val) => toCurrency(val)
      }
    }
  };
  const otaChartSeries = [{ name: "Pemasukan", data: Object.values(otaData) }];

  // Export CSV untuk data bulan yang dipilih
  const exportCsv = () => {
    const header = ["Nama Tamu", "No HP", "Sumber Booking", "Kamar", "Checkin", "Checkout", "Status", "Total Tagihan"];
    const rows = filteredList.map((item) => [
      item.nama_tamu,
      item.no_hp,
      item.sumber_booking,
      item.id_kamar,
      item.tgl_checkin,
      item.tgl_checkout,
      item.status_bayar,
      Number(item.total_tagihan.replace(/[^0-9-]/g, "")) || 0,
    ]);
    const escapeCell = (value: string | number) => {
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };
    const csvContent = [header, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileLabel = selectedMonth ? `-${selectedMonth}` : "";
    link.href = url;
    link.setAttribute("download", `laporan-pemasukan${fileLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  if (loading) {
    return (
      <div className="p-4 text-center text-gray-700">Memuat data laporan...</div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 border border-red-200 rounded bg-red-50">{error}</div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* Header Halaman */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Laporan Pemasukan & Tutup Buku
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Rekapitulasi keuangan, pemasukan, DP, dan piutang periode Tutup Buku (Tanggal 18 s/d 17).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              const financialTotals = {
                pemasukanLunas: totals.lunas,
                totalDP: totals.dp,
                piutangBelumBayar: totals.belumBayar,
                totalCash: totals.lunas + totals.dp,
                totalGuests: filteredList.length,
              };
              exportRiwayatTutupBukuPDF(filteredList, startDate, endDate, financialTotals);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-rose-500/30 hover:bg-rose-700 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
          <button
            onClick={exportCsv}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:gap-6 relative">
        {/* PANEL FILTER PERIODE TUTUP BUKU (TGL 18 S/D 17) */}
        <div className="rounded-2xl border border-blue-100 bg-white p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3.5">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>📘 Filter Periode Tutup Buku</span>
                {filterMode === "tutup_buku" && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] sm:text-xs font-extrabold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    Otomatis 18 - 17
                  </span>
                )}
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                Penyaringan otomatis periode laporan keuangan dari Tanggal Mulai (18) sampai Tanggal Akhir (17).
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
              {filteredList.length} Transaksi Ditemukan
            </span>
          </div>
        </div>

        {/* Summary Cards (2x2 Grid on Mobile) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          <div className="group rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-3.5 sm:p-6 shadow-sm transition-all duration-300 dark:border-emerald-800/30 dark:from-emerald-900/20 dark:to-teal-900/10">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">Total Lunas</p>
                <p className="mt-1 text-base sm:text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 truncate">{toCurrency(totals.lunas)}</p>
              </div>
              <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-800/50 dark:text-emerald-300 flex-shrink-0">
                <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
          </div>
          
          <div className="group rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50/50 p-3.5 sm:p-6 shadow-sm transition-all duration-300 dark:border-amber-800/30 dark:from-amber-900/20 dark:to-orange-900/10">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">Total DP</p>
                <p className="mt-1 text-base sm:text-2xl font-extrabold text-amber-900 dark:text-amber-200 truncate">{toCurrency(totals.dp)}</p>
              </div>
              <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-800/50 dark:text-amber-300 flex-shrink-0">
                <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
          </div>

          <div className="group rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-pink-50/50 p-3.5 sm:p-6 shadow-sm transition-all duration-300 dark:border-rose-800/30 dark:from-rose-900/20 dark:to-pink-900/10">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 truncate">Belum Bayar</p>
                <p className="mt-1 text-base sm:text-2xl font-extrabold text-rose-900 dark:text-rose-200 truncate">{toCurrency(totals.belumBayar)}</p>
              </div>
              <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-800/50 dark:text-rose-300 flex-shrink-0">
                <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
            </div>
          </div>

          <div className="group rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50/50 p-3.5 sm:p-6 shadow-sm transition-all duration-300 dark:border-blue-800/30 dark:from-blue-900/20 dark:to-cyan-900/10">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 truncate">Total Omset</p>
                <p className="mt-1 text-base sm:text-2xl font-extrabold text-blue-900 dark:text-blue-200 truncate">{toCurrency(totals.totalKeseluruhan)}</p>
              </div>
              <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-800/50 dark:text-blue-300 flex-shrink-0">
                <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Grafik Utama */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6">Grafik Tren Pemasukan (Lunas)</h3>
          <div className="overflow-hidden">
            <Chart
              options={{
                chart: { type: "bar", toolbar: { show: false }, fontFamily: 'inherit' },
                plotOptions: { bar: { borderRadius: 6, horizontal: false, columnWidth: '40%' } },
                dataLabels: { enabled: false },
                xaxis: { 
                  categories: Object.keys(pemasukanBulanan).map(monthYearToLabel),
                  axisBorder: { show: false },
                  axisTicks: { show: false },
                },
                yaxis: {
                  labels: {
                    formatter: (value: number) => new Intl.NumberFormat("id-ID", { notation: "compact" }).format(Number(value)),
                  }
                },
                colors: ["#3b82f6"],
                grid: { borderColor: '#f1f5f9', strokeDashArray: 4, yaxis: { lines: { show: true } } },
                tooltip: { y: { formatter: (val: number) => toCurrency(val) } }
              }}
              series={[{ name: "Lunas", data: Object.values(pemasukanBulanan) }]}
              type="bar"
              width="100%"
              height={300}
            />
          </div>
        </div>

        {/* Tiga Grafik Kecil */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6 text-center">Status Pembayaran</h3>
            <Chart options={{...chartOptions, chart: {...chartOptions.chart, fontFamily: 'inherit'}}} series={chartSeries} type="donut" width="100%" height={280} />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6 text-center">Pemasukan per Kamar</h3>
            <Chart options={{...kamarChartOptions, chart: {...kamarChartOptions.chart, fontFamily: 'inherit'}}} series={kamarChartSeries} type="bar" width="100%" height={280} />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6 text-center">Pemasukan per OTA</h3>
            <Chart options={{...otaChartOptions, chart: {...otaChartOptions.chart, fontFamily: 'inherit'}}} series={otaChartSeries} type="bar" width="100%" height={280} />
          </div>
        </div>

        {/* Tabel Detail */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Detail Transaksi {selectedMonth ? `Bulan ${selectedMonth}` : ""}</h3>
          </div>
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400 border-collapse">
              <thead className="bg-gray-50/50 text-[11px] uppercase tracking-wider text-gray-500 dark:bg-gray-800/30 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Nama Tamu</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Kamar & OTA</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Jadwal Menginap</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap text-center">Status Bayar</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap text-right">Tagihan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm font-medium text-gray-500">
                      Tidak ada data transaksi yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-bold text-gray-900 dark:text-white">{item.nama_tamu}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.no_hp}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="font-medium text-gray-900 dark:text-white">{item.id_kamar}</p>
                        <p className="text-xs text-primary mt-0.5">{item.sumber_booking}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-xs font-medium text-gray-900 dark:text-white">{formatDate(item.tgl_checkin)}</p>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">{formatDate(item.tgl_checkout)}</p>
                      </td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide border ${
                          item.status_bayar?.toLowerCase() === 'lunas' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          item.status_bayar?.toLowerCase().includes('dp') ? 'bg-amber-100 text-amber-800 border-amber-200' :
                          'bg-rose-100 text-rose-800 border-rose-200'
                        }`}>
                          {item.status_bayar}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {toCurrency(Number(item.total_tagihan.replace(/[^0-9-]/g, "")) || 0)}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaporanPage;
