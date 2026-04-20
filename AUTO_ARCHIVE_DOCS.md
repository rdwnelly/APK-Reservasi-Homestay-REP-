# 📜 Dokumentasi Sistem Auto-Archive Tamu

## Deskripsi Fitur

Sistem Auto-Archive adalah fitur otomatis yang mengelola siklus hidup data reservasi tamu tanpa menghapusnya dari database. Ketika waktu checkout tiba, sistem secara otomatis mengubah status reservasi dari "Aktif" menjadi "Selesai" dan menyembunyikan tamu dari layar utama.

### Manfaat Operasional

✅ **Layar Resepsionis Bersih**: Staf hanya melihat tamu yang sedang menginap atau akan check-in
✅ **Integritas Data**: Semua data tetap tersimpan untuk audit dan pelaporan keuangan
✅ **Otomatis & Akurat**: Tidak perlu manual update status
✅ **Riwayat Lengkap**: Data historical tersedia di halaman "Riwayat Kunjungan"

---

## Arsitektur Sistem

### 1. Data Model

```typescript
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
  
  // ✨ FIELD BARU UNTUK AUTO-ARCHIVE
  status_reservasi?: "Aktif" | "DP" | "Selesai" | "Batal";
  updated_at?: string;
}
```

### 2. Status Reservasi

| Status | Deskripsi | Terlihat di Dashboard | Terlihat di Riwayat |
|--------|-----------|----------------------|--------------------|
| **Aktif** | Tamu sedang menginap atau akan check-in hari ini | ✅ Ya | ❌ Tidak |
| **DP** | Tamu sudah membayar DP tapi belum check-in | ✅ Ya | ❌ Tidak |
| **Selesai** | Tamu sudah checkout (tanggal checkout sudah lewat) | ❌ Tidak | ✅ Ya |
| **Batal** | Reservasi dibatalkan | ❌ Tidak | ✅ Ya |

---

## Flow Sistem Auto-Archive

```
┌─────────────────────────────────────────────────────────────┐
│ Admin membuat/mengedit reservasi tamu                        │
│ - Set tgl_checkin, tgl_checkout                              │
│ - Set status_reservasi = "Aktif" (default)                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Data disimpan ke Firebase Collection "reservasi"             │
│ - Hanya tamu dengan status "Aktif" / "DP" tampil di dashboard│
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Sistem Auto-Check (Trigger pada berbagai event)             │
│ - Saat page load (useAutoArchiveReservations hook)           │
│ - Saat window di-focus kembali                               │
│ - Saat admin membuka halaman Reservasi                       │
│ - Saat admin membuka Riwayat Kunjungan                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ checkAndUpdateReservationStatus() function check:            │
│ - Loop semua reservasi dengan status "Aktif" / "DP"         │
│ - Bandingkan tgl_checkout dengan tanggal hari ini           │
│ - Jika tgl_checkout <= hari ini → update status ke "Selesai"│
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Data Selesai/Batal otomatis:                                 │
│ - HILANG dari Dashboard (Tabel "Tamu Aktif & DP")           │
│ - MUNCUL di halaman "Riwayat Kunjungan"                      │
│ - TETAP tersimpan di Firebase untuk audit                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Components & Files

### 📁 Utility Functions
**File**: `src/utils/reservationUtils.ts`

```typescript
// Fungsi utama untuk auto-archive
export async function checkAndUpdateReservationStatus(): Promise<void>

// Helper functions
export function isGuestActive(checkInDate: string, checkOutDate: string): boolean
export function calculateNights(checkInDate: string, checkOutDate: string): number
export function getStatusReservasiLabel(status?: string): { label: string; color: string }
```

### 🎣 Custom Hooks
**File**: `src/hooks/useAutoArchive.ts`

```typescript
// Hook untuk auto-archive dengan window focus listener
export function useAutoArchiveReservations()

