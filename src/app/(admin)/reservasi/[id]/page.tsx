"use client";

import React, { useEffect, useState } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  formatDate,
  formatRupiah,
  parseNominal,
  calculateSisaTagihan,
  getStatusBayarBadge,
  calculateNights,
  ReservationData,
} from "@/utils/reservationUtils";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Link from "next/link";

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<ReservationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchDetail = async () => {
    if (!params.id) return;
    try {
      const docRef = doc(db, "reservasi", params.id as string);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setData({ id: docSnap.id, ...docSnap.data() } as ReservationData);
      } else {
        alert("Data reservasi tidak ditemukan.");
        router.push("/reservasi");
      }
    } catch (error) {
      console.error("Error mengambil data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [params.id, router]);

  // Handle Pelunasan Cepat 1-Klik dari Halaman Detail
  // Handle Pelunasan Cepat 1-Klik dari Halaman Detail
  const handleQuickSettle = async () => {
    if (!data?.id) return;
    const total = parseNominal(data.total_tagihan);
    const confirmSettle = window.confirm(
      `Konfirmasi pelunasan untuk ${data.nama_tamu}?\nTotal Tagihan: ${formatRupiah(total)}\n\nStatus akan diubah menjadi "Lunas" dan sisa tagihan menjadi Rp 0.`
    );
    if (!confirmSettle) return;

    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "reservasi", data.id), {
        status_bayar: "Lunas",
        nominal_dp: total,
        sisa_tagihan: 0,
        updated_at: new Date().toISOString(),
      });
      alert("✅ Pembayaran berhasil dilunasi.");
      await fetchDetail();
    } catch (err) {
      console.error("Gagal melunasi:", err);
      alert("❌ Terjadi kesalahan saat memperbarui status.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Pembatalan Reservasi (Pemasukan otomatis berkurang)
  const handleCancelReservation = async () => {
    if (!data?.id) return;
    const confirmCancel = window.confirm(
      `⚠️ KONFIRMASI PEMBATALAN:\n\nApakah Anda yakin ingin membatalkan reservasi tamu "${data.nama_tamu}" (${data.id_kamar})?\n\n• Uang pemasukan dan piutang otomatis DIKURANGI / DIHAPUS dari laporan pendapatan & dashboard.\n• Kamar akan berstatus kosong kembali.`
    );
    if (!confirmCancel) return;

    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "reservasi", data.id), {
        status_reservasi: "Batal",
        status_bayar: "Batal",
        nominal_dp: 0,
        sisa_tagihan: 0,
        updated_at: new Date().toISOString(),
      });
      alert("✅ Reservasi telah dibatalkan. Pemasukan otomatis berkurang dari seluruh laporan.");
      await fetchDetail();
    } catch (err) {
      console.error("Gagal membatalkan:", err);
      alert("❌ Gagal membatalkan reservasi.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageBreadCrumb pageTitle="Detail Pemesanan Kamar" />
        <div className="rounded-3xl border border-gray-100 bg-white p-16 text-center dark:border-gray-800 dark:bg-gray-900 shadow-sm flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
            Memuat rincian data reservasi...
          </span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const total = parseNominal(data.total_tagihan);
  const dp = parseNominal(data.nominal_dp);
  const sisa = calculateSisaTagihan(total, dp > 0 ? dp : (data.status_bayar === "Lunas" ? total : 0));
  const badgeBayar = getStatusBayarBadge(data.status_bayar);
  const nights = calculateNights(data.tgl_checkin, data.tgl_checkout);

  const phone = data.no_hp
    ? data.no_hp.replace(/[^0-9]/g, "").replace(/^0/, "62")
    : "";
  const waLink = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(
        `Halo ${data.nama_tamu}, kami dari Homestay ARUM ingin mengonfirmasi reservasi kamar ${data.id_kamar} untuk tanggal ${formatDate(data.tgl_checkin)} s/d ${formatDate(data.tgl_checkout)}.`
      )}`
    : "#";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out space-y-6">
      <PageBreadCrumb pageTitle="Detail Pemesanan Kamar" />

      {/* Header Navigasi & Aksi */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-white transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Kembali ke Daftar Reservasi</span>
        </button>

        <div className="flex items-center gap-2">
          {phone && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition shadow-xs"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
              </svg>
              <span>Hubungi WhatsApp</span>
            </a>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {/* Banner Header Status */}
        <div className="border-b border-gray-100 bg-gray-50/70 p-5 sm:p-6 dark:border-gray-800 dark:bg-gray-800/30 flex justify-between items-center flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                Homestay ARUM
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs font-bold text-gray-500">
                #{data.id?.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
              {data.nama_tamu}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Sumber: <span className="font-bold text-gray-800 dark:text-gray-200">{data.sumber_booking || "Langsung"}</span> • Status Kamar:{" "}
              <span className="font-bold text-gray-800 dark:text-gray-200">{data.kamar_siap ? "🟢 Siap Huni" : "🟡 Perlu Persiapan"}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={`inline-flex rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wide border ${badgeBayar.badgeClass}`}
            >
              {badgeBayar.label}
            </span>

            {data.status_bayar !== "Lunas" && data.status_reservasi !== "Batal" && (
              <button
                type="button"
                onClick={handleQuickSettle}
                disabled={isUpdating}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition shadow-sm"
              >
                <span>⚡</span>
                <span>{isUpdating ? "Memproses..." : "Lunaskan Tagihan"}</span>
              </button>
            )}

            {data.status_reservasi !== "Batal" && (
              <button
                type="button"
                onClick={handleCancelReservation}
                disabled={isUpdating}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs transition"
                title="Batalkan Reservasi (Uang pemasukan otomatis berkurang)"
              >
                <span>🚫</span>
                <span>Batalkan Reservasi</span>
              </button>
            )}
          </div>
        </div>

        {/* 2 Kolom Grid Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 sm:p-8">
          {/* Kolom Kiri: Informasi Tamu & Jadwal */}
          <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/40">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-primary border-b border-gray-200 dark:border-gray-700 pb-2">
              Informasi Tamu & Jadwal
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Nama Lengkap</span>
                <span className="font-bold text-gray-900 dark:text-white">{data.nama_tamu}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Jumlah Tamu</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {data.jumlah_tamu ? `${data.jumlah_tamu} Orang` : "-"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">No. WhatsApp</span>
                <span className="font-bold text-gray-900 dark:text-white">{data.no_hp || "-"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Check-in</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatDate(data.tgl_checkin)} {data.jam_kedatangan && `(Jam: ${data.jam_kedatangan})`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Check-out</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatDate(data.tgl_checkout)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Durasi Menginap</span>
                <span className="font-extrabold text-blue-600 dark:text-blue-400">{nights} Malam</span>
              </div>
              {data.catatan && (
                <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                  <span className="text-gray-400 font-bold block uppercase text-[10px]">Catatan Khusus:</span>
                  <p className="text-gray-800 dark:text-gray-200 mt-1">{data.catatan}</p>
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Rincian Kamar & Fasilitas */}
          <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/40">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-primary border-b border-gray-200 dark:border-gray-700 pb-2">
              Kamar & Fasilitas Homestay
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Tipe Kamar</span>
                <span className="font-bold text-gray-900 dark:text-white">{data.id_kamar}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Status Reservasi</span>
                <span className="font-bold text-gray-900 dark:text-white">{data.status_reservasi || "Aktif"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Status Kebersihan</span>
                <span className="font-bold text-emerald-600">
                  {data.status_kebersihan === "siap" ? "🟢 Siap Huni" : data.status_kebersihan === "dipakai" ? "🔴 Sedang Dipakai" : "🟡 Perlu Dibersihkan"}
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400 block mb-2">
                  Fasilitas Homestay ARUM:
                </span>
                <ul className="list-disc pl-4 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <li>Makan 2x & Snack 2x (Yaswar Cafe)</li>
                  <li>Bebas Akses Kostum Adat Papua</li>
                  <li>Kunjungan Rumah Tradisional & Museum Rumsram</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 3. RINCIAN KEUANGAN & STATUS PEMBAYARAN STANDAR PMS */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-5 sm:p-8 space-y-6">
          <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">
            Rincian & Kebijakan Pembayaran
          </h4>

          {/* BANNER KEBIJAKAN PEMBAYARAN OTA (PERSIS SEPERTI SCREENSHOT USER) */}
          {data.sumber_booking && data.sumber_booking !== "Langsung" && (
            <div className="rounded-3xl border border-gray-200 bg-gray-900 text-white p-5 sm:p-6 shadow-sm space-y-5 dark:border-gray-700">
              <div className="border-b border-gray-800 pb-4">
                <h5 className="text-base font-extrabold flex items-center gap-2">
                  <span>Pembayaran – Transfer Bank</span>
                </h5>
                <div className="mt-2 text-xs text-gray-400">
                  <p className="font-semibold text-gray-300">Pembayaran tamu</p>
                  <p className="mt-0.5 text-gray-400">
                    Pembayaran difasilitasi melalui Pembayaran oleh <span className="font-bold text-white">{data.sumber_booking}</span>
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Detail pembayaran
                </p>
                <p className="text-xs text-gray-300 mt-1">Harga reservasi</p>

                <div className="flex items-center gap-2.5 mt-2 text-amber-400">
                  <svg className="w-5 h-5 flex-shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className="font-extrabold text-base sm:text-lg text-white">
                      Tagihan reservasi {formatRupiah(total)}
                    </span>
                    {data.status_reservasi === "Selesai" || data.status_bayar === "Lunas" ? (
                      <p className="text-xs font-bold text-emerald-400 mt-0.5">
                        ✓ Pembayaran Lunas — Telah dicairkan ke rekening homestay saat selesai check-out.
                      </p>
                    ) : (
                      <p className="text-xs font-bold text-amber-400 mt-0.5">
                        Pembayaran tertunda – jatuh tempo pada saat selesai check-out ({formatDate(data.tgl_checkout)})
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                Total Tagihan Sewa
              </span>
              <span className="text-xl font-extrabold text-gray-900 dark:text-white mt-1 block">
                {formatRupiah(total)}
              </span>
              <span className="text-[11px] text-gray-500 mt-0.5 block">
                {data.id_kamar} ({nights} Malam)
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-100 dark:border-emerald-950/30 bg-emerald-50/40 dark:bg-emerald-950/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Pembayaran Masuk (DP / Lunas)
              </span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
                {formatRupiah(dp > 0 ? dp : (data.status_bayar === "Lunas" ? total : 0))}
              </span>
              <span className="text-[11px] text-emerald-700/70 mt-0.5 block">
                Metode: {data.metode_bayar || (data.sumber_booking !== "Langsung" ? `Pembayaran oleh ${data.sumber_booking}` : "Transfer Bank")}
              </span>
            </div>

            <div className={`p-4 rounded-2xl border ${
              sisa > 0 && data.status_bayar !== "Lunas"
                ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20"
                : "border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30"
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                Sisa Tagihan / Status Jatuh Tempo
              </span>
              <span className={`text-xl font-extrabold mt-1 block ${
                data.status_bayar === "Lunas"
                  ? "text-emerald-600"
                  : data.sumber_booking !== "Langsung"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}>
                {data.status_bayar === "Lunas"
                  ? "Rp 0 (Lunas)"
                  : data.sumber_booking !== "Langsung"
                  ? "Jatuh Tempo Check-out"
                  : formatRupiah(sisa)}
              </span>
              <span className="text-[11px] text-gray-500 mt-0.5 block">
                {data.status_bayar === "Lunas"
                  ? "Semua tagihan telah diselesaikan"
                  : data.sumber_booking !== "Langsung"
                  ? `Pencairan via transfer bank pada ${formatDate(data.tgl_checkout)}`
                  : "Harus dilunasi sebelum / saat check-in"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
