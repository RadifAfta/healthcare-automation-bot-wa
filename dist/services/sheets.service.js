"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSlotAvailability = exports.extractDoctorCoreName = exports.formatDoctorScheduleContext = exports.getExistingBookingsFromSheet = exports.getDoctorSchedulesFromSheet = exports.parseTimeToMinutes = exports.extractDayFromDateString = exports.appendBookingToSheet = exports.getCatalogFromSheet = exports.FALLBACK_DOCTOR_SCHEDULES = exports.FALLBACK_CLINIC_CATALOG = void 0;
const googleapis_1 = require("googleapis");
const env_1 = require("../config/env");
// Katalog cadangan (fallback) khusus Klinik Kecantikan & Estetika (Beauty Clinic)
exports.FALLBACK_CLINIC_CATALOG = [
    { nama: 'Facial Deep Cleansing & Brightening', harga: 250000, durasi: '60 menit', dokter: 'dr. Amanda, Sp.DVE', kategori: 'Facial' },
    { nama: 'Laser Glowing (Black Doll Laser)', harga: 650000, durasi: '45 menit', dokter: 'dr. Amanda, Sp.DVE', kategori: 'Laser & Rejuvenation' },
    { nama: 'Chemical Peeling Glowing / Acne', harga: 350000, durasi: '45 menit', dokter: 'dr. Budi, Sp.DVE', kategori: 'Peeling' },
    { nama: 'Skin Booster Salmon DNA', harga: 1500000, durasi: '60 menit', dokter: 'dr. Maya (Aesthetic Doctor)', kategori: 'Injection & Anti-Aging' },
    { nama: 'Acne Care & Comedo Extraction', harga: 300000, durasi: '60 menit', dokter: 'dr. Budi, Sp.DVE', kategori: 'Acne Solution' },
    { nama: 'Konsultasi Dokter Estetika & Skin Analysis', harga: 100000, durasi: '30 menit', dokter: 'Tim Dokter Estetika', kategori: 'Konsultasi' }
];
// Jadwal Dokter cadangan (fallback) jika tab 'JadwalDokter' belum dibuat di Google Sheets
exports.FALLBACK_DOCTOR_SCHEDULES = [
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
let sheetsClient = null;
if (env_1.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env_1.env.GOOGLE_PRIVATE_KEY) {
    try {
        const sanitizePrivateKey = (key) => key.replace(/\\n/g, '\n');
        const auth = new googleapis_1.google.auth.JWT({
            email: env_1.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: sanitizePrivateKey(env_1.env.GOOGLE_PRIVATE_KEY),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        sheetsClient = googleapis_1.google.sheets({ version: 'v4', auth });
    }
    catch (err) {
        console.warn('⚠️ [Sheets Service] Gagal inisialisasi Service Account JWT Client:', err.message);
    }
}
/**
 * Service untuk mengambil data katalog perawatan Klinik Kecantikan dari Google Sheets.
 * Memprioritaskan koneksi langsung via Service Account API ke GOOGLE_SPREADSHEET_ID,
 * dengan opsi fallback ke Apps Script Web App dan katalog internal.
 */
const getCatalogFromSheet = async () => {
    // METODE 1: GOOGLE SERVICE ACCOUNT API (Langsung & Sinkron Real-Time dengan GOOGLE_SPREADSHEET_ID)
    if (sheetsClient && env_1.env.GOOGLE_SPREADSHEET_ID) {
        try {
            console.log(`📊 [Sheets Service] Memuat katalog langsung via Google Service Account API (Sheet ID: ${env_1.env.GOOGLE_SPREADSHEET_ID})...`);
            const response = await sheetsClient.spreadsheets.values.get({
                spreadsheetId: env_1.env.GOOGLE_SPREADSHEET_ID,
                range: 'Katalog!A2:E',
            });
            const rows = response.data.values;
            if (rows && rows.length > 0) {
                const parsedItems = rows
                    .map((row) => ({
                    nama: row[0]?.trim() || '',
                    harga: parseInt(row[1]?.replace(/[^0-9]/g, '') || '0', 10),
                    durasi: row[2]?.trim() || '45 menit',
                    dokter: row[3]?.trim() || 'Tim Dokter Estetika',
                    kategori: row[4]?.trim() || 'Aesthetic & Skincare',
                }))
                    .filter((item) => item.nama && item.nama.trim() !== '');
                if (parsedItems.length > 0) {
                    console.log(`✅ [Sheets Service] Sukses memuat ${parsedItems.length} layanan perawatan kecantikan dari Google Spreadsheet.`);
                    return parsedItems;
                }
            }
        }
        catch (error) {
            console.error('⚠️ [Sheets Service] Gagal mengambil katalog via Service Account:', error.message || error);
        }
    }
    // METODE 2: GOOGLE APPS SCRIPT WEB APP (Fallback)
    if (env_1.env.GOOGLE_SHEETS_WEBAPP_URL && env_1.env.GOOGLE_SHEETS_WEBAPP_URL.trim() !== '') {
        try {
            console.log(`📊 [Sheets Service] Memuat katalog dari Google Apps Script Web App...`);
            const targetUrl = new URL(env_1.env.GOOGLE_SHEETS_WEBAPP_URL);
            targetUrl.searchParams.append('action', 'getCatalog');
            if (env_1.env.GOOGLE_SHEETS_SECRET_TOKEN) {
                targetUrl.searchParams.append('secret', env_1.env.GOOGLE_SHEETS_SECRET_TOKEN);
            }
            const response = await fetch(targetUrl.toString(), {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });
            if (response.ok) {
                const data = await response.json();
                if (data && Array.isArray(data.catalog) && data.catalog.length > 0) {
                    console.log(`✅ [Sheets Service] Sukses memuat ${data.catalog.length} layanan perawatan kecantikan dari Apps Script.`);
                    return data.catalog.map((item) => ({
                        nama: String(item.nama || '').trim(),
                        harga: parseInt(String(item.harga || '0').replace(/[^0-9]/g, ''), 10),
                        durasi: String(item.durasi || '45 menit').trim(),
                        dokter: String(item.dokter || 'Tim Dokter Estetika').trim(),
                        kategori: String(item.kategori || 'Aesthetic & Skincare').trim(),
                    }));
                }
            }
        }
        catch (error) {
            console.error('⚠️ [Sheets Service] Gagal mengambil katalog via Apps Script Web App:', error.message || error);
        }
    }
    // DEFAULT FALLBACK
    console.log('ℹ️ [Sheets Service] Menggunakan katalog default Klinik Kecantikan (fallback).');
    return exports.FALLBACK_CLINIC_CATALOG;
};
exports.getCatalogFromSheet = getCatalogFromSheet;
/**
 * Service untuk menyisipkan data reservasi pasien Klinik Kecantikan ke Google Sheets secara otomatis.
 */
const appendBookingToSheet = async (booking) => {
    // METODE 1: GOOGLE SERVICE ACCOUNT API
    if (sheetsClient && env_1.env.GOOGLE_SPREADSHEET_ID) {
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
                spreadsheetId: env_1.env.GOOGLE_SPREADSHEET_ID,
                range: 'Sheet1!A:H',
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [rowValues] },
            });
            console.log(`✅ [Sheets Service] Data reservasi berhasil ditulis via Service Account API!`);
            return;
        }
        catch (error) {
            console.error('❌ [Sheets Service] Gagal menulis data reservasi via Service Account API:', error.message || error);
        }
    }
    // METODE 2: GOOGLE APPS SCRIPT WEB APP (Fallback)
    if (env_1.env.GOOGLE_SHEETS_WEBAPP_URL && env_1.env.GOOGLE_SHEETS_WEBAPP_URL.trim() !== '') {
        try {
            console.log(`📊 [Sheets Service] Menulis reservasi via Google Apps Script Web App...`);
            const response = await fetch(env_1.env.GOOGLE_SHEETS_WEBAPP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'appendBooking',
                    secret: env_1.env.GOOGLE_SHEETS_SECRET_TOKEN || '',
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
            const result = await response.json();
            if (!response.ok || result.status !== 'success') {
                throw new Error(result.message || `HTTP Error ${response.status}`);
            }
            console.log(`✅ [Sheets Service] Reservasi berhasil ditulis via Apps Script! Respon:`, result);
            return;
        }
        catch (error) {
            console.error('❌ [Sheets Service] Gagal menulis data reservasi via Apps Script Web App:', error.message || error);
            throw error;
        }
    }
    console.warn('⚠️ [Sheets Service] Tidak ada metode integrasi Google Sheets yang aktif di .env!');
};
exports.appendBookingToSheet = appendBookingToSheet;
/**
 * Helper untuk mengekstrak hari dari string tanggal (misal: "Sabtu, 26 September 2026" -> "Sabtu")
 */
