import Groq from 'groq-sdk';
import { env } from '../config/env';

// Inisialisasi Groq client menggunakan API Key yang sudah divalidasi Zod
const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Tipe Niat (Intent) pesan WhatsApp masuk untuk Klinik Gigi (Dental Clinic)
export type IntentType = 'BOOKING' | 'INQUIRY' | 'COMPLAINT' | 'CONFIRM' | 'CANCEL' | 'TALK_TO_HUMAN' | 'GRATITUDE' | 'OTHER';

// Interface untuk respons deteksi intent
export interface IntentResult {
  intent: IntentType;
  explanation: string;
}

// Interface untuk bentuk data hasil ekstraksi reservasi klinik gigi yang sudah tervalidasi katalog
export interface ExtractedBooking {
  nama_pasien: string;
  nomor_hp: string;
  layanan_dipilih: Array<{
    nama_layanan: string;
    estimasi_harga: number;
  }>;
  tanggal_booking: string;
  jam_booking: string;
  dokter_pilihan: string;
  total_estimasi: number;
}

/**
 * Service untuk mendeteksi niat (intent) dari chat pasien Klinik Gigi (Dental Clinic).
 */
export const classifyIntent = async (message: string, history: ChatMessage[] = []): Promise<IntentType> => {
  try {
    const systemPrompt = `Kamu adalah AI Router cerdas yang bertugas mengklasifikasi kategori pesan dari pasien Klinik Gigi (Dental Clinic).
Tentukan kategori pesan dari daftar berikut:
- CONFIRM: Jika pesan berisi konfirmasi setuju, mengiyakan rekap kartu reservasi, atau konfirmasi "Ya" / "Oke" / "Benar" / "Setuju" terhadap jadwal booking pemeriksaan gigi sebelumnya. Contoh: "ya", "oke", "benar", "betul kak", "ya reservasi saya sudah benar", "ok pas".
- CANCEL: Jika pesan berisi keinginan membatalkan reservasi janji temu dokter gigi atau menghapus booking klinik. Contoh: "batalin aja", "batal", "cancel booking saya", "gak jadi periksa gigi deh".
- BOOKING: Jika pesan berisi niat untuk mendaftar reservasi periksa gigi, mengambil slot tindakan gigi (seperti scaling, tambal gigi, cabut gigi, behel, bleaching, perawatan saluran akar), menentukan tanggal/jam kedatangan, atau menambah jadwal perawatan gigi. Contoh: "mau booking scaling gigi besok", "pesen tempat tambal gigi jam 2 siang", "daftar periksa behel hari sabtu", "booking bleaching gigi sama drg. amanda".
- INQUIRY: Jika pesan berisi pertanyaan umum tentang biaya/tarif tindakan gigi, katalog perawatan gigi, jam buka klinik gigi, ketersediaan dokter gigi (drg), lokasi fisik klinik, atau syarat persiapan sebelum tindakan gigi. Contoh: "scaling gigi berapa ya kak?", "buka jam berapa?", "drg. amanda ada hari apa aja?", "cabut gigi sakit gak?", "alamat kliniknya di mana?".
- COMPLAINT: Jika pesan berisi komplain, keluhan kelambatan pelayanan, ketidakpuasan hasil tindakan gigi, atau keluhan noda/sakit gigi pasca periksa. Contoh: "gigi saya sakit banget setelah ditambal kemarin", "pelayanannya lambat banget tadi".
- TALK_TO_HUMAN: Jika pesan berisi permintaan eksplisit untuk berbicara langsung dengan admin manusia, resepsionis, atau CS klinik. Contoh: "mau bicara sama cs", "admin manusia dong", "transfer ke admin", "mau ngobrol sama admin manusia", "bisa bicara dengan resepsionis?".
- GRATITUDE: Jika pesan berisi ucapan terima kasih, salam penutup, rasa puas, atau apresiasi setelah informasi/reservasi selesai. Contoh: "terima kasih kak", "makasih ya", "makasih banyak", "thank you", "tq kak", "siap makasih", "oke mantap makasih", "sip makasih ya".
- OTHER: Jika pesan hanya berisi salam pembuka (halo, p, pagi, siang), basa-basi umum, atau teks acak.

Kamu WAJIB mengembalikan respon HANYA berupa objek JSON mentah yang valid, tanpa teks basa-basi, tanpa tanda backticks (\`\`\`json), dan tanpa penjelasan apa pun.
Struktur JSON yang wajib kamu kembalikan harus memiliki key berikut:
{
  "intent": "BOOKING" | "INQUIRY" | "COMPLAINT" | "CONFIRM" | "CANCEL" | "TALK_TO_HUMAN" | "GRATITUDE" | "OTHER",
  "explanation": "alasan singkat klasifikasi dalam bahasa indonesia"
}`;

    const formattedMessages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      ...history.map((msg) => ({
        role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: formattedMessages,
      response_format: {
        type: 'json_object',
      },
      temperature: 0.0,
    });

    const rawJsonString = response.choices[0]?.message?.content || '{}';
    const parsedData: IntentResult = JSON.parse(rawJsonString);
    return parsedData.intent || 'OTHER';
  } catch (error) {
    console.error('❌ [AI Service] Gagal mengklasifikasikan intent chat:', error);
    return 'OTHER';
  }
};

/**
 * Service untuk menjawab pertanyaan umum pasien (INQUIRY / FAQ) Klinik Gigi secara ramah, profesional, & empatik.
 */
export const answerInquiry = async (message: string, catalogContext: string, history: ChatMessage[] = []): Promise<string> => {
  try {
    const systemPrompt = `Kamu adalah Customer Service AI (Resepsionis) yang ramah, sopan, empatik, dan profesional khusus untuk Klinik Gigi (Dental Clinic).
Tugasmu adalah menjawab pertanyaan pasien (Inquiry/FAQ) secara singkat, jelas, dan membantu berdasarkan konteks katalog tindakan & dokter gigi berikut:

Katalog Perawatan & Tarif Dokter Gigi Aktif:
${catalogContext}

Informasi Umum Klinik Gigi:
- Jam Operasional: Senin - Sabtu, 09:00 - 20:00 WIB (Minggu & Libur Nasional Tutup)
- Lokasi Klinik: Jl. Kesehatan Raya No. 88, Jakarta (Dekat Pusat Kota)
- Fasilitas: Alat Steril Standar Medis, Dokter Gigi Spesialis (drg), Ruang Tunggu Nyaman & AC
- Metode Pembayaran: Cash, QRIS, Transfer Bank, & Kartu Kredit

Aturan Komunikasi:
- Gunakan bahasa Indonesia yang santun, ramah, dan empatik (gunakan sapaan "Kak" atau "Kakak").
- Jika menanyakan harga tindakan gigi / dokter gigi, jawab secara presisi sesuai katalog aktif di atas.
- Jika menanyakan perawatan yang tidak ada di katalog, katakan dengan sopan bahwa layanan tersebut saat ini belum tersedia di klinik gigi kami.
- Jangan memberikan diagnosis medis gigi yang terlalu berisiko, sarankan pasien untuk mendaftar reservasi janji temu agar bisa diperiksa langsung oleh dokter gigi profesional kami.
- Maksimal 3-4 kalimat. Akhiri dengan sapaan atau emotikon yang ramah.`;

    const formattedMessages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      ...history.map((msg) => ({
        role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: formattedMessages,
      temperature: 0.4,
    });

    return response.choices[0]?.message?.content || 'Halo Kak! Ada yang bisa kami bantu seputar informasi perawatan dan konsultasi kesehatan gigi di klinik gigi kami? 😊';
  } catch (error) {
    console.error('❌ [AI Service] Gagal menyusun balasan inquiry:', error);
    return 'Halo Kak! Pertanyaan Kakak telah kami terima. Admin resepsionis klinik gigi kami akan segera membantu membalas pesan Kakak ya! 😊';
  }
};

/**
 * Helper untuk membersihkan nama pasien dari kata awalan/akhiran obrolan (seperti "nama saya ... kak")
 */
export const cleanPatientName = (rawText: string): string => {
  if (!rawText) return 'Pasien';
  let clean = rawText
    .replace(/^(nama\s+saya|namaku|nama\s*:|nama|atas\s+nama|saya|panggil\s+saja)\s+/i, '')
    .replace(/\s+(kak|kakak|min|admin|ya|gan|bro|sis|dek)$/i, '')
    .replace(/[.,!]/g, '')
    .trim();
  if (clean.length > 0) {
    clean = clean.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  return clean || 'Pasien';
};

/**
 * Service untuk mengekstrak data reservasi klinik gigi terstruktur dari chat WhatsApp pasien.
 */
export const extractBookingFromChat = async (
  message: string,
  catalogContext: string,
  history: ChatMessage[] = [],
  currentBooking?: ExtractedBooking
): Promise<ExtractedBooking> => {
  try {
    const todayStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    });

    const currentBookingContext = currentBooking && currentBooking.layanan_dipilih.length > 0
      ? `\nReservasi Aktif Saat Ini yang Sedang Berjalan:\n${JSON.stringify(currentBooking, null, 2)}\n`
      : '';

    const systemPrompt = `Kamu adalah sistem AI ekstraksi data reservasi presisi tinggi untuk Klinik Gigi (Dental Clinic). Tugasmu adalah mengekstrak chat pendaftaran pasien menjadi data JSON yang bersih, terstruktur, dan tervalidasi terhadap Katalog Tindakan Gigi resmi.

Hari Ini: ${todayStr}

Katalog Tindakan Gigi Resmi:
${catalogContext}
${currentBookingContext}

Tugas & Aturan Ekstraksi Presisi:
1. NAMA PASIEN: Ekstrak HANYA nama orang yang bersih. Jika pasien mengetik "nama saya burna kak", "namaku Budi Santoso", "atas nama Putri ya min", ekstrak HANYA nama orangnya saja: "Burna", "Budi Santoso", "Putri". DILARANG KERAS memasukkan kata "nama saya", "kak", "min", dsb. Jika tidak ada nama, kosongkan "".
2. NOMOR HP: Ekstrak nomor HP HANYA jika pasien menyebutkan deretan angka telepon resmi (contoh: "08123456789"). DILARANG keras mengekstrak kalimat basa-basi seperti "nomor wa ini", "nomor ini", "pake nomor ini". Jika pasien menggunakan kalimat tersebut atau tidak menyebutkan angka, kembalikan nomor_hp sebagai string kosong "".
3. TANGGAL BOOKING: Hitung dan konversikan kata relatif tanggal (seperti "besok", "besok sabtu", "sabtu besok", "lusa", "sabtu depan", "tanggal 15") berdasarkan referensi "Hari Ini: ${todayStr}". Formatkan menjadi string tanggal resmi yang rapi: "[Hari], [Tanggal] [Bulan] [Tahun]" (contoh: "Sabtu, 15 Agustus 2026"). Jika pasien belum sebutkan tanggal, kembalikan "".
4. JAM SLOT: Ekstrak jam kedatangan dari kata pasien dan konversikan ke format 24 jam "HH:MM WIB":
   - "jam 9" / "jam 9 pagi" -> "09:00 WIB"
   - "jam 9 malam" / "jam 21" / "21.00" -> "21:00 WIB"
   - "jam 2 siang" / "jam 14" / "14.00" -> "14:00 WIB"
   - "jam 4 sore" / "jam 16" / "16.00" -> "16:00 WIB"
   - "jam 7 malam" / "jam 19" / "19.00" / "19:00" -> "19:00 WIB"
   - "10.30" / "10:30" -> "10:30 WIB"
   Jika pasien menyebutkan jam berapa pun, WAJIB kamu ekstrak ke format "HH:MM WIB". DILARANG mengarang frasa generik seperti "Sesuai Jadwal". Jika pasien belum sebutkan jam, kembalikan "".
5. TINDAKAN GIGI: Cocokkan (fuzzy match) setiap tindakan gigi yang diminta dengan Nama Layanan dari Katalog resmi. Isi nama_layanan dan estimasi_harga (number). Hitung total_estimasi (number).
6. DOKTER PILIHAN: Ekstrak nama dokter gigi pilihan (contoh: "drg. Amanda"). Jika tidak ada, kembalikan "-".
7. JIKA ada "Reservasi Aktif Saat Ini", gabungkan atau perbarui informasi baru tanpa menghapus data pasien/layanan yang sudah ada.

Struktur JSON yang wajib kamu kembalikan:
- nama_pasien (string, bersih hanya nama orang, kosongkan "" jika belum ada)
- nomor_hp (string, kosongkan "" jika belum berisi deretan angka telepon)
- layanan_dipilih (array of object: 'nama_layanan', 'estimasi_harga')
- tanggal_booking (string, format "[Hari], [Tanggal] [Bulan] [Tahun]", kosongkan "" jika belum ada)
- jam_booking (string, format "HH:MM WIB", kosongkan "" jika belum ada jam spesifik)
- dokter_pilihan (string, contoh: "drg. Amanda", kosongkan "-" jika tidak ada)
- total_estimasi (number, akumulasi estimasi harga)

Kamu WAJIB mengembalikan respon HANYA berupa objek JSON mentah yang valid, tanpa teks basa-basi, tanpa tanda backticks (\`\`\`json), dan tanpa penjelasan apa pun.`;

    const formattedMessages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      ...history.map((msg) => ({
        role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: formattedMessages,
      response_format: {
        type: 'json_object',
      },
      temperature: 0.1,
    });

    const rawJsonString = response.choices[0]?.message?.content || '{}';
    const parsedData: ExtractedBooking = JSON.parse(rawJsonString);
    return parsedData;
  } catch (error) {
    console.error('❌ [AI Service] Gagal mengekstrak data reservasi klinik gigi dari chat:', error);
    return {
      nama_pasien: '',
      nomor_hp: '',
      layanan_dipilih: [],
      tanggal_booking: '',
      jam_booking: '',
      dokter_pilihan: '-',
      total_estimasi: 0,
    };
  }
};
