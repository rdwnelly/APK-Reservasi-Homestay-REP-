"use client";

import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, getDocs, where } from "firebase/firestore";

interface ReservationData {
  id?: string;
  nama_tamu: string;
  no_hp: string;
  sumber_booking: string;
  id_kamar: string;
  tgl_checkin: string;
  tgl_checkout: string;
  status_bayar: string;
  total_tagihan: string;
}

const ReservasiPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // State baru untuk menampung daftar reservasi dari Database
  const [reservasiList, setReservasiList] = useState<ReservationData[]>([]);

  const [formData, setFormData] = useState<ReservationData>({
    nama_tamu: "", no_hp: "", sumber_booking: "Langsung", id_kamar: "Double Room AC",
    tgl_checkin: "", tgl_checkout: "", status_bayar: "Belum Bayar", total_tagihan: "",
  });

  // 1. EFEK "MATA SISTEM": Menarik data secara Real-Time dari Firebase
  useEffect(() => {
    const q = query(collection(db, "reservasi"));
    // onSnapshot membuat data langsung ter-update tanpa perlu refresh browser
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as ReservationData }));
      // Urutkan berdasarkan tanggal check-in (opsional, untuk kerapian)
      data.sort((a, b) => new Date(a.tgl_checkin).getTime() - new Date(b.tgl_checkin).getTime());
      setReservasiList(data as ReservationData[]);
    });
    return () => unsubscribe();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 2. OTAK SISTEM: Fungsi Simpan & Logika Pencegah Double Booking
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // --- VALIDASI TANGGAL DASAR ---
      const newIn = new Date(formData.tgl_checkin);
      const newOut = new Date(formData.tgl_checkout);

      // Pastikan tanggal valid
      if (isNaN(newIn.getTime()) || isNaN(newOut.getTime())) {
        alert("⚠️ Tanggal check-in atau check-out tidak valid!");
        setIsLoading(false);
        return;
      }

      // Pastikan check-out setelah check-in
      if (newOut <= newIn) {
        alert("⚠️ Tanggal check-out harus setelah tanggal check-in!");
        setIsLoading(false);
        return;
      }

      // --- LOGIKA PENCEGAH BENTROK (ALGORITMA OVERLAP) ---
      // a. Ambil semua data tamu lama yang menyewa kamar yang sama
      const qKamar = query(collection(db, "reservasi"), where("id_kamar", "==", formData.id_kamar));
      const querySnapshot = await getDocs(qKamar);
      let isOverlap = false;
      let conflictingReservation: ReservationData | null = null;

      // b. Cek satu per satu jadwal tamu lama
      querySnapshot.forEach((doc) => {
        const data = doc.data() as ReservationData;
        const oldIn = new Date(data.tgl_checkin);
        const oldOut = new Date(data.tgl_checkout);

        // c. Rumus Overlap: (Tanggal Mulai Baru < Tanggal Selesai Lama) DAN (Tanggal Selesai Baru > Tanggal Mulai Lama)
        if (newIn < oldOut && newOut > oldIn) {
          isOverlap = true;
          conflictingReservation = data;
        }
      });

      // d. Jika bentrok, hentikan proses dan tolak!
      if (isOverlap && conflictingReservation) {
        const conflict = conflictingReservation as ReservationData;
        const conflictInfo = `\n\nDetail Konflik:\n• Tamu: ${conflict.nama_tamu}\n• Check-in: ${conflict.tgl_checkin}\n• Check-out: ${conflict.tgl_checkout}`;

        alert(`🚫 DOUBLE-BOOKING TERDETEKSI!\n\nKamar "${formData.id_kamar}" sudah dipesan oleh tamu lain pada rentang tanggal tersebut.\n\n${conflictInfo}\n\nSilakan pilih:\n• Kamar yang berbeda\n• Tanggal check-in/check-out yang berbeda`);
        setIsLoading(false);
        return; // Kode berhenti di sini, data batal disimpan.
      }
      // ----------------------------------------------------

      // Jika aman (tidak bentrok), sistem lanjut menyimpan ke Cloud
      await addDoc(collection(db, "reservasi"), formData);
      alert("✅ Puji Tuhan! Reservasi berhasil disimpan tanpa konflik.");
      setIsModalOpen(false);
      setFormData({
        nama_tamu: "", no_hp: "", sumber_booking: "Langsung", id_kamar: "Double Room AC",
        tgl_checkin: "", tgl_checkout: "", status_bayar: "Belum Bayar", total_tagihan: "",
      });
    } catch (error) {
      console.error("Error menambah data: ", error);
      alert("❌ Maaf, terjadi kesalahan pada jaringan/sistem. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi pembantu warna status bayar
  const getStatusColor = (status: string) => {
    if (status === "Lunas") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (status === "DP") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-rose-100 text-rose-800 border-rose-200"; // Belum Bayar
  };

  // Aksi hapus reservasi
  const handleDeleteReservation = async (id: string | undefined) => {
    if (!id) return;

    const shouldDelete = confirm("Apakah Anda yakin ingin menghapus reservasi ini? Tindakan ini tidak dapat dibatalkan.");
    if (!shouldDelete) return;

    try {
      await deleteDoc(doc(db, "reservasi", id));
      alert("✅ Reservasi berhasil dihapus.");
    } catch (error) {
      console.error("Error menghapus reservasi:", error);
      alert("❌ Gagal menghapus reservasi. Coba lagi.");
    }
  };

  return (
    <>
      <PageBreadcrumb pageTitle="Kelola Reservasi" />

      <div className="flex flex-col gap-10 relative">
        <div className="flex justify-between items-center bg-white p-5 rounded-sm border border-stroke shadow-default dark:border-strokedark dark:bg-boxdark">
          <div>
            <h2 className="text-title-md2 font-semibold text-black dark:text-white">Daftar Tamu Homestay</h2>
            <p className="text-sm text-gray-500 mt-1">Kelola jadwal Rumsram dan Homestay REP.</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded bg-primary py-2.5 px-6 font-medium text-white hover:bg-opacity-90 transition-all">
            + Tambah Reservasi
          </button>
        </div>

        <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-2 text-left dark:bg-meta-4">
                  <th className="py-4 px-4 font-medium text-black dark:text-white">Nama Tamu & OTA</th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white">Pilihan Kamar</th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white">Jadwal Check-in/out</th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white">Status Bayar</th>
                </tr>
              </thead>
              <tbody>
                {/* 3. TAMPILAN DINAMIS: Me-looping data dari Cloud Database */}
                {reservasiList.length === 0 ? (
                  <tr className="border-b border-stroke dark:border-strokedark">
                    <td colSpan={4} className="py-8 text-center text-sm font-medium text-gray-500">
                      Memuat data dari Cloud... (Atau belum ada reservasi)
                    </td>
                  </tr>
                ) : (
                  reservasiList.map((item) => (
                    <tr key={item.id} className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors">
                      <td className="py-4 px-4">
                        <p className="font-semibold text-black dark:text-white">{item.nama_tamu}</p>
                        <p className="text-xs text-gray-500">{item.sumber_booking} • {item.no_hp}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-black dark:text-white">{item.id_kamar}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-black dark:text-white">In: {item.tgl_checkin}</p>
                        <p className="text-sm text-gray-500">Out: {item.tgl_checkout}</p>
                      </td>
                      <td className="py-4 px-4 flex flex-col gap-2">
                        <span className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium border ${getStatusColor(item.status_bayar)}`}>
                          {item.status_bayar}
                        </span>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded bg-rose-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-600 transition"
                          onClick={() => handleDeleteReservation(item.id)}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL FORMULIR (Tetap sama seperti sebelumnya) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark overflow-y-auto max-h-[90vh]">
              <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark flex justify-between items-center">
                <h3 className="font-medium text-black dark:text-white">Formulir Reservasi Baru</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-red-500 text-xl font-bold">&times;</button>
              </div>
              <form onSubmit={handleSubmit} className="p-6.5">
                <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">Nama Tamu <span className="text-meta-1">*</span></label>
                    <input type="text" name="nama_tamu" required value={formData.nama_tamu} onChange={handleInputChange} placeholder="Masukkan nama" className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input" />
                  </div>
                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">No. WhatsApp</label>
                    <input type="text" name="no_hp" value={formData.no_hp} onChange={handleInputChange} placeholder="Contoh: 0812..." className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input" />
                  </div>
                </div>

                <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">Tanggal Check-in <span className="text-meta-1">*</span></label>
                    <input type="date" name="tgl_checkin" required value={formData.tgl_checkin} onChange={handleInputChange} className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input" />
                  </div>
                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">Tanggal Check-out <span className="text-meta-1">*</span></label>
                    <input type="date" name="tgl_checkout" required value={formData.tgl_checkout} onChange={handleInputChange} className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input" />
                  </div>
                </div>

                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">Pilih Kamar Homestay <span className="text-meta-1">*</span></label>
                  <select name="id_kamar" value={formData.id_kamar} onChange={handleInputChange} className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input">
                    <option value="Double Room AC">Double Room AC - Rp 1.100.000/orang</option>
                    <option value="Standard Room AC">Standard Room AC - Rp 950.000/orang</option>
                    <option value="Standard Non-AC">Standard Non-AC - Rp 900.000/orang</option>
                    <option value="Single Room">Single Room - Rp 550.000/orang</option>
                  </select>
                </div>

                <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                  <div className="w-full xl:w-1/3">
                    <label className="mb-2.5 block text-black dark:text-white">Sumber (OTA)</label>
                    <select name="sumber_booking" value={formData.sumber_booking} onChange={handleInputChange} className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input">
                      <option value="Langsung">Langsung (WA)</option>
                      <option value="Traveloka">Traveloka</option>
                      <option value="Tiket.com">Tiket.com</option>
                      <option value="Agoda">Agoda</option>
                    </select>
                  </div>
                  <div className="w-full xl:w-1/3">
                    <label className="mb-2.5 block text-black dark:text-white">Total (Rp)</label>
                    <input type="number" name="total_tagihan" value={formData.total_tagihan} onChange={handleInputChange} placeholder="1100000" className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input" />
                  </div>
                  <div className="w-full xl:w-1/3">
                    <label className="mb-2.5 block text-black dark:text-white">Status Bayar</label>
                    <select name="status_bayar" value={formData.status_bayar} onChange={handleInputChange} className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input">
                      <option value="Belum Bayar">Belum Bayar</option>
                      <option value="DP">DP (Uang Muka)</option>
                      <option value="Lunas">Lunas</option>
                    </select>
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="flex w-full justify-center rounded bg-primary p-3 font-medium text-white hover:bg-opacity-90 disabled:bg-gray-400 mt-6">
                  {isLoading ? "Memproses..." : "Simpan Reservasi"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ReservasiPage;