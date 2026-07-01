"use client";

import React, { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { db } from "@/lib/firebase";
import { formatDate } from "@/utils/reservationUtils";
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
  const [selectedMonth, setSelectedMonth] = useState<string>("");

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

  // Group data by month-year
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

  // Data for selected month
  const filteredList = useMemo(() => {
    if (!selectedMonth) return reservasiList;
    return monthlyData[selectedMonth] || [];
  }, [reservasiList, monthlyData, selectedMonth]);

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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Laporan Pemasukan
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Ringkasan keuangan dan analisis performa homestay.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium outline-none transition focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          >
            <option value="">🗓️ Semua Bulan</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>{monthYearToLabel(m)}</option>
            ))}
          </select>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 relative">
        {/* Summary Cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-emerald-800/30 dark:from-emerald-900/20 dark:to-teal-900/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Total Lunas</p>
                <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-200">{toCurrency(totals.lunas)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-800/50 dark:text-emerald-300 transition-transform group-hover:scale-110">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
          </div>
          
          <div className="group rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50/50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-amber-800/30 dark:from-amber-900/20 dark:to-orange-900/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Total DP</p>
                <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-200">{toCurrency(totals.dp)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-800/50 dark:text-amber-300 transition-transform group-hover:scale-110">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
          </div>

          <div className="group rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-pink-50/50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-rose-800/30 dark:from-rose-900/20 dark:to-pink-900/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">Belum Bayar</p>
                <p className="mt-2 text-2xl font-bold text-rose-900 dark:text-rose-200">{toCurrency(totals.belumBayar)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-800/50 dark:text-rose-300 transition-transform group-hover:scale-110">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
            </div>
          </div>

          <div className="group rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50/50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-blue-800/30 dark:from-blue-900/20 dark:to-cyan-900/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">Total Semua</p>
                <p className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-200">{toCurrency(totals.totalKeseluruhan)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-800/50 dark:text-blue-300 transition-transform group-hover:scale-110">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
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