// Hook untuk periodic auto-archive (interval)
export function useAutoArchiveWithInterval(intervalMs?: number)
```

### 🖼️ Components

**1. RecentOrdersGuest** (`src/components/ecommerce/RecentOrdersGuest.tsx`)
- Menampilkan tamu dengan status "Aktif" atau "DP"
- Ditampilkan di halaman Dashboard Utama
- Auto-filter berdasarkan status_reservasi
- Menggunakan `useAutoArchiveReservations` hook

**2. Halaman Riwayat Kunjungan** (`src/app/(admin)/riwayat-kunjungan/page.tsx`)
- Menampilkan riwayat checkout dan reservasi batal
- Filter berdasarkan bulan/tahun
- Summary ringkasan revenue per bulan
- Semua data dengan status "Selesai" atau "Batal"

### 📄 Pages yang Updated

**1. Dashboard Utama** (`src/app/(admin)/page.tsx`)
- Menambahkan komponen `<RecentOrdersGuest />`
- Menampilkan tamu aktif di bawah kartu-kartu statistik

**2. Kelola Reservasi** (`src/app/(admin)/reservasi/page.tsx`)
- Menambahkan field `status_reservasi` di form
- Menambahkan kolom status di table
- Memanggil `checkAndUpdateReservationStatus()` saat mount

**3. AppSidebar** (`src/layout/AppSidebar.tsx`)
- Menambahkan menu baru "📜 Riwayat Kunjungan"
- Link ke `/riwayat-kunjungan`

---

## Bagaimana Auto-Archive Bekerja?

### Trigger #1: Page Load
Saat halaman Reservasi atau Dashboard dimuat:
```typescript
useEffect(() => {
  checkAndUpdateReservationStatus(); // ← Run immediately
  // ... rest of logic
}, []);
```

### Trigger #2: Window Focus
Saat user kembali ke tab aplikasi:
```typescript
useAutoArchiveReservations(); // Hook mendengarkan window focus event
```

### Trigger #3: Halaman Riwayat
Saat user membuka halaman Riwayat Kunjungan:
```typescript
useEffect(() => {
  checkAndUpdateReservationStatus(); // ← Ensure data updated
  // ... fetch completed reservations
}, []);
```

---

## Contoh Skenario

### Skenario 1: Tamu Check-out

**Waktu**: Senin, 15 April 2024

1. **Admin membuat reservasi Tamu A**
   - Check-in: 10 April
   - Check-out: 14 April
   - Status: "Aktif"
   - ✅ Terlihat di Dashboard

2. **Selasa, 15 April (Checkout sudah lewat)**
   - Admin membuka halaman Reservasi
   - Sistem auto-check: 14 April < 15 April ✓
   - Status berubah otomatis: "Aktif" → "Selesai"
   - ❌ Hilang dari Dashboard
   - ✅ Muncul di Riwayat Kunjungan

### Skenario 2: Tamu dengan DP

**Waktu**: Selasa, 16 April 2024

1. **Admin membuat reservasi Tamu B**
   - Check-in: 20 April
   - Check-out: 22 April
   - Status: "DP" (sudah bayar uang muka)
   - ✅ Terlihat di Dashboard dengan badge "🟡 DP"

2. **Rabu, 17 April**
   - Admin membuka Dashboard
   - Check: 20 April (masih 3 hari lagi) > 17 April
   - Status tetap "DP"
   - ✅ Masih terlihat di Dashboard

3. **Sabtu, 22 April (Checkout lewat)**
   - Admin membuka Riwayat Kunjungan
   - Sistem auto-check: 22 April <= 22 April ✓
   - Status berubah: "DP" → "Selesai"
   - ❌ Hilang dari Dashboard
   - ✅ Muncul di Riwayat Kunjungan

---

## Penjelasan Logika Time Check

```typescript
const today = new Date();
today.setHours(0, 0, 0, 0); // Reset ke tengah malam

const checkoutDate = new Date(data.tgl_checkout);
checkoutDate.setHours(0, 0, 0, 0); // Reset ke tengah malam

// Jika checkout date sudah lewat atau sama dengan hari ini
if (checkoutDate <= today) {
  // Update status ke "Selesai"
  status_reservasi = "Selesai";
}
```

**Contoh**:
- Hari ini: 15 April 2024
- Checkout date: 14 April 2024
- Kondisi: 14 April <= 15 April → **TRUE** ✓
- Aksi: Ubah status ke "Selesai"

---

## Cara Menggunakan Custom Hooks

### Opsi 1: Auto-Archive dengan Window Focus Listener (Recommended)

```typescript
import { useAutoArchiveReservations } from "@/hooks/useAutoArchive";

export default function MyComponent() {
  useAutoArchiveReservations(); // ← Otomatis check saat mount & window focus
  
  return <div>Content...</div>;
}
```

**Kapan digunakan**: Halaman yang sering di-access, dimana staf mungkin beralih ke tab lain

### Opsi 2: Auto-Archive dengan Periodic Interval

```typescript
import { useAutoArchiveWithInterval } from "@/hooks/useAutoArchive";

