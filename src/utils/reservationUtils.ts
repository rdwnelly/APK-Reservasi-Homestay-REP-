import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  updateDoc, 
  doc,
  where,
} from "firebase/firestore";

export interface ReservationData {
  id?: string;
  nama_tamu: string;
  jumlah_tamu?: string | number;
  no_hp: string;
  sumber_booking: string;
  id_kamar: string;
  tgl_checkin: string;
  tgl_checkout: string;
  jam_kedatangan: string;
  kamar_siap: boolean;
  status_bayar: "Lunas" | "DP" | "Belum Bayar" | "Dibayar via OTA" | "Batal" | string;
  total_tagihan: string;
  nominal_dp?: string | number;
  sisa_tagihan?: string | number;
  metode_bayar?: "Transfer Bank" | "QRIS" | "Tunai (Cash)" | "OTA Pay at Hotel" | "Pembayaran oleh OTA" | "Kartu Debit/Kredit" | string;
  status_kebersihan?: "siap" | "dipakai" | "perlu_bersih";
  status_reservasi?: "Aktif" | "DP" | "Selesai" | "Batal";
  updated_at?: string;
  catatan?: string;
}

/**
 * Helper untuk memeriksa apakah saluran pemesanan adalah OTA (Online Travel Agency)
 */
export function isOtaChannel(source?: string): boolean {
  if (!source) return false;
  const s = source.toLowerCase();
  return (
    s.includes("booking") ||
    s.includes("traveloka") ||
    s.includes("agoda") ||
    s.includes("tiket") ||
    s.includes("airbnb")
  );
}

/**
 * Helper untuk parsing nominal angka dari string/number aman
 */