const extractDayFromDateString = (tanggalStr) => {
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    for (const day of days) {
        if (new RegExp(`\\b${day}\\b`, 'i').test(tanggalStr)) {
            return day;
        }
    }
    return '';
};
exports.extractDayFromDateString = extractDayFromDateString;
/**
 * Helper untuk mengonversi format jam string ("14:00 WIB", "14:00", "14.00") ke menit total dari jam 00:00
 */
const parseTimeToMinutes = (timeStr) => {
    if (!timeStr)
        return null;
    const match = timeStr.match(/(\d{1,2})[:.](\d{2})/);
    if (!match)
        return null;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours * 60 + minutes;
};
exports.parseTimeToMinutes = parseTimeToMinutes;
/**
 * Service untuk mengambil jadwal dokter dari Google Sheets (tab 'JadwalDokter')
 */
const getDoctorSchedulesFromSheet = async () => {
    // METODE 1: GOOGLE SERVICE ACCOUNT API
    if (sheetsClient && env_1.env.GOOGLE_SPREADSHEET_ID) {
        try {
            console.log(`📊 [Sheets Service] Memuat jadwal dokter dari Google Spreadsheet (JadwalDokter!A2:E)...`);
            const response = await sheetsClient.spreadsheets.values.get({
                spreadsheetId: env_1.env.GOOGLE_SPREADSHEET_ID,
                range: 'JadwalDokter!A2:E',
            });
            const rows = response.data.values;
            if (rows && rows.length > 0) {
                const parsed = rows
                    .map((row) => ({
                    dokter: row[0]?.trim() || '',
                    hari: (row[1]?.trim() || 'Semua Hari').split(',').map((h) => h.trim()),
                    jamMulai: row[2]?.trim() || '09:00',
                    jamSelesai: row[3]?.trim() || '20:00',
                    kuotaPerJam: parseInt(row[4]?.replace(/[^0-9]/g, '') || '1', 10) || 1,
                }))
                    .filter((item) => item.dokter && item.dokter !== '');
                if (parsed.length > 0) {
                    console.log(`✅ [Sheets Service] Sukses memuat ${parsed.length} jadwal dokter dari Google Spreadsheet.`);
                    return parsed;
                }
            }
        }
        catch (error) {
            console.warn('ℹ️ [Sheets Service] Tab JadwalDokter belum ada atau gagal dimuat via Service Account, menggunakan fallback jadwal.');
        }
    }
    // METODE 2: GOOGLE APPS SCRIPT WEB APP
    if (env_1.env.GOOGLE_SHEETS_WEBAPP_URL && env_1.env.GOOGLE_SHEETS_WEBAPP_URL.trim() !== '') {
        try {
            const targetUrl = new URL(env_1.env.GOOGLE_SHEETS_WEBAPP_URL);
            targetUrl.searchParams.append('action', 'getDoctorSchedules');
            if (env_1.env.GOOGLE_SHEETS_SECRET_TOKEN) {
                targetUrl.searchParams.append('secret', env_1.env.GOOGLE_SHEETS_SECRET_TOKEN);
            }
            const response = await fetch(targetUrl.toString(), {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });
            if (response.ok) {
                const data = await response.json();
                if (data && Array.isArray(data.schedules) && data.schedules.length > 0) {
                    return data.schedules.map((s) => ({
                        dokter: String(s.dokter || '').trim(),
                        hari: String(s.hari || 'Semua Hari').split(',').map((h) => h.trim()),
                        jamMulai: String(s.jamMulai || '09:00').trim(),
                        jamSelesai: String(s.jamSelesai || '20:00').trim(),
                        kuotaPerJam: parseInt(String(s.kuotaPerJam || '1'), 10) || 1,
                    }));
                }
            }
        }
        catch (error) {
            console.warn('ℹ️ [Sheets Service] Gagal memuat jadwal dokter via Apps Script Web App:', error.message || error);
        }
    }
    console.log('ℹ️ [Sheets Service] Menggunakan jadwal dokter default (fallback).');
    return exports.FALLBACK_DOCTOR_SCHEDULES;
};
exports.getDoctorSchedulesFromSheet = getDoctorSchedulesFromSheet;
/**
 * Service untuk mengambil daftar seluruh reservasi aktif dari Google Sheets (Sheet1!A2:F)
 */
