"use client";

import React, { useState, useRef, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import {
  EventInput,
  DateSelectArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";
import Link from "next/link";
import { formatDate, calculateNights } from "@/utils/reservationUtils";
import { Modal } from "@/components/ui/modal";

export interface CalendarReservation {
  id: string;
  nama_tamu: string;
  id_kamar: string;
  no_hp?: string;
  sumber_booking?: string;
  jumlah_tamu?: string | number;
  tgl_checkin: string;
  tgl_checkout: string;
  jam_kedatangan?: string;
  status_bayar?: string;
  total_tagihan?: string;
  status_kebersihan?: string;
  status_reservasi?: string;
  catatan?: string;
}

export interface CalendarHoliday {
  date: string;
  localName: string;
}

interface CalendarProps {
  reservations?: CalendarReservation[];
  holidays?: CalendarHoliday[];
  onAddReservation?: (startDate: string, endDate: string) => void;
  onEditReservation?: (reservation: CalendarReservation) => void;
}

export default function Calendar({
  reservations = [],
  holidays = [],
  onAddReservation,
  onEditReservation,
}: CalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);

  // Filter States
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [showHolidays, setShowHolidays] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<"dayGridMonth" | "timeGridWeek" | "listMonth">("dayGridMonth");

  // Selected Detail Modal
  const [selectedEvent, setSelectedEvent] = useState<{
    type: "reservation" | "holiday";
    reservation?: CalendarReservation;
    holiday?: CalendarHoliday;
  } | null>(null);

  // Warna Tipe Kamar
  const getRoomColor = (room: string) => {
    if (room.includes("AC")) {
      return {
        bg: "#2563eb", // Blue
        lightBg: "#eff6ff",
        textColor: "#1d4ed8",
        border: "#bfdbfe",
        icon: "❄️",
      };
    }
    if (room.includes("Double Room with Fan") || room.includes("Fan")) {
      return {
        bg: "#059669", // Emerald
        lightBg: "#ecfdf5",
        textColor: "#047857",
        border: "#a7f3d0",
        icon: "🌿",
      };
    }
    return {
      bg: "#d97706", // Amber
      lightBg: "#fffbeb",
      textColor: "#b45309",
      border: "#fde68a",
      icon: "🛏️",
    };
  };

  // 1. TRANSFORM RESERVATIONS & HOLIDAYS TO FULLCALENDAR EVENTS
  const calendarEvents = useMemo(() => {
    const list: EventInput[] = [];

    // Tambah Reservasi
    reservations.forEach((r) => {
      if (selectedRoom !== "all" && r.id_kamar !== selectedRoom) return;
      if (r.status_reservasi === "Batal") return;

      const roomStyle = getRoomColor(r.id_kamar);

      list.push({
        id: `res-${r.id}`,
        title: `${roomStyle.icon} ${r.nama_tamu}`,
        start: r.tgl_checkin,
        end: r.tgl_checkout, // FullCalendar end date is exclusive for allDay
        allDay: true,
        backgroundColor: roomStyle.bg,
        borderColor: roomStyle.bg,
        textColor: "#ffffff",
        extendedProps: {
          type: "reservation",
          data: r,
          roomStyle,
        },
      });
    });

    // Tambah Hari Libur Nasional
    if (showHolidays) {
      holidays.forEach((h, idx) => {
        list.push({
          id: `hol-${idx}`,
          title: `🇮🇩 ${h.localName}`,
          start: h.date,
          allDay: true,
          backgroundColor: "#e11d48", // Rose/Crimson
          borderColor: "#e11d48",
          textColor: "#ffffff",
          extendedProps: {
            type: "holiday",
            data: h,
          },
        });
      });
    }

    return list;
  }, [reservations, holidays, selectedRoom, showHolidays]);

  // Handle Pilih Rentang Tanggal (Drag / Click Date)
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    if (onAddReservation) {
      // FullCalendar selectInfo.endStr is exclusive for allDay, subtract 1 day if necessary or pass directly
      const start = selectInfo.startStr;
      const end = selectInfo.endStr;
      onAddReservation(start, end);
    }
  };

  // Handle Klik Event (Buka Modal Detail)
  const handleEventClick = (clickInfo: EventClickArg) => {
    const ext = clickInfo.event.extendedProps;
    if (ext.type === "reservation") {
      setSelectedEvent({
        type: "reservation",
        reservation: ext.data,
      });
    } else if (ext.type === "holiday") {
      setSelectedEvent({
        type: "holiday",
        holiday: ext.data,
      });
    }
  };

  // Custom Event Card Rendering
  const renderEventContent = (eventInfo: EventContentArg) => {
    const ext = eventInfo.event.extendedProps;
    const isHoliday = ext.type === "holiday";
    const res: CalendarReservation = ext.data;

    if (isHoliday) {
      return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-bold shadow-xs truncate w-full">
          <span className="flex-shrink-0">🇮🇩</span>
          <span className="truncate">{eventInfo.event.title.replace("🇮🇩 ", "")}</span>
        </div>
      );
    }

    const roomStyle = ext.roomStyle || getRoomColor(res?.id_kamar || "");

    return (
      <div
        className="flex items-center justify-between gap-1 px-2 py-1 rounded-md text-white text-[11px] font-bold shadow-xs truncate w-full transition-transform hover:scale-[1.01]"
        style={{ backgroundColor: roomStyle.bg }}
      >
        <div className="flex items-center gap-1 truncate">
          <span className="flex-shrink-0">{roomStyle.icon}</span>
          <span className="truncate">{res?.nama_tamu || eventInfo.event.title}</span>
        </div>
        {res?.status_bayar === "Lunas" && (
          <span className="text-[9px] bg-white/20 px-1 rounded flex-shrink-0">✓</span>
        )}
      </div>
    );
  };

  const handleViewChange = (view: "dayGridMonth" | "timeGridWeek" | "listMonth") => {
    setActiveView(view);
    const api = calendarRef.current?.getApi();
    if (api) {
      api.changeView(view);
    }
  };

  const formatRupiah = (val: string | number) => {
    const num = Number(String(val).replace(/[^0-9]/g, "")) || 0;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const getWaLink = (res: CalendarReservation) => {
    const phone = res.no_hp
      ? res.no_hp.replace(/[^0-9]/g, "").replace(/^0/, "62")
      : "";
    if (!phone) return "#";
    const message = `Halo ${res.nama_tamu}, kami dari Homestay ARUM ingin mengonfirmasi reservasi kamar ${res.id_kamar} pada tanggal ${formatDate(res.tgl_checkin)} s/d ${formatDate(res.tgl_checkout)}.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP INTERACTIVE TOOLBAR & LEGEND */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* ROOM FILTER BUTTONS & HOLIDAY TOGGLE */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">
            Filter:
          </span>

          <button
            onClick={() => setSelectedRoom("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedRoom === "all"
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            Semua Kamar
          </button>

          <button
            onClick={() => setSelectedRoom("Double Room with AC")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedRoom === "Double Room with AC"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
            }`}
          >
            <span>❄️</span>
            <span>Double AC</span>
          </button>

          <button
            onClick={() => setSelectedRoom("Double Room with Fan")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedRoom === "Double Room with Fan"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
            }`}
          >
            <span>🌿</span>
            <span>Double Fan</span>
          </button>

          <button
            onClick={() => setSelectedRoom("Single Room with Fan")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedRoom === "Single Room with Fan"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
            }`}
          >
            <span>🛏️</span>
            <span>Single Fan</span>
          </button>

          {/* TOGGLE LIBUR NASIONAL */}
          <button
            onClick={() => setShowHolidays(!showHolidays)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              showHolidays
                ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
                : "bg-gray-100 text-gray-400 opacity-60 dark:bg-gray-800"
            }`}
          >
            <span>🇮🇩</span>
            <span>Libur Nasional</span>
          </button>
        </div>

        {/* VIEW SWITCHER BUTTONS (BULAN / MINGGU / AGENDA) */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl self-start lg:self-auto">
          <button
            onClick={() => handleViewChange("dayGridMonth")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeView === "dayGridMonth"
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            Bulan
          </button>
          <button
            onClick={() => handleViewChange("timeGridWeek")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeView === "timeGridWeek"
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            Minggu
          </button>
          <button
            onClick={() => handleViewChange("listMonth")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeView === "listMonth"
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            Daftar Agenda
          </button>
        </div>
      </div>

      {/* 2. FULLCALENDAR BOARD */}
      <div className="rounded-2xl border border-gray-100 bg-white p-3 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        <div className="custom-calendar overflow-x-auto">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "",
            }}
            buttonText={{
              today: "Hari Ini",
              month: "Bulan",
              week: "Minggu",
              list: "Agenda",
            }}
            events={calendarEvents}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={3}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
            height="auto"
            contentHeight={650}
          />
        </div>
      </div>

      {/* 3. MODAL DETAIL POPUP (RESERVASI ATAU LIBUR NASIONAL) */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          className="max-w-lg p-0 overflow-hidden rounded-3xl"
        >
          {selectedEvent.type === "reservation" && selectedEvent.reservation ? (
            <div className="flex flex-col bg-white dark:bg-gray-900">
              {/* Header Popup */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-md inline-block">
                    Rincian Reservasi Tamu
                  </span>
                  <h3 className="text-xl font-extrabold mt-2">
                    {selectedEvent.reservation.nama_tamu}
                  </h3>
                  <p className="text-xs text-white/80 mt-0.5">
                    {selectedEvent.reservation.id_kamar} • {selectedEvent.reservation.sumber_booking || "Langsung"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold transition text-lg"
                >
                  &times;
                </button>
              </div>

              {/* Body Popup */}
              <div className="p-5 sm:p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div>
                    <span className="text-gray-400 font-bold block uppercase text-[10px]">Check-in</span>
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                      {formatDate(selectedEvent.reservation.tgl_checkin)}
                    </span>
                    {selectedEvent.reservation.jam_kedatangan && (
                      <span className="text-blue-600 dark:text-blue-400 block text-[11px] mt-0.5">
                        Jam: {selectedEvent.reservation.jam_kedatangan}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block uppercase text-[10px]">Check-out</span>
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                      {formatDate(selectedEvent.reservation.tgl_checkout)}
                    </span>
                    <span className="text-gray-500 block text-[11px] mt-0.5 font-semibold">
                      Durasi: {calculateNights(selectedEvent.reservation.tgl_checkin, selectedEvent.reservation.tgl_checkout)} Malam
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <span className="text-gray-400 font-bold block uppercase text-[10px]">Status Bayar</span>
                    <span className="font-extrabold text-sm text-gray-900 dark:text-white block mt-0.5">
                      {selectedEvent.reservation.status_bayar}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      {formatRupiah(selectedEvent.reservation.total_tagihan || 0)}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <span className="text-gray-400 font-bold block uppercase text-[10px]">Kontak WhatsApp</span>
                    <span className="font-bold text-sm text-gray-900 dark:text-white block mt-0.5 truncate">
                      {selectedEvent.reservation.no_hp || "-"}
                    </span>
                    <span className="text-gray-500 text-[11px] block">
                      {selectedEvent.reservation.jumlah_tamu ? `${selectedEvent.reservation.jumlah_tamu} Tamu` : "1 Tamu"}
                    </span>
                  </div>
                </div>

                {selectedEvent.reservation.catatan && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
                    <span className="text-amber-800 dark:text-amber-300 font-bold block text-[10px] uppercase">
                      Catatan Khusus:
                    </span>
                    <p className="text-amber-900 dark:text-amber-200 mt-0.5">
                      {selectedEvent.reservation.catatan}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 flex items-center justify-between gap-2">
                {selectedEvent.reservation.no_hp ? (
                  <a
                    href={getWaLink(selectedEvent.reservation)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                    </svg>
                    <span>Chat WA</span>
                  </a>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2">
                  {onEditReservation && (
                    <button
                      onClick={() => {
                        const res = selectedEvent.reservation;
                        setSelectedEvent(null);
                        if (res) onEditReservation(res);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs transition border border-amber-200"
                    >
                      Ubah
                    </button>
                  )}

                  <Link
                    href={`/reservasi/${selectedEvent.reservation.id}`}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs transition shadow-sm"
                  >
                    Buka Rincian
                  </Link>
                </div>
              </div>
            </div>
          ) : selectedEvent.type === "holiday" && selectedEvent.holiday ? (
            <div className="flex flex-col bg-white dark:bg-gray-900">
              <div className="p-6 bg-gradient-to-r from-rose-600 to-red-700 text-white flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-md inline-block">
                    Hari Libur Nasional Indonesia
                  </span>
                  <h3 className="text-xl font-extrabold mt-2">
                    {selectedEvent.holiday.localName}
                  </h3>
                  <p className="text-xs text-white/80 mt-1">
                    📅 {formatDate(selectedEvent.holiday.date)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold transition text-lg"
                >
                  &times;
                </button>
              </div>

              <div className="p-6 space-y-3 text-xs text-gray-600 dark:text-gray-300">
                <p className="leading-relaxed">
                  Hari libur resmi nasional Republik Indonesia. Anda dapat memanfaatkan momen libur ini untuk memantau potensi peningkatan okupansi pemesanan homestay.
                </p>
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}
