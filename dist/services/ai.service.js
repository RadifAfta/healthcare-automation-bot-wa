"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractBookingFromChat = exports.cleanPatientName = exports.answerInquiry = exports.classifyIntent = void 0;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const env_1 = require("../config/env");
// Inisialisasi Groq client menggunakan API Key yang sudah divalidasi Zod
const groq = new groq_sdk_1.default({
    apiKey: env_1.env.GROQ_API_KEY,
});
/**
 * Service untuk mendeteksi niat (intent) dari chat pasien Klinik Kecantikan & Estetika.
 */
const classifyIntent = async (message, history = []) => {
    try {
        const systemPrompt = `Kamu adalah AI Router cerdas yang bertugas mengklasifikasi kategori pesan dari pasien/klien Klinik Kecantikan & Estetika (Beauty & Aesthetic Clinic).
Tentukan kategori pesan dari daftar berikut:
- CONFIRM: Jika pesan berisi konfirmasi setuju, mengiyakan rekap kartu reservasi, atau konfirmasi "Ya" / "Oke" / "Benar" / "Setuju" terhadap jadwal booking treatment kecantikan / perawatan kulit sebelumnya. Contoh: "ya", "oke", "benar", "betul kak", "ya reservasi saya sudah benar", "ok pas".
- CANCEL: Jika pesan berisi keinginan membatalkan reservasi janji temu dokter estetika atau menghapus booking treatment klinik kecantikan. Contoh: "batalin aja", "batal", "cancel booking saya", "gak jadi treatment deh".
- BOOKING: Jika pesan berisi niat untuk mendaftar reservasi treatment kecantikan, mengambil slot perawatan (seperti facial, laser glowing, chemical peeling, skin booster, botox, filler, acne care, slimming, infus whitening), menentukan tanggal/jam kedatangan, atau menambah jadwal perawatan. Contoh: "mau booking facial glowing besok", "pesen tempat laser acne jam 2 siang", "daftar skin booster hari sabtu", "booking peeling sama dr. amanda".
- INQUIRY: Jika pesan berisi pertanyaan umum tentang biaya/tarif treatment kecantikan, konsultasi masalah kulit (jerawat, flek, kusam, pori besar, bekas jerawat), katalog perawatan, jam buka klinik, ketersediaan dokter estetika (dr. Sp.DVE / dr. Estetika), lokasi klinik, atau pantangan/persiapan sebelum treatment. Contoh: "laser glowing berapa ya kak?", "buka jam berapa?", "dr. amanda praktek hari apa aja?", "facial sakit gak?", "alamat kliniknya di mana?", "buat bekas jerawat bagusnya treatment apa ya?".
- COMPLAINT: Jika pesan berisi komplain, keluhan kelambatan pelayanan, ketidakpuasan hasil treatment, atau keluhan reaksi kulit (kemerahan/iritasi/purging) pasca treatment. Contoh: "muka saya merah banget setelah peeling kemarin", "pelayanannya lambat banget tadi".
- TALK_TO_HUMAN: Jika pesan berisi permintaan eksplisit untuk berbicara langsung dengan admin manusia, resepsionis, atau beauty consultant klinik. Contoh: "mau bicara sama cs", "admin manusia dong", "transfer ke admin", "mau ngobrol sama admin manusia", "bisa bicara dengan resepsionis?".
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
                role: 'system',
                content: systemPrompt,
            },
            ...history.map((msg) => ({
                role: (msg.role === 'user' ? 'user' : 'assistant'),
                content: msg.content,
            })),
            {
                role: 'user',
                content: message,
            },
        ];
        const response = await groq.chat.completions.create({
            model: env_1.env.GROQ_MODEL,
            messages: formattedMessages,
            response_format: {
                type: 'json_object',
            },
            temperature: 0.0,
        });
        const rawJsonString = response.choices[0]?.message?.content || '{}';
        const parsedData = JSON.parse(rawJsonString);
        return parsedData.intent || 'OTHER';
    }
    catch (error) {
        console.error('❌ [AI Service] Gagal mengklasifikasikan intent chat:', error);
        return 'OTHER';
    }
};
exports.classifyIntent = classifyIntent;
/**
 * Service untuk menjawab pertanyaan umum pasien (INQUIRY / FAQ) Klinik Kecantikan secara ramah, profesional, & empatik.
 */
const answerInquiry = async (message, catalogContext, history = []) => {
    try {
        const systemPrompt = `Kamu adalah Beauty Consultant & Customer Service AI (Resepsionis) yang ramah, sopan, empatik, dan profesional khusus untuk Klinik Kecantikan & Estetika (Beauty & Aesthetic Clinic).
Tugasmu adalah menjawab pertanyaan pasien/klien (Inquiry/FAQ) seputar perawatan kecantikan, keluhan kulit, dan jadwal treatment secara singkat, jelas, dan membantu berdasarkan konteks katalog treatment & dokter estetika berikut:

Katalog Perawatan & Tarif Klinik Kecantikan Aktif:
${catalogContext}

Informasi Umum Klinik Kecantikan & Estetika:
- Jam Operasional: Senin - Sabtu, 09:00 - 20:00 WIB (Minggu & Libur Nasional Tutup)
- Lokasi Klinik: Jl. Kesehatan Raya No. 88, Jakarta (Dekat Pusat Kota)
- Fasilitas: Ruang Treatment Nyaman & Higienis, Alat Estetika Medis Modern, Dokter Estetika Bersertifikasi / Sp.DVE, Ruang Tunggu Eksklusif & AC
- Metode Pembayaran: Cash, QRIS, Transfer Bank, & Kartu Kredit

Aturan Komunikasi:
- Gunakan bahasa Indonesia yang santun, ramah, dan khas beauty consultant (gunakan sapaan "Kak" atau "Kakak").
- Berikan penjelasan manfaat treatment secara ringkas dan solutif jika klien menanyakan solusi keluhan kulit (misal kulit kusam direkomendasikan facial brightening / laser glowing; jerawat direkomendasikan acne care / chemical peeling).
- Jika menanyakan harga tindakan kecantikan / dokter estetika, jawab secara presisi sesuai katalog aktif di atas.
- Jika menanyakan perawatan yang tidak ada di katalog, katakan dengan sopan bahwa layanan tersebut saat ini belum tersedia di klinik kami.
- Jangan memberikan resep obat keras tanpa pengawasan dokter, sarankan pasien untuk datang konsultasi & skin analysis langsung dengan dokter estetika kami.
- Maksimal 3-4 kalimat. Akhiri dengan sapaan ramah dan emotikon cantik (😊✨🌸).`;
        const formattedMessages = [
            {
                role: 'system',
                content: systemPrompt,
            },
            ...history.map((msg) => ({
                role: (msg.role === 'user' ? 'user' : 'assistant'),
                content: msg.content,
            })),
            {
                role: 'user',
                content: message,
            },
        ];
        const response = await groq.chat.completions.create({
            model: env_1.env.GROQ_MODEL,
            messages: formattedMessages,
            temperature: 0.4,
        });
        return response.choices[0]?.message?.content || 'Halo Kak! Ada yang bisa kami bantu seputar informasi perawatan kulit dan konsultasi kecantikan di klinik kami? 😊✨';
    }
    catch (error) {
        console.error('❌ [AI Service] Gagal menyusun balasan inquiry:', error);
        return 'Halo Kak! Pertanyaan Kakak telah kami terima. Admin resepsionis / beauty consultant kami akan segera membantu membalas pesan Kakak ya! 😊✨';
    }
};
exports.answerInquiry = answerInquiry;
/**
 * Helper untuk membersihkan nama pasien dari kata awalan/akhiran obrolan (seperti "nama saya ... kak")
 */
const cleanPatientName = (rawText) => {
    if (!rawText)
        return 'Pasien';
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
exports.cleanPatientName = cleanPatientName;
/**
 * Service untuk mengekstrak data reservasi klinik kecantikan terstruktur dari chat WhatsApp pasien.
 */
const extractBookingFromChat = async (message, catalogContext, history = [], currentBooking) => {
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
        const systemPrompt = `Kamu adalah sistem AI ekstraksi data reservasi presisi tinggi untuk Klinik Kecantikan & Estetika (Beauty & Aesthetic Clinic). Tugasmu adalah mengekstrak chat pendaftaran pasien menjadi data JSON yang bersih, terstruktur, dan tervalidasi terhadap Katalog Perawatan Kecantikan resmi.

Hari Ini: ${todayStr}

Katalog Perawatan Kecantikan Resmi:
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
5. TINDAKAN KECANTIKAN: Cocokkan (fuzzy match) setiap perawatan kecantikan yang diminta dengan Nama Layanan dari Katalog resmi. Isi nama_layanan dan estimasi_harga (number). Hitung total_estimasi (number).
6. DOKTER PILIHAN: Ekstrak nama dokter estetika pilihan (contoh: "dr. Amanda"). Jika tidak ada, kembalikan "-".
7. JIKA ada "Reservasi Aktif Saat Ini", gabungkan atau perbarui informasi baru tanpa menghapus data pasien/layanan yang sudah ada.

Struktur JSON yang wajib kamu kembalikan:
- nama_pasien (string, bersih hanya nama orang, kosongkan "" jika belum ada)
- nomor_hp (string, kosongkan "" jika belum berisi deretan angka telepon)
- layanan_dipilih (array of object: 'nama_layanan', 'estimasi_harga')
- tanggal_booking (string, format "[Hari], [Tanggal] [Bulan] [Tahun]", kosongkan "" jika belum ada)
- jam_booking (string, format "HH:MM WIB", kosongkan "" jika belum ada jam spesifik)
- dokter_pilihan (string, contoh: "dr. Amanda", kosongkan "-" jika tidak ada)
- total_estimasi (number, akumulasi estimasi harga)

Kamu WAJIB mengembalikan respon HANYA berupa objek JSON mentah yang valid, tanpa teks basa-basi, tanpa tanda backticks (\`\`\`json), dan tanpa penjelasan apa pun.`;
        const formattedMessages = [
            {
                role: 'system',
                content: systemPrompt,
            },
            ...history.map((msg) => ({
                role: (msg.role === 'user' ? 'user' : 'assistant'),
                content: msg.content,
            })),
            {
                role: 'user',
                content: message,
            },
        ];
        const response = await groq.chat.completions.create({
            model: env_1.env.GROQ_MODEL,
            messages: formattedMessages,
            response_format: {
                type: 'json_object',
            },
            temperature: 0.1,
        });
        const rawJsonString = response.choices[0]?.message?.content || '{}';
        const parsedData = JSON.parse(rawJsonString);
        return parsedData;
    }
    catch (error) {
        console.error('❌ [AI Service] Gagal mengekstrak data reservasi klinik kecantikan dari chat:', error);
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
exports.extractBookingFromChat = extractBookingFromChat;