const getExistingBookingsFromSheet = async () => {
    // METODE 1: GOOGLE SERVICE ACCOUNT API
    if (sheetsClient && env_1.env.GOOGLE_SPREADSHEET_ID) {
        try {
            const response = await sheetsClient.spreadsheets.values.get({
                spreadsheetId: env_1.env.GOOGLE_SPREADSHEET_ID,
                range: 'Sheet1!A2:F',
            });
            const rows = response.data.values;
            if (rows && rows.length > 0) {
                return rows
                    .map((row) => ({
                    nama_pasien: row[0]?.trim() || '',
                    nomor_hp: row[1]?.trim() || '',
                    treatment: row[2]?.trim() || '',
                    tanggal_booking: row[3]?.trim() || '',
                    jam_booking: row[4]?.trim() || '',
                    dokter_pilihan: row[5]?.trim() || '',
                }))
                    .filter((item) => item.nama_pasien && item.tanggal_booking && item.jam_booking);
            }
        }
        catch (error) {
            console.warn('⚠️ [Sheets Service] Gagal membaca riwayat reservasi via Service Account:', error.message || error);
        }
    }
    // METODE 2: GOOGLE APPS SCRIPT WEB APP
    if (env_1.env.GOOGLE_SHEETS_WEBAPP_URL && env_1.env.GOOGLE_SHEETS_WEBAPP_URL.trim() !== '') {
        try {
            const targetUrl = new URL(env_1.env.GOOGLE_SHEETS_WEBAPP_URL);
            targetUrl.searchParams.append('action', 'getExistingBookings');
            if (env_1.env.GOOGLE_SHEETS_SECRET_TOKEN) {
                targetUrl.searchParams.append('secret', env_1.env.GOOGLE_SHEETS_SECRET_TOKEN);
            }
            const response = await fetch(targetUrl.toString(), {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });
            if (response.ok) {
                const data = await response.json();
                if (data && Array.isArray(data.bookings)) {
                    return data.bookings;
                }
            }
        }
        catch (error) {
            console.warn('⚠️ [Sheets Service] Gagal membaca riwayat reservasi via Apps Script:', error.message || error);
        }
    }
    return [];
};
exports.getExistingBookingsFromSheet = getExistingBookingsFromSheet;
/**
 * Helper untuk merangkum teks jadwal dokter untuk konteks AI
 */
