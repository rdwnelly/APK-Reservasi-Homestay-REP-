import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "@/utils/reservationUtils";

interface ExportData {
  id?: string;
  nama_tamu: string;
  no_hp: string;
  id_kamar: string;
  sumber_booking?: string;
  tgl_checkin: string;
  tgl_checkout: string;
  status_bayar: string;
  total_tagihan: string;
  jumlah_tamu?: string | number;
}

interface FinancialTotals {
  pemasukanLunas: number;
  totalDP: number;
  piutangBelumBayar: number;
  totalCash: number;
  totalGuests: number;
}

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
};

export const exportRiwayatTutupBukuPDF = (
  filteredList: ExportData[],
  startDate: string,
  endDate: string,
  totals: FinancialTotals
) => {
  // A4 Landscape mode
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Header Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text("HOMESTAY ARUM - LAPORAN RIWAYAT KUNJUNGAN & TUTUP BUKU", 14, 15);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Periode Tutup Buku: ${formatDate(startDate)} s/d ${formatDate(endDate)}`, 14, 22);
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`, 14, 27);

  // Line Separator
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.6);
  doc.line(14, 30, 283, 30);

  // Summary Financial Header Box
  autoTable(doc, {
    startY: 34,
    head: [["Pemasukan (Lunas)", "DP (Uang Muka)", "Piutang (Belum Bayar)", "Total Cash Inflow", "Total Tamu & Reservasi"]],
    body: [[
      formatRupiah(totals.pemasukanLunas),
      formatRupiah(totals.totalDP),
      formatRupiah(totals.piutangBelumBayar),
      formatRupiah(totals.totalCash),
      `${totals.totalGuests} Orang (${filteredList.length} Reservasi)`
    ]],
    theme: "grid",
    headStyles: { 
      fillColor: [37, 99, 235], // Blue-600
      textColor: 255, 
      fontStyle: "bold", 
      fontSize: 8.5,
      halign: "center"
    },
    bodyStyles: { 
      fontSize: 8.5, 
      fontStyle: "bold", 
      textColor: [30, 41, 59],
      halign: "center"
    },
    margin: { left: 14, right: 14 }
  });

  // Table Data
  const tableRows = filteredList.map((item, index) => {
    const checkIn = new Date(item.tgl_checkin);
    const checkOut = new Date(item.tgl_checkout);
    const diff = checkOut.getTime() - checkIn.getTime();
    const nights = Math.ceil(diff / (1000 * 3600 * 24));
    const durasiStr = nights > 0 ? `${nights} Malam` : "-";

    const tagihanNum = Number(String(item.total_tagihan).replace(/[^0-9-]/g, "")) || 0;

    return [
      index + 1,
      `#${item.id?.slice(0, 6).toUpperCase() || "RES"}`,
      item.nama_tamu,
      item.no_hp || "-",
      item.id_kamar,
      item.sumber_booking || "Langsung",
      formatDate(item.tgl_checkin),
      formatDate(item.tgl_checkout),
      durasiStr,
      item.status_bayar || "-",
      formatRupiah(tagihanNum)
    ];
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Detail Riwayat Kunjungan Tamu:", 14, finalY);

  autoTable(doc, {
    startY: finalY + 4,
    head: [["No", "ID", "Nama Tamu", "No HP", "Kamar", "Sumber", "Check-in", "Check-out", "Durasi", "Status", "Tagihan"]],
    body: tableRows,
    theme: "striped",
    headStyles: { 
      fillColor: [15, 23, 42], // Slate-900
      textColor: 255, 
      fontSize: 8, 
      fontStyle: "bold" 
    },
    bodyStyles: { 
      fontSize: 8,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 20 },
      2: { cellWidth: 36 },
      3: { cellWidth: 25 },
      4: { cellWidth: 32 },
      5: { cellWidth: 22 },
      6: { cellWidth: 28 },
      7: { cellWidth: 28 },
      8: { cellWidth: 18, halign: "center" },
      9: { cellWidth: 22, halign: "center" },
      10: { cellWidth: 28, halign: "right" },
    },
    margin: { left: 14, right: 14 }
  });

  // Footer stamp
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Dokumen Resmi Homestay ARUM | Halaman ${i} dari ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  // Save PDF file
  const fileName = `Laporan_Riwayat_TutupBuku_${startDate}_sd_${endDate}.pdf`;
  doc.save(fileName);
};
