"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  collection,
  onSnapshot,
  query,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fetchIndonesianHolidays, HolidayItem } from "@/utils/holidays";
import {
  checkAndUpdateReservationStatus,
  formatDate,
} from "@/utils/reservationUtils";
import { CalendarReservation, CalendarHoliday } from "@/components/calendar/Calendar";

const Calendar = dynamic(() => import("@/components/calendar/Calendar"), {
  ssr: false,
  loading: () => (
    <div className="rounded-3xl border border-gray-100 bg-white p-16 text-center dark:border-gray-800 dark:bg-gray-900 shadow-sm flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
        Memuat kalender interaktif Homestay ARUM...
      </span>
    </div>
  ),
});

const ROOM_OPTIONS = [
  "Double Room with AC",
  "Double Room with Fan",
  "Single Room with Fan",
];

const OTA_OPTIONS = [
  "Langsung",
  "Traveloka",
  "Booking.com",
  "Tiket.com",
  "Agoda",
  "Airbnb",
];

export default function KalenderReservasiPage() {
  const [reservations, setReservations] = useState<CalendarReservation[]>([]);
  const [holidays, setHolidays] = useState<CalendarHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Quick Add / Edit from Calendar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nama_tamu: "",
    jumlah_tamu: "",
    no_hp: "",
    sumber_booking: "Langsung",
    id_kamar: "Double Room with AC",
    tgl_checkin: "",
    tgl_checkout: "",
    jam_kedatangan: "",
    kamar_siap: false,
    status_bayar: "Belum Bayar",
    total_tagihan: "",
    status_kebersihan: "siap",
    status_reservasi: "Aktif",
    catatan: "",
  });

  // 1. Ambil data Reservasi & Hari Libur Nasional
  useEffect(() => {
    let isMounted = true;
    checkAndUpdateReservationStatus();

    const loadHolidays = async () => {
      try {
        const currentYear = new Date().getFullYear();
        const data = await fetchIndonesianHolidays(currentYear);
        if (isMounted) {
          setHolidays(data);
        }
      } catch (e) {
        console.warn("Failed to load holidays:", e);
      }
    };

    loadHolidays();

    const q = query(collection(db, "reservasi"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!isMounted) return;
        const resList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as CalendarReservation[];

        setReservations(resList);
        setLoading(false);
      },
      (err) => {
        if (!isMounted) return;
        console.warn("Firestore error:", err);
        setError("Gagal memuat data reservasi.");
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      try {
        unsubscribe();
      } catch (e) {}
    };
  }, []);

  // 2. Metrik Ringkasan Kalender
  const calendarStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let inHouseCount = 0;
    let upcomingCount = 0;

    reservations.forEach((r) => {
      if (r.status_reservasi === "Batal") return;
      const checkIn = new Date(r.tgl_checkin);
      checkIn.setHours(0, 0, 0, 0);
      const checkOut = new Date(r.tgl_checkout);
      checkOut.setHours(0, 0, 0, 0);

      if (today >= checkIn && today < checkOut) {
        inHouseCount += 1;
      }
      if (checkIn >= today) {
        upcomingCount += 1;
      }
    });

    return {
      total: reservations.filter((r) => r.status_reservasi !== "Batal").length,
      inHouseCount,
      upcomingCount,
      holidayCount: holidays.length,
    };
  }, [reservations, holidays]);

  // Handle Klik Tanggal Kosong / Drag Rentang Tanggal
  const handleOpenAddWithDates = (startDate: string, endDate: string) => {
    setEditingId(null);

    // Jika user hanya klik 1 hari, buat endDate minimal 1 hari berikutnya
    let checkout = endDate;
    if (startDate === endDate) {
      const nextDay = new Date(startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      checkout = nextDay.toISOString().slice(0, 10);
    }

    setFormData({
      nama_tamu: "",
      jumlah_tamu: "1",
      no_hp: "",
      sumber_booking: "Langsung",
      id_kamar: "Double Room with AC",
      tgl_checkin: startDate,
      tgl_checkout: checkout,
      jam_kedatangan: "14:00",
      kamar_siap: false,
      status_bayar: "Belum Bayar",
      total_tagihan: "",
      status_kebersihan: "siap",
      status_reservasi: "Aktif",
      catatan: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (res: CalendarReservation) => {
    setEditingId(res.id);
    setFormData({
      nama_tamu: res.nama_tamu || "",
      jumlah_tamu: String(res.catatan || "1"),
      no_hp: res.no_hp || "",
      sumber_booking: res.sumber_booking || "Langsung",
      id_kamar: res.id_kamar || "Double Room with AC",
      tgl_checkin: res.tgl_checkin || "",
      tgl_checkout: res.tgl_checkout || "",
      jam_kedatangan: res.jam_kedatangan || "",
      kamar_siap: false,
      status_bayar: res.status_bayar || "Belum Bayar",
      total_tagihan: res.total_tagihan || "",
      status_kebersihan: res.status_kebersihan || "siap",
      status_reservasi: res.status_reservasi || "Aktif",
      catatan: res.catatan || "",
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === "checkbox" ? target.checked : target.value;
    setFormData({ ...formData, [target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newIn = new Date(formData.tgl_checkin);
      const newOut = new Date(formData.tgl_checkout);

      if (isNaN(newIn.getTime()) || isNaN(newOut.getTime())) {
        alert("⚠️ Tanggal check-in atau check-out tidak valid!");
        setIsSubmitting(false);
        return;
      }

      if (newOut <= newIn) {
        alert("⚠️ Tanggal check-out harus setelah tanggal check-in!");
        setIsSubmitting(false);
        return;
      }

      // Validasi Overlap Double Booking
      const qKamar = query(
        collection(db, "reservasi"),
        where("id_kamar", "==", formData.id_kamar)
      );
      const querySnapshot = await getDocs(qKamar);
      let isOverlap = false;
      let conflict: CalendarReservation | null = null;

      querySnapshot.forEach((docSnap) => {
        if (docSnap.id === editingId) return;
        const data = docSnap.data() as CalendarReservation;
        if (data.status_reservasi === "Batal" || data.status_reservasi === "Selesai") return;

        const oldIn = new Date(data.tgl_checkin);
        const oldOut = new Date(data.tgl_checkout);

        if (newIn < oldOut && newOut > oldIn) {
          isOverlap = true;
          conflict = data;
        }
      });

      if (isOverlap && conflict) {
        const c = conflict as CalendarReservation;
        alert(
          `🚫 JADWAL BENTROK!\n\nKamar "${formData.id_kamar}" sudah dipesan oleh ${c.nama_tamu} (${formatDate(c.tgl_checkin)} - ${formatDate(c.tgl_checkout)}).\nSilakan pilih kamar atau tanggal lain.`
        );
        setIsSubmitting(false);
        return;
      }

      if (editingId) {
        await updateDoc(doc(db, "reservasi", editingId), {
          ...formData,
          updated_at: new Date().toISOString(),
        } as any);
        alert("✅ Reservasi berhasil diperbarui.");
      } else {
        await addDoc(collection(db, "reservasi"), {
          ...formData,
          updated_at: new Date().toISOString(),
        });
        alert("✅ Reservasi baru berhasil dijadwalkan di kalender.");
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error("Gagal simpan reservasi kalender:", err);
      alert("❌ Terjadi kesalahan sistem. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out space-y-6">
      {/* 1. HEADER HALAMAN */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">
              Kalender Reservasi Interaktif
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Visualisasi jadwal okupansi kamar homestay dan hari libur nasional Indonesia.
          </p>
        </div>

        <button
          onClick={() => {
            const todayStr = new Date().toISOString().slice(0, 10);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            handleOpenAddWithDates(todayStr, tomorrow.toISOString().slice(0, 10));
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm shadow-primary/30 hover:bg-primary/90 transition-all active:scale-95 self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>+ Reservasi Cepat</span>
        </button>
      </div>

      {/* 2. STATS KPI BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
            Terjadwal di Kalender
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mt-1 block">
            {calendarStats.total} <span className="text-xs font-normal text-gray-400">Pemesanan</span>
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3.5 sm:p-4 shadow-sm dark:border-emerald-950/30 dark:bg-emerald-950/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Kamar Terisi Hari Ini
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {calendarStats.inHouseCount} / 3 <span className="text-xs font-normal text-emerald-700/60">Kamar</span>
          </span>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3.5 sm:p-4 shadow-sm dark:border-blue-950/30 dark:bg-blue-950/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
            Kedatangan Mendatang
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 block">
            {calendarStats.upcomingCount} <span className="text-xs font-normal text-blue-700/60">Tamu</span>
          </span>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-3.5 sm:p-4 shadow-sm dark:border-rose-950/30 dark:bg-rose-950/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
            Hari Libur Nasional
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 block">
            {calendarStats.holidayCount} <span className="text-xs font-normal text-rose-700/60">Hari (2026)</span>
          </span>
        </div>
      </div>

      {/* 3. KALENDER INTERAKTIF */}
      {loading ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-16 text-center dark:border-gray-800 dark:bg-gray-900 shadow-sm flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
            Menyiapkan jadwal okupansi kamar & hari libur...
          </span>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm font-bold text-red-600">
          {error}
        </div>
      ) : (
        <Calendar
          reservations={reservations}
          holidays={holidays}
          onAddReservation={handleOpenAddWithDates}
          onEditReservation={handleOpenEdit}
        />
      )}

      {/* 4. MODAL RESERVASI CEPAT DARI KALENDER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 transition-all">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl dark:bg-gray-900 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 py-4 px-6 flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                  {editingId ? "Ubah Reservasi Kalender" : "Pesan Kamar dari Kalender"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Jadwalkan tamu pada tanggal yang Anda pilih di kalender.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-rose-100 hover:text-rose-600 transition font-bold"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto p-5 sm:p-6 flex-1 custom-scrollbar">
              <form id="quick-calendar-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="mb-1 block font-bold text-gray-700 dark:text-gray-300">
                    Nama Tamu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nama_tamu"
                    required
                    value={formData.nama_tamu}
                    onChange={handleInputChange}
                    placeholder="Nama lengkap tamu"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-bold text-gray-700 dark:text-gray-300">
                      No. WhatsApp
                    </label>
                    <input
                      type="text"
                      name="no_hp"
                      value={formData.no_hp}
                      onChange={handleInputChange}
                      placeholder="081234..."
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-gray-700 dark:text-gray-300">
                      Pilihan Kamar <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="id_kamar"
                      value={formData.id_kamar}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      {ROOM_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                  <div>
                    <label className="mb-1 block font-bold text-gray-700 dark:text-gray-300">
                      Tanggal Check-in <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="tgl_checkin"
                      required
                      value={formData.tgl_checkin}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-gray-700 dark:text-gray-300">
                      Tanggal Check-out <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="tgl_checkout"
                      required
                      value={formData.tgl_checkout}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block font-bold text-gray-700 dark:text-gray-300">
                      Saluran OTA
                    </label>
                    <select
                      name="sumber_booking"
                      value={formData.sumber_booking}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      {OTA_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-gray-700 dark:text-gray-300">
                      Total Tagihan (Rp)
                    </label>
                    <input
                      type="number"
                      name="total_tagihan"
                      value={formData.total_tagihan}
                      onChange={handleInputChange}
                      placeholder="1200000"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-gray-700 dark:text-gray-300">
                      Status Bayar
                    </label>
                    <select
                      name="status_bayar"
                      value={formData.status_bayar}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="Belum Bayar">Belum Bayar</option>
                      <option value="DP">DP</option>
                      <option value="Lunas">Lunas</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 py-3.5 px-6 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl px-5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                form="quick-calendar-form"
                disabled={isSubmitting}
                className="rounded-xl px-6 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 disabled:bg-primary/50 shadow-sm shadow-primary/30 transition flex items-center justify-center min-w-[140px]"
              >
                {isSubmitting ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Reservasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