export function parseNominal(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9-]/g, "");
  const parsed = Number(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format Rupiah Standar Indonesia
 */
export function formatRupiah(val: string | number | undefined | null): string {
  const num = parseNominal(val);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
}

/**
 * STANDAR UMUM LOGIKA PEMBAYARAN RESERVASI (PMS & KEBIJAKAN OTA):
 * 1. "Dibayar via OTA" (Payout Pending): Pembayaran difasilitasi oleh OTA (Booking.com, Traveloka, Agoda, Airbnb, Tiket.com).
 *    Status pembayaran tertunda dan JATUH TEMPO / CAIR LUNAS otomatis saat tamu SELESAI CHECK-OUT.
 * 2. "Lunas" (Fully Paid): Dana telah diterima penuh (100%), atau telah selesai check-out via OTA.
 * 3. "DP" (Deposit / Partial Paid): Tamu memesan langsung dan membayar uang muka (0 < Nominal bayar < Total Tagihan).
 * 4. "Belum Bayar" (Unpaid): Belum ada pembayaran masuk sama sekali.
 */
export function calculatePaymentStatus(
  totalTagihan: number | string,
  nominalDibayar: number | string,
  sumberBooking?: string
): "Lunas" | "DP" | "Belum Bayar" | "Dibayar via OTA" {
  const total = parseNominal(totalTagihan);
  const paid = parseNominal(nominalDibayar);

  // Jika pemesanan dari OTA (Booking.com, Traveloka, Agoda, dll)
  if (isOtaChannel(sumberBooking)) {
    if (paid >= total && total > 0) return "Lunas";
    return "Dibayar via OTA";
  }

  if (total <= 0 || paid <= 0) return "Belum Bayar";
  if (paid >= total) return "Lunas";
  return "DP";
}

/**
 * Menghitung sisa tagihan yang belum terbayar
 */
export function calculateSisaTagihan(
  totalTagihan: number | string,
  nominalDibayar: number | string
): number {
  const total = parseNominal(totalTagihan);
  const paid = parseNominal(nominalDibayar);
  return Math.max(0, total - paid);
}

/**
 * Badge & Style Status Pembayaran Standar PMS & OTA Policy
 */
export function getStatusBayarBadge(
  status: string | undefined,
  sumberBooking?: string,
  tglCheckout?: string
): {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  badgeClass: string;
  payoutNote?: string;
} {
  const st = (status || "").toLowerCase();

  // 1. Status Lunas (Sudah dicairkan / Diterima penuh)
  if (st === "lunas" || st === "paid" || st === "fully paid") {
    return {
      label: "Lunas",
      color: "emerald",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
      textColor: "text-emerald-700 dark:text-emerald-300",
      borderColor: "border-emerald-200 dark:border-emerald-800",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      payoutNote: "Pembayaran telah selesai dan lunas diterima.",
    };
  }

  // 2. Status Dibayar via OTA / Pembayaran Tertunda OTA (Pencairan Saat Check-out)
  if (
    st.includes("ota") ||
    st.includes("tertunda") ||
    (isOtaChannel(sumberBooking) && st !== "batal")
  ) {
    const otaName = sumberBooking || "OTA";
    const checkoutText = tglCheckout ? formatDate(tglCheckout) : "Selesai Check-out";
    return {
      label: `Dibayar via ${otaName}`,
      color: "blue",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
      textColor: "text-blue-700 dark:text-blue-300",
      borderColor: "border-blue-200 dark:border-blue-800",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      payoutNote: `Pembayaran difasilitasi oleh ${otaName}. Pembayaran tertunda — jatuh tempo transfer bank pada saat selesai check-out (${checkoutText}).`,
    };
  }

  // 3. Status DP (Uang Muka)
  if (st.includes("dp") || st === "partial" || st === "deposit") {
    return {
      label: "DP (Uang Muka)",
      color: "amber",
      bgColor: "bg-amber-50 dark:bg-amber-950/40",
      textColor: "text-amber-700 dark:text-amber-300",
      borderColor: "border-amber-200 dark:border-amber-800",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      payoutNote: "Uang muka telah diterima. Sisa tagihan wajib dilunasi saat check-in.",
    };
  }

  // 4. Status Batal
  if (st === "batal" || st === "cancelled" || st === "refund") {
    return {
      label: "Batal / Refund",
      color: "gray",
      bgColor: "bg-gray-100 dark:bg-gray-800",
      textColor: "text-gray-600 dark:text-gray-400",
      borderColor: "border-gray-200 dark:border-gray-700",
      badgeClass: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
      payoutNote: "Reservasi dibatalkan.",
    };
  }

  // 5. Default: Belum Bayar
  return {
    label: "Belum Bayar",
    color: "rose",
    bgColor: "bg-rose-50 dark:bg-rose-950/40",
    textColor: "text-rose-700 dark:text-rose-300",
    borderColor: "border-rose-200 dark:border-rose-800",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    payoutNote: "Belum ada pembayaran masuk dari tamu.",
  };
}

/**
 * KEBIJAKAN OTA: OTOMASI PELUNASAN SAAT CHECK-OUT SELESAI
 * 
 * Mengecek semua reservasi:
 * - Jika tanggal checkout sudah lewat (kemarin atau sebelumnya):
 *   1. Ubah status reservasi menjadi "Selesai" (Checked-out)
 *   2. Sesuai kebijakan OTA (Online Travel Agency) pada umumnya, pembayaran yang difasilitasi oleh
 *      Booking.com / Traveloka / Agoda / Tiket.com / Airbnb otomatis JATUH TEMPO & LUNAS dicairkan saat check-out selesai!
 *   3. Untuk direct booking yang statusnya DP / Belum Bayar, sistem juga menyelesaikan status pelunasannya saat check-out selesai.
 */
let isAutoArchivingRunning = false;

export async function checkAndUpdateReservationStatus(): Promise<void> {
  if (isAutoArchivingRunning) return;
  isAutoArchivingRunning = true;

  try {
    const q = query(
      collection(db, "reservasi"),
      where("status_reservasi", "in", ["Aktif", "DP"])
    );
    
    const querySnapshot = await getDocs(q);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Mulai dari tengah malam hari ini

    const updatePromises: Promise<any>[] = [];

    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data() as ReservationData;
      if (!data.tgl_checkout) continue;

      // PENTING: Jangan pernah mengubah status reservasi yang sudah Dibatalkan
      if (
        data.status_reservasi === "Batal" ||
        data.status_bayar === "Batal" ||
        data.status_bayar?.toLowerCase().includes("batal")
      ) {
        continue;
      }

      const checkoutDate = new Date(data.tgl_checkout);
      checkoutDate.setHours(0, 0, 0, 0);

      // Jika checkout date sudah lewat (kemarin atau sebelumnya), ubah status menjadi "Selesai" & "Lunas"
      if (checkoutDate < now) {
        const total = parseNominal(data.total_tagihan);
        
        updatePromises.push(
          updateDoc(doc(db, "reservasi", docSnapshot.id), {
            status_reservasi: "Selesai",
            status_bayar: "Lunas", // Sesuai kebijakan OTA, pembayaran jatuh tempo & lunas saat selesai check-out
            nominal_dp: total,
            sisa_tagihan: 0,
            updated_at: new Date().toISOString(),
          }).then(() => {
            console.log(
              `✅ Auto-Payout (Check-out Selesai): Reservasi ${data.nama_tamu} (${data.id_kamar}) via ${data.sumber_booking || "Langsung"} status diubah menjadi "Selesai" & pembayaran "Lunas"`
            );
          }).catch((err) => {
            console.warn("Gagal update status reservasi:", err);
          })
        );
      }
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
  } catch (error) {
    console.warn("❌ Peringatan: checkAndUpdateReservationStatus gagal:", error instanceof Error ? error.message : String(error));
  } finally {
    isAutoArchivingRunning = false;
  }
}

/**
 * Fungsi helper untuk mengecek apakah tamu sedang aktif (check-in sudah, belum check-out)
 */
export function isGuestActive(checkInDate: string, checkOutDate: string): boolean {
  const now = new Date();
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  
  return now >= checkIn && now < checkOut;
}

/**
 * Fungsi untuk menghitung jumlah malam menginap
 */
export function calculateNights(checkInDate: string, checkOutDate: string): number {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const diff = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)));
}

