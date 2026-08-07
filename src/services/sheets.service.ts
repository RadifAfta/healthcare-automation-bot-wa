import { google } from 'googleapis';
import { env } from '../config/env';
import { ExtractedBooking } from './ai.service';

// Interface untuk item katalog layanan klinik
export interface ClinicServiceItem {
  nama: string;
  harga: number;
  durasi?: string;
  dokter?: string;
  kategori?: string;
}

// Katalog cadangan (fallback) jika tab 'Katalog' di Google Sheet belum dibuat merchant
const FALLBACK_CLINIC_CATALOG: ClinicServiceItem[] = [
  { nama: 'Scaling Gigi (Pembersihan Karang)', harga: 250000, durasi: '45 menit', dokter: 'drg. Amanda', kategori: 'Gigi' },
  { nama: 'Bleaching Gigi (Pemutihan Gigi)', harga: 1500000, durasi: '60 menit', dokter: 'drg. Amanda', kategori: 'Gigi' },
  { nama: 'Facial Glow & Deep Cleansing', harga: 300000, durasi: '60 menit', dokter: 'Beautician Siska', kategori: 'Kecantikan' },
  { nama: 'Laser Acne Treatment', harga: 750000, durasi: '45 menit', dokter: 'dr. Siska, Sp.DV', kategori: 'Kecantikan' },
  { nama: 'Konsultasi Dokter Gigi/Kecantikan', harga: 100000, durasi: '30 menit', dokter: 'Tim Dokter Klinik', kategori: 'Umum' }
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
 * Service untuk mengambil data katalog perawatan klinik dari Google Sheets tab 'Katalog'.
 * Mendukung graceful fallback jika tab belum diisi.
 */
export const getCatalogFromSheet = async (): Promise<ClinicServiceItem[]> => {
  try {
    const spreadsheetId = env.GOOGLE_SPREADSHEET_ID;
    const range = 'Katalog!A2:E'; // Kolom: Nama Layanan, Harga, Durasi, Dokter, Kategori

    console.log(`📊 [Sheets Service] Mencoba memuat katalog layanan klinik dari Google Sheets...`);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.warn('⚠️ [Sheets Service] Tab "Katalog" kosong. Menggunakan katalog default klinik (fallback).');
      return FALLBACK_CLINIC_CATALOG;
    }

    const catalog: ClinicServiceItem[] = rows
      .map((row) => ({
        nama: row[0]?.trim() || '',
        harga: parseInt(row[1]?.replace(/[^0-9]/g, '') || '0', 10),
        durasi: row[2]?.trim() || '45 menit',
        dokter: row[3]?.trim() || 'Tim Dokter',
        kategori: row[4]?.trim() || 'Klinik',
      }))
      .filter((item) => item.nama !== '');

    console.log(`✅ [Sheets Service] Sukses memuat ${catalog.length} layanan klinik dari Google Sheets.`);
    return catalog;
  } catch (error: any) {
    console.error('⚠️ [Sheets Service] Gagal mengambil katalog dari Google Sheets:', error.message || error);
    console.log('ℹ️ Menggunakan katalog default klinik (fallback) agar bot tetap berjalan.');
    return FALLBACK_CLINIC_CATALOG;
  }
};

/**
 * Service untuk menyisipkan data reservasi pasien ke Google Sheets secara otomatis.
 */
export const appendBookingToSheet = async (booking: ExtractedBooking): Promise<void> => {
  try {
    const spreadsheetId = env.GOOGLE_SPREADSHEET_ID;
    const range = 'Sheet1!A:H'; // Target menulis dari kolom A sampai H

    // 1. Format rincian layanan treatment
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
    // Format Kolom: [Nama Pasien, Nomor HP, Treatment, Tanggal Booking, Jam Slot, Dokter Pilihan, Timestamp, Total Estimasi]
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

    console.log(`📊 [Sheets Service] Menulis data reservasi pasien ke Google Sheets...`);
    console.log(`📊 [Sheets Service] Data Baris:`, rowValues);

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues],
      },
    });

    console.log(`✅ [Sheets Service] Data reservasi berhasil ditulis ke Sheets! Status HTTP: ${response.status}`);
  } catch (error: any) {
    console.error('❌ [Sheets Service] Gagal menulis data reservasi ke Google Sheets:', error.message || error);
    throw error;
  }
};
