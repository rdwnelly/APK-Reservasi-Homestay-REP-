"use client";


import dynamic from "next/dynamic";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { fetchIndonesianHolidays } from "@/utils/holidays";
import { useEffect, useState } from "react";

const Calendar = dynamic(() => import("@/components/calendar/Calendar"), { ssr: false });

interface ReservationData {
  id?: string;
  nama_tamu: string;
  id_kamar: string;
  tgl_checkin: string;
  tgl_checkout: string;
}

export default function KalenderReservasi() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch reservations from Firestore
        const q = query(collection(db, "reservasi"));
        unsub = onSnapshot(q, async (snapshot) => {
          const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ReservationData));
          // Map reservations to calendar events
          const reservationEvents = data.map((r, idx) => ({
            id: r.id || `reservasi-${idx}`,
            title: `${r.nama_tamu} (${r.id_kamar})`,
            start: r.tgl_checkin,
            end: r.tgl_checkout,
            allDay: true,
            backgroundColor: "#2563eb", // blue
            borderColor: "#2563eb",
            textColor: "#fff",
            extendedProps: { type: "reservation", kamar: r.id_kamar },
          }));

          // Fetch holidays for the current year
          let holidays: { date: string; localName: string }[] = [];
          try {
            holidays = await fetchIndonesianHolidays(new Date().getFullYear());
          } catch (e) {
            // fallback: no holidays
            holidays = [];
          }
          const holidayEvents = holidays.map((h, idx) => ({
            id: `holiday-${idx}`,
            title: h.localName,
            start: h.date,
            allDay: true,
            backgroundColor: "#f87171", // red
            borderColor: "#f87171",
            textColor: "#fff",
            extendedProps: { type: "holiday" },
          }));

          setEvents([...reservationEvents, ...holidayEvents]);
          setLoading(false);
        }, (error) => {
          console.warn("Firestore onSnapshot error:", error.message);
          setError("Gagal memuat data kalender.");
          setLoading(false);
        });
      } catch (err: any) {
        setError("Gagal memuat data kalender");
        setLoading(false);
      }
    };
    fetchData();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out space-y-4">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📅 Kalender Reservasi Interaktif
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Jadwal penginapan tamu dan hari libur nasional secara visual.
          </p>
        </div>

        {/* Legend Keterangan Warna */}
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-800 p-2.5 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block shadow-sm"></span>
            <span className="text-gray-700 dark:text-gray-300">Reservasi Tamu</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-400 inline-block shadow-sm"></span>
            <span className="text-gray-700 dark:text-gray-300">Libur Nasional</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-boxdark">
          <p className="text-sm font-bold text-blue-600 animate-pulse">📅 Memuat kalender reservasi...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-xs font-bold text-red-600">{error}</div>
      ) : (
        <Calendar events={events} />
      )}
    </div>
  );
}