export default function MyComponent() {
  // Check setiap 5 menit
  useAutoArchiveWithInterval(300000);
  
  return <div>Content...</div>;
}
```

**Kapan digunakan**: Background process untuk memastikan check selalu berjalan

### Opsi 3: Manual Call

```typescript
import { checkAndUpdateReservationStatus } from "@/utils/reservationUtils";

export default function MyComponent() {
  const handleRefresh = async () => {
    await checkAndUpdateReservationStatus();
    // ... reload data
  };
  
  return <button onClick={handleRefresh}>Refresh</button>;
}
```

---

## Testing Fitur

### Test Case 1: Auto-Update Status

**Setup**:
1. Buat reservasi dengan tgl_checkout = kemarin
2. Status: "Aktif"
3. Buka halaman Reservasi

**Expected**:
- Status berubah menjadi "Selesai"
- Data menghilang dari Dashboard
- Data muncul di Riwayat Kunjungan

### Test Case 2: Filter Aktif di Dashboard

**Setup**:
1. Buat 2 reservasi:
   - Reservasi A: Checkout = kemarin (Status "Aktif") → perlu auto-update
   - Reservasi B: Checkout = besok (Status "Aktif") → tetap aktif

**Expected**:
- Dashboard hanya tampil Reservasi B
- Riwayat tampil Reservasi A

### Test Case 3: Monthly Summary

**Setup**:
1. Buat beberapa reservasi di bulan yang sama
2. Buka halaman Riwayat Kunjungan
3. Filter bulan tersebut

**Expected**:
- Summary revenue, total tamu, total reservasi tampil dengan benar
- Data terfilter sesuai bulan

---

## Troubleshooting

### Problem: Data tidak hilang dari Dashboard padahal checkout sudah lewat

**Solusi**:
1. Refresh halaman Browser (Ctrl+R / Cmd+R)
2. Buka ulang halaman Reservasi untuk trigger auto-check
3. Pastikan tanggal sistem lokal sudah benar

### Problem: Tamu muncul di 2 tempat (Dashboard & Riwayat)

**Penyebab**: Data belum ter-update
**Solusi**: Klik tombol "Refresh" atau reload halaman

### Problem: Riwayat Kunjungan tidak menampilkan data apapun

**Solusi**:
1. Pastikan ada reservasi dengan status "Selesai" atau "Batal"
2. Cek filter bulan sudah sesuai
3. Buka halaman Reservasi terlebih dahulu (untuk trigger auto-check)

---

## Notes & Catatan Pengembang

### Persiapan untuk Future Enhancement

1. **Cloud Firestore Scheduled Functions**
   - Bisa menambahkan Cloud Function untuk periodic trigger serverside
   - Lebih reliable untuk production

2. **Notification System**
   - Bisa menambahkan notifikasi ke admin saat auto-archive terjadi
   - Gunakan Firebase Messaging

3. **Batch Operations**
   - Current implementation: Update per-document
   - Future: Batch update untuk performance lebih baik

### Current Limitations

- Auto-check hanya terjadi saat client (browser) aktif
- Tidak ada serverside scheduled trigger (belum)
- Bergantung pada user interaction untuk trigger update

### Migration Notes

Jika ada data lama tanpa field `status_reservasi`:
1. Sistem akan handle dengan default value "Aktif"
2. Bisa run migration script untuk backfill data
3. Misal: Semua reservasi dengan checkout < hari ini dijadikan "Selesai"

---

## Summary Fitur

✨ **Fitur Auto-Archive Selesai Diimplementasikan**:

✅ Field status_reservasi ditambahkan ke data model
✅ Utility function `checkAndUpdateReservationStatus()` untuk auto-update
✅ Custom hooks untuk seamless integration
✅ Komponen RecentOrdersGuest untuk menampilkan tamu aktif
✅ Halaman Riwayat Kunjungan dengan filter bulan & summary
✅ Menu baru di sidebar
✅ Auto-trigger pada berbagai event

🎯 **Next Steps**:
- Test di production environment
- Monitor performa
- Gather feedback dari staf
- Implementasi Cloud Functions untuk serverside trigger (optional)

---

*Dokumentasi ini dibuat untuk memudahkan maintenance dan pengembangan fitur Auto-Archive.*
