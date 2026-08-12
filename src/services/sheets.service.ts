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

// Inisialisasi Google API Client jika Service Account dikonfigurasi (Legacy Fallback)
let sheetsClient: any = null;
if (env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY) {
  try {
    const sanitizePrivateKey = (key: string): string => key.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
      email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: sanitizePrivateKey(env.GOOGLE_PRIVATE_KEY),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    sheetsClient = google.sheets({ version: 'v4', auth });
  } catch (err: any) {
    console.warn('⚠️ [Sheets Service] Gagal inisialisasi Service Account JWT Client:', err.message);
  }
}

/**
 * Service untuk mengambil data katalog perawatan Klinik Gigi dari Google Sheets.
 * Mendukung metode Google Apps Script Web App (Metode Utama Aman & Praktis) serta Service Account.
 */
export const getCatalogFromSheet = async (): Promise<ClinicServiceItem[]> => {
  // METODE 1: GOOGLE APPS SCRIPT WEB APP (Dua Arah & Bebas Service Account)
  if (env.GOOGLE_SHEETS_WEBAPP_URL && env.GOOGLE_SHEETS_WEBAPP_URL.trim() !== '') {
    try {
      console.log(`📊 [Sheets Service] Memuat katalog dari Google Apps Script Web App...`);
      const targetUrl = new URL(env.GOOGLE_SHEETS_WEBAPP_URL);
      targetUrl.searchParams.append('action', 'getCatalog');
      if (env.GOOGLE_SHEETS_SECRET_TOKEN) {
        targetUrl.searchParams.append('secret', env.GOOGLE_SHEETS_SECRET_TOKEN);
      }

      const response = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP Status ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();
      if (data && Array.isArray(data.catalog) && data.catalog.length > 0) {
        console.log(`✅ [Sheets Service] Sukses memuat ${data.catalog.length} tindakan gigi dari Google Apps Script.`);
        return data.catalog.map((item: any) => ({
          nama: String(item.nama || '').trim(),
          harga: parseInt(String(item.harga || '0').replace(/[^0-9]/g, ''), 10),
          durasi: String(item.durasi || '45 menit').trim(),
          dokter: String(item.dokter || 'Tim Dokter Gigi').trim(),
          kategori: String(item.kategori || 'Dental').trim(),
        }));
      }
      console.warn('⚠️ [Sheets Service] Respon Apps Script kosong. Menggunakan katalog default (fallback).');
      return FALLBACK_CLINIC_CATALOG;
    } catch (error: any) {
      console.error('⚠️ [Sheets Service] Gagal mengambil katalog via Apps Script Web App:', error.message || error);
      console.log('ℹ️ Menggunakan katalog default Klinik Gigi (fallback) agar bot tetap berjalan.');
      return FALLBACK_CLINIC_CATALOG;
    }
  }

  // METODE 2: GOOGLE SERVICE ACCOUNT (Legacy Fallback)
  if (sheetsClient && env.GOOGLE_SPREADSHEET_ID) {
    try {
      console.log(`📊 [Sheets Service] Memuat katalog via Google Service Account API...`);
      const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
        range: 'Katalog!A2:E',
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return FALLBACK_CLINIC_CATALOG;
      }

      return rows
        .map((row: any) => ({
          nama: row[0]?.trim() || '',
          harga: parseInt(row[1]?.replace(/[^0-9]/g, '') || '0', 10),
          durasi: row[2]?.trim() || '45 menit',
          dokter: row[3]?.trim() || 'Tim Dokter Gigi',
          kategori: row[4]?.trim() || 'Dental',
        }))
        .filter((item: any) => item.nama !== '');
    } catch (error: any) {
      console.error('⚠️ [Sheets Service] Gagal mengambil katalog via Service Account:', error.message || error);
      return FALLBACK_CLINIC_CATALOG;
    }
  }

  // DEFAULT FALLBACK
  return FALLBACK_CLINIC_CATALOG;
};

/**
 * Service untuk menyisipkan data reservasi pasien Klinik Gigi ke Google Sheets secara otomatis.
 */
export const appendBookingToSheet = async (booking: ExtractedBooking): Promise<void> => {
  // METODE 1: GOOGLE APPS SCRIPT WEB APP
  if (env.GOOGLE_SHEETS_WEBAPP_URL && env.GOOGLE_SHEETS_WEBAPP_URL.trim() !== '') {
    try {
      console.log(`📊 [Sheets Service] Menulis reservasi via Google Apps Script Web App...`);
      const response = await fetch(env.GOOGLE_SHEETS_WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'appendBooking',
          secret: env.GOOGLE_SHEETS_SECRET_TOKEN || '',
          booking: {
            nama_pasien: booking.nama_pasien || '-',
            nomor_hp: booking.nomor_hp || '-',
            layanan_dipilih: booking.layanan_dipilih,
            tanggal_booking: booking.tanggal_booking || '-',
            jam_booking: booking.jam_booking || '-',
            dokter_pilihan: booking.dokter_pilihan || '-',
            total_estimasi: booking.total_estimasi || 0,
          },
        }),
      });

      const result: any = await response.json();
      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || `HTTP Error ${response.status}`);
      }

      console.log(`✅ [Sheets Service] Reservasi berhasil ditulis via Apps Script! Respon:`, result);
      return;
    } catch (error: any) {
      console.error('❌ [Sheets Service] Gagal menulis data reservasi via Apps Script Web App:', error.message || error);
      throw error;
    }
  }

  // METODE 2: GOOGLE SERVICE ACCOUNT (Legacy Fallback)
  if (sheetsClient && env.GOOGLE_SPREADSHEET_ID) {
    try {
      const treatmentDetails = booking.layanan_dipilih
        .map((item) => `${item.nama_layanan} (Rp${item.estimasi_harga.toLocaleString('id-ID')})`)
        .join(', ');

      const timestamp = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'medium',
      });

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

      console.log(`📊 [Sheets Service] Menulis data via Google Service Account API...`);
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
        range: 'Sheet1!A:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowValues] },
      });

      console.log(`✅ [Sheets Service] Data reservasi berhasil ditulis via Service Account API!`);
      return;
    } catch (error: any) {
      console.error('❌ [Sheets Service] Gagal menulis data reservasi via Service Account API:', error.message || error);
      throw error;
    }
  }

  console.warn('⚠️ [Sheets Service] Tidak ada metode integrasi Google Sheets yang aktif di .env!');
};
