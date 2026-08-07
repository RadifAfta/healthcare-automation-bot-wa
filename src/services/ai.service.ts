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

// Tipe Niat (Intent) pesan WhatsApp masuk untuk Klinik Kecantikan & Gigi
export type IntentType = 'BOOKING' | 'INQUIRY' | 'COMPLAINT' | 'CONFIRM' | 'CANCEL' | 'OTHER';

// Interface untuk respons deteksi intent
export interface IntentResult {
  intent: IntentType;
  explanation: string;
}

// Interface untuk bentuk data hasil ekstraksi reservasi klinik yang sudah tervalidasi katalog
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
 * Service untuk mendeteksi niat (intent) dari chat pasien Klinik Kecantikan & Gigi.
 */
export const classifyIntent = async (message: string, history: ChatMessage[] = []): Promise<IntentType> => {
  try {
    const systemPrompt = `Kamu adalah AI Router cerdas yang bertugas mengklasifikasi kategori pesan dari pasien Klinik Kecantikan & Klinik Gigi.
Tentukan kategori pesan dari daftar berikut:
- CONFIRM: Jika pesan berisi konfirmasi setuju, mengiyakan rekap kartu reservasi, atau konfirmasi "Ya" / "Oke" / "Benar" / "Setuju" terhadap jadwal booking klinik sebelumnya. Contoh: "ya", "oke", "benar", "betul kak", "ya reservasi saya sudah benar", "ok pas".
- CANCEL: Jika pesan berisi keinginan membatalkan reservasi janji temu atau menghapus booking klinik. Contoh: "batalin aja", "batal", "cancel booking saya", "gak jadi periksa deh".
- BOOKING: Jika pesan berisi niat untuk mendaftar reservasi janji temu, mengambil slot treatment/perawatan gigi atau kecantikan, menentukan tanggal/jam kedatangan, atau menambah tindakan perawatan. Contoh: "mau booking scaling gigi besok", "pesen tempat facial glow jam 2 siang", "daftar periksa behel hari sabtu", "booking laser acne sama dr. siska".
- INQUIRY: Jika pesan berisi pertanyaan umum tentang biaya/tarif treatment, katalog perawatan gigi/kecantikan, jam buka klinik, ketersediaan dokter/beautician, lokasi fisik klinik, atau syarat persiapan sebelum treatment. Contoh: "scaling gigi berapa ya kak?", "buka jam berapa?", "drg. amanda ada hari apa aja?", "alamat kliniknya di mana?".
- COMPLAINT: Jika pesan berisi komplain, keluhan kelambatan pelayanan, ketidakpuasan hasil perawatan, atau keluhan komplikasi pasca tindakan. Contoh: "gigi saya sakit banget setelah ditambal kemarin", "pelayanannya lambat banget tadi".
- OTHER: Jika pesan hanya berisi salam pembuka (halo, p, pagi, siang), basa-basi, ucapan terima kasih, atau teks acak yang tidak jelas tujuannya.

Kamu WAJIB mengembalikan respon HANYA berupa objek JSON mentah yang valid, tanpa teks basa-basi, tanpa tanda backticks (\`\`\`json), dan tanpa penjelasan apa pun.
Struktur JSON yang wajib kamu kembalikan harus memiliki key berikut:
{
  "intent": "BOOKING" | "INQUIRY" | "COMPLAINT" | "CONFIRM" | "CANCEL" | "OTHER",
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
 * Service untuk menjawab pertanyaan umum pasien (INQUIRY / FAQ) klinik secara ramah, profesional, & empatik.
 */
export const answerInquiry = async (message: string, catalogContext: string, history: ChatMessage[] = []): Promise<string> => {
  try {
    const systemPrompt = `Kamu adalah Customer Service AI (Resepsionis) yang ramah, sopan, empatik, dan profesional untuk Klinik Kecantikan & Klinik Gigi.
Tugasmu adalah menjawab pertanyaan pasien (Inquiry/FAQ) secara singkat, jelas, dan membantu berdasarkan konteks katalog layanan perawatan & jadwal klinik berikut:

Katalog Layanan & Tarif Klinik Aktif:
${catalogContext}

Informasi Umum Klinik:
- Jam Operasional: Senin - Sabtu, 09:00 - 20:00 WIB (Minggu & Libur Nasional Tutup)
- Lokasi Klinik: Jl. Kesehatan Raya No. 88, Jakarta
- Metode Pembayaran: Cash, QRIS, Transfer Bank, & Kartu Kredit

Aturan Komunikasi:
- Gunakan bahasa Indonesia yang santun, ramah, dan empatik (gunakan sapaan "Kak" atau "Kakak").
- Jika menanyakan harga treatment / dokter, jawab secara presisi sesuai katalog aktif di atas.
- Jika menanyakan treatment yang tidak ada di katalog, katakan dengan sopan bahwa layanan tersebut saat ini belum tersedia di klinik kami.
- Jangan memberikan konsultasi medis yang terlalu berisiko, sarankan pasien untuk mendaftar reservasi janji temu agar bisa diperiksa langsung oleh dokter profesional kami.
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

    return response.choices[0]?.message?.content || 'Halo Kak! Ada yang bisa kami bantu seputar informasi perawatan gigi dan kecantikan di klinik kami? 😊';
  } catch (error) {
    console.error('❌ [AI Service] Gagal menyusun balasan inquiry:', error);
    return 'Halo Kak! Pertanyaan Kakak telah kami terima. Admin resepsionis kami akan segera membantu membalas pesan Kakak ya! 😊';
  }
};

