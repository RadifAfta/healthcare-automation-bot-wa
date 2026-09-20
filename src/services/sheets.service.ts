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

// Interface untuk jadwal praktek dokter estetika
export interface DoctorScheduleItem {
  dokter: string;
  hari: string[];
  jamMulai: string; // contoh "13:00"
  jamSelesai: string; // contoh "20:00"
  kuotaPerJam: number;
}

// Interface untuk data reservasi yang sudah ada di Spreadsheet
export interface ExistingBookingItem {
  nama_pasien: string;
  nomor_hp: string;
  treatment: string;
  tanggal_booking: string;
  jam_booking: string;
  dokter_pilihan: string;
}

// Interface hasil pengecekan ketersediaan jadwal / slot
export interface SlotCheckResult {
  isAvailable: boolean;
  assignedDoctor?: string;
  reason?: 'AVAILABLE' | 'CLINIC_CLOSED_DAY' | 'OUTSIDE_OPERATING_HOURS' | 'DOCTOR_NOT_ON_DUTY' | 'DOCTOR_ALREADY_BOOKED' | 'ALL_DOCTORS_FULL';
  message: string;
  availableDoctorsAtSameTime?: string[];
  suggestedTimes?: string[];
}

// Katalog cadangan (fallback) khusus Klinik Kecantikan & Estetika (Beauty Clinic)
export const FALLBACK_CLINIC_CATALOG: ClinicServiceItem[] = [
  { nama: 'Facial Deep Cleansing & Brightening', harga: 250000, durasi: '60 menit', dokter: 'dr. Amanda, Sp.DVE', kategori: 'Facial' },
  { nama: 'Laser Glowing (Black Doll Laser)', harga: 650000, durasi: '45 menit', dokter: 'dr. Amanda, Sp.DVE', kategori: 'Laser & Rejuvenation' },
  { nama: 'Chemical Peeling Glowing / Acne', harga: 350000, durasi: '45 menit', dokter: 'dr. Budi, Sp.DVE', kategori: 'Peeling' },
  { nama: 'Skin Booster Salmon DNA', harga: 1500000, durasi: '60 menit', dokter: 'dr. Maya (Aesthetic Doctor)', kategori: 'Injection & Anti-Aging' },
  { nama: 'Acne Care & Comedo Extraction', harga: 300000, durasi: '60 menit', dokter: 'dr. Budi, Sp.DVE', kategori: 'Acne Solution' },
  { nama: 'Konsultasi Dokter Estetika & Skin Analysis', harga: 100000, durasi: '30 menit', dokter: 'Tim Dokter Estetika', kategori: 'Konsultasi' }
];

