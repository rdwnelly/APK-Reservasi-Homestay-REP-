"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { getStatusReservasiLabel, formatDate, formatRupiah } from "@/utils/reservationUtils";
import { useAutoArchiveReservations } from "@/hooks/useAutoArchive";

export interface GuestReservation {
  id: string;
  nama_tamu: string;
  no_hp: string;
  id_kamar: string;
  tgl_checkin: string;
  tgl_checkout: string;
  status_reservasi?: "Aktif" | "DP" | "Selesai" | "Batal";
  status_bayar: string;
  total_tagihan: string;
  jumlah_tamu?: string | number;
  sumber_booking?: string;
  jam_kedatangan?: string;
}

interface RecentOrdersGuestProps {
  reservations?: GuestReservation[];
}

export default function RecentOrdersGuest({ reservations: propReservations }: RecentOrdersGuestProps = {}) {
  const [internalList, setInternalList] = useState<GuestReservation[]>([]);
  const [isLoading, setIsLoading] = useState(!propReservations);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "inhouse" | "unpaid" | "upcoming">("all");

  // Custom hook auto-archive
  useAutoArchiveReservations();

  // Ambil data tamu jika tidak di-supply via props
  useEffect(() => {
    if (propReservations) {
      const activeOrDp = propReservations.filter(
        (r) => !r.status_reservasi || r.status_reservasi === "Aktif" || r.status_reservasi === "DP"
      );
      activeOrDp.sort(
        (a, b) =>
          new Date(a.tgl_checkin).getTime() - new Date(b.tgl_checkin).getTime()
      );
      setInternalList(activeOrDp);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, "reservasi"),
      where("status_reservasi", "in", ["Aktif", "DP"])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as GuestReservation));

        // Urutkan berdasarkan tanggal check-in
        data.sort(
          (a, b) =>
            new Date(a.tgl_checkin).getTime() - new Date(b.tgl_checkin).getTime()
        );

        setInternalList(data);
        setIsLoading(false);
      },
      (error) => {
        console.warn("Firestore onSnapshot error:", error.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [propReservations]);

  const guestList = propReservations ? internalList : internalList;

  const getStatusColor = (status: string) => {
    if (status === "Lunas")
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300";
    if (status === "DP" || status === "DP/Uang Muka")
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300";
    if (status === "Batal")
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300";
    return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"; // Belum Bayar
  };

  const getOtaColor = (source?: string) => {
    const s = (source || "").toLowerCase();
    if (s.includes("traveloka")) return "bg-sky-50 text-sky-700 border-sky-200";
    if (s.includes("booking")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (s.includes("agoda")) return "bg-rose-50 text-rose-700 border-rose-200";
    if (s.includes("airbnb")) return "bg-pink-50 text-pink-700 border-pink-200";
    if (s.includes("tiket")) return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getJumlahMalam = (inDate: string, outDate: string) => {
    if (!inDate || !outDate) return "-";
    const diff = new Date(outDate).getTime() - new Date(inDate).getTime();
    const days = diff / (1000 * 3600 * 24);
    return days > 0 ? `${Math.ceil(days)} Malam` : "-";
  };

  const handleQuickSettle = async (guest: GuestReservation) => {
    if (!guest.id) return;
    const confirmSettle = window.confirm(
      `Konfirmasi pelunasan untuk ${guest.nama_tamu}?\nStatus pembayaran akan diubah menjadi "Lunas".`
    );
    if (!confirmSettle) return;

    try {
      await updateDoc(doc(db, "reservasi", guest.id), {
        status_bayar: "Lunas",
        nominal_dp: guest.total_tagihan,
        sisa_tagihan: 0,
        updated_at: new Date().toISOString(),
      });
      alert(`✅ Pembayaran tamu ${guest.nama_tamu} berhasil dilunasi.`);
    } catch (err) {
      console.error("Gagal melunasi:", err);
      alert("❌ Gagal memperbarui status pembayaran.");
    }
  };

  const filteredGuests = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return guestList.filter((guest) => {
      // 1. Filter Search
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        guest.nama_tamu?.toLowerCase().includes(q) ||
        guest.no_hp?.toLowerCase().includes(q) ||
        guest.id_kamar?.toLowerCase().includes(q) ||
        guest.sumber_booking?.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // 2. Filter Tab
      const checkIn = new Date(guest.tgl_checkin);
      checkIn.setHours(0, 0, 0, 0);
      const checkOut = new Date(guest.tgl_checkout);
      checkOut.setHours(0, 0, 0, 0);

      if (filterTab === "inhouse") {
        return today >= checkIn && today < checkOut;
      }
      if (filterTab === "unpaid") {
        return guest.status_bayar !== "Lunas";
      }
      if (filterTab === "upcoming") {
        return checkIn > today;
      }

      return true;
    });
  }, [guestList, searchQuery, filterTab]);

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 shadow-sm">
        <div className="flex items-center justify-center py-12">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">
            Memuat data tamu...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-900 shadow-sm">
      {/* HEADER TABEL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Daftar Tamu Aktif & DP
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
              {guestList.length} Tamu
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Kelola tamu yang sedang menginap, menunggu pelunasan, atau akan segera tiba.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* SEARCH INPUT */}
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Cari nama, kamar, no HP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 text-gray-800 placeholder-gray-400 focus:bg-white focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <Link
            href="/reservasi"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-sm active:scale-95"
          >
            <span>+</span> Reservasi Baru
          </Link>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 py-3 border-b border-gray-100 dark:border-gray-800 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilterTab("all")}
          className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            filterTab === "all"
              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
        >
          Semua ({guestList.length})
        </button>
        <button
          onClick={() => setFilterTab("inhouse")}
          className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            filterTab === "inhouse"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
        >
          Sedang Menginap
        </button>
        <button
          onClick={() => setFilterTab("unpaid")}
          className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            filterTab === "unpaid"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
        >
          Menunggu Pelunasan
        </button>
        <button
          onClick={() => setFilterTab("upcoming")}
          className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            filterTab === "upcoming"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
        >
          Check-in Mendatang
        </button>
      </div>

      {filteredGuests.length === 0 ? (
        <div className="py-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Tidak ada data tamu yang cocok
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Coba ubah kata kunci pencarian atau tab filter di atas.
          </p>
        </div>
      ) : (
        <>
          {/* MOBILE CARDS VIEW (Khusus Layar HP) */}
          <div className="space-y-3 block sm:hidden mt-3">
            {filteredGuests.map((guest) => {
              const waNumber = guest.no_hp ? guest.no_hp.replace(/[^0-9]/g, "").replace(/^0/, "62") : "";
              return (
                <div
                  key={guest.id}
                  className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-extrabold text-sm flex items-center justify-center flex-shrink-0">
                        {guest.nama_tamu?.charAt(0).toUpperCase() || "T"}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                          {guest.nama_tamu}
                        </h4>
                        <p className="text-xs text-gray-500 font-medium">
                          {guest.jumlah_tamu ? `${guest.jumlah_tamu} Tamu` : "1 Tamu"} • {guest.sumber_booking || "Langsung"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusColor(
                        guest.status_bayar
                      )}`}
                    >
                      {guest.status_bayar}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                    <div>
                      <span className="text-[10px] text-gray-400 font-semibold uppercase block">Kamar</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200 truncate block">
                        {guest.id_kamar}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-semibold uppercase block">Jadwal</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300 block">
                        {formatDate(guest.tgl_checkin)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 font-semibold uppercase block">Tagihan</span>
                      <span className="font-bold text-gray-900 dark:text-white block">
                        {formatRupiah(guest.total_tagihan)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {guest.status_bayar !== "Lunas" && (
                      <button
                        type="button"
                        onClick={() => handleQuickSettle(guest)}
                        className="py-1.5 px-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold flex items-center gap-1"
                      >
                        <span>⚡</span>
                        <span>Lunaskan</span>
                      </button>
                    )}
                    {waNumber && (
                      <a
                        href={`https://wa.me/${waNumber}?text=Halo%20${encodeURIComponent(guest.nama_tamu)},%20kami%20dari%20Homestay%20ARUM...`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                        </svg>
                        Hubungi WA
                      </a>
                    )}
                    <Link
                      href={guest.id ? `/reservasi/${guest.id}` : "/reservasi"}
                      className="py-1.5 px-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold"
                    >
                      Detail
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="max-w-full overflow-x-auto hidden sm:block mt-3">
            <Table>
              <TableHeader className="border-gray-100 dark:border-gray-800 border-y bg-gray-50/50 dark:bg-gray-800/30">
                <TableRow>
                  <TableCell isHeader className="py-3.5 font-bold text-gray-600 text-start text-xs uppercase tracking-wider dark:text-gray-300">
                    Tamu & Kontak
                  </TableCell>
                  <TableCell isHeader className="py-3.5 font-bold text-gray-600 text-start text-xs uppercase tracking-wider dark:text-gray-300">
                    Kamar & Saluran
                  </TableCell>
                  <TableCell isHeader className="py-3.5 font-bold text-gray-600 text-start text-xs uppercase tracking-wider dark:text-gray-300">
                    Check-in / Check-out
                  </TableCell>
                  <TableCell isHeader className="py-3.5 font-bold text-gray-600 text-start text-xs uppercase tracking-wider dark:text-gray-300">
                    Durasi
                  </TableCell>
                  <TableCell isHeader className="py-3.5 font-bold text-gray-600 text-center text-xs uppercase tracking-wider dark:text-gray-300">
                    Status Reservasi
                  </TableCell>
                  <TableCell isHeader className="py-3.5 font-bold text-gray-600 text-center text-xs uppercase tracking-wider dark:text-gray-300">
                    Pembayaran
                  </TableCell>
                  <TableCell isHeader className="py-3.5 font-bold text-gray-600 text-end text-xs uppercase tracking-wider dark:text-gray-300">
                    Aksi
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredGuests.map((guest) => {
                  const waNumber = guest.no_hp ? guest.no_hp.replace(/[^0-9]/g, "").replace(/^0/, "62") : "";
                  return (
                    <TableRow
                      key={guest.id}
                      className="border-gray-100 dark:border-gray-800 border-b hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <TableCell className="py-3 text-start">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {guest.nama_tamu?.charAt(0).toUpperCase() || "T"}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white block text-sm">
                              {guest.nama_tamu}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>{guest.no_hp || "-"}</span>
                              {guest.jumlah_tamu && (
                                <>
                                  <span>•</span>
                                  <span>{guest.jumlah_tamu} Tamu</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 text-start">
                        <div>
                          <span className="text-xs font-bold text-gray-900 dark:text-white block">
                            {guest.id_kamar}
                          </span>
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-0.5 ${getOtaColor(guest.sumber_booking)}`}>
                            {guest.sumber_booking || "Langsung"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 text-start">
                        <div className="text-xs">
                          <div className="text-gray-900 dark:text-white font-medium">
                            <span className="text-gray-400 text-[10px] block">In:</span>
                            {formatDate(guest.tgl_checkin)}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400 mt-1">
                            <span className="text-gray-400 text-[10px] block">Out:</span>
                            {formatDate(guest.tgl_checkout)}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 text-start">
                        <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                          {getJumlahMalam(guest.tgl_checkin, guest.tgl_checkout)}
                        </span>
                      </TableCell>

                      <TableCell className="py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 py-1 px-2.5 rounded-lg text-xs font-bold border ${
                            getStatusReservasiLabel(guest.status_reservasi).color
                          }`}
                        >
                          {getStatusReservasiLabel(guest.status_reservasi).label}
                        </span>
                      </TableCell>

                      <TableCell className="py-3 text-center">
                        <div>
                          <span
                            className={`inline-flex items-center gap-1 py-0.5 px-2 rounded text-xs font-bold border ${getStatusColor(
                              guest.status_bayar
                            )}`}
                          >
                            {guest.status_bayar}
                          </span>
                          <span className="text-xs font-bold text-gray-900 dark:text-white block mt-1">
                            {formatRupiah(guest.total_tagihan)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          {guest.status_bayar !== "Lunas" && (
                            <button
                              type="button"
                              onClick={() => handleQuickSettle(guest)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs border border-emerald-200 transition flex items-center gap-1"
                              title="Pelunasan Cepat 1-Klik"
                            >
                              <span>⚡</span>
                              <span>Lunaskan</span>
                            </button>
                          )}

                          {waNumber && (
                            <a
                              href={`https://wa.me/${waNumber}?text=Halo%20${encodeURIComponent(guest.nama_tamu)},%20kami%20dari%20Homestay%20ARUM...`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-950/40 dark:text-emerald-400 transition-all border border-emerald-200 dark:border-emerald-800"
                              title="Chat WhatsApp"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                              </svg>
                            </a>
                          )}

                          <Link
                            href={guest.id ? `/reservasi/${guest.id}` : "/reservasi"}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 text-xs font-semibold transition-all"
                          >
                            Detail
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
