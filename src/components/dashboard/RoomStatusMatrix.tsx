"use client";

import React from "react";
import Link from "next/link";
import { formatDate, getStatusBayarBadge } from "@/utils/reservationUtils";

export interface ReservationItem {
  id?: string;
  nama_tamu: string;
  jumlah_tamu?: string | number;
  no_hp: string;
  sumber_booking: string;
  id_kamar: string;
  tgl_checkin: string;
  tgl_checkout: string;
  jam_kedatangan?: string;
  kamar_siap?: boolean;
  status_bayar: string;
  total_tagihan: string;
  status_kebersihan?: "siap" | "dipakai" | "perlu_bersih";
  status_reservasi?: "Aktif" | "DP" | "Selesai" | "Batal";
}

interface RoomInfo {
  id: string;
  name: string;
  type: string;
  capacity: string;
  facilities: string[];
}

const ROOM_LIST: RoomInfo[] = [
  {
    id: "Double Room with AC",
    name: "Double Room with AC",
    type: "Kamar Utama AC",
    capacity: "2 Tamu",
    facilities: ["Air Conditioner", "Double Bed", "Free WiFi", "Private Bath"],
  },
  {
    id: "Double Room with Fan",
    name: "Double Room with Fan",
    type: "Kamar Standar Kipas",
    capacity: "2 Tamu",
    facilities: ["Ceiling Fan", "Double Bed", "Free WiFi", "En-suite"],
  },
  {
    id: "Single Room with Fan",
    name: "Single Room with Fan",
    type: "Kamar Single Kipas",
    capacity: "1 Tamu",
    facilities: ["Ceiling Fan", "Single Bed", "Free WiFi", "Shared/Private"],
  },
];

interface RoomStatusMatrixProps {
  reservations: ReservationItem[];
}

export default function RoomStatusMatrix({ reservations }: RoomStatusMatrixProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper untuk mendapatkan status okupansi dan tamu aktif di kamar tertentu
  const getRoomOccupancy = (roomName: string) => {
    // Cari tamu yang sedang menginap HARI INI
    const activeGuest = reservations.find((r) => {
      if (r.id_kamar !== roomName) return false;
      if (r.status_reservasi === "Batal" || r.status_reservasi === "Selesai") return false;

      const checkIn = new Date(r.tgl_checkin);
      checkIn.setHours(0, 0, 0, 0);
      const checkOut = new Date(r.tgl_checkout);
      checkOut.setHours(0, 0, 0, 0);

      return today >= checkIn && today < checkOut;
    });

    // Jika tidak ada yang sedang menginap, cari tamu berikutnya yang akan check-in
    const nextGuest = !activeGuest
      ? reservations
          .filter((r) => {
            if (r.id_kamar !== roomName) return false;
            if (r.status_reservasi === "Batal" || r.status_reservasi === "Selesai") return false;
            const checkIn = new Date(r.tgl_checkin);
            checkIn.setHours(0, 0, 0, 0);
            return checkIn >= today;
          })
          .sort(
            (a, b) =>
              new Date(a.tgl_checkin).getTime() - new Date(b.tgl_checkin).getTime()
          )[0]
      : null;

    return { activeGuest, nextGuest };
  };

  const getCleanlinessBadge = (guest?: ReservationItem) => {
    if (guest) {
      return {
        label: "Sedang Digunakan",
        color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400",
        dot: "bg-rose-500 animate-pulse",
      };
    }
    return {
      label: "Siap Huni / Bersih",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
      dot: "bg-emerald-500",
    };
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </span>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Status Kamar Real-Time (Room Matrix)
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Pantau ketersediaan fisik dan kondisi kamar Homestay ARUM saat ini.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/kalender"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Buka Kalender Grid
          </Link>
        </div>
      </div>

      {/* GRID STATUS 3 KAMAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mt-5">
        {ROOM_LIST.map((room) => {
          const { activeGuest, nextGuest } = getRoomOccupancy(room.name);
          const isOccupied = !!activeGuest;
          const statusBadge = getCleanlinessBadge(activeGuest);

          return (
            <div
              key={room.id}
              className={`rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden p-4 sm:p-5 relative ${
                isOccupied
                  ? "border-rose-200/80 bg-gradient-to-b from-rose-50/40 to-white dark:border-rose-900/40 dark:from-rose-950/20 dark:to-gray-900 shadow-sm"
                  : "border-emerald-200/80 bg-gradient-to-b from-emerald-50/40 to-white dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-gray-900 hover:shadow-md"
              }`}
            >
              {/* TOP STATUS BAR */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {room.type} • {room.capacity}
                  </span>
                  <h4 className="text-base font-extrabold text-gray-900 dark:text-white mt-0.5">
                    {room.name}
                  </h4>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusBadge.color}`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`}></span>
                  {statusBadge.label}
                </span>
              </div>

              {/* MIDDLE CONTENT: DETAIL TAMU / STATUS KOSONG */}
              <div className="my-3 py-3 border-y border-gray-100 dark:border-gray-800 text-xs">
                {isOccupied && activeGuest ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Tamu Menginap:</span>
                      <span className="font-bold text-gray-900 dark:text-white truncate max-w-[140px]">
                        {activeGuest.nama_tamu}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Jadwal Check-out:</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {formatDate(activeGuest.tgl_checkout)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Status Bayar:</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] border ${
                          getStatusBayarBadge(activeGuest.status_bayar, activeGuest.sumber_booking, activeGuest.tgl_checkout).badgeClass
                        }`}
                      >
                        {getStatusBayarBadge(activeGuest.status_bayar, activeGuest.sumber_booking, activeGuest.tgl_checkout).label}
                      </span>
                    </div>

                    {activeGuest.sumber_booking && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">Saluran (OTA):</span>
                        <span className="text-gray-600 dark:text-gray-300 font-medium">
                          {activeGuest.sumber_booking}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 py-1">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Kamar siap menerima tamu baru
                    </div>

                    {nextGuest ? (
                      <div className="bg-blue-50/60 dark:bg-blue-950/30 p-2 rounded-xl border border-blue-100 dark:border-blue-900/30 mt-2">
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 block uppercase">
                          Reservasi Berikutnya:
                        </span>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate mt-0.5">
                          {nextGuest.nama_tamu} ({formatDate(nextGuest.tgl_checkin)})
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 mt-1">
                        Belum ada jadwal check-in dalam waktu dekat.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* BOTTOM ACTIONS */}
              <div className="flex items-center gap-2 pt-1">
                {isOccupied && activeGuest ? (
                  <>
                    <Link
                      href={activeGuest.id ? `/reservasi/${activeGuest.id}` : "/reservasi"}
                      className="flex-1 text-center py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold transition-all"
                    >
                      Lihat Rincian
                    </Link>
                    {activeGuest.no_hp && (
                      <a
                        href={`https://wa.me/${activeGuest.no_hp.replace(/[^0-9]/g, "").replace(/^0/, "62")}?text=Halo%20${encodeURIComponent(activeGuest.nama_tamu)},%20kami%20dari%20Homestay%20ARUM...`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-sm flex items-center justify-center"
                        title="Chat Tamu via WhatsApp"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                        </svg>
                      </a>
                    )}
                  </>
                ) : (
                  <Link
                    href="/reservasi"
                    className="w-full text-center py-2 px-3 rounded-xl bg-primary text-white hover:bg-primary/90 text-xs font-bold transition-all shadow-sm shadow-primary/20 flex items-center justify-center gap-1.5"
                  >
                    <span>+</span> Pesan Kamar Ini
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
