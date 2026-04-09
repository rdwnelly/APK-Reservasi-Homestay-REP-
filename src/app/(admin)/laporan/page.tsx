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

const LaporanPage = () => {
  const [reservasiList, setReservasiList] = useState<ReservationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const totals = useMemo(() => {
    return reservasiList.reduce(
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
          // Do not add to total if cancelled? The previous code didn't handle batal explicitly, it added to belumBayar. 
          // Let's just keep the old logic but add to belumBayar if not lunas/dp
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
  }, [reservasiList]);

  const { kamarData, otaData } = useMemo(() => {
    const kData: Record<string, number> = {};
    const oData: Record<string, number> = {};

    reservasiList.forEach((item) => {
      // Hanya menghitung yang bukan batal
      if (item.status_bayar?.toLowerCase() !== "batal") {
        const billed = Number(item.total_tagihan.replace(/[^0-9-]/g, "")) || 0;
        const kamar = item.id_kamar || "Lainnya";
        const ota = item.sumber_booking || "Lainnya";

        kData[kamar] = (kData[kamar] || 0) + billed;
        oData[ota] = (oData[ota] || 0) + billed;
      }
    });

    return { kamarData: kData, otaData: oData };
  }, [reservasiList]);

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

  const exportCsv = () => {
    const header = ["Nama Tamu", "No HP", "Sumber Booking", "Kamar", "Checkin", "Checkout", "Status", "Total Tagihan"];
    const rows = reservasiList.map((item) => [
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

    link.href = url;
    link.setAttribute("download", `laporan-pemasukan-${new Date().toISOString().slice(0, 10)}.csv`);
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

      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Ringkasan Pemasukan</h2>
        <button
          onClick={exportCsv}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          Export CSV
        </button>
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
              {reservasiList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                    Belum ada data reservasi
                  </td>
                </tr>
              ) : (
                reservasiList.map((item) => (
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
