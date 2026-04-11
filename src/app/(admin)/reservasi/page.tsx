"use client";

import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, getDocs, where, updateDoc } from "firebase/firestore";
import Link from "next/link";

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
}

const ReservasiPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // State baru untuk menampung daftar reservasi dari Database
  const [reservasiList, setReservasiList] = useState<ReservationData[]>([]);

  const [formData, setFormData] = useState<ReservationData>({
    nama_tamu: "", jumlah_tamu: "", no_hp: "", sumber_booking: "Langsung", id_kamar: "Double Room AC",
    tgl_checkin: "", tgl_checkout: "", jam_kedatangan: "", kamar_siap: false, status_bayar: "Belum Bayar", total_tagihan: "",
    status_kebersihan: "siap"
  });
  // Fungsi pembantu status kebersihan
  const getKebersihanLabel = (status?: string) => {
    if (status === "siap") return { label: "🟢 Siap Huni", color: "bg-green-100 text-green-800 border-green-200" };
    if (status === "dipakai") return { label: "🔴 Sedang Dipakai", color: "bg-red-100 text-red-800 border-red-200" };
    if (status === "perlu_bersih") return { label: "🟡 Perlu Dibersihkan", color: "bg-yellow-100 text-yellow-800 border-yellow-200" };
    return { label: "-", color: "bg-gray-100 text-gray-800 border-gray-200" };
  };

  const handleEditClick = (item: ReservationData) => {
    setEditingId(item.id || null);
    setFormData({ ...item, status_kebersihan: item.status_kebersihan || "siap" });
    setIsModalOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingId(null);
    setFormData({
      nama_tamu: "", jumlah_tamu: "", no_hp: "", sumber_booking: "Langsung", id_kamar: "Double Room AC",
      tgl_checkin: "", tgl_checkout: "", jam_kedatangan: "", kamar_siap: false, status_bayar: "Belum Bayar", total_tagihan: "",
      status_kebersihan: "siap"
    });
    setIsModalOpen(true);
  };

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
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setFormData({ ...formData, [target.name]: value });
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
        if (doc.id === editingId) return; // Lewati pengecekan dengan dirinya sendiri saat edit

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
      if (editingId) {
        await updateDoc(doc(db, "reservasi", editingId), formData as ReservationData);
        alert("✅ Reservasi berhasil diperbarui.");
      } else {
        await addDoc(collection(db, "reservasi"), formData);
        alert("✅ Puji Tuhan! Reservasi berhasil disimpan tanpa konflik.");
      }
      
      setIsModalOpen(false);
      setFormData({
        nama_tamu: "", jumlah_tamu: "", no_hp: "", sumber_booking: "Langsung", id_kamar: "Double Room AC",
        tgl_checkin: "", tgl_checkout: "", jam_kedatangan: "", kamar_siap: false, status_bayar: "Belum Bayar", total_tagihan: "",
        status_kebersihan: "siap"
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
    if (status === "DP" || status === "DP/Uang Muka") return "bg-amber-100 text-amber-800 border-amber-200";
    if (status === "Batal") return "bg-rose-100 text-rose-800 border-rose-200";
    return "bg-rose-100 text-rose-800 border-rose-200"; // Belum Bayar
  };

  const getJumlahMalam = (inDate: string, outDate: string) => {
    if (!inDate || !outDate) return "-";
    const diff = new Date(outDate).getTime() - new Date(inDate).getTime();
    const days = diff / (1000 * 3600 * 24);
    return days > 0 ? `${days} Malam` : "-";
  };

  const handleToggleKamarSiap = async (id: string | undefined, currentStatus: boolean) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, "reservasi", id), {
        kamar_siap: !currentStatus
      });
    } catch (error) {
      console.error("Error updating kamar_siap:", error);
      alert("❌ Gagal memperbarui status kamar.");
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
          <button onClick={handleAddNewClick} className="flex items-center gap-2 rounded bg-primary py-2.5 px-6 font-medium text-white hover:bg-opacity-90 transition-all">
            + Tambah Reservasi
          </button>
        </div>

        <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-2 text-left dark:bg-meta-4">
                  <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap">ID & Nama Tamu</th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap">Jml Tamu</th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap">Jml Malam</th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap">Sumber Booking</th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap">Tipe Kamar</th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap">Harga Kamar</th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap">Check-in</th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap">Check-out</th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap">Jam Kedatangan</th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap text-center">Status Bayar</th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap text-center">Status Kebersihan</th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white whitespace-nowrap text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {/* 3. TAMPILAN DINAMIS: Me-looping data dari Cloud Database */}
                {reservasiList.length === 0 ? (
                  <tr className="border-b border-stroke dark:border-strokedark">
                    <td colSpan={11} className="py-8 text-center text-sm font-medium text-gray-500">
                      Memuat data dari Cloud... (Atau belum ada reservasi)
                    </td>
                  </tr>
                ) : (
                  reservasiList.map((item) => (
                    <tr key={item.id} className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors">
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="text-xs text-gray-500">#{item.id?.slice(0, 6).toUpperCase()}</p>
                        <p className="font-semibold text-black dark:text-white">{item.nama_tamu}</p>
                        <p className="text-xs text-gray-500">{item.no_hp}</p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="text-sm text-black dark:text-white">{item.jumlah_tamu ? `${item.jumlah_tamu} Orang` : "-"}</p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="text-sm text-black dark:text-white">{getJumlahMalam(item.tgl_checkin, item.tgl_checkout)}</p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="text-sm text-black dark:text-white">{item.sumber_booking}</p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="font-medium text-black dark:text-white">{item.id_kamar}</p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="text-sm text-black dark:text-white">
                          {item.total_tagihan ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(item.total_tagihan)) : "-"}
                        </p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="text-sm text-black dark:text-white">{item.tgl_checkin}</p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="text-sm text-black dark:text-white">{item.tgl_checkout}</p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-primary">{item.jam_kedatangan || "-"}</p>
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium border ${getStatusColor(item.status_bayar)}`}>
                          {item.status_bayar}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium border ${getKebersihanLabel(item.status_kebersihan).color}`}>
                          {getKebersihanLabel(item.status_kebersihan).label}
                        </span>
                        <div className="flex gap-1 mt-1 justify-center">
                          <button
                            type="button"
                            className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 border border-green-200 hover:bg-green-200"
                            onClick={async () => await updateDoc(doc(db, "reservasi", item.id!), { status_kebersihan: "siap" })}
                          >🟢</button>
                          <button
                            type="button"
                            className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-200"
                            onClick={async () => await updateDoc(doc(db, "reservasi", item.id!), { status_kebersihan: "perlu_bersih" })}
                          >🟡</button>
                          <button
                            type="button"
                            className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 border border-red-200 hover:bg-red-200"
                            onClick={async () => await updateDoc(doc(db, "reservasi", item.id!), { status_kebersihan: "dipakai" })}
                          >🔴</button>
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/reservasi/${item.id}`}
                            className="inline-flex items-center justify-center rounded bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition"
                          >
                            Detail
                          </Link>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition"
                            onClick={() => handleEditClick(item)}
                          >
                            Ubah
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition"
                            onClick={async () => {
                              if (confirm('Yakin ingin menghapus reservasi ini?')) {
                                await deleteDoc(doc(db, "reservasi", item.id!));
                              }
                            }}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL FORMULIR */}
        {isModalOpen && (
          <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark overflow-y-auto max-h-[90vh]">
              <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark flex justify-between items-center">
                <h3 className="font-medium text-black dark:text-white">{editingId ? "Ubah Reservasi" : "Formulir Reservasi Baru"}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-red-500 text-xl font-bold">&times;</button>
              </div>
              <form onSubmit={handleSubmit} className="p-6.5">
                <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                  <div className="w-full xl:w-1/3">
                    <label className="mb-2.5 block text-black dark:text-white">Nama Tamu <span className="text-meta-1">*</span></label>
                    <input type="text" name="nama_tamu" required value={formData.nama_tamu} onChange={handleInputChange} placeholder="Masukkan nama" className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input" />
                  </div>
                  <div className="w-full xl:w-1/3">
                    <label className="mb-2.5 block text-black dark:text-white">Jumlah Tamu</label>
                    <input type="number" name="jumlah_tamu" value={formData.jumlah_tamu} onChange={handleInputChange} placeholder="Misal: 2" min="1" className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input" />
                  </div>
                  <div className="w-full xl:w-1/3">
                    <label className="mb-2.5 block text-black dark:text-white">No. WhatsApp</label>
                    <input type="text" name="no_hp" value={formData.no_hp} onChange={handleInputChange} placeholder="Contoh: 0812..." className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input" />
                  </div>
                </div>

                <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                  <div className="w-full xl:w-1/3">
                    <label className="mb-2.5 block text-black dark:text-white">Tanggal Check-in <span className="text-meta-1">*</span></label>
                    <input type="date" name="tgl_checkin" required value={formData.tgl_checkin} onChange={handleInputChange} className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input" />
                  </div>
                  <div className="w-full xl:w-1/3">
                    <label className="mb-2.5 block text-black dark:text-white">Jam Kedatangan</label>
                    <input type="time" name="jam_kedatangan" value={formData.jam_kedatangan} onChange={handleInputChange} className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input" />
                  </div>
                  <div className="w-full xl:w-1/3">
                    <label className="mb-2.5 block text-black dark:text-white">Tanggal Check-out <span className="text-meta-1">*</span></label>
                    <input type="date" name="tgl_checkout" required value={formData.tgl_checkout} onChange={handleInputChange} className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input" />
                  </div>
                </div>

                <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">Pilih Kamar Homestay <span className="text-meta-1">*</span></label>
                    <select name="id_kamar" value={formData.id_kamar} onChange={handleInputChange} className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input">
                      <option value="Double Room AC">Double Room AC - Rp 1.100.000/orang</option>
                      <option value="Standard Room AC">Standard Room AC - Rp 950.000/orang</option>
                      <option value="Standard Non-AC">Standard Non-AC - Rp 900.000/orang</option>
                      <option value="Single Room">Single Room - Rp 550.000/orang</option>
                    </select>
                  </div>
                  <div className="w-full xl:w-1/2 flex items-center xl:mt-8">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        name="kamar_siap"
                        checked={formData.kamar_siap}
                        onChange={handleInputChange}
                        className="w-5 h-5 cursor-pointer rounded border-stroke"
                      />
                      <span className="text-black dark:text-white font-medium">Kamar Sudah Siap</span>
                    </label>
                  </div>
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
                      <option value="Batal">Batal</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-2.5 block text-black dark:text-white">Status Kebersihan Kamar</label>
                  <select name="status_kebersihan" value={formData.status_kebersihan} onChange={handleInputChange} className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input">
                    <option value="siap">🟢 Siap Huni</option>
                    <option value="dipakai">🔴 Sedang Dipakai</option>
                    <option value="perlu_bersih">🟡 Perlu Dibersihkan</option>
                  </select>
                </div>
                <button type="submit" disabled={isLoading} className="flex w-full justify-center rounded bg-primary p-3 font-medium text-white hover:bg-opacity-90 disabled:bg-gray-400 mt-6">
                  {isLoading ? "Memproses..." : (editingId ? "Simpan Perubahan" : "Simpan Reservasi")}
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