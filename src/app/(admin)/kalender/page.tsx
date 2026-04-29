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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Kalender Reservasi Interaktif</h1>
      {loading ? (
        <div>Memuat kalender...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <Calendar events={events} />
      )}
      <div className="mt-4 text-sm text-gray-600">
        <div><span className="inline-block w-4 h-4 bg-blue-600 mr-2 align-middle"></span>Reservasi</div>
        <div><span className="inline-block w-4 h-4 bg-red-400 mr-2 align-middle"></span>Hari Libur Nasional</div>
      </div>
    </div>
  );
}