const formatDoctorScheduleContext = (schedules) => {
    return schedules
        .map((s) => `- ${s.dokter}: Hari ${s.hari.join(', ')} (Pukul ${s.jamMulai} - ${s.jamSelesai} WIB)`)
        .join('\n');
};
exports.formatDoctorScheduleContext = formatDoctorScheduleContext;
/**
 * Service cerdas untuk memvalidasi ketersediaan jadwal dokter dan mendeteksi bentrok slot reservasi.
 */
/**
 * Helper untuk mengekstrak nama inti dokter (menghapus gelar depan dr./drg. dan gelar spesialis Sp.XXX)
 */
const extractDoctorCoreName = (name) => {
    if (!name)
        return '';
    return name
        .toLowerCase()
        .replace(/\b(drg\.|dr\.|drg|dr|sp\.[a-z]+|sp[a-z]+|\(aesthetic doctor\)|\(aesthetic\)|aesthetic doctor)\b/gi, '')
        .replace(/[^a-z0-9]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};
exports.extractDoctorCoreName = extractDoctorCoreName;
/**
 * Service cerdas untuk memvalidasi ketersediaan jadwal dokter dan mendeteksi bentrok slot reservasi.
 */
const checkSlotAvailability = async (tanggalStr, jamStr, dokterRequested, defaultDoctorFromCatalog) => {
    const reqMinutes = (0, exports.parseTimeToMinutes)(jamStr);
    const dayName = (0, exports.extractDayFromDateString)(tanggalStr);
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
        (0, exports.getDoctorSchedulesFromSheet)(),
        (0, exports.getExistingBookingsFromSheet)(),
    ]);
    // Cari dokter yang bertugas di hari dan jam tersebut
    const onDutyDoctors = schedules.filter((s) => {
        const isDayMatch = s.hari.some((h) => h.toLowerCase().includes('semua') || (dayName && h.toLowerCase().includes(dayName.toLowerCase())));
        const startMin = (0, exports.parseTimeToMinutes)(s.jamMulai) ?? 9 * 60;
        const endMin = (0, exports.parseTimeToMinutes)(s.jamSelesai) ?? 20 * 60;
        const isTimeMatch = reqMinutes >= startMin && reqMinutes < endMin;
        return isDayMatch && isTimeMatch;
    });
    if (onDutyDoctors.length === 0) {
        return {
            isAvailable: false,
            reason: 'DOCTOR_NOT_ON_DUTY',
            message: `Mohon maaf Kak, pada hari *${dayName || tanggalStr}* pukul *${jamStr}* belum ada dokter yang berpraktek. Jam praktek dokter tersedia antara **09:00 - 20:00 WIB**. Apakah Kakak berkenan memilih jam slot lainnya? 😊`,
        };
    }
    // Cek booking yang bentrok di tanggal & jam yang sama
    const conflictingBookings = existingBookings.filter((b) => {
        const bMinutes = (0, exports.parseTimeToMinutes)(b.jam_booking);
        if (bMinutes === null)
            return false;
        const isSameDate = b.tanggal_booking.toLowerCase().replace(/\s+/g, '') === tanggalStr.toLowerCase().replace(/\s+/g, '')
            || (dayName && b.tanggal_booking.toLowerCase().includes(dayName.toLowerCase()) && b.tanggal_booking.includes(tanggalStr.split(' ')[1] || ''));
        const isSameTime = Math.abs(bMinutes - reqMinutes) < 45;
        return isSameDate && isSameTime;
    });
    // Hitung dokter yang masih KOSONG (available) pada slot jam ini
    const availableDoctors = onDutyDoctors.filter((doc) => {
        const docCore = (0, exports.extractDoctorCoreName)(doc.dokter);
        const bookingsCount = conflictingBookings.filter((b) => {
            const bCore = (0, exports.extractDoctorCoreName)(b.dokter_pilihan);
            return (docCore && bCore && (docCore.includes(bCore) || bCore.includes(docCore)))
                || b.dokter_pilihan.toLowerCase().includes(doc.dokter.toLowerCase())
                || doc.dokter.toLowerCase().includes(b.dokter_pilihan.toLowerCase());
        }).length;
        return bookingsCount < doc.kuotaPerJam;
    });
    // Apakah pasien secara EKSPLISIT meminta dokter tertentu di chat (misal "sama dr. amanda")?
    const isExplicitDoctorRequest = Boolean(dokterRequested && dokterRequested.trim() !== '' && dokterRequested.trim() !== '-');
    // KASUS A: Pasien SECARA EKSPLISIT meminta dokter tertentu
    if (isExplicitDoctorRequest && dokterRequested) {
        const reqCore = (0, exports.extractDoctorCoreName)(dokterRequested);
        const targetDocSchedule = onDutyDoctors.find((d) => {
            const dCore = (0, exports.extractDoctorCoreName)(d.dokter);
            return (reqCore && dCore && (reqCore.includes(dCore) || dCore.includes(reqCore)))
                || d.dokter.toLowerCase().includes(dokterRequested.toLowerCase())
                || dokterRequested.toLowerCase().includes(d.dokter.toLowerCase());
        });
        // A1. Dokter yang diminta tidak bertugas di jam tersebut
        if (!targetDocSchedule) {
            const docGeneralSched = schedules.find((d) => {
                const dCore = (0, exports.extractDoctorCoreName)(d.dokter);
                return (reqCore && dCore && (reqCore.includes(dCore) || dCore.includes(reqCore)))
                    || d.dokter.toLowerCase().includes(dokterRequested.toLowerCase())
                    || dokterRequested.toLowerCase().includes(d.dokter.toLowerCase());
            });
            const dutyInfo = docGeneralSched ? `Hari ${docGeneralSched.hari.join(', ')} (Pukul ${docGeneralSched.jamMulai} - ${docGeneralSched.jamSelesai} WIB)` : 'jadwal tertentu';
            const altDoctors = availableDoctors.map((d) => d.dokter).join(', ');
            if (availableDoctors.length > 0) {
                return {
                    isAvailable: false,
                    reason: 'DOCTOR_NOT_ON_DUTY',
                    message: `Mohon maaf Kak, ${dokterRequested} tidak ada jadwal praktek di hari *${dayName || tanggalStr}* jam *${jamStr}* (Jadwal praktek beliau: *${dutyInfo}*).\n\nNamun di jam *${jamStr}*, dokter **${altDoctors}** masih bertugas dan tersedia! ✨\n\nApakah Kakak bersedia ditangani oleh **${altDoctors}**, atau ingin mengganti hari/jam lain bersama ${dokterRequested}? 😊`,
                    availableDoctorsAtSameTime: availableDoctors.map((d) => d.dokter),
                };
            }
            else {
                return {
                    isAvailable: false,
                    reason: 'DOCTOR_NOT_ON_DUTY',
                    message: `Mohon maaf Kak, ${dokterRequested} tidak berpraktek di hari/jam tersebut. Jadwal beliau: *${dutyInfo}*. Apakah Kakak berkenan memilih hari atau jam lain? 😊`,
                };
            }
        }
        // A2. Dokter yang diminta BERTUGAS, tapi SUDAH TER-BOOKING oleh pasien lain!
        const isTargetDocAvailable = availableDoctors.some((d) => {
            const dCore = (0, exports.extractDoctorCoreName)(d.dokter);
            return (reqCore && dCore && (reqCore.includes(dCore) || dCore.includes(reqCore)))
                || d.dokter.toLowerCase().includes(dokterRequested.toLowerCase())
                || dokterRequested.toLowerCase().includes(d.dokter.toLowerCase());
        });
        if (!isTargetDocAvailable) {
            if (availableDoctors.length > 0) {
                const altDoctorName = availableDoctors[0].dokter;
                return {
                    isAvailable: false,
                    reason: 'DOCTOR_ALREADY_BOOKED',
                    message: `Mohon maaf Kak, untuk jam *${jamStr}* jadwal **${targetDocSchedule.dokter}** sudah terisi oleh pasien lain.\n\nNamun di jam yang sama (*${jamStr}*), dokter **${altDoctorName}** masih ada slot kosong lho! ✨\n\nApakah Kakak bersedia dijadwalkan dengan **${altDoctorName}**, atau ingin memilih jam slot lain bersama **${targetDocSchedule.dokter}**? 😊`,
                    availableDoctorsAtSameTime: availableDoctors.map((d) => d.dokter),
                };
            }
            else {
                return {
                    isAvailable: false,
                    reason: 'ALL_DOCTORS_FULL',
                    message: `Mohon maaf Kak, seluruh slot dokter untuk jam *${jamStr}* pada hari *${tanggalStr}* sudah terisi penuh oleh pasien lain. 🌸\n\nSlot yang masih tersedia ada di jam sebelum atau sesudahnya. Kakak berkenan mengambil jam berapa? 😊`,
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
    // KASUS B: Pasien TIDAK meminta dokter spesifik (Hanya memilih tindakan/treatment)
    // 1. Cek apakah dokter bawaan katalog sedang bertugas dan masih kosong
    if (defaultDoctorFromCatalog && defaultDoctorFromCatalog.trim() !== '' && defaultDoctorFromCatalog !== 'Tim Dokter Estetika' && defaultDoctorFromCatalog !== 'Tim Dokter Gigi') {
        const defaultCore = (0, exports.extractDoctorCoreName)(defaultDoctorFromCatalog);
        const matchedDefaultAvailable = availableDoctors.find((d) => {
            const dCore = (0, exports.extractDoctorCoreName)(d.dokter);
            return (defaultCore && dCore && (defaultCore.includes(dCore) || dCore.includes(defaultCore)))
                || d.dokter.toLowerCase().includes(defaultDoctorFromCatalog.toLowerCase())
                || defaultDoctorFromCatalog.toLowerCase().includes(d.dokter.toLowerCase());
        });
        if (matchedDefaultAvailable) {
            return {
                isAvailable: true,
                reason: 'AVAILABLE',
                assignedDoctor: matchedDefaultAvailable.dokter,
                message: 'Slot jadwal tersedia.',
            };
        }
    }
    // 2. Jika dokter bawaan katalog tidak bertugas hari itu, gunakan dokter lain yang SEDANG BERTUGAS dan KOSONG
    if (availableDoctors.length > 0) {
        return {
            isAvailable: true,
            reason: 'AVAILABLE',
            assignedDoctor: availableDoctors[0].dokter,
            message: 'Slot jadwal tersedia.',
        };
    }
    // 3. Jika seluruh dokter penuh di jam tersebut
    return {
        isAvailable: false,
        reason: 'ALL_DOCTORS_FULL',
        message: `Mohon maaf Kak, seluruh slot perawatan di jam *${jamStr}* pada hari *${tanggalStr}* sudah terisi penuh oleh pasien lain. 🌸\n\nApakah Kakak berkenan memilih jam slot lainnya yang masih kosong? 😊`,
    };
};
exports.checkSlotAvailability = checkSlotAvailability;
