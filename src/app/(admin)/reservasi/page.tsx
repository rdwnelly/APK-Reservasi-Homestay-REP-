"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  getDocs,
  where,
  updateDoc,
} from "firebase/firestore";
import Link from "next/link";
import {
  checkAndUpdateReservationStatus,
  getStatusReservasiLabel,
  getStatusBayarBadge,
  formatDate,
  calculateNights,
  formatRupiah,
  parseNominal,
  calculatePaymentStatus,
  calculateSisaTagihan,
  isOtaChannel,
  ReservationData,
} from "@/utils/reservationUtils";

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

const PAYMENT_METHODS = [
  "Transfer Bank",
  "QRIS",
  "Tunai (Cash)",
  "Pembayaran oleh OTA",
  "OTA Pay at Hotel",
  "Kartu Debit/Kredit",
];

export default function ReservasiPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // State data reservasi
  const [reservasiList, setReservasiList] = useState<ReservationData[]>([]);
  const [reminderMessages, setReminderMessages] = useState<string[]>([]);

  // State filter & pencarian
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<
    "all" | "inhouse" | "upcoming" | "today_tomorrow" | "ota" | "unpaid" | "paid"
  >("all");
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"upcoming_asc" | "date_desc">("upcoming_asc");

  // Form State
  const [formData, setFormData] = useState<ReservationData>({
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
    nominal_dp: "",
    sisa_tagihan: "",
    metode_bayar: "Transfer Bank",
    status_kebersihan: "siap",
    status_reservasi: "Aktif",
    catatan: "",
  });

  const getKebersihanLabel = (status?: string) => {
    if (status === "siap")
      return {
        label: "🟢 Siap Huni",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
      };
    if (status === "dipakai")
      return {
        label: "🔴 Sedang Dipakai",
        color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300",
      };
    if (status === "perlu_bersih")
      return {
        label: "🟡 Perlu Bersih",
        color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
      };
    return { label: "-", color: "bg-gray-100 text-gray-800 border-gray-200" };
  };

  const getOtaBadge = (channel: string) => {
    const ch = (channel || "").toLowerCase();
    if (ch.includes("traveloka"))
      return { label: "Traveloka", color: "bg-sky-50 text-sky-700 border-sky-200" };
    if (ch.includes("booking"))
      return { label: "Booking.com", color: "bg-blue-50 text-blue-700 border-blue-200" };
    if (ch.includes("agoda"))
      return { label: "Agoda", color: "bg-rose-50 text-rose-700 border-rose-200" };
    if (ch.includes("airbnb"))
      return { label: "Airbnb", color: "bg-pink-50 text-pink-700 border-pink-200" };
    if (ch.includes("tiket"))
      return { label: "Tiket.com", color: "bg-yellow-50 text-yellow-700 border-yellow-200" };
    return { label: "Langsung (WA)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  };

  const getJumlahMalam = (inDate: string, outDate: string) => {
    if (!inDate || !outDate) return "-";
    const diff = new Date(outDate).getTime() - new Date(inDate).getTime();
    const days = diff / (1000 * 3600 * 24);
    return days > 0 ? `${Math.ceil(days)} Malam` : "-";
  };

  const getWaLink = (item: ReservationData) => {
    const phone = item.no_hp
      ? item.no_hp.replace(/[^0-9]/g, "").replace(/^0/, "62")
      : "";
    if (!phone) return "#";
    const isOta = isOtaChannel(item.sumber_booking);
    const sisa = calculateSisaTagihan(item.total_tagihan, item.nominal_dp || (item.status_bayar === "Lunas" ? item.total_tagihan : 0));
    const statusNote = isOta
      ? ` (Pembayaran difasilitasi oleh ${item.sumber_booking})`
      : sisa > 0
      ? ` (Sisa tagihan: ${formatRupiah(sisa)})`
      : ` (Status: Lunas)`;

    const message = `Halo ${item.nama_tamu}, kami dari Homestay ARUM ingin mengonfirmasi reservasi Anda di kamar ${item.id_kamar} untuk tanggal ${formatDate(item.tgl_checkin)} s/d ${formatDate(item.tgl_checkout)}${statusNote}. Apakah ada yang dapat kami bantu?`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const handleEditClick = (item: ReservationData) => {
    setEditingId(item.id || null);
    setFormData({
      ...item,
      nominal_dp: item.nominal_dp || (item.status_bayar === "Lunas" ? item.total_tagihan : ""),
      sisa_tagihan: item.sisa_tagihan || (item.status_bayar === "Lunas" ? "0" : item.total_tagihan),
      metode_bayar: item.metode_bayar || (isOtaChannel(item.sumber_booking) ? `Pembayaran oleh ${item.sumber_booking}` : "Transfer Bank"),
      status_kebersihan: item.status_kebersihan || "siap",
    });
    setIsModalOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingId(null);
    setFormData({
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
      nominal_dp: "",
      sisa_tagihan: "",
      metode_bayar: "Transfer Bank",
      status_kebersihan: "siap",
      status_reservasi: "Aktif",
      catatan: "",
    });
    setIsModalOpen(true);
  };

  // 1-KLIK PELUNASAN CEPAT (QUICK SETTLE)
  const handleQuickSettle = async (item: ReservationData) => {
    if (!item.id) return;
    const total = parseNominal(item.total_tagihan);
    const confirmSettle = window.confirm(
      `Konfirmasi pelunasan untuk ${item.nama_tamu}?\nTotal Tagihan: ${formatRupiah(total)}\n\nStatus akan diubah menjadi "Lunas" dan sisa tagihan menjadi Rp 0.`
    );
    if (!confirmSettle) return;

    try {
      await updateDoc(doc(db, "reservasi", item.id), {
        status_bayar: "Lunas",
        nominal_dp: total,
        sisa_tagihan: 0,
        updated_at: new Date().toISOString(),
      });
      alert(`✅ Pembayaran tamu ${item.nama_tamu} berhasil dilunasi.`);
    } catch (err) {
      console.error("Gagal melunasi reservasi:", err);
      alert("❌ Gagal memperbarui status pembayaran.");
    }
  };

  // BATALKAN RESERVASI (Pemasukan otomatis dikurangi dari laporan & dashboard)
  const handleCancelClick = async (item: ReservationData) => {
    if (!item.id) return;
    const confirmCancel = window.confirm(
      `⚠️ KONFIRMASI PEMBATALAN RESERVASI:\n\nApakah Anda yakin ingin membatalkan reservasi tamu "${item.nama_tamu}" (${item.id_kamar})?\n\n• Uang pemasukan dan piutang dari reservasi ini otomatis DIKURANGI / DIHAPUS dari laporan & dashboard.\n• Kamar akan berstatus kosong kembali.`
    );
    if (!confirmCancel) return;

    try {
      await updateDoc(doc(db, "reservasi", item.id), {
        status_reservasi: "Batal",
        status_bayar: "Batal",
        nominal_dp: 0,
        sisa_tagihan: 0,
        updated_at: new Date().toISOString(),
      });
      alert(`✅ Reservasi tamu ${item.nama_tamu} telah dibatalkan. Pemasukan otomatis berkurang.`);
    } catch (err) {
      console.error("Gagal membatalkan reservasi:", err);
      alert("❌ Gagal membatalkan reservasi.");
    }
  };

  const handleDeleteClick = async (item: ReservationData) => {
    if (!item.id) return;
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus reservasi tamu "${item.nama_tamu}" (${item.id_kamar})?`
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "reservasi", item.id));
      alert("✅ Reservasi berhasil dihapus.");
    } catch (err) {
      console.error("Gagal menghapus data:", err);
      alert("❌ Gagal menghapus reservasi.");
    }
  };

  // 1. Notifikasi Reminder Check-In Besok
  const sendCheckInReminders = (items: ReservationData[]) => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    const now = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const notifiedIds = new Set<string>(
      JSON.parse(localStorage.getItem("checkInReminderIds") || "[]") || []
    );
    const newMessages: string[] = [];
    const newNotifiedIds = new Set(notifiedIds);

    items.forEach((item) => {
      if (!item.id || !item.tgl_checkin) return;
      const checkInTime = new Date(item.tgl_checkin).getTime();
      const diff = checkInTime - now;

      if (diff > 0 && diff <= oneDayMs) {
        if (!notifiedIds.has(item.id)) {
          const arrivalText = item.jam_kedatangan ? ` pada jam ${item.jam_kedatangan}` : "";
          const message = `Pengingat: Tamu ${item.nama_tamu} akan check-in besok${arrivalText}.`;
          newMessages.push(message);
          newNotifiedIds.add(item.id);

          try {
            new Notification("Reminder Check-In Besok", {
              body: message,
              icon: "/favicon.ico",
            });
          } catch (error) {
            console.error("Notification error:", error);
          }
        }
      }
    });

    if (newMessages.length > 0) {
      setReminderMessages((prev) => [...prev, ...newMessages]);
      localStorage.setItem(
        "checkInReminderIds",
        JSON.stringify(Array.from(newNotifiedIds))
      );
    }
  };

  // 2. Real-time Firestore Listener
  useEffect(() => {
    checkAndUpdateReservationStatus();

    const q = query(collection(db, "reservasi"));
    let isMounted = true;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!isMounted) return;
        let data = snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as ReservationData)
        );

        data = data.filter(
          (item) =>
            !item.status_reservasi ||
            item.status_reservasi === "Aktif" ||
            item.status_reservasi === "DP"
        );

        setReservasiList(data as ReservationData[]);
        sendCheckInReminders(data as ReservationData[]);
        setIsDataLoading(false);
      },
      (error) => {
        if (!isMounted) return;
        console.warn("Firestore onSnapshot error:", error.message);
        setIsDataLoading(false);
      }
    );

    return () => {
      isMounted = false;
      try {
        unsubscribe();
      } catch (e) {}
    };
  }, []);

  // 3. HANDLER INPUT DENGAN OTOMASI KEBIJAKAN PEMBAYARAN OTA & REGULER
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;

    const updated = { ...formData, [name]: value };

    // Jika user mengubah Sumber Pemesanan (OTA vs Langsung)
    if (name === "sumber_booking") {
      if (value !== "Langsung") {
        updated.status_bayar = "Dibayar via OTA";
        updated.metode_bayar = `Pembayaran oleh ${value}`;
        updated.sisa_tagihan = "0";
      } else {
        const total = parseNominal(formData.total_tagihan);
        const dp = parseNominal(formData.nominal_dp);
        updated.status_bayar = calculatePaymentStatus(total, dp, "Langsung");
        updated.metode_bayar = "Transfer Bank";
      }
    }

    // Otomasi kalkulasi saat total_tagihan atau nominal_dp berubah
    if (name === "total_tagihan" || name === "nominal_dp") {
      const total = parseNominal(name === "total_tagihan" ? value : formData.total_tagihan);
      const dp = parseNominal(name === "nominal_dp" ? value : formData.nominal_dp);

      if (isOtaChannel(formData.sumber_booking)) {
        updated.status_bayar = "Dibayar via OTA";
        updated.sisa_tagihan = "0";
      } else {
        updated.status_bayar = calculatePaymentStatus(total, dp, formData.sumber_booking);
        updated.sisa_tagihan = String(calculateSisaTagihan(total, dp));
      }
    }

    // Jika user manual ubah status_bayar
    if (name === "status_bayar") {
      const total = parseNominal(formData.total_tagihan);
      if (value === "Lunas") {
        updated.nominal_dp = String(total);
        updated.sisa_tagihan = "0";
      } else if (value === "Belum Bayar") {
        updated.nominal_dp = "0";
        updated.sisa_tagihan = String(total);
      } else if (value === "Dibayar via OTA") {
        updated.sisa_tagihan = "0";
      }
    }

    setFormData(updated);
  };

  // 4. Submit Formulir Simpan / Ubah
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newIn = new Date(formData.tgl_checkin);
      const newOut = new Date(formData.tgl_checkout);

      if (isNaN(newIn.getTime()) || isNaN(newOut.getTime())) {
        alert("⚠️ Tanggal check-in atau check-out tidak valid!");
        setIsLoading(false);
        return;
      }

      if (newOut <= newIn) {
        alert("⚠️ Tanggal check-out harus setelah tanggal check-in!");
        setIsLoading(false);
        return;
      }

      // Algoritma Pencegah Double Booking
      const qKamar = query(
        collection(db, "reservasi"),
        where("id_kamar", "==", formData.id_kamar)
      );
      const querySnapshot = await getDocs(qKamar);
      let isOverlap = false;
      let conflictingReservation: ReservationData | null = null;

      querySnapshot.forEach((docSnap) => {
        if (docSnap.id === editingId) return;

        const data = docSnap.data() as ReservationData;
        if (data.status_reservasi === "Batal" || data.status_reservasi === "Selesai") return;

        const oldIn = new Date(data.tgl_checkin);
        const oldOut = new Date(data.tgl_checkout);

        if (newIn < oldOut && newOut > oldIn) {
          isOverlap = true;
          conflictingReservation = data;
        }
      });

      if (isOverlap && conflictingReservation) {
        const conflict = conflictingReservation as ReservationData;
        const conflictInfo = `\n\nDetail Bentrok:\n• Tamu: ${conflict.nama_tamu}\n• Check-in: ${formatDate(
          conflict.tgl_checkin
        )}\n• Check-out: ${formatDate(conflict.tgl_checkout)}`;

        alert(
          `🚫 DOUBLE-BOOKING TERDETEKSI!\n\nKamar "${formData.id_kamar}" sudah dipesan oleh tamu lain pada rentang tanggal tersebut.${conflictInfo}\n\nSilakan pilih kamar atau tanggal lain.`
        );
        setIsLoading(false);
        return;
      }

      // Kalkulasi final sisa & status sebelum simpan
      const total = parseNominal(formData.total_tagihan);
      const dp = parseNominal(formData.nominal_dp);
      const isOta = isOtaChannel(formData.sumber_booking);
      const sisa = isOta ? 0 : calculateSisaTagihan(total, dp);
      const statusBayar = formData.status_bayar || (isOta ? "Dibayar via OTA" : calculatePaymentStatus(total, dp));

      const payload = {
        ...formData,
        status_bayar: statusBayar,
        nominal_dp: isOta ? total : dp,
        sisa_tagihan: sisa,
        metode_bayar: formData.metode_bayar || (isOta ? `Pembayaran oleh ${formData.sumber_booking}` : "Transfer Bank"),
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        await updateDoc(doc(db, "reservasi", editingId), payload as any);
        alert("✅ Reservasi berhasil diperbarui.");
      } else {
        await addDoc(collection(db, "reservasi"), payload);
        alert("✅ Reservasi baru berhasil disimpan tanpa konflik.");
      }

      setIsModalOpen(false);
      setFormData({
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
        nominal_dp: "",
        sisa_tagihan: "",
        metode_bayar: "Transfer Bank",
        status_kebersihan: "siap",
        status_reservasi: "Aktif",
        catatan: "",
      });
    } catch (error) {
      console.error("Error menyimpan data:", error);
      alert("❌ Maaf, terjadi kesalahan pada sistem/jaringan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateKebersihan = async (
    id: string | undefined,
    newStatus: "siap" | "dipakai" | "perlu_bersih"
  ) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, "reservasi", id), {
        status_kebersihan: newStatus,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Gagal update kebersihan:", err);
    }
  };

  // 5. Kalkulasi Metrik Ringkasan (KPI Chips)
  const summaryKpis = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    let inHouse = 0;
    let todayTomorrow = 0;
    let unpaid = 0;
    let otaPending = 0;
    let totalRevenuePaid = 0;
    let totalPendingReceivable = 0;

    reservasiList.forEach((r) => {
      // PENTING: Cegah uang pemasukan terhitung jika reservasi Batal
      const isBatal =
        r.status_reservasi === "Batal" ||
        r.status_bayar === "Batal" ||
        r.status_bayar?.toLowerCase().includes("batal");

      if (isBatal) return;

      const checkIn = new Date(r.tgl_checkin);
      checkIn.setHours(0, 0, 0, 0);
      const checkOut = new Date(r.tgl_checkout);
      checkOut.setHours(0, 0, 0, 0);

      // In House
      if (today >= checkIn && today < checkOut) {
        inHouse += 1;
      }

      // Check-in Today or Tomorrow
      const inStr = r.tgl_checkin?.slice(0, 10);
      if (inStr === todayStr || inStr === tomorrowStr) {
        todayTomorrow += 1;
      }

      const total = parseNominal(r.total_tagihan);
      const dp = parseNominal(r.nominal_dp);
      const isOta = isOtaChannel(r.sumber_booking);

      if (r.status_bayar === "Lunas") {
        totalRevenuePaid += total;
      } else if (isOta || r.status_bayar?.toLowerCase().includes("ota")) {
        otaPending += 1;
        totalPendingReceivable += total;
      } else if (r.status_bayar?.toLowerCase().includes("dp")) {
        const actualDp = dp > 0 ? dp : total * 0.5;
        totalRevenuePaid += actualDp;
        totalPendingReceivable += Math.max(0, total - actualDp);
        unpaid += 1;
      } else {
        totalPendingReceivable += total;
        unpaid += 1;
      }
    });

    return {
      total: reservasiList.length,
      inHouse,
      todayTomorrow,
      unpaid,
      otaPending,
      totalRevenuePaid,
      totalPendingReceivable,
    };
  }, [reservasiList]);

  // 6. FILTERING & SORTING KRONOLOGIS MENDATANG TERDEKAT
  const processedReservations = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const filtered = reservasiList.filter((item) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          item.nama_tamu?.toLowerCase().includes(q) ||
          item.no_hp?.toLowerCase().includes(q) ||
          item.id_kamar?.toLowerCase().includes(q) ||
          item.sumber_booking?.toLowerCase().includes(q) ||
          item.id?.toLowerCase().includes(q) ||
          item.status_bayar?.toLowerCase().includes(q) ||
          item.catatan?.toLowerCase().includes(q);

        if (!match) return false;
      }

      if (selectedRoom !== "all" && item.id_kamar !== selectedRoom) {
        return false;
      }

      if (selectedChannel !== "all" && item.sumber_booking !== selectedChannel) {
        return false;
      }

      const checkIn = new Date(item.tgl_checkin);
      checkIn.setHours(0, 0, 0, 0);
      const checkOut = new Date(item.tgl_checkout);
      checkOut.setHours(0, 0, 0, 0);
      const inStr = item.tgl_checkin?.slice(0, 10);
      const isOta = isOtaChannel(item.sumber_booking);

      if (filterTab === "inhouse") {
        return today >= checkIn && today < checkOut;
      }
      if (filterTab === "upcoming") {
        return checkIn >= today;
      }
      if (filterTab === "today_tomorrow") {
        return inStr === todayStr || inStr === tomorrowStr;
      }
      if (filterTab === "ota") {
        return isOta;
      }
      if (filterTab === "unpaid") {
        return item.status_bayar !== "Lunas" && !isOta;
      }
      if (filterTab === "paid") {
        return item.status_bayar === "Lunas";
      }

      return true;
    });

    filtered.sort((a, b) => {
      const timeA = new Date(a.tgl_checkin).getTime();
      const timeB = new Date(b.tgl_checkin).getTime();
      return sortOrder === "upcoming_asc" ? timeA - timeB : timeB - timeA;
    });

    return filtered;
  }, [reservasiList, searchQuery, filterTab, selectedRoom, selectedChannel, sortOrder]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out space-y-6">
      {/* 1. HEADER HALAMAN & SUMMARY CARDS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">
              Kelola Reservasi Tamu
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Status pemesanan, jadwal menginap, dan monitoring pelunasan pembayaran (Langsung & OTA).
          </p>
        </div>

        <button
          onClick={handleAddNewClick}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm shadow-primary/30 hover:bg-primary/90 transition-all active:scale-95 self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>+ Tambah Reservasi Baru</span>
        </button>
      </div>

      {/* 2. SUMMARY KPI CHIPS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setFilterTab("all")}
          className={`cursor-pointer rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 ${
            filterTab === "all"
              ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs"
              : "border-gray-100 bg-white hover:border-gray-200 dark:border-gray-800 dark:bg-gray-900"
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
            Semua Aktif & DP
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mt-1 block">
            {summaryKpis.total} <span className="text-xs font-normal text-gray-400">Tamu</span>
          </span>
        </div>

        <div
          onClick={() => setFilterTab("inhouse")}
          className={`cursor-pointer rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 ${
            filterTab === "inhouse"
              ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-xs"
              : "border-gray-100 bg-white hover:border-gray-200 dark:border-gray-800 dark:bg-gray-900"
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Sedang Menginap
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {summaryKpis.inHouse} <span className="text-xs font-normal text-gray-400">Kamar</span>
          </span>
        </div>

        <div
          onClick={() => setFilterTab("ota")}
          className={`cursor-pointer rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 ${
            filterTab === "ota"
              ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/20 shadow-xs"
              : "border-gray-100 bg-white hover:border-gray-200 dark:border-gray-800 dark:bg-gray-900"
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
            Pencairan OTA (Jatuh Tempo Check-out)
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 block">
            {summaryKpis.otaPending} <span className="text-xs font-normal text-gray-400">Tamu OTA</span>
          </span>
          <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 mt-0.5 block truncate">
            Cair otomatis saat Check-out
          </span>
        </div>

        <div
          onClick={() => setFilterTab("paid")}
          className={`cursor-pointer rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 ${
            filterTab === "paid"
              ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-xs"
              : "border-gray-100 bg-white hover:border-gray-200 dark:border-gray-800 dark:bg-gray-900"
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Pembayaran Diterima (Lunas)
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block truncate">
            {formatRupiah(summaryKpis.totalRevenuePaid)}
          </span>
          <span className="text-[11px] font-semibold text-gray-400 mt-0.5 block">
            Kas Masuk Terkonfirmasi
          </span>
        </div>
      </div>

      {/* REMINDER BOX */}
      {reminderMessages.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:p-5 text-sm text-amber-900 shadow-sm dark:border-amber-800/30 dark:from-amber-900/20 dark:to-orange-900/10 dark:text-amber-200 flex gap-3.5 items-start">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm mb-1">Pengingat Kedatangan Besok</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-amber-800/80 dark:text-amber-200/70">
              {reminderMessages.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 3. TOOLBAR PENCARIAN & FILTER MULTI-DIMENSI */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filterTab === "all"
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            Semua ({reservasiList.length})
          </button>
          <button
            onClick={() => setFilterTab("upcoming")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filterTab === "upcoming"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            📅 Mendatang Terdekat
          </button>
          <button
            onClick={() => setFilterTab("inhouse")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filterTab === "inhouse"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            🟢 Sedang Menginap
          </button>
          <button
            onClick={() => setFilterTab("today_tomorrow")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filterTab === "today_tomorrow"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            🔔 Check-in Hari Ini & Besok
          </button>
          <button
            onClick={() => setFilterTab("ota")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filterTab === "ota"
                ? "bg-blue-700 text-white shadow-xs"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            🏨 Saluran OTA ({summaryKpis.otaPending})
          </button>
          <button
            onClick={() => setFilterTab("unpaid")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filterTab === "unpaid"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            🟡 Menunggu Pelunasan ({summaryKpis.unpaid})
          </button>
          <button
            onClick={() => setFilterTab("paid")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filterTab === "paid"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            🟢 Lunas
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari tamu, HP, #ID, kamar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:bg-white focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">Semua Tipe Kamar</option>
              {ROOM_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:bg-white focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">Semua Saluran (OTA)</option>
              {OTA_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:bg-white focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="upcoming_asc">Urutkan: Mendatang Terdekat (Asc)</option>
              <option value="date_desc">Urutkan: Tanggal Paling Akhir (Desc)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. TABEL & KARTU DAFTAR RESERVASI */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {/* TAMPILAN MOBILE (KARTU HP) */}
        <div className="space-y-3.5 lg:hidden p-3.5 sm:p-5">
          {isDataLoading ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-8 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <span>Memuat data reservasi dari Cloud...</span>
            </div>
          ) : processedReservations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
              ✨ Tidak ada data reservasi yang sesuai filter / pencarian.
            </div>
          ) : (
            processedReservations.map((item) => {
              const ota = getOtaBadge(item.sumber_booking);
              const waLink = getWaLink(item);
              const isOta = isOtaChannel(item.sumber_booking);
              const badgeBayar = getStatusBayarBadge(item.status_bayar, item.sumber_booking, item.tgl_checkout);
              const total = parseNominal(item.total_tagihan);
              const dp = parseNominal(item.nominal_dp);
              const sisa = isOta ? 0 : calculateSisaTagihan(total, dp > 0 ? dp : (item.status_bayar === "Lunas" ? total : 0));

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold text-sm flex items-center justify-center flex-shrink-0">
                        {item.nama_tamu?.charAt(0).toUpperCase() || "T"}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                          {item.nama_tamu}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">
                          #{item.id?.slice(0, 6).toUpperCase()} • {item.no_hp || "-"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${badgeBayar.badgeClass}`}
                    >
                      {badgeBayar.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-gray-50/80 p-2.5 dark:bg-gray-800/50">
                      <p className="text-[9px] uppercase font-bold text-gray-400">Kamar</p>
                      <p className="mt-0.5 font-bold text-gray-900 dark:text-white truncate">
                        {item.id_kamar}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50/80 p-2.5 dark:bg-gray-800/50">
                      <p className="text-[9px] uppercase font-bold text-gray-400">Sumber (OTA)</p>
                      <p className={`mt-0.5 font-bold inline-block text-[10px] px-2 py-0.5 rounded-full border ${ota.color}`}>
                        {ota.label}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50/80 p-2.5 dark:bg-gray-800/50">
                      <p className="text-[9px] uppercase font-bold text-gray-400">Jadwal Menginap</p>
                      <p className="mt-0.5 font-semibold text-gray-900 dark:text-white text-[11px] truncate">
                        {formatDate(item.tgl_checkin)} – {formatDate(item.tgl_checkout)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50/80 p-2.5 dark:bg-gray-800/50">
                      <p className="text-[9px] uppercase font-bold text-gray-400">Tagihan & Payout</p>
                      <p className="mt-0.5 font-bold text-gray-900 dark:text-white">
                        {formatRupiah(total)}
                      </p>
                      {isOta ? (
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                          🕒 Cair saat Check-out
                        </p>
                      ) : sisa > 0 ? (
                        <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          Sisa: {formatRupiah(sisa)}
                        </p>
                      ) : (
                        <p className="text-[10px] font-bold text-emerald-600">✓ Lunas (Rp 0)</p>
                      )}
                    </div>
                  </div>

                  {/* AKSI BAR DENGAN TOMBOL QUICK SETTLE */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800 gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.no_hp && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1.5 text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                          </svg>
                          <span>WA</span>
                        </a>
                      )}

                      {item.status_bayar !== "Lunas" && (
                        <button
                          type="button"
                          onClick={() => handleQuickSettle(item)}
                          className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1"
                          title="Lunaskan Tagihan Instan"
                        >
                          <span>⚡</span>
                          <span>Lunaskan</span>
                        </button>
                      )}

                      <Link
                        href={`/reservasi/${item.id}`}
                        className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-600 transition hover:bg-blue-100"
                      >
                        Detail
                      </Link>

                      <button
                        type="button"
                        className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-600 transition hover:bg-amber-100"
                        onClick={() => handleEditClick(item)}
                      >
                        Ubah
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className="rounded-lg bg-orange-50 px-2 py-1.5 text-xs font-bold text-orange-600 transition hover:bg-orange-100"
                        onClick={() => handleCancelClick(item)}
                        title="Batalkan Reservasi (Kurangi Pemasukan)"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
                        onClick={() => handleDeleteClick(item)}
                        title="Hapus Reservasi"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* TAMPILAN DESKTOP (TABEL PROFESIONAL STANDAR PMS) */}
        <div className="hidden lg:block w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400 border-collapse">
            <thead className="bg-gray-50/80 text-[11px] uppercase tracking-wider text-gray-600 font-bold dark:bg-gray-800/40 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Tamu & Kontak</th>
                <th className="px-4 py-4 whitespace-nowrap">Kamar & Housekeeping</th>
                <th className="px-4 py-4 whitespace-nowrap">Jadwal Menginap</th>
                <th className="px-4 py-4 whitespace-nowrap text-center">Durasi</th>
                <th className="px-4 py-4 whitespace-nowrap">Rincian Pembayaran & OTA</th>
                <th className="px-4 py-4 whitespace-nowrap text-center">Status</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isDataLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm font-medium text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                      <span>Memuat data reservasi dari Cloud...</span>
                    </div>
                  </td>
                </tr>
              ) : processedReservations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm font-medium text-gray-500">
                    ✨ Tidak ada data reservasi yang sesuai filter / pencarian.
                  </td>
                </tr>
              ) : (
                processedReservations.map((item) => {
                  const ota = getOtaBadge(item.sumber_booking);
                  const waLink = getWaLink(item);
                  const isOta = isOtaChannel(item.sumber_booking);
                  const badgeBayar = getStatusBayarBadge(item.status_bayar, item.sumber_booking, item.tgl_checkout);
                  const total = parseNominal(item.total_tagihan);
                  const dp = parseNominal(item.nominal_dp);
                  const sisa = isOta ? 0 : calculateSisaTagihan(total, dp > 0 ? dp : (item.status_bayar === "Lunas" ? total : 0));

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      {/* KOLOM 1: TAMU & KONTAK */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-extrabold text-sm flex items-center justify-center flex-shrink-0">
                            {item.nama_tamu?.charAt(0).toUpperCase() || "T"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-white text-sm">
                                {item.nama_tamu}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ota.color}`}>
                                {ota.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                              <span>{item.no_hp || "-"}</span>
                              {item.jumlah_tamu && (
                                <>
                                  <span>•</span>
                                  <span>{item.jumlah_tamu} Tamu</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* KOLOM 2: KAMAR & HOUSEKEEPING */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-sm">
                            {item.id_kamar}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <button
                              type="button"
                              title="Set Siap Huni"
                              className={`px-1.5 py-0.5 text-[10px] rounded transition ${
                                item.status_kebersihan === "siap"
                                  ? "bg-emerald-100 text-emerald-800 font-bold"
                                  : "text-gray-400 hover:bg-gray-100"
                              }`}
                              onClick={() => handleUpdateKebersihan(item.id, "siap")}
                            >
                              🟢 Siap
                            </button>
                            <button
                              type="button"
                              title="Set Perlu Dibersihkan"
                              className={`px-1.5 py-0.5 text-[10px] rounded transition ${
                                item.status_kebersihan === "perlu_bersih"
                                  ? "bg-amber-100 text-amber-800 font-bold"
                                  : "text-gray-400 hover:bg-gray-100"
                              }`}
                              onClick={() => handleUpdateKebersihan(item.id, "perlu_bersih")}
                            >
                              🟡 Bersih
                            </button>
                            <button
                              type="button"
                              title="Set Sedang Dipakai"
                              className={`px-1.5 py-0.5 text-[10px] rounded transition ${
                                item.status_kebersihan === "dipakai"
                                  ? "bg-rose-100 text-rose-800 font-bold"
                                  : "text-gray-400 hover:bg-gray-100"
                              }`}
                              onClick={() => handleUpdateKebersihan(item.id, "dipakai")}
                            >
                              🔴 Pakai
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* KOLOM 3: JADWAL MENGINAP */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-xs">
                          <p className="font-bold text-gray-900 dark:text-white">
                            In: {formatDate(item.tgl_checkin)}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                            Out: {formatDate(item.tgl_checkout)}
                          </p>
                          {item.jam_kedatangan && (
                            <p className="text-blue-600 dark:text-blue-400 font-semibold text-[11px] mt-0.5">
                              🕒 ETA: {item.jam_kedatangan}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* KOLOM 4: DURASI */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                          {getJumlahMalam(item.tgl_checkin, item.tgl_checkout)}
                        </span>
                      </td>

                      {/* KOLOM 5: RINCIAN PEMBAYARAN (STANDAR PMS & KEBIJAKAN OTA) */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${badgeBayar.badgeClass}`}
                            >
                              {badgeBayar.label}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">
                              ({item.metode_bayar || (isOta ? `Oleh ${item.sumber_booking}` : "Transfer Bank")})
                            </span>
                          </div>
                          <div className="font-bold text-gray-900 dark:text-white text-xs">
                            Tagihan: {formatRupiah(total)}
                          </div>
                          {isOta ? (
                            <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                              🕒 Jatuh tempo pencairan: Selesai Check-out
                            </div>
                          ) : sisa > 0 ? (
                            <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                              Sisa: {formatRupiah(sisa)} (DP: {formatRupiah(dp)})
                            </div>
                          ) : (
                            <div className="text-[11px] font-semibold text-emerald-600">
                              ✓ Terbayar Lunas
                            </div>
                          )}
                        </div>
                      </td>

                      {/* KOLOM 6: STATUS RESERVASI */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase border ${
                            getStatusReservasiLabel(item.status_reservasi).color
                          }`}
                        >
                          {getStatusReservasiLabel(item.status_reservasi).label}
                        </span>
                      </td>

                      {/* KOLOM 7: AKSI */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status_bayar !== "Lunas" && (
                            <button
                              type="button"
                              onClick={() => handleQuickSettle(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs border border-emerald-200 transition flex items-center gap-1"
                              title="Pelunasan Cepat 1-Klik"
                            >
                              <span>⚡</span>
                              <span>Lunaskan</span>
                            </button>
                          )}

                          {item.no_hp && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-200"
                              title="Hubungi WhatsApp Tamu"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                              </svg>
                            </a>
                          )}

                          <Link
                            href={`/reservasi/${item.id}`}
                            className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 transition"
                          >
                            Detail
                          </Link>

                          <button
                            type="button"
                            className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-100 transition"
                            onClick={() => handleEditClick(item)}
                          >
                            Ubah
                          </button>

                          <button
                            type="button"
                            className="rounded-lg bg-orange-50 px-2 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-100 transition"
                            onClick={() => handleCancelClick(item)}
                            title="Batalkan Reservasi (Kurangi Pemasukan)"
                          >
                            Batal
                          </button>

                          <button
                            type="button"
                            className="rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 transition"
                            onClick={() => handleDeleteClick(item)}
                            title="Hapus Reservasi"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL FORMULIR RESERVASI (TAMBAH / UBAH) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 transition-all">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl dark:bg-gray-900 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 py-4 px-6 flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                  {editingId ? "Ubah Data Reservasi" : "Formulir Reservasi Baru"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lengkapi data pemesanan kamar & rincian pembayaran Homestay ARUM.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-rose-100 hover:text-rose-600 dark:bg-gray-800 dark:hover:bg-rose-900/40 transition-colors text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto p-5 sm:p-6 flex-1 custom-scrollbar">
              <form id="reservation-form" onSubmit={handleSubmit} className="space-y-6">
                {/* SECTION 1: DATA TAMU */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                    1. Data Pribadi Tamu
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
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
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                        No. WhatsApp / HP
                      </label>
                      <input
                        type="text"
                        name="no_hp"
                        value={formData.no_hp}
                        onChange={handleInputChange}
                        placeholder="Contoh: 08123456789"
                        className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                        Jumlah Tamu (Orang)
                      </label>
                      <input
                        type="number"
                        name="jumlah_tamu"
                        value={formData.jumlah_tamu}
                        onChange={handleInputChange}
                        placeholder="Misal: 2"
                        min="1"
                        className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: JADWAL MENGINAP */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                      2. Jadwal Menginap & Kedatangan
                    </h4>
                    {formData.tgl_checkin && formData.tgl_checkout && (
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                        Durasi: {getJumlahMalam(formData.tgl_checkin, formData.tgl_checkout)}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
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
                      <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
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
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                        Perkiraan Jam Tiba (ETA)
                      </label>
                      <input
                        type="time"
                        name="jam_kedatangan"
                        value={formData.jam_kedatangan}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: KAMAR & SALURAN (OTA) */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-2">
                    3. Kamar & Saluran Pemesanan
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                        Pilih Kamar Homestay <span className="text-red-500">*</span>
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

                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                        Sumber Pemesanan (OTA)
                      </label>
                      <select
                        name="sumber_booking"
                        value={formData.sumber_booking}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white font-bold"
                      >
                        {OTA_OPTIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                        Catatan Khusus Tamu
                      </label>
                      <input
                        type="text"
                        name="catatan"
                        value={formData.catatan || ""}
                        onChange={handleInputChange}
                        placeholder="Contoh: Minta extra bed, tamu check-in larut malam..."
                        className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: KEUANGAN & PEMBAYARAN CERDAS (STANDAR PMS & OTA) */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-2">
                    4. Rincian Keuangan & Kebijakan Pembayaran
                  </h4>

                  {/* KOTAK NOTIFIKASI JIKA SUMBER ADALAH OTA */}
                  {formData.sumber_booking && formData.sumber_booking !== "Langsung" && (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-900/40 dark:bg-blue-900/20 text-xs space-y-1">
                      <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300">
                        <span>🕒</span>
                        <span>Pembayaran Tamu Difasilitasi oleh {formData.sumber_booking}</span>
                      </div>
                      <p className="text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                        Sesuai kebijakan {formData.sumber_booking}, pembayaran tamu ditampung oleh pihak OTA dan berstatus pembayaran tertunda. <strong>Pencairan dana transfer bank akan jatuh tempo dan otomatis dilunasi saat tamu selesai check-out</strong>.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                        Total Tagihan (Rp) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="total_tagihan"
                        required
                        value={formData.total_tagihan}
                        onChange={handleInputChange}
                        placeholder="Misal: 1200000"
                        className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                        Pembayaran Masuk / DP (Rp)
                      </label>
                      <input
                        type="number"
                        name="nominal_dp"
                        value={formData.nominal_dp || ""}
                        onChange={handleInputChange}
                        placeholder={formData.sumber_booking !== "Langsung" ? "Difasilitasi OTA" : "Misal: 500000 (0 jika belum bayar)"}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                        Metode Pembayaran
                      </label>
                      <select
                        name="metode_bayar"
                        value={formData.metode_bayar || (formData.sumber_booking !== "Langsung" ? `Pembayaran oleh ${formData.sumber_booking}` : "Transfer Bank")}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* KOTAK STATUS OTOMATIS */}
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-800/40 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 block">
                        Status Pembayaran:
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          name="status_bayar"
                          value={formData.status_bayar}
                          onChange={handleInputChange}
                          className="py-1.5 px-3 text-xs font-extrabold rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        >
                          <option value="Dibayar via OTA">🏨 Dibayar via OTA (Cair saat Check-out)</option>
                          <option value="Belum Bayar">🔴 Belum Bayar</option>
                          <option value="DP">🟡 DP (Uang Muka)</option>
                          <option value="Lunas">🟢 Lunas</option>
                          <option value="Batal">❌ Batal</option>
                        </select>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                        Status Pelunasan / Sisa:
                      </span>
                      <span className={`text-base font-extrabold block mt-0.5 ${
                        formData.sumber_booking !== "Langsung"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}>
                        {formData.sumber_booking !== "Langsung"
                          ? "Jatuh Tempo Check-out"
                          : formatRupiah(calculateSisaTagihan(formData.total_tagihan, formData.nominal_dp || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 py-3.5 px-6 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl px-5 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                form="reservation-form"
                disabled={isLoading}
                className="rounded-xl px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 disabled:bg-primary/50 shadow-sm shadow-primary/30 transition-all flex items-center justify-center min-w-[150px]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Menyimpan...
                  </span>
                ) : editingId ? (
                  "Simpan Perubahan"
                ) : (
                  "Simpan Reservasi"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}