/**
 * Fungsi untuk mendapatkan status badge color reservasi
 */
export function getStatusReservasiColor(status?: string): string {
  if (status === "Aktif") return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300";
  if (status === "DP") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300";
  if (status === "Selesai") return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (status === "Batal") return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300";
  return "bg-gray-100 text-gray-800 border-gray-200";
}

/**
 * Fungsi untuk mendapatkan label status dengan emoji
 */
export function getStatusReservasiLabel(
  status?: string
): { label: string; color: string } {
  if (status === "Aktif") return { label: "🟢 Aktif", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300" };
  if (status === "DP") return { label: "🟡 DP", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300" };
  if (status === "Selesai") return { label: "✅ Selesai", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300" };
  if (status === "Batal") return { label: "❌ Batal", color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300" };
  return { label: "-", color: "bg-gray-100 text-gray-800 border-gray-200" };
}

/**
 * Fungsi untuk memformat tanggal (YYYY-MM-DD) menjadi format dengan nama bulan (DD MMMM YYYY)
 */
export function formatDate(dateString: string): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  } catch (e) {
    return dateString;
  }
}

/**
 * Menghitung rentang tanggal untuk Periode Tutup Buku (Tgl 18 Bulan Sebelumnya s/d Tgl 17 Bulan Ini)
 */
export function getTutupBukuRange(year: number, month: number) {
  const prevMonthDate = new Date(year, month - 2, 18);
  const startY = prevMonthDate.getFullYear();
  const startM = String(prevMonthDate.getMonth() + 1).padStart(2, "0");
  const startDateStr = `${startY}-${startM}-18`;

  const endM = String(month).padStart(2, "0");
  const endDateStr = `${year}-${endM}-17`;

  const prevMonthName = prevMonthDate.toLocaleString("id-ID", { month: "short" });
  const currentMonthName = new Date(year, month - 1, 1).toLocaleString("id-ID", { month: "short" });

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    label: `18 ${prevMonthName} ${startY} - 17 ${currentMonthName} ${year}`,
    shortLabel: `${prevMonthName}-${currentMonthName} (18-17)`,
    monthYearKey: `${year}-${endM}`,
  };
}

/**
 * Memeriksa apakah suatu tanggal YYYY-MM-DD berada di dalam rentang [startDate, endDate]
 */
export function isDateInTutupBukuRange(dateStr: string, startDateStr: string, endDateStr: string): boolean {
  if (!dateStr || !startDateStr || !endDateStr) return false;
  return dateStr >= startDateStr && dateStr <= endDateStr;
}
