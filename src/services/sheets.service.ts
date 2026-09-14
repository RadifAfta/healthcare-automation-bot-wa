import { google } from 'googleapis';
import { env } from '../config/env';
import { ExtractedBooking } from './ai.service';

// Interface untuk item katalog layanan Klinik Kecantikan & Estetika
export interface ClinicServiceItem {
  nama: string;
  harga: number;
  durasi?: string;
  dokter?: string;
  kategori?: string;
}

// Katalog cadangan (fallback) khusus Klinik Kecantikan & Estetika (Beauty Clinic)
const FALLBACK_CLINIC_CATALOG: ClinicServiceItem[] = [
  { nama: 'Facial Deep Cleansing & Brightening', harga: 250000, durasi: '60 menit', dokter: 'dr. Amanda, Sp.DVE', kategori: 'Facial' },
  { nama: 'Laser Glowing (Black Doll Laser)', harga: 650000, durasi: '45 menit', dokter: 'dr. Amanda, Sp.DVE', kategori: 'Laser & Rejuvenation' },
  { nama: 'Chemical Peeling Glowing / Acne', harga: 350000, durasi: '45 menit', dokter: 'dr. Budi, Sp.DVE', kategori: 'Peeling' },
  { nama: 'Skin Booster Salmon DNA', harga: 1500000, durasi: '60 menit', dokter: 'dr. Maya (Aesthetic Doctor)', kategori: 'Injection & Anti-Aging' },
  { nama: 'Acne Care & Comedo Extraction', harga: 300000, durasi: '60 menit', dokter: 'dr. Budi, Sp.DVE', kategori: 'Acne Solution' },
  { nama: 'Konsultasi Dokter Estetika & Skin Analysis', harga: 100000, durasi: '30 menit', dokter: 'Tim Dokter Estetika', kategori: 'Konsultasi' }
];

// Inisialisasi Google API Client jika Service Account dikonfigurasi
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
 * Service untuk mengambil data katalog perawatan Klinik Kecantikan dari Google Sheets.
 * Memprioritaskan koneksi langsung via Service Account API ke GOOGLE_SPREADSHEET_ID,
 * dengan opsi fallback ke Apps Script Web App dan katalog internal.
 */
export const getCatalogFromSheet = async (): Promise<ClinicServiceItem[]> => {
  // METODE 1: GOOGLE SERVICE ACCOUNT API (Langsung & Sinkron Real-Time dengan GOOGLE_SPREADSHEET_ID)
  if (sheetsClient && env.GOOGLE_SPREADSHEET_ID) {
    try {
      console.log(`📊 [Sheets Service] Memuat katalog langsung via Google Service Account API (Sheet ID: ${env.GOOGLE_SPREADSHEET_ID})...`);
      const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
        range: 'Katalog!A2:E',
      });

      const rows = response.data.values;
      if (rows && rows.length > 0) {
        const parsedItems = rows
          .map((row: any) => ({
            nama: row[0]?.trim() || '',
            harga: parseInt(row[1]?.replace(/[^0-9]/g, '') || '0', 10),
            durasi: row[2]?.trim() || '45 menit',
            dokter: row[3]?.trim() || 'Tim Dokter Estetika',
            kategori: row[4]?.trim() || 'Aesthetic & Skincare',
          }))
          .filter((item: any) => item.nama && item.nama.trim() !== '');

        if (parsedItems.length > 0) {
          console.log(`✅ [Sheets Service] Sukses memuat ${parsedItems.length} layanan perawatan kecantikan dari Google Spreadsheet.`);
          return parsedItems;
        }
      }
    } catch (error: any) {
      console.error('⚠️ [Sheets Service] Gagal mengambil katalog via Service Account:', error.message || error);
    }
  }

  // METODE 2: GOOGLE APPS SCRIPT WEB APP (Fallback)
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

      if (response.ok) {
        const data: any = await response.json();
        if (data && Array.isArray(data.catalog) && data.catalog.length > 0) {
          console.log(`✅ [Sheets Service] Sukses memuat ${data.catalog.length} layanan perawatan kecantikan dari Apps Script.`);
          return data.catalog.map((item: any) => ({
            nama: String(item.nama || '').trim(),
            harga: parseInt(String(item.harga || '0').replace(/[^0-9]/g, ''), 10),
            durasi: String(item.durasi || '45 menit').trim(),
            dokter: String(item.dokter || 'Tim Dokter Estetika').trim(),
            kategori: String(item.kategori || 'Aesthetic & Skincare').trim(),
          }));
        }
      }
    } catch (error: any) {
      console.error('⚠️ [Sheets Service] Gagal mengambil katalog via Apps Script Web App:', error.message || error);
    }
  }

  // DEFAULT FALLBACK
  console.log('ℹ️ [Sheets Service] Menggunakan katalog default Klinik Kecantikan (fallback).');
  return FALLBACK_CLINIC_CATALOG;
};

/**
 * Service untuk menyisipkan data reservasi pasien Klinik Kecantikan ke Google Sheets secara otomatis.
 */
export const appendBookingToSheet = async (booking: ExtractedBooking): Promise<void> => {
  // METODE 1: GOOGLE SERVICE ACCOUNT API
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
    }
  }

  // METODE 2: GOOGLE APPS SCRIPT WEB APP (Fallback)
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

  console.warn('⚠️ [Sheets Service] Tidak ada metode integrasi Google Sheets yang aktif di .env!');
};