// Jadwal Dokter cadangan (fallback) jika tab 'JadwalDokter' belum dibuat di Google Sheets
export const FALLBACK_DOCTOR_SCHEDULES: DoctorScheduleItem[] = [
  {
    dokter: 'dr. Amanda, Sp.DVE',
    hari: ['Senin', 'Rabu', 'Jumat', 'Sabtu'],
    jamMulai: '13:00',
    jamSelesai: '20:00',
    kuotaPerJam: 1,
  },
  {
    dokter: 'dr. Budi, Sp.DVE',
    hari: ['Selasa', 'Kamis', 'Sabtu'],
    jamMulai: '09:00',
    jamSelesai: '17:00',
    kuotaPerJam: 1,
  },
  {
    dokter: 'dr. Maya (Aesthetic Doctor)',
    hari: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    jamMulai: '10:00',
    jamSelesai: '19:00',
    kuotaPerJam: 1,
  },
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

/**
 * Helper untuk mengekstrak hari dari string tanggal (misal: "Sabtu, 26 September 2026" -> "Sabtu")
 */
export const extractDayFromDateString = (tanggalStr: string): string => {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  for (const day of days) {
    if (new RegExp(`\\b${day}\\b`, 'i').test(tanggalStr)) {
      return day;
    }
  }
  return '';
};

/**
 * Helper untuk mengonversi format jam string ("14:00 WIB", "14:00", "14.00") ke menit total dari jam 00:00
 */
export const parseTimeToMinutes = (timeStr: string): number | null => {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
};

/**
 * Service untuk mengambil jadwal dokter dari Google Sheets (tab 'JadwalDokter')
 */
export const getDoctorSchedulesFromSheet = async (): Promise<DoctorScheduleItem[]> => {
  // METODE 1: GOOGLE SERVICE ACCOUNT API
  if (sheetsClient && env.GOOGLE_SPREADSHEET_ID) {
    try {
      console.log(`📊 [Sheets Service] Memuat jadwal dokter dari Google Spreadsheet (JadwalDokter!A2:E)...`);
      const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
        range: 'JadwalDokter!A2:E',
      });

      const rows = response.data.values;
      if (rows && rows.length > 0) {
        const parsed: DoctorScheduleItem[] = rows
          .map((row: any) => ({
            dokter: row[0]?.trim() || '',
            hari: (row[1]?.trim() || 'Semua Hari').split(',').map((h: string) => h.trim()),
            jamMulai: row[2]?.trim() || '09:00',
            jamSelesai: row[3]?.trim() || '20:00',
            kuotaPerJam: parseInt(row[4]?.replace(/[^0-9]/g, '') || '1', 10) || 1,
          }))
          .filter((item: DoctorScheduleItem) => item.dokter && item.dokter !== '');

        if (parsed.length > 0) {
          console.log(`✅ [Sheets Service] Sukses memuat ${parsed.length} jadwal dokter dari Google Spreadsheet.`);
          return parsed;
        }
      }
    } catch (error: any) {
      console.warn('ℹ️ [Sheets Service] Tab JadwalDokter belum ada atau gagal dimuat via Service Account, menggunakan fallback jadwal.');
    }
  }

  // METODE 2: GOOGLE APPS SCRIPT WEB APP
  if (env.GOOGLE_SHEETS_WEBAPP_URL && env.GOOGLE_SHEETS_WEBAPP_URL.trim() !== '') {
    try {
      const targetUrl = new URL(env.GOOGLE_SHEETS_WEBAPP_URL);
      targetUrl.searchParams.append('action', 'getDoctorSchedules');
      if (env.GOOGLE_SHEETS_SECRET_TOKEN) {
        targetUrl.searchParams.append('secret', env.GOOGLE_SHEETS_SECRET_TOKEN);
      }

      const response = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (response.ok) {
        const data: any = await response.json();
        if (data && Array.isArray(data.schedules) && data.schedules.length > 0) {
          return data.schedules.map((s: any) => ({
            dokter: String(s.dokter || '').trim(),
            hari: String(s.hari || 'Semua Hari').split(',').map((h: string) => h.trim()),
            jamMulai: String(s.jamMulai || '09:00').trim(),
            jamSelesai: String(s.jamSelesai || '20:00').trim(),
            kuotaPerJam: parseInt(String(s.kuotaPerJam || '1'), 10) || 1,
          }));
        }
      }
    } catch (error: any) {
      console.warn('ℹ️ [Sheets Service] Gagal memuat jadwal dokter via Apps Script Web App:', error.message || error);
    }
  }

  console.log('ℹ️ [Sheets Service] Menggunakan jadwal dokter default (fallback).');
  return FALLBACK_DOCTOR_SCHEDULES;
};

/**
 * Service untuk mengambil daftar seluruh reservasi aktif dari Google Sheets (Sheet1!A2:F)
 */
export const getExistingBookingsFromSheet = async (): Promise<ExistingBookingItem[]> => {
  // METODE 1: GOOGLE SERVICE ACCOUNT API
  if (sheetsClient && env.GOOGLE_SPREADSHEET_ID) {
    try {
      const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: env.GOOGLE_SPREADSHEET_ID,
        range: 'Sheet1!A2:F',
      });

      const rows = response.data.values;
      if (rows && rows.length > 0) {
        return rows
          .map((row: any) => ({
            nama_pasien: row[0]?.trim() || '',
            nomor_hp: row[1]?.trim() || '',
            treatment: row[2]?.trim() || '',
            tanggal_booking: row[3]?.trim() || '',
            jam_booking: row[4]?.trim() || '',
            dokter_pilihan: row[5]?.trim() || '',
          }))
          .filter((item: ExistingBookingItem) => item.nama_pasien && item.tanggal_booking && item.jam_booking);
      }
    } catch (error: any) {
      console.warn('⚠️ [Sheets Service] Gagal membaca riwayat reservasi via Service Account:', error.message || error);
    }
  }

  // METODE 2: GOOGLE APPS SCRIPT WEB APP
  if (env.GOOGLE_SHEETS_WEBAPP_URL && env.GOOGLE_SHEETS_WEBAPP_URL.trim() !== '') {
    try {
      const targetUrl = new URL(env.GOOGLE_SHEETS_WEBAPP_URL);
      targetUrl.searchParams.append('action', 'getExistingBookings');
      if (env.GOOGLE_SHEETS_SECRET_TOKEN) {
        targetUrl.searchParams.append('secret', env.GOOGLE_SHEETS_SECRET_TOKEN);
      }

      const response = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (response.ok) {
        const data: any = await response.json();
        if (data && Array.isArray(data.bookings)) {
          return data.bookings;
        }
      }
    } catch (error: any) {
      console.warn('⚠️ [Sheets Service] Gagal membaca riwayat reservasi via Apps Script:', error.message || error);
    }
  }

  return [];
};

/**
 * Helper untuk merangkum teks jadwal dokter untuk konteks AI
 */
