"use client";

import React, { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { db } from "@/lib/firebase";
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
        console.error("Failed to load reservation data:", err);
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
    <div>
      <PageBreadcrumb pageTitle="Laporan Pemasukan" />

      {/* Filter Bulan */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Ringkasan Pemasukan</h2>
          <select
            className="ml-4 border rounded px-2 py-1 text-sm"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          >
            <option value="">Semua Bulan</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>{monthYearToLabel(m)}</option>
            ))}
          </select>
        </div>
        <button
          onClick={exportCsv}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          Export CSV {selectedMonth && `(Bulan ${monthYearToLabel(selectedMonth)})`}
        </button>
      </div>

      {/* Grafik Pemasukan Bulanan */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-700 mb-2">Grafik Pemasukan Lunas per Bulan</h3>
        <Chart
          options={{
            chart: { type: "bar", toolbar: { show: false } },
            plotOptions: { bar: { borderRadius: 4, horizontal: false, columnWidth: '45%' } },
            dataLabels: { enabled: false },
            xaxis: { categories: Object.keys(pemasukanBulanan).map(monthYearToLabel) },
            yaxis: {
              labels: {
                formatter: (value: number) => new Intl.NumberFormat("id-ID", { notation: "compact" }).format(Number(value)),
              }
            },
            colors: ["#10B981"],
            tooltip: { y: { formatter: (val: number) => toCurrency(val) } }
          }}
          series={[{ name: "Lunas", data: Object.values(pemasukanBulanan) }]}
          type="bar"
          width="100%"
          height={220}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-strokedark dark:bg-boxdark">
          <p className="text-sm text-gray-500">Total Lunas</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{toCurrency(totals.lunas)}</p>
        </div>
        <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-strokedark dark:bg-boxdark">
          <p className="text-sm text-gray-500">Total DP</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{toCurrency(totals.dp)}</p>
        </div>
        <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-strokedark dark:bg-boxdark">
          <p className="text-sm text-gray-500">Total Belum Bayar</p>
          <p className="mt-2 text-2xl font-bold text-rose-600">{toCurrency(totals.belumBayar)}</p>
        </div>
        <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-strokedark dark:bg-boxdark">
          <p className="text-sm text-gray-500">Total Semua</p>
          <p className="mt-2 text-2xl font-bold text-blue-600">{toCurrency(totals.totalKeseluruhan)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-strokedark dark:bg-boxdark">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">Status Pembayaran</h3>
          <div className="mt-4">
            <Chart
              options={chartOptions}
              series={chartSeries}
              type="donut"
              width="100%"
              height={320}
            />
          </div>
        </div>

        <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-strokedark dark:bg-boxdark">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">Pemasukan per Kamar</h3>
          <div className="mt-4">
            <Chart
              options={kamarChartOptions}
              series={kamarChartSeries}
              type="bar"
              width="100%"
              height={320}
            />
          </div>
        </div>

        <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-strokedark dark:bg-boxdark">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">Pemasukan per OTA</h3>
          <div className="mt-4">
            <Chart
              options={otaChartOptions}
              series={otaChartSeries}
              type="bar"
              width="100%"
              height={320}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-strokedark dark:bg-boxdark">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detail Transaksi</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-100 text-xs uppercase text-gray-600">
                <th className="px-3 py-2">Tamu</th>
                <th className="px-3 py-2">Kamar</th>
                <th className="px-3 py-2">Check-in</th>
                <th className="px-3 py-2">Check-out</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Tagihan</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                    Belum ada data reservasi
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="px-3 py-2">{item.nama_tamu}</td>
                    <td className="px-3 py-2">{item.id_kamar}</td>
                    <td className="px-3 py-2">{item.tgl_checkin}</td>
                    <td className="px-3 py-2">{item.tgl_checkout}</td>
                    <td className="px-3 py-2">{item.status_bayar}</td>
                    <td className="px-3 py-2">{toCurrency(Number(item.total_tagihan.replace(/[^0-9-]/g, "")) || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LaporanPage;
