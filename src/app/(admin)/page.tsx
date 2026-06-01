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
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-black dark:text-white">
          Selamat Datang di ARUM Admin
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Pantau ringkasan operasional dan keuangan Homestay ARUM secara real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5">
        
        {/* KARTU 1: Total Reservasi */}
        <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <span className="text-2xl">📋</span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <h4 className="text-title-md font-bold text-black dark:text-white">
                {stats.totalReservasi}
              </h4>
              <span className="text-sm font-medium">Total Reservasi</span>
            </div>
          </div>
        </div>

        {/* KARTU 2: Kamar Terisi Hari Ini */}
        <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark border-b-4 border-b-primary">
          <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <span className="text-2xl">🛏️</span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <h4 className="text-title-md font-bold text-black dark:text-white">
                {stats.kamarTerisiHariIni} Kamar
              </h4>
              <span className="text-sm font-medium">Terisi Hari Ini</span>
            </div>
            <span className="flex items-center gap-1 text-sm font-medium text-meta-3">
              Live
            </span>
          </div>
        </div>

        {/* KARTU 3: Pendapatan Masuk */}
        <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark border-b-4 border-b-meta-3">
          <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <span className="text-2xl">💰</span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <h4 className="text-title-md font-bold text-black dark:text-white">
                {formatRupiah(stats.totalPendapatan)}
              </h4>
              <span className="text-sm font-medium">Pendapatan Diterima</span>
            </div>
          </div>
        </div>

        {/* KARTU 4: Menunggu Pembayaran */}
        <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark border-b-4 border-b-meta-1">
          <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <span className="text-2xl">⏳</span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <h4 className="text-title-md font-bold text-black dark:text-white">
                {formatRupiah(stats.menungguPembayaran)}
              </h4>
              <span className="text-sm font-medium">Potensi Tagihan</span>
            </div>
          </div>
        </div>

      </div>

      {/* BANNER INFORMASI TAMBAHAN */}
      <div className="mt-8 rounded-sm border border-stroke bg-amber-50 p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h3 className="text-lg font-bold text-amber-900 dark:text-white mb-2">💡 Tips Operasional</h3>
        <p className="text-sm text-amber-800 dark:text-gray-400">
          Gunakan menu <strong>Kelola Reservasi</strong> untuk menambahkan tamu baru. Pastikan nomor WhatsApp tamu diisi agar mempermudah staf menghubungi tamu terkait pelunasan tagihan.
        </p>
      </div>

      {/* TABEL TAMU AKTIF */}
      <div className="mt-8">
        <RecentOrdersGuest />
      </div>
    </>
  );
}