"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = void 0;
/// <reference path="../types/global.d.ts" />
const whatsapp_web_js_1 = require("whatsapp-web.js");
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const whatsapp_queue_1 = require("../queue/whatsapp.queue");
// Inisialisasi Client WhatsApp Web JS menggunakan strategi LocalAuth
// LocalAuth akan menyimpan data sesi di folder lokal '.wwebjs_auth/' agar tidak perlu scan QR lagi
exports.client = new whatsapp_web_js_1.Client({
    authStrategy: new whatsapp_web_js_1.LocalAuth(),
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    puppeteer: {
        headless: false, // Set ke false agar kita bisa melihat window browser untuk debugging
        handleSIGINT: false, // Penting agar Puppeteer menutup browser dengan bersih saat server berhenti
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled', // Menyembunyikan tanda-tanda otomatisasi (bot) Puppeteer
        ],
    },
});
// Event Listener 'loading_screen': Menampilkan progres pemuatan halaman WhatsApp Web
exports.client.on('loading_screen', (percent, message) => {
    console.log(`📡 [WhatsApp Bot] Loading screen: ${percent}% - ${message}`);
});
// Event Listener 'qr': Menampilkan QR Code langsung di dalam console/terminal server
exports.client.on('qr', (qr) => {
    console.log('\n📡 [WhatsApp Bot] Sesi baru terdeteksi! Silakan pindai QR code berikut menggunakan WhatsApp di HP Anda untuk login:\n');
    qrcode_terminal_1.default.generate(qr, { small: true });
});
// Event Listener 'ready': Terpanggil ketika bot sudah terautentikasi dan siap digunakan
exports.client.on('ready', () => {
    console.log('\n✅ [WhatsApp Bot] Koneksi sukses! Bot WhatsApp siap digunakan & mendengarkan pesan masuk.\n');
});
// Event Listener 'authenticated': Terpanggil saat proses autentikasi berhasil
exports.client.on('authenticated', () => {
    console.log('📡 [WhatsApp Bot] Autentikasi sukses! Memuat sesi...');
});
// Event Listener 'auth_failure': Terpanggil jika proses autentikasi gagal
exports.client.on('auth_failure', (msg) => {
    console.error('❌ [WhatsApp Bot] Autentikasi gagal! Pesan:', msg);
});
// Event Listener 'disconnected': Terpanggil ketika bot terputus dari WhatsApp Web
exports.client.on('disconnected', (reason) => {
    console.warn('⚠️ [WhatsApp Bot] Koneksi terputus! Alasan:', reason);
});
// ====== EVENT UTAMA UNTUK PROSESING ANTRIAN ======
// Event Listener 'message_create': Menangkap semua pesan personal (baik dari orang lain maupun dari diri sendiri)
// Kita menggunakan 'message_create' agar mendukung fitur pengujian Self-Chat (mengirim pesan ke nomor sendiri untuk testing)
exports.client.on('message_create', async (msg) => {
    // DEBUG LOG MENTAH: Selalu cetak setiap kali ada pesan masuk/keluar untuk mempermudah diagnosa
    console.log(`🔍 [Debug WA] Event 'message_create' terdeteksi!`);
    console.log(`   - Dari (From): ${msg.from}`);
    console.log(`   - Ke (To): ${msg.to}`);
    console.log(`   - Dari Saya (fromMe): ${msg.fromMe}`);
    console.log(`   - Teks Pesan: "${msg.body}"`);
    // Hanya proses chat personal (Direct Message) dan abaikan jika pesan berasal dari Grup Chat
    // Pada wweb.js modern, chat personal diakhiri '@c.us' atau '@lid' (Linked Identity format baru dari Meta)
    const isPersonalChat = msg.from.endsWith('@c.us') || msg.from.endsWith('@lid');
    if (isPersonalChat) {
        // 1. Cegah infinite loop dengan mengabaikan pesan balasan otomatis dari bot kita sendiri
        const isAutomatedReply = msg.body.startsWith('🤖') || msg.body.startsWith('Halo! Pesanan kamu');
        if (isAutomatedReply) {
            console.log('   ℹ️ Mengabaikan pesan balasan otomatis untuk mencegah loop.');
            return;
        }
        // 2. Terima jika pesan berasal dari orang lain (Incoming)
        // Skenario pesan masuk dari orang lain selalu memiliki 'fromMe: false'
        const isIncoming = !msg.fromMe;
        // Untuk mempermudah pengujian, kita mengizinkan pesan dikirim dari akun kita sendiri (simulasi testing)
        const isSelfChat = msg.fromMe;
        if (isIncoming || isSelfChat) {
            const sender = isSelfChat ? msg.to : msg.from; // Tetapkan pengirim dengan tepat
            const message = msg.body; // Isi pesan teks chat
            console.log(`\n📥 [WhatsApp Bot] Chat Diterima (${isSelfChat ? 'Self-Chat Test' : 'Pesan Masuk'}): ${sender}`);
            console.log(`💬 Isi Pesan: "${message}"`);
            try {
                // Masukkan data chat ke antrean Redis secara asinkronus (BullMQ)
                await (0, whatsapp_queue_1.addChatToQueue)(sender, message);
            }
            catch (error) {
                console.error('❌ [WhatsApp Bot] Gagal memasukkan pesan masuk ke antrean Redis:', error);
            }
        }
        else {
            console.log('   ℹ️ Pesan diabaikan karena bukan pesan masuk baru atau self-chat test.');
        }
    }
    else {
        console.log('   ℹ️ Pesan diabaikan karena bukan dari chat personal (diakhiri @c.us).');
    }
});
// Event Listener Cadangan 'message': Menangkap pesan masuk sebagai pengaman tambahan jika 'message_create' terhambat
exports.client.on('message', async (msg) => {
    console.log(`🔍 [Debug WA] Event 'message' (Incoming Only) terdeteksi dari: ${msg.from}`);
    if (msg.from.endsWith('@c.us') && !msg.fromMe) {
        const sender = msg.from;
        const message = msg.body;
        // Cek apakah data ini sudah ditangani (untuk menghindari duplikasi jika keduanya aktif)
        console.log(`📥 [WhatsApp Bot] Chat Masuk Cadangan dari ${sender}: "${message}"`);
    }
});
exports.default = exports.client;
