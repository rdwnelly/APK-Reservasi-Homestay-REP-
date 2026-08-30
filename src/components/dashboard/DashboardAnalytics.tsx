"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { ReservationItem } from "./RoomStatusMatrix";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface DashboardAnalyticsProps {
  reservations: ReservationItem[];
}

export default function DashboardAnalytics({
  reservations,
}: DashboardAnalyticsProps) {
  // 1. HITUNG TREN 6 BULAN TERAKHIR
  const monthlyTrendData = useMemo(() => {
    const months: { key: string; label: string; revenue: number; bookings: number }[] = [];
    const now = new Date();

    // Buat 6 slot bulan terakhir
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const key = `${year}-${month}`;
      const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
      months.push({ key, label, revenue: 0, bookings: 0 });
    }

    // Isi data dari reservasi (abaikan reservasi batal)
    reservations.forEach((item) => {
      const isBatal =
        item.status_reservasi === "Batal" ||
        item.status_bayar === "Batal" ||
        item.status_bayar?.toLowerCase().includes("batal");

      if (isBatal) return;
      if (!item.tgl_checkin) return;

      const dateStr = item.tgl_checkin.slice(0, 7); // "YYYY-MM"
      const slot = months.find((m) => m.key === dateStr);
      if (slot) {
        slot.bookings += 1;
        const tagihan = Number(String(item.total_tagihan).replace(/[^0-9]/g, "")) || 0;
        if (item.status_bayar === "Lunas") {
          slot.revenue += tagihan;
        } else if (item.status_bayar === "DP") {
          slot.revenue += tagihan / 2;
        }
      }
    });

    return months;
  }, [reservations]);

  // 2. HITUNG DISTRIBUSI CHANNEL / OTA
  const channelDistribution = useMemo(() => {
    const channelMap: Record<string, number> = {
      "Langsung (WA)": 0,
      Traveloka: 0,
      "Booking.com": 0,
      "Tiket.com": 0,
      Agoda: 0,
      Airbnb: 0,
    };

    reservations.forEach((item) => {
      const isBatal =
        item.status_reservasi === "Batal" ||
        item.status_bayar === "Batal" ||
        item.status_bayar?.toLowerCase().includes("batal");

      if (isBatal) return;
      const src = (item.sumber_booking || "").toLowerCase();
      if (src.includes("traveloka")) channelMap["Traveloka"] += 1;
      else if (src.includes("booking")) channelMap["Booking.com"] += 1;
      else if (src.includes("tiket")) channelMap["Tiket.com"] += 1;
      else if (src.includes("agoda")) channelMap["Agoda"] += 1;
      else if (src.includes("airbnb")) channelMap["Airbnb"] += 1;
      else channelMap["Langsung (WA)"] += 1;
    });

    const labels = Object.keys(channelMap).filter((k) => channelMap[k] > 0);
    const series = labels.map((k) => channelMap[k]);

    // Fallback jika belum ada data reservasi sama sekali
    if (series.length === 0) {
      return {
        labels: ["Langsung (WA)"],
        series: [1],
        isEmpty: true,
      };
    }

    return { labels, series, isEmpty: false };
  }, [reservations]);

  // KONFIGURASI GRAFIK TREN PENDAPATAN
  const trendOptions: ApexOptions = {
    chart: {
      type: "area",
      height: 260,
      toolbar: { show: false },
      fontFamily: "Outfit, sans-serif",
    },
    colors: ["#0ba5ec", "#10b981"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2.5 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [20, 100],
      },
    },
    xaxis: {
      categories: monthlyTrendData.map((m) => m.label),
      labels: {
        style: { colors: "#9ca3af", fontSize: "11px", fontWeight: 600 },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: [
      {
        title: { text: "Pendapatan (Rp)", style: { color: "#0ba5ec", fontSize: "11px" } },
        labels: {
          style: { colors: "#9ca3af", fontSize: "10px" },
          formatter: (val) => {
            if (val >= 1000000) return `${(val / 1000000).toFixed(1)} jt`;
            if (val >= 1000) return `${(val / 1000).toFixed(0)} rb`;
            return `${val}`;
          },
        },
      },
      {
        opposite: true,
        title: { text: "Reservasi", style: { color: "#10b981", fontSize: "11px" } },
        labels: {
          style: { colors: "#9ca3af", fontSize: "10px" },
          formatter: (val) => `${Math.round(val)}`,
        },
      },
    ],
    grid: {
      borderColor: "#f3f4f6",
      strokeDashArray: 3,
      yaxis: { lines: { show: true } },
    },
    tooltip: {
      y: [
        {
          formatter: (val) =>
            new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val),
        },
        {
          formatter: (val) => `${val} Tamu`,
        },
      ],
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      fontSize: "12px",
      markers: { size: 6 },
    },
  };

  const trendSeries = [
    {
      name: "Pendapatan",
      data: monthlyTrendData.map((m) => m.revenue),
    },
    {
      name: "Total Reservasi",
      data: monthlyTrendData.map((m) => m.bookings),
    },
  ];

  // KONFIGURASI GRAFIK DONAT SALURAN (OTA)
  const donutOptions: ApexOptions = {
    chart: {
      type: "donut",
      fontFamily: "Outfit, sans-serif",
    },
    colors: ["#10b981", "#0ea5e9", "#2563eb", "#f59e0b", "#f43f5e", "#ec4899"],
    labels: channelDistribution.labels,
    dataLabels: { enabled: true },
    legend: {
      position: "bottom",
      fontSize: "11px",
      markers: { size: 6 },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total Pesanan",
              fontSize: "12px",
              fontWeight: 600,
              formatter: () => `${reservations.filter((r) => r.status_reservasi !== "Batal").length}`,
            },
          },
        },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* GRAFIK 1: TREN PENDAPATAN & VOLUME (2 KOLOM) */}
      <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </span>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Tren Pendapatan & Volume Reservasi
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Perkembangan omset dan jumlah reservasi tamu 6 bulan terakhir.
            </p>
          </div>
        </div>

        <div className="mt-3 max-w-full overflow-x-auto">
          <div className="min-w-[480px]">
            <ReactApexChart
              options={trendOptions}
              series={trendSeries}
              type="area"
              height={250}
            />
          </div>
        </div>
      </div>

      {/* GRAFIK 2: DISTRIBUSI SALURAN / OTA (1 KOLOM) */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between">
        <div className="pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </span>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Saluran Pemesanan (OTA)
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Komposisi asal pesanan tamu homestay.
          </p>
        </div>

        <div className="mt-4 flex items-center justify-center">
          <div className="w-full max-w-[280px]">
            <ReactApexChart
              options={donutOptions}
              series={channelDistribution.series}
              type="donut"
              height={250}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
