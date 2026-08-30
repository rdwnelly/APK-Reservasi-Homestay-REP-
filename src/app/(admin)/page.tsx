"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import { useUserProfile } from "@/hooks/useUserProfile";
import DashboardKpiCards from "@/components/dashboard/DashboardKpiCards";
import RoomStatusMatrix, { ReservationItem } from "@/components/dashboard/RoomStatusMatrix";
import DailyOperationsHub from "@/components/dashboard/DailyOperationsHub";
import DashboardAnalytics from "@/components/dashboard/DashboardAnalytics";
import RecentOrdersGuest from "@/components/ecommerce/RecentOrdersGuest";

export default function DashboardUtama() {
  const { profile } = useUserProfile();
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [stats, setStats] = useState({
    totalReservasi: 0,
    totalPendapatan: 0,
    menungguPembayaran: 0,
    kamarTerisiHariIni: 0,
    totalKamar: 3,
    checkInHariIni: 0,
    checkOutHariIni: 0,
    checkInBesok: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Update jam real-time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Ucapan waktu dinamis
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return "Selamat Pagi";
    if (hour >= 11 && hour < 15) return "Selamat Siang";
    if (hour >= 15 && hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  // Tanggal hari ini terformat
  const getFormattedToday = () => {
    return new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Penarikan dan kalkulasi data real-time dari Firebase
  useEffect(() => {
    let isMounted = true;
    const q = query(collection(db, "reservasi"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!isMounted) return;

        let totalRes = 0;
        let totalPend = 0;
        let totalMenunggu = 0;
        let kamarTerisi = 0;
        let inHariIni = 0;
        let outHariIni = 0;
        let inBesok = 0;

        const rawList: ReservationItem[] = [];

        // Ambil tanggal hari ini & besok (jam dinolkan)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().slice(0, 10);

        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);

        snapshot.forEach((docSnap) => {
          const data = { id: docSnap.id, ...docSnap.data() } as ReservationItem;
          rawList.push(data);

          // PENTING: Cegah pemasukan & piutang bertambah jika reservasi dibatalkan
          const isBatal =
            data.status_reservasi === "Batal" ||
            data.status_bayar === "Batal" ||
            data.status_bayar?.toLowerCase().includes("batal");

          if (isBatal) return;

          totalRes += 1;
          const tagihan = Number(String(data.total_tagihan).replace(/[^0-9]/g, "")) || 0;

          // Hitung Keuangan (Hanya reservasi aktif/lunas valid)
          if (data.status_bayar === "Lunas") {
            totalPend += tagihan;
          } else if (data.status_bayar === "DP" || data.status_bayar === "DP/Uang Muka") {
            const actualDp = (data as any).nominal_dp
              ? Number(String((data as any).nominal_dp).replace(/[^0-9]/g, "")) || tagihan / 2
              : tagihan / 2;
            totalPend += actualDp;
            totalMenunggu += Math.max(0, tagihan - actualDp);
          } else {
            totalMenunggu += tagihan;
          }

          // Hitung Operasional Hari Ini & Besok
          if (data.tgl_checkin && data.tgl_checkout) {
            const checkIn = new Date(data.tgl_checkin);
            checkIn.setHours(0, 0, 0, 0);
            const checkOut = new Date(data.tgl_checkout);
            checkOut.setHours(0, 0, 0, 0);

            // Kamar Terisi Hari Ini
            if (today >= checkIn && today < checkOut) {
              kamarTerisi += 1;
            }

            // Check-in Hari Ini
            if (data.tgl_checkin.slice(0, 10) === todayStr) {
              inHariIni += 1;
            }

            // Check-out Hari Ini
            if (data.tgl_checkout.slice(0, 10) === todayStr) {
              outHariIni += 1;
            }

            // Check-in Besok
            if (data.tgl_checkin.slice(0, 10) === tomorrowStr) {
              inBesok += 1;
            }
          }
        });

        setReservations(rawList);
        setStats({
          totalReservasi: totalRes,
          totalPendapatan: totalPend,
          menungguPembayaran: totalMenunggu,
          kamarTerisiHariIni: Math.min(kamarTerisi, 3), // Maksimal 3 kamar
          totalKamar: 3,
          checkInHariIni: inHariIni,
          checkOutHariIni: outHariIni,
          checkInBesok: inBesok,
        });
        setIsLoading(false);
      },
      (error) => {
        if (!isMounted) return;
        console.warn("Firestore onSnapshot error:", error.message);
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      try {
        unsubscribe();
      } catch (e) {
        // ignore unmount stream race
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-base font-bold text-gray-700 dark:text-gray-300 animate-pulse">
          Menghubungkan ke Cloud Homestay ARUM...
        </p>
      </div>
    );
  }

  const userName = profile?.firstName || "Staf Homestay";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out space-y-6">
      {/* 1. EXECUTIVE HEADER & QUICK ACTIONS */}
      <div className="rounded-3xl border border-gray-100 bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700 p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-papua-pattern pointer-events-none mix-blend-soft-light opacity-30"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-white backdrop-blur-md border border-white/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Cloud Terhubung • Live
              </span>
              <span className="text-xs text-white/80 font-medium">
                {getFormattedToday()} {currentTime && `• ${currentTime} WIT`}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {getGreeting()}, {userName}! <span className="inline-block animate-bounce">👋</span>
            </h1>
            <p className="text-sm text-white/80 mt-1 max-w-2xl leading-relaxed">
              Ringkasan operasional dan keuangan Homestay ARUM (Rumah Etnik Papua). Pantau okupansi kamar, jadwal kedatangan, dan transaksi real-time.
            </p>
          </div>

          {/* QUICK ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/reservasi"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-brand-700 text-xs sm:text-sm font-bold shadow-sm hover:bg-gray-100 transition-all active:scale-95"
            >
              <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Reservasi Baru</span>
            </Link>

            <Link
              href="/kalender"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold backdrop-blur-md border border-white/20 transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Kalender</span>
            </Link>

            <Link
              href="/laporan"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold backdrop-blur-md border border-white/20 transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Laporan</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. KPI METRICS CARDS */}
      <DashboardKpiCards stats={stats} />

      {/* 3. OPERATIONAL GRID: ROOM STATUS MATRIX & DAILY OPERATIONS HUB */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RoomStatusMatrix reservations={reservations} />
        <DailyOperationsHub reservations={reservations} />
      </div>

      {/* 4. HOSPITALITY INTELLIGENCE & ANALYTICS CHARTS */}
      <DashboardAnalytics reservations={reservations} />

      {/* 5. ACTIVE GUESTS TABLE */}
      <div>
        <RecentOrdersGuest reservations={reservations as any} />
      </div>
    </div>
  );
}