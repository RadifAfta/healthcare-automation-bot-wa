import { google } from 'googleapis';
import { env } from '../config/env';
import { ExtractedBooking } from './ai.service';

// Interface untuk item katalog layanan Klinik Gigi
export interface ClinicServiceItem {
  nama: string;
  harga: number;
  durasi?: string;
  dokter?: string;
  kategori?: string;
}

// Katalog cadangan (fallback) khusus Klinik Gigi (Dental Clinic)
const FALLBACK_CLINIC_CATALOG: ClinicServiceItem[] = [
  { nama: 'Scaling Gigi (Pembersihan Karang)', harga: 250000, durasi: '45 menit', dokter: 'drg. Amanda, Sp.KGA', kategori: 'Pencegahan' },
  { nama: 'Tambal Gigi Komposit (Per Gigi)', harga: 350000, durasi: '45 menit', dokter: 'drg. Budi, Sp.KG', kategori: 'Konservasi' },
  { nama: 'Bleaching Gigi (Pemutihan Gigi)', harga: 1500000, durasi: '60 menit', dokter: 'drg. Amanda, Sp.KGA', kategori: 'Estetika Gigi' },
  { nama: 'Pasang Behel / Kawat Gigi Metal', harga: 4500000, durasi: '60 menit', dokter: 'drg. Maya, Sp.Ort', kategori: 'Ortodonti' },
  { nama: 'Cabut Gigi Bungsu / Molar', harga: 800000, durasi: '45 menit', dokter: 'drg. Budi, Sp.BM', kategori: 'Bedah Mulut' },
  { nama: 'Konsultasi Dokter Gigi & Check-up', harga: 100000, durasi: '30 menit', dokter: 'Tim Dokter Gigi', kategori: 'Umum' }
];

// Bersihkan Private Key dari string escape character "\\n"
const sanitizePrivateKey = (key: string): string => {
  return key.replace(/\\n/g, '\n');
};

// Inisialisasi Google Auth Service Account JWT
const auth = new google.auth.JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: sanitizePrivateKey(env.GOOGLE_PRIVATE_KEY),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Inisialisasi Google Sheets API client (versi v4)
const sheets = google.sheets({
  version: 'v4',
  auth,
});

/**
 * Service untuk mengambil data katalog perawatan Klinik Gigi dari Google Sheets tab 'Katalog'.
 * Mendukung graceful fallback jika tab belum diisi.
 */
export const getCatalogFromSheet = async (): Promise<ClinicServiceItem[]> => {
  try {
    const spreadsheetId = env.GOOGLE_SPREADSHEET_ID;
    const range = 'Katalog!A2:E'; // Kolom: Nama Layanan, Harga, Durasi, Dokter Gigi, Kategori

    console.log(`📊 [Sheets Service] Mencoba memuat katalog perawatan Klinik Gigi dari Google Sheets...`);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.warn('⚠️ [Sheets Service] Tab "Katalog" kosong. Menggunakan katalog default Klinik Gigi (fallback).');
      return FALLBACK_CLINIC_CATALOG;
    }

    const catalog: ClinicServiceItem[] = rows
      .map((row) => ({
        nama: row[0]?.trim() || '',
        harga: parseInt(row[1]?.replace(/[^0-9]/g, '') || '0', 10),
        durasi: row[2]?.trim() || '45 menit',
        dokter: row[3]?.trim() || 'Tim Dokter Gigi',
        kategori: row[4]?.trim() || 'Dental',
      }))
      .filter((item) => item.nama !== '');

    console.log(`✅ [Sheets Service] Sukses memuat ${catalog.length} tindakan gigi dari Google Sheets.`);
    return catalog;
  } catch (error: any) {
    console.error('⚠️ [Sheets Service] Gagal mengambil katalog dari Google Sheets:', error.message || error);
    console.log('ℹ️ Menggunakan katalog default Klinik Gigi (fallback) agar bot tetap berjalan.');
    return FALLBACK_CLINIC_CATALOG;
  }
};

/**
 * Service untuk menyisipkan data reservasi pasien Klinik Gigi ke Google Sheets secara otomatis.
 */
export const appendBookingToSheet = async (booking: ExtractedBooking): Promise<void> => {
  try {
    const spreadsheetId = env.GOOGLE_SPREADSHEET_ID;
    const range = 'Sheet1!A:H';

    // 1. Format rincian tindakan gigi
    const treatmentDetails = booking.layanan_dipilih
      .map((item) => `${item.nama_layanan} (Rp${item.estimasi_harga.toLocaleString('id-ID')})`)
      .join(', ');

    // 2. Buat timestamp input
    const timestamp = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'medium',
    });

    // 3. Susun data baris baru yang akan ditambahkan ke Google Sheets
    // Format Kolom: [Nama Pasien, Nomor HP, Tindakan Gigi, Tanggal Booking, Jam Slot, Dokter Gigi Pilihan, Timestamp, Total Estimasi]
    const rowValues = [
      booking.nama_pasien || '-',
      booking.nomor_hp || '-',
      treatmentDetails || '-',
      booking.tanggal_booking || '-',
      booking.jam_booking || '-',
      booking.dokter_pilihan || '-',
      timestamp,
      booking.total_estimasi || 0,
    ];

    console.log(`📊 [Sheets Service] Menulis data reservasi pasien Klinik Gigi ke Google Sheets...`);
    console.log(`📊 [Sheets Service] Data Baris:`, rowValues);

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues],
      },
    });

    console.log(`✅ [Sheets Service] Data reservasi Klinik Gigi berhasil ditulis ke Sheets! Status HTTP: ${response.status}`);
  } catch (error: any) {
    console.error('❌ [Sheets Service] Gagal menulis data reservasi ke Google Sheets:', error.message || error);
    throw error;
  }
};
