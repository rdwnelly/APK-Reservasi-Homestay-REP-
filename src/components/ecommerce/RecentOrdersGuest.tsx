"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { getStatusReservasiLabel, formatDate } from "@/utils/reservationUtils";
import { useAutoArchiveReservations } from "@/hooks/useAutoArchive";

interface GuestReservation {
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
}

export default function RecentOrdersGuest() {
  const [guestList, setGuestList] = useState<GuestReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Gunakan custom hook untuk auto-archive
  useAutoArchiveReservations();

  // Ambil data tamu dengan status "Aktif" atau "DP" dari Firebase
  useEffect(() => {
    const q = query(
      collection(db, "reservasi"),
      where("status_reservasi", "in", ["Aktif", "DP"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as GuestReservation));

      // Urutkan berdasarkan tanggal check-in
      data.sort(
        (a, b) =>
          new Date(a.tgl_checkin).getTime() - new Date(b.tgl_checkin).getTime()
      );

      setGuestList(data);
      setIsLoading(false);
    }, (error) => {
      console.warn("Firestore onSnapshot error:", error.message);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getStatusColor = (status: string) => {
    if (status === "Lunas")
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (status === "DP" || status === "DP/Uang Muka")
      return "bg-amber-100 text-amber-800 border-amber-200";
    if (status === "Batal")
      return "bg-rose-100 text-rose-800 border-rose-200";
    return "bg-rose-100 text-rose-800 border-rose-200"; // Belum Bayar
  };

  const getJumlahMalam = (inDate: string, outDate: string) => {
    if (!inDate || !outDate) return "-";
    const diff = new Date(outDate).getTime() - new Date(inDate).getTime();
    const days = diff / (1000 * 3600 * 24);
    return days > 0 ? `${Math.ceil(days)} Malam` : "-";
  };

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-boxdark sm:px-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Memuat data tamu...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-boxdark sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            🏨 Tamu Aktif & DP
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tamu yang sedang menginap atau akan check-in ({guestList.length}{" "}
            tamu)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/reservasi"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            Kelola Reservasi →
          </Link>
        </div>
      </div>

      {guestList.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            ✨ Tidak ada tamu aktif saat ini
          </p>
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto">
          <Table>
            {/* Table Header */}
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Nama Tamu
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  No. HP
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Kamar
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Check-in
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Check-out
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Durasi
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400"
                >
                  Bayar
                </TableCell>
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody>
              {guestList.map((guest) => (
                <TableRow
                  key={guest.id}
                  className="border-gray-100 dark:border-gray-800 border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <TableCell className="py-3 text-start">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {guest.nama_tamu}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {guest.jumlah_tamu ? `${guest.jumlah_tamu} orang` : "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-start">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {guest.no_hp}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-start">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {guest.id_kamar}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-start">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(guest.tgl_checkin)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-start">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(guest.tgl_checkout)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-start">
                    <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                      {getJumlahMalam(guest.tgl_checkin, guest.tgl_checkout)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    <span className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium border ${getStatusReservasiLabel(guest.status_reservasi).color}`}>
                      {getStatusReservasiLabel(guest.status_reservasi).label}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    <span className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium border ${getStatusColor(guest.status_bayar)}`}>
                      {guest.status_bayar}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