/**
 * Service untuk mengekstrak data reservasi klinik terstruktur dari chat WhatsApp pasien.
 */
export const extractBookingFromChat = async (
  message: string,
  catalogContext: string,
  history: ChatMessage[] = [],
  currentBooking?: ExtractedBooking
): Promise<ExtractedBooking> => {
  try {
    const currentBookingContext = currentBooking && currentBooking.layanan_dipilih.length > 0
      ? `\nReservasi Aktif Saat Ini yang Sedang Berjalan:\n${JSON.stringify(currentBooking, null, 2)}\n`
      : '';

    const systemPrompt = `Kamu adalah sistem AI ekstraksi data reservasi untuk Klinik Kecantikan & Klinik Gigi. Tugasmu adalah mengekstrak chat pendaftaran pasien menjadi data JSON yang bersih, terstruktur, dan tervalidasi terhadap Katalog Layanan Klinik resmi.

Katalog Layanan Klinik Resmi:
${catalogContext}
${currentBookingContext}

Tugasmu:
1. Ekstrak nama pasien, nomor HP (jika disebutkan), daftar tindakan/treatment yang dipilih, tanggal booking/kedatangan, jam slot kedatangan, dan nama dokter pilihan (jika disebutkan).
2. Setiap treatment yang dipilih pasien wajib dicocokkan (fuzzy match) dengan Nama Layanan yang ada di Katalog Layanan Klinik Resmi di atas.
3. Untuk setiap layanan yang cocok, isi:
   - nama_layanan: Gunakan Nama Layanan resmi dari Katalog.
   - estimasi_harga: Harga resmi dari Katalog (harus angka/number).
4. Hitung total_estimasi: Jumlah akumulasi harga dari seluruh layanan yang dipilih (harus angka/number).
5. JIKA pasien menyebutkan tanggal/jam kedatangan (contoh: "besok jam 2 siang", "sabtu jam 10 pagi", "tanggal 12 jam 14.00"), ekstrak menjadi string tanggal_booking dan jam_booking yang rapi (contoh: tanggal_booking: "Sabtu, 10 Agustus", jam_booking: "14:00 WIB").
6. JIKA pasien TIDAK menyebutkan layanan perawatan secara jelas, kembalikan array 'layanan_dipilih' kosong [] dan total_estimasi 0.
7. JIKA ada "Reservasi Aktif Saat Ini", gabungkan atau perbarui informasi baru tanpa menghapus data pasien/layanan yang sudah ada kecuali diminta diubah oleh pasien.

Struktur JSON yang wajib kamu kembalikan:
- nama_pasien (string, kosongkan "" jika belum disebutkan)
- nomor_hp (string, kosongkan "" jika belum disebutkan)
- layanan_dipilih (array of object: 'nama_layanan', 'estimasi_harga')
- tanggal_booking (string, kosongkan "" jika belum disebutkan)
- jam_booking (string, kosongkan "" jika belum disebutkan)
- dokter_pilihan (string, kosongkan "-" jika tidak memilih dokter khusus)
- total_estimasi (number, jumlah dari seluruh estimasi harga)

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
    console.error('❌ [AI Service] Gagal mengekstrak data reservasi klinik dari chat:', error);
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
