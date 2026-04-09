"use client";

import React, { useEffect, useState } from 'react';
import PageBreadCrumb from '@/components/common/PageBreadCrumb';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

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
}

export default function BookingDetail() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<ReservationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return;
      try {
        const docRef = doc(db, "reservasi", params.id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setData({ id: docSnap.id, ...docSnap.data() } as ReservationData);
        } else {
          alert("Data reservasi tidak ditemukan.");
          router.push('/reservasi');
        }
      } catch (error) {
        console.error("Error mengambil data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [params.id, router]);

  const toCurrency = (value: string | number) => {
    const num = Number(String(value).replace(/[^0-9-]/g, ""));
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const getJumlahMalam = (inDate: string, outDate: string) => {
    if (!inDate || !outDate) return "-";
    const diff = new Date(outDate).getTime() - new Date(inDate).getTime();
    const days = diff / (1000 * 3600 * 24);
    return days > 0 ? `${days} Malam` : "-";
  };

  if (loading) {
    return (
      <div>
        <PageBreadCrumb pageTitle="Detail Pemesanan Kamar" />
        <div className="flex justify-center p-10 text-gray-500">Memuat data...</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <PageBreadCrumb pageTitle="Detail Pemesanan Kamar" />

      <button 
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        &larr; Kembali
      </button>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        
        {/* Header Status & ID */}
        <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              ID Reservasi: <span className="text-blue-600">#{data.id?.slice(0, 6).toUpperCase()}</span>
            </h3>
            <p className="text-sm text-gray-500 mt-1">Status Kamar: {data.kamar_siap ? "Siap" : "Belum Siap"}</p>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
            data.status_bayar === 'Lunas' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
            data.status_bayar === 'Batal' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>
            {data.status_bayar}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
          
          {/* Informasi Tamu */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-800/50">
            <h4 className="mb-4 text-base font-semibold text-gray-800 dark:text-white border-b pb-2 dark:border-gray-700">Data Tamu</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Nama Lengkap</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{data.nama_tamu}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Jumlah Tamu</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{data.jumlah_tamu ? `${data.jumlah_tamu} Orang` : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">No. WhatsApp</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{data.no_hp || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sumber Booking</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{data.sumber_booking}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Jadwal Check-in</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {data.tgl_checkin} {data.jam_kedatangan && `(${data.jam_kedatangan})`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Jadwal Check-out</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{data.tgl_checkout}</span>
              </div>
            </div>
          </div>

          {/* Rincian Kamar & Fasilitas */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-800/50">
            <h4 className="mb-4 text-base font-semibold text-gray-800 dark:text-white border-b pb-2 dark:border-gray-700">Rincian Homestay</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-start">
                <span className="text-gray-500">Tipe Kamar</span>
                <div className="text-right">
                  <span className="font-medium text-gray-800 dark:text-gray-200 block">{data.id_kamar}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Durasi Menginap</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{getJumlahMalam(data.tgl_checkin, data.tgl_checkout)}</span>
              </div>
              <div className="mt-4 pt-3 border-t border-dashed border-gray-300 dark:border-gray-700">
                <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 block mb-2">
                  Fasilitas (Default):
                </span>
                <ul className="list-disc pl-4 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <li>Makan 2x & Snack 2x (Yaswar Cafe)</li>
                  <li>Bebas Akses Kostum Papua</li>
                  <li>Kunjungan Rumah Tradisional & Museum</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Layanan Tambahan (Bisa dikembangkan lebih lanjut) */}
        <div className="border-t border-gray-200 p-6 dark:border-gray-800">
          <h4 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">Ringkasan Tagihan</h4>
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Item Layanan</th>
                <th className="px-4 py-3 text-right rounded-r-lg">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                  {data.id_kamar} ({getJumlahMalam(data.tgl_checkin, data.tgl_checkout)})
                </td>
                <td className="px-4 py-3 text-right">{toCurrency(data.total_tagihan || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Total Pembayaran */}
        <div className="bg-gray-50 p-6 dark:bg-gray-800/30 flex justify-end">
          <div className="w-full max-w-sm space-y-3">
            <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-bold text-gray-800 dark:border-gray-700 dark:text-white">
              <span>Total Tagihan</span>
              <span>{toCurrency(data.total_tagihan || 0)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
