"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatDate, isOtaChannel } from "@/utils/reservationUtils";
import { ReservationItem } from "./RoomStatusMatrix";

interface DailyOperationsHubProps {
  reservations: ReservationItem[];
}

export default function DailyOperationsHub({
  reservations,
}: DailyOperationsHubProps) {
  const [activeTab, setActiveTab] = useState<"checkin" | "checkout" | "tomorrow">("checkin");

  // Tanggal Hari ini & Besok
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // Filter tamu check-in hari ini
  const checkInToday = reservations.filter(
    (r) =>
      r.tgl_checkin?.slice(0, 10) === todayStr &&
      r.status_reservasi !== "Batal"
  );

  // Filter tamu check-out hari ini
  const checkOutToday = reservations.filter(
    (r) =>
      r.tgl_checkout?.slice(0, 10) === todayStr &&
      r.status_reservasi !== "Batal"
  );

  // Filter tamu check-in besok
  const checkInTomorrow = reservations.filter(
    (r) =>
      r.tgl_checkin?.slice(0, 10) === tomorrowStr &&
      r.status_reservasi !== "Batal"
  );

  const getActiveList = () => {
    switch (activeTab) {
      case "checkin":
        return checkInToday;
      case "checkout":
        return checkOutToday;
      case "tomorrow":
        return checkInTomorrow;
    }
  };

  const currentList = getActiveList();

  const formatRupiah = (val: string | number) => {
    const num = Number(String(val).replace(/[^0-9]/g, "")) || 0;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const getOtaBadge = (channel: string) => {
    const ch = (channel || "").toLowerCase();
    if (ch.includes("traveloka")) return { label: "Traveloka", color: "bg-sky-50 text-sky-700 border-sky-200" };
    if (ch.includes("booking")) return { label: "Booking.com", color: "bg-blue-50 text-blue-700 border-blue-200" };
    if (ch.includes("agoda")) return { label: "Agoda", color: "bg-rose-50 text-rose-700 border-rose-200" };
    if (ch.includes("airbnb")) return { label: "Airbnb", color: "bg-pink-50 text-pink-700 border-pink-200" };
    if (ch.includes("tiket")) return { label: "Tiket.com", color: "bg-yellow-50 text-yellow-700 border-yellow-200" };
    return { label: "Langsung (WA)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  };

  const getWaLink = (item: ReservationItem, type: "checkin" | "checkout" | "tomorrow") => {
    const phone = item.no_hp ? item.no_hp.replace(/[^0-9]/g, "").replace(/^0/, "62") : "";
    if (!phone) return "#";

    let message = "";
    if (type === "checkin") {
      message = `Halo ${item.nama_tamu}, kami dari Homestay ARUM ingin mengonfirmasi kedatangan Anda hari ini di kamar ${item.id_kamar}. Jam berapa perkiraan tiba di homestay?`;
    } else if (type === "checkout") {
      message = `Halo ${item.nama_tamu}, kami dari Homestay ARUM mengucapkan terima kasih telah menginap. Kami ingin mengonfirmasi jadwal check-out Anda hari ini.`;
    } else {
      message = `Halo ${item.nama_tamu}, kami dari Homestay ARUM mengingatkan jadwal check-in Anda besok (${formatDate(item.tgl_checkin)}) di kamar ${item.id_kamar}. Kami siap menyambut Anda!`;
    }

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Pusat Operasional Front Desk
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Jadwal kedatangan, kepulangan, dan koordinasi cepat dengan tamu.
            </p>
          </div>

          {/* TAB NAVIGASI */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("checkin")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "checkin"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span>Check-in Hari Ini</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === "checkin"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {checkInToday.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("checkout")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "checkout"
                  ? "bg-white text-amber-600 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span>Check-out Hari Ini</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === "checkout"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {checkOutToday.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("tomorrow")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "tomorrow"
                  ? "bg-white text-purple-600 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span>Check-in Besok</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === "tomorrow"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {checkInTomorrow.length}
              </span>
            </button>
          </div>
        </div>

        {/* DAFTAR TAMU DALAM TAB */}
        <div className="mt-4 space-y-3">
          {currentList.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {activeTab === "checkin"
                  ? "Tidak ada jadwal check-in hari ini"
                  : activeTab === "checkout"
                  ? "Tidak ada jadwal check-out hari ini"
                  : "Tidak ada jadwal check-in besok"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Semua operasional jadwal tamu dalam kondisi terkendali.
              </p>
            </div>
          ) : (
            currentList.map((item) => {
              const ota = getOtaBadge(item.sumber_booking);
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-800 transition-all shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {item.nama_tamu?.charAt(0).toUpperCase() || "T"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          {item.nama_tamu}
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ota.color}`}>
                          {ota.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          🏠 {item.id_kamar}
                        </span>
                        {item.jam_kedatangan && (
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            🕒 ETA: {item.jam_kedatangan}
                          </span>
                        )}
                        <span>
                          👥 {item.jumlah_tamu ? `${item.jumlah_tamu} Tamu` : "1 Tamu"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/60 dark:border-gray-700/60">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-gray-400 block uppercase font-medium">
                        Tagihan
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {formatRupiah(item.total_tagihan)}
                      </span>
                      <span
                        className={`text-[10px] font-bold block ${
                          item.status_bayar === "Lunas"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isOtaChannel(item.sumber_booking)
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {item.status_bayar === "Lunas"
                          ? "(Lunas)"
                          : isOtaChannel(item.sumber_booking)
                          ? "(Cair saat Check-out)"
                          : `(${item.status_bayar})`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.no_hp && (
                        <a
                          href={getWaLink(item, activeTab)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                          title="Hubungi Tamu via WhatsApp"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                          </svg>
                          <span>WA Tamu</span>
                        </a>
                      )}

                      <Link
                        href={item.id ? `/reservasi/${item.id}` : "/reservasi"}
                        className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold transition-all"
                      >
                        Detail
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
