"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import RecentOrdersGuest from "@/components/ecommerce/RecentOrdersGuest";

export default function DashboardUtama() {
  const [stats, setStats] = useState({
    totalReservasi: 0,
    totalPendapatan: 0,
    menungguPembayaran: 0,
    kamarTerisiHariIni: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fungsi untuk menarik dan menghitung data dari Firebase
  useEffect(() => {
    const q = query(collection(db, "reservasi"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalRes = 0;
      let totalPend = 0;
      let totalMenunggu = 0;
      let kamarTerisi = 0;

      // Ambil tanggal hari ini (jam dinolkan agar akurat)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      snapshot.forEach((doc) => {
        const data = doc.data();
        totalRes += 1; // Hitung jumlah total reservasi

        const tagihan = Number(data.total_tagihan) || 0;

        // Hitung Keuangan
        if (data.status_bayar === "Lunas") {
          totalPend += tagihan;
        } else if (data.status_bayar === "DP") {
          totalPend += tagihan / 2; // Asumsi masuk 50%
          totalMenunggu += tagihan / 2; // Sisa 50%
        } else {
          totalMenunggu += tagihan;
        }

        // Hitung Kamar Terisi HARI INI
        if (data.tgl_checkin && data.tgl_checkout) {
          const checkIn = new Date(data.tgl_checkin);
          const checkOut = new Date(data.tgl_checkout);
          
          // Jika hari ini berada di antara check-in dan sebelum check-out
          if (today >= checkIn && today < checkOut) {
            kamarTerisi += 1;
          }
        }
      });

      setStats({
        totalReservasi: totalRes,
        totalPendapatan: totalPend,
        menungguPembayaran: totalMenunggu,
        kamarTerisiHariIni: kamarTerisi,
      });
      setIsLoading(false);
    }, (error) => {
      console.warn("Firestore onSnapshot error:", error.message);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Format angka ke Rupiah
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-xl font-bold text-amber-900 animate-pulse">Menghitung Statistik Cloud...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Selamat Datang di ARUM
            <span className="animate-bounce">👋</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Pantau ringkasan operasional dan keuangan Homestay ARUM secara real-time.
          </p>
        </div>
        <div className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-medium border border-primary/20 backdrop-blur-sm">
          Live Update Aktif
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        
        {/* KARTU 1: Total Reservasi */}
        <div className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-900/30 dark:text-blue-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <div className="mt-5 flex items-end justify-between">
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Reservasi</span>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.totalReservasi}
              </h4>
            </div>
          </div>
        </div>

        {/* KARTU 2: Kamar Terisi Hari Ini */}
        <div className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600 transition-colors group-hover:bg-green-600 group-hover:text-white dark:bg-green-900/30 dark:text-green-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </div>
          <div className="mt-5 flex items-end justify-between">
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Terisi Hari Ini</span>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.kamarTerisiHariIni} <span className="text-base font-medium text-gray-400">Kamar</span>
              </h4>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full dark:bg-green-900/30 dark:text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></span>
              Live
            </span>
          </div>
        </div>

        {/* KARTU 3: Pendapatan Masuk */}
        <div className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-900/30 dark:text-emerald-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="mt-5 flex items-end justify-between">
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Pendapatan Diterima</span>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatRupiah(stats.totalPendapatan)}
              </h4>
            </div>
          </div>
        </div>

        {/* KARTU 4: Menunggu Pembayaran */}
        <div className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white dark:bg-amber-900/30 dark:text-amber-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="mt-5 flex items-end justify-between">
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Potensi Tagihan</span>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatRupiah(stats.menungguPembayaran)}
              </h4>
            </div>
          </div>
        </div>

      </div>

      {/* BANNER INFORMASI TAMBAHAN */}
      <div className="mt-8 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/50 p-6 shadow-sm border border-amber-100/50 dark:from-amber-900/20 dark:to-orange-900/10 dark:border-amber-800/30 flex gap-4 items-start transition-all hover:shadow-md">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-amber-900 dark:text-amber-500 mb-1">Tips Operasional</h3>
          <p className="text-sm text-amber-800/80 dark:text-amber-200/70 leading-relaxed">
            Gunakan menu <strong className="font-semibold text-amber-900 dark:text-amber-400">Kelola Reservasi</strong> untuk menambahkan tamu baru. Pastikan nomor WhatsApp tamu diisi agar mempermudah staf menghubungi tamu terkait pelunasan tagihan maupun koordinasi kedatangan.
          </p>
        </div>
      </div>

      {/* TABEL TAMU AKTIF */}
      <div className="mt-8">
        <RecentOrdersGuest />
      </div>
    </div>
  );
}