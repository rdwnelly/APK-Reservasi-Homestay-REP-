import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  updateDoc, 
  doc,
  deleteDoc,
  where,
  Timestamp 
} from "firebase/firestore";

interface ReservationData {
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
  status_bayar: string;
  total_tagihan: string;
  status_kebersihan?: "siap" | "dipakai" | "perlu_bersih";
  status_reservasi?: "Aktif" | "DP" | "Selesai" | "Batal";
  updated_at?: string;
}

/**
 * Fungsi untuk mengotomasi perubahan status reservasi
 * Mengecek semua reservasi dan mengubah status "Aktif" menjadi "Selesai"
 * jika tanggal checkout sudah lewat
 * 
 * Logika Status:
 * - "Aktif": Tamu sedang menginap atau akan check-in hari ini
 * - "DP": Telah melakukan pembayaran DP tetapi belum check-in
 * - "Selesai": Tamu sudah checkout (tanggal checkout sudah lewat)
 * - "Batal": Reservasi dibatalkan
 */
export async function checkAndUpdateReservationStatus(): Promise<void> {
  try {
    // Ambil semua reservasi
    const q = query(collection(db, "reservasi"));
    
    const querySnapshot = await getDocs(q);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Mulai dari tengah malam hari ini

    // Proses setiap reservasi
    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data() as ReservationData;
      const checkoutDate = new Date(data.tgl_checkout);
      checkoutDate.setHours(0, 0, 0, 0);

      // Jika checkout date sudah lewat (kemarin atau sebelumnya), ubah status menjadi "Selesai"
      // Berlaku untuk semua reservasi yang belum "Selesai" atau "Batal"
      if (
        checkoutDate < now && 
        data.status_reservasi !== "Selesai" && 
        data.status_reservasi !== "Batal"
      ) {
        await updateDoc(doc(db, "reservasi", docSnapshot.id), {
          status_reservasi: "Selesai",
          updated_at: new Date().toISOString(),
        });
        
        console.log(
          `✅ Auto-Archive: Reservasi ${data.nama_tamu} (${data.id_kamar}) status diubah menjadi "Selesai"`
        );
      }
    }
  } catch (error) {
    console.warn("❌ Peringatan: checkAndUpdateReservationStatus gagal (mungkin karena belum login):", error instanceof Error ? error.message : String(error));
  }
}

/**
 * Fungsi helper untuk mengecek apakah tamu sedang aktif (check-in sudah, belum check-out)
 * Gunakan untuk menentukan status real-time tanpa query ke Firebase
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
  return Math.ceil(diff / (1000 * 3600 * 24));
}

/**
 * Fungsi untuk mendapatkan status badge color
 */
export function getStatusReservasiColor(status?: string): string {
  if (status === "Aktif") return "bg-blue-100 text-blue-800 border-blue-200";
  if (status === "DP") return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "Selesai") return "bg-green-100 text-green-800 border-green-200";
  if (status === "Batal") return "bg-red-100 text-red-800 border-red-200";
  return "bg-gray-100 text-gray-800 border-gray-200";
}

/**
 * Fungsi untuk mendapatkan label status dengan emoji
 */
export function getStatusReservasiLabel(
  status?: string
): { label: string; color: string } {
  if (status === "Aktif") return { label: "🟢 Aktif", color: "bg-blue-100 text-blue-800 border-blue-200" };
  if (status === "DP") return { label: "🟡 DP", color: "bg-amber-100 text-amber-800 border-amber-200" };
  if (status === "Selesai") return { label: "✅ Selesai", color: "bg-green-100 text-green-800 border-green-200" };
  if (status === "Batal") return { label: "❌ Batal", color: "bg-red-100 text-red-800 border-red-200" };
  return { label: "-", color: "bg-gray-100 text-gray-800 border-gray-200" };
}