export const formatDoctorScheduleContext = (schedules: DoctorScheduleItem[]): string => {
  return schedules
    .map((s) => `- ${s.dokter}: Hari ${s.hari.join(', ')} (Pukul ${s.jamMulai} - ${s.jamSelesai} WIB)`)
    .join('\n');
};

/**
 * Service cerdas untuk memvalidasi ketersediaan jadwal dokter dan mendeteksi bentrok slot reservasi.
 */
export const checkSlotAvailability = async (
  tanggalStr: string,
  jamStr: string,
  dokterRequested?: string,
  defaultDoctorFromCatalog?: string
): Promise<SlotCheckResult> => {
  const reqMinutes = parseTimeToMinutes(jamStr);
  const dayName = extractDayFromDateString(tanggalStr);

  // 1. Validasi Hari Operasional (Minggu Tutup)
  if (dayName.toLowerCase() === 'minggu') {
    return {
      isAvailable: false,
      reason: 'CLINIC_CLOSED_DAY',
      message: `Mohon maaf Kak, klinik kami tutup pada hari **Minggu**. Jam operasional kami adalah **Senin - Sabtu, 09:00 - 20:00 WIB**. Silakan memilih jadwal di hari Senin sampai Sabtu ya Kak! 😊✨`,
    };
  }

  // 2. Validasi Jam Operasional (09:00 - 20:00 WIB)
  if (reqMinutes === null || reqMinutes < 9 * 60 || reqMinutes > 20 * 60) {
    return {
      isAvailable: false,
      reason: 'OUTSIDE_OPERATING_HOURS',
      message: `Mohon maaf Kak, klinik kami beroperasi pukul **09:00 - 20:00 WIB**. Untuk jam *${jamStr}* klinik sudah tutup. Apakah Kakak bersedia di jam operasional kami, misalnya jam *10:00 WIB*, *14:00 WIB*, atau *19:00 WIB*? 😊`,
    };
  }

  // 3. Ambil Jadwal Dokter & Riwayat Booking Aktif
  const [schedules, existingBookings] = await Promise.all([
    getDoctorSchedulesFromSheet(),
    getExistingBookingsFromSheet(),
  ]);

  // Cari dokter yang bertugas di hari dan jam tersebut
  const onDutyDoctors = schedules.filter((s) => {
    const isDayMatch = s.hari.some((h) => h.toLowerCase().includes('semua') || (dayName && h.toLowerCase().includes(dayName.toLowerCase())));
    const startMin = parseTimeToMinutes(s.jamMulai) ?? 9 * 60;
    const endMin = parseTimeToMinutes(s.jamSelesai) ?? 20 * 60;
    const isTimeMatch = reqMinutes >= startMin && reqMinutes < endMin;
    return isDayMatch && isTimeMatch;
  });

  if (onDutyDoctors.length === 0) {
    return {
      isAvailable: false,
      reason: 'DOCTOR_NOT_ON_DUTY',
      message: `Mohon maaf Kak, pada hari *${dayName || tanggalStr}* pukul *${jamStr}* belum ada dokter estetika kami yang berpraktek. Jam praktek dokter tersedia antara **09:00 - 20:00 WIB**. Apakah Kakak berkenan memilih jam slot lainnya? 😊`,
    };
  }

  // Cek booking yang bentrok di tanggal & jam yang sama
  const conflictingBookings = existingBookings.filter((b) => {
    const bMinutes = parseTimeToMinutes(b.jam_booking);
    if (bMinutes === null) return false;
    const isSameDate = b.tanggal_booking.toLowerCase().replace(/\s+/g, '') === tanggalStr.toLowerCase().replace(/\s+/g, '')
      || (dayName && b.tanggal_booking.toLowerCase().includes(dayName.toLowerCase()) && b.tanggal_booking.includes(tanggalStr.split(' ')[1] || ''));
    const isSameTime = Math.abs(bMinutes - reqMinutes) < 45;
    return isSameDate && isSameTime;
  });

  // Tentukan target dokter (bisa diminta spesifik oleh pasien, atau dokter default tindakan)
  const cleanRequestedDoctor = (dokterRequested && dokterRequested.trim() !== '-' ? dokterRequested : (defaultDoctorFromCatalog || '')).trim().toLowerCase();

  // Hitung dokter yang masih KOSONG (available) pada slot ini
  const availableDoctors = onDutyDoctors.filter((doc) => {
    const bookingsCount = conflictingBookings.filter((b) =>
      b.dokter_pilihan.toLowerCase().includes(doc.dokter.toLowerCase()) || doc.dokter.toLowerCase().includes(b.dokter_pilihan.toLowerCase())
    ).length;
    return bookingsCount < doc.kuotaPerJam;
  });

  // KASUS A: Pasien meminta dokter spesifik ATAU tindakan memiliki dokter spesifik
  if (cleanRequestedDoctor && cleanRequestedDoctor !== 'tim dokter estetika') {
    const targetDocSchedule = onDutyDoctors.find((d) => d.dokter.toLowerCase().includes(cleanRequestedDoctor) || cleanRequestedDoctor.includes(d.dokter.toLowerCase()));

    // A1. Dokter yang diminta tidak bertugas di jam tersebut
    if (!targetDocSchedule) {
      const docGeneralSched = schedules.find((d) => d.dokter.toLowerCase().includes(cleanRequestedDoctor) || cleanRequestedDoctor.includes(d.dokter.toLowerCase()));
      const dutyInfo = docGeneralSched ? `Hari ${docGeneralSched.hari.join(', ')} (Pukul ${docGeneralSched.jamMulai} - ${docGeneralSched.jamSelesai} WIB)` : 'jadwal tertentu';
      const altDoctors = availableDoctors.map((d) => d.dokter).join(', ');

      if (availableDoctors.length > 0) {
        return {
          isAvailable: false,
          reason: 'DOCTOR_NOT_ON_DUTY',
          message: `Mohon maaf Kak, dokter pilihan Kakak (${cleanRequestedDoctor}) tidak ada jadwal praktek di jam *${jamStr}* (Jadwal praktek beliau: *${dutyInfo}*).\n\nNamun di jam *${jamStr}*, dokter **${altDoctors}** masih bertugas dan tersedia! ✨\n\nApakah Kakak bersedia ditangani oleh **${altDoctors}**, atau ingin mengganti jam lain dengan dokter pilihan Kakak? 😊`,
          availableDoctorsAtSameTime: availableDoctors.map((d) => d.dokter),
        };
      } else {
        return {
          isAvailable: false,
          reason: 'DOCTOR_NOT_ON_DUTY',
          message: `Mohon maaf Kak, dokter pilihan Kakak tidak berpraktek di jam tersebut. Jadwal beliau: *${dutyInfo}*. Apakah Kakak berkenan memilih hari atau jam lain? 😊`,
        };
      }
    }

    // A2. Dokter yang diminta BERTUGAS, tapi SUDAH TER-BOOKING oleh pasien lain!
    const isTargetDocAvailable = availableDoctors.some((d) => d.dokter.toLowerCase().includes(cleanRequestedDoctor) || cleanRequestedDoctor.includes(d.dokter.toLowerCase()));

    if (!isTargetDocAvailable) {
      // Ada dokter lain yang kosong di jam yang sama?
      if (availableDoctors.length > 0) {
        const altDoctorName = availableDoctors[0].dokter;
        return {
          isAvailable: false,
          reason: 'DOCTOR_ALREADY_BOOKED',
          message: `Mohon maaf Kak, untuk jam *${jamStr}* jadwal **${targetDocSchedule.dokter}** sudah terisi oleh pasien lain.\n\nNamun di jam yang sama (*${jamStr}*), dokter **${altDoctorName}** masih ada slot kosong lho! ✨\n\nApakah Kakak bersedia dijadwalkan dengan **${altDoctorName}**, atau ingin memilih jam slot lain bersama **${targetDocSchedule.dokter}**? 😊`,
          availableDoctorsAtSameTime: availableDoctors.map((d) => d.dokter),
        };
      } else {
        // Semua dokter penuh di jam ini
        return {
          isAvailable: false,
          reason: 'ALL_DOCTORS_FULL',
          message: `Mohon maaf Kak, seluruh slot dokter untuk jam *${jamStr}* pada hari *${tanggalStr}* sudah terisi penuh oleh pasien lain. 🌸\n\nSlot yang masih tersedia ada di jam sebelum atau sesudahnya (misal: *14:00 WIB* atau *16:30 WIB*). Kakak berkenan mengambil jam berapa? 😊`,
        };
      }
    }

    // A3. Dokter yang diminta KOSONG & BISA DILAYANI!
    return {
      isAvailable: true,
      reason: 'AVAILABLE',
      assignedDoctor: targetDocSchedule.dokter,
      message: 'Slot jadwal dokter tersedia.',
    };
  }

  // KASUS B: Pasien tidak meminta dokter spesifik
  if (availableDoctors.length > 0) {
    return {
      isAvailable: true,
      reason: 'AVAILABLE',
      assignedDoctor: availableDoctors[0].dokter,
      message: 'Slot jadwal tersedia.',
    };
  }

  // KASUS C: Seluruh dokter penuh di jam tersebut
  return {
    isAvailable: false,
    reason: 'ALL_DOCTORS_FULL',
    message: `Mohon maaf Kak, seluruh slot perawatan di jam *${jamStr}* pada *${tanggalStr}* sudah terisi penuh oleh pasien lain. 🌸\n\nApakah Kakak berkenan memilih jam slot lainnya yang masih kosong? 😊`,
  };
};
