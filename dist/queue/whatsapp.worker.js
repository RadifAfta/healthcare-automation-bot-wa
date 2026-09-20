"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = __importDefault(require("../config/redis"));
const whatsapp_queue_1 = require("./whatsapp.queue");
const ai_service_1 = require("../services/ai.service");
const sheets_service_1 = require("../services/sheets.service");
const whatsapp_provider_service_1 = require("../services/whatsapp-provider.service");
const session_service_1 = require("../services/session.service");
const env_1 = require("../config/env");
// Inisialisasi WhatsApp Provider dari Factory
const whatsappProvider = whatsapp_provider_service_1.WhatsAppProviderFactory.getProvider();
// Helper untuk menyanitasi nomor HP pasien (memastikan berupa deretan angka WA pengirim asli)
const sanitizePhoneNumber = (extractedPhone, senderPhone) => {
    if (!extractedPhone || extractedPhone.trim() === '')
        return senderPhone;
    const digitsOnly = extractedPhone.replace(/[^0-9]/g, '');
    const lower = extractedPhone.toLowerCase();
    if (digitsOnly.length < 8 || lower.includes('nomor') || lower.includes('wa') || lower.includes('pake')) {
        return senderPhone;
    }
    return digitsOnly;
};
// Helper untuk menyusun teks Kartu Reservasi Klinik Kecantikan & Estetika
const renderBookingRecap = (booking, cleanSenderPhone) => {
    const validPhone = sanitizePhoneNumber(booking.nomor_hp, cleanSenderPhone);
    booking.nomor_hp = validPhone;
    const treatmentDetailsStr = booking.layanan_dipilih
        .map((p) => `- *${p.nama_layanan}*: Rp${p.estimasi_harga.toLocaleString('id-ID')}`)
        .join('\n');
    return `🤖 *📋 KARTU RESERVASI KLINIK KECANTIKAN & ESTETIKA* \n\nBerikut rincian jadwal janji temu perawatan kecantikan Kakak:\n\n- *Nama Pasien/Klien:* ${booking.nama_pasien || 'Pasien'}\n- *Nomor WA:* ${validPhone}\n- *Tanggal Booking:* ${booking.tanggal_booking || '-'}\n- *Jam Slot:* ${booking.jam_booking || '-'}\n- *Dokter / Terapis Estetika:* ${booking.dokter_pilihan || '-'}\n\n*Treatment Kecantikan Dipilih:*\n${treatmentDetailsStr}\n\n*💰 Total Estimasi Biaya:* *Rp${booking.total_estimasi.toLocaleString('id-ID')}*\n\nApakah jadwal reservasi perawatan di atas sudah sesuai? (Ketik **Ya** untuk konfirmasi, atau ketik jika ada perubahan/tambahan). 😊✨`;
};
// Inisialisasi Worker BullMQ (Consumer)
exports.whatsappWorker = new bullmq_1.Worker(whatsapp_queue_1.WHATSAPP_QUEUE_NAME, async (job) => {
    const { sender, message } = job.data;
    const cleanSenderPhone = sender.split('@')[0];
    console.log(`\n👷 [Worker] Mulai memproses job #${job.id} dari pengirim: ${sender}`);
    // ------------------------------------------------------------------------
    // AMBIL ATAU INISIALISASI SESI DENGAN RIWAYAT CHAT
    // ------------------------------------------------------------------------
    let session = await session_service_1.sessionService.getSession(sender);
    if (!session) {
        session = {
            step: 'IDLE',
            history: [],
        };
    }
    // 1. Simpan pesan pengguna ke riwayat chat
    session.history.push({ role: 'user', content: message });
    // Batasi panjang riwayat chat (maksimal 6 pesan terakhir)
    if (session.history.length > 6) {
        session.history.shift();
    }
    console.log(`👷 [Worker] Status Sesi ${sender}: ${session.step}, Riwayat Chat: ${session.history.length} pesan`);
    let replyText = '';
    const cleanMessageTrim = message.trim();
    const cleanMessageLower = cleanMessageTrim.toLowerCase();
    // ------------------------------------------------------------------------
    // 0. PERINTAH KHUSUS ADMIN RELAY VIA WHATSAPP (!balas & !bot-on)
    // ------------------------------------------------------------------------
    // A. PERINTAH ADMIN: !balas <nomor_pasien> <pesan_admin>
    if (cleanMessageLower.startsWith('!balas')) {
        const parts = cleanMessageTrim.split(/\s+/);
        if (parts.length >= 3) {
            const targetPhone = parts[1].replace(/[^0-9]/g, '');
            const adminReplyText = parts.slice(2).join(' ');
            console.log(`👷 [Worker] Admin ${sender} membalas ke pasien ${targetPhone}: "${adminReplyText}"`);
            await whatsappProvider.sendMessage(targetPhone, adminReplyText);
            let patientSession = await session_service_1.sessionService.getSession(targetPhone);
            if (patientSession) {
                patientSession.history.push({ role: 'assistant', content: adminReplyText });
                // Refresh waktu tunggu Handoff selama 30 menit (1800 detik) setiap kali admin membalas
                await session_service_1.sessionService.setSession(targetPhone, patientSession, 1800);
            }
            replyText = `✅ *Pesan Berhasil Terkirim!*\n\n📲 *Penerima:* ${targetPhone}\n💬 *Pesan Admin:* "${adminReplyText}"`;
            await whatsappProvider.sendMessage(sender, replyText);
            return;
        }
        else {
            replyText = `⚠️ *Format Perintah Balas Salah!*\n\nGunakan format: \`!balas <nomor_pasien> <pesan_admin>\`\n*Contoh:* \`!balas 6282245480975 Halo Kak, ada yang bisa dibantu?\``;
            await whatsappProvider.sendMessage(sender, replyText);
            return;
        }
    }
    // B. PERINTAH ADMIN: !bot-on <nomor_pasien> ATAU !bot-on
    if (cleanMessageLower.startsWith('!bot-on') || cleanMessageLower.startsWith('!reset') || cleanMessageLower.startsWith('!aktif')) {
        const parts = cleanMessageTrim.split(/\s+/);
        const targetPhone = parts.length >= 2 ? parts[1].replace(/[^0-9]/g, '') : sender;
        console.log(`👷 [Worker] Perintah reaktivasi bot terdeteksi untuk pasien ${targetPhone}`);
        // Hapus seluruh riwayat dan sesi lama dari Redis/Memori
        await session_service_1.sessionService.deleteSession(targetPhone);
        const patientNotification = `🤖 *Bot AI Klinik Kecantikan Telah Aktif Kembali!* \n\nHalo Kak! Bot AI kami siap melayani informasi treatment, konsultasi tarif, jadwal dokter estetika, dan reservasi perawatan Kakak 24/7. Ada yang bisa kami bantu? 😊✨`;
        await whatsappProvider.sendMessage(targetPhone, patientNotification);
        if (targetPhone !== sender) {
            replyText = `✅ *Bot AI Berhasil Diaktifkan Kembali!*\n\n📲 *Nomor Pasien:* ${targetPhone}`;
            await whatsappProvider.sendMessage(sender, replyText);
        }
        return;
    }
    // ------------------------------------------------------------------------
    // 1. KLASIFIKASI NIAT CHAT (DILAKUKAN DIAWAL UNTUK CEK REAKTIVASI OTOMATIS)
    // ------------------------------------------------------------------------
    const intent = await (0, ai_service_1.classifyIntent)(message, session.history);
    console.log(`👷 [Worker] Niat terdeteksi: ${intent.toUpperCase()}`);
    // ------------------------------------------------------------------------
    // 2. LOGIKA AUTO-REACTIVATION & SILENT MODE (HANDOFF_ADMIN)
    // ------------------------------------------------------------------------
    if (session.step === 'HANDOFF_ADMIN') {
        // JIKA PASIEN DI HANDOFF INGIN MEMULAI BOOKING BARU ATAU BATALKAN:
        // AI Otomatis Mengambil Alih Kembali (Auto-Reactivation) tanpa perlu !bot-on!
        if (intent === 'BOOKING' || intent === 'CANCEL') {
            console.log(`🤖 [Worker] Auto-Reactivation: Pasien ${sender} memulai niat ${intent}. Bot AI otomatis aktif kembali!`);
            session.step = 'IDLE';
            session.booking = undefined;
        }
        else {
            // Jika masih percakapan biasa/keluhan, bot tetap hening dan teruskan ke WA Admin
            console.log(`ℹ️ [Worker] Mengabaikan pesan dari ${sender} karena sesi sedang dalam mode HANDOFF_ADMIN.`);
            // Refresh TTL Inactivity 30 menit
            await session_service_1.sessionService.setSession(sender, session, 1800);
            if (env_1.env.ADMIN_WA_NUMBER && env_1.env.ADMIN_WA_NUMBER.trim() !== '') {
                const patientName = session.booking?.nama_pasien || 'Pasien';
                const adminAlertText = `💬 *[PESAN BARU PASIEN HANDOFF]*\n\n👤 *Pasien:* ${patientName} (${cleanSenderPhone})\n💬 *Pesan:* "${message}"\n\n*Balas via WA:* \`!balas ${cleanSenderPhone} <pesan_anda>\``;
                await whatsappProvider.sendMessage(env_1.env.ADMIN_WA_NUMBER, adminAlertText);
            }
            return;
        }
    }
    const catalog = await (0, sheets_service_1.getCatalogFromSheet)();
    const catalogContext = catalog
        .map((item) => `- ${item.nama} (Tarif: Rp${item.harga.toLocaleString('id-ID')}, Durasi: ${item.durasi || '45m'}, Dokter: ${item.dokter || 'Tim Dokter Estetika'})`)
        .join('\n');
    // ------------------------------------------------------------------------
    // HANDLING GLOBAL INTENT: HANDOFF TO HUMAN ADMIN (TALK_TO_HUMAN / COMPLAINT)
    // ------------------------------------------------------------------------
    if (intent === 'TALK_TO_HUMAN' || intent === 'COMPLAINT') {
        console.log(`👷 [Worker] Menerima permintaan pengalihan ke Admin Manusia dari ${sender}`);
        session.step = 'HANDOFF_ADMIN';
        replyText = `🤖 Baik Kak, pesan Kakak telah kami teruskan ke Admin Resepsionis / Beauty Consultant klinik kami. Bot otomatis diistirahatkan sementara untuk nomor ini. Admin kami akan segera membalas percakapan Kakak secara manual ya. Terima kasih! 🙏✨`;
        await whatsappProvider.sendMessage(sender, replyText);
        session.history.push({ role: 'assistant', content: replyText });
        // Simpan sesi HANDOFF_ADMIN dengan Inactivity Timeout 30 menit (1800 detik)
        await session_service_1.sessionService.setSession(sender, session, 1800);
        if (env_1.env.ADMIN_WA_NUMBER && env_1.env.ADMIN_WA_NUMBER.trim() !== '') {
            const patientName = session.booking?.nama_pasien || 'Pasien';
            const adminAlertMessage = `🚨 *[ALERT PASIEN HANDOFF KLINIK KECANTIKAN]*\n\n👤 *Klien:* ${patientName} (${cleanSenderPhone})\n💬 *Pesan Klien:* "${message}"\n\n💬 *Cara Balas dari WA:* \n\`!balas ${cleanSenderPhone} <pesan_anda>\` \n\n🤖 *Cara Aktifkan Bot Kembali:* \n\`!bot-on ${cleanSenderPhone}\``;
            console.log(`📡 [Worker] Meneruskan notifikasi Handoff ke WA Admin: ${env_1.env.ADMIN_WA_NUMBER}`);
            await whatsappProvider.sendMessage(env_1.env.ADMIN_WA_NUMBER, adminAlertMessage);
        }
        return;
    }
    // ------------------------------------------------------------------------
    // HANDLING GLOBAL INTENT: GRATITUDE (UCAPAN TERIMA KASIH / SALAM PENUTUP)
    // ------------------------------------------------------------------------
    if (intent === 'GRATITUDE') {
        console.log(`👷 [Worker] Menerima ucapan terima kasih dari ${sender}`);
        const patientName = session.booking?.nama_pasien || '';
        const nameCall = patientName ? ` Kak *${patientName}*` : ' Kak';
        replyText = `🤖 Sama-sama${nameCall}! Senang bisa membantu melayani Kakak. Jika ada pertanyaan seputar perawatan kecantikan kulit atau ingin konsultasi lagi, jangan ragu untuk chat kami kembali ya. Sampai jumpa di klinik kecantikan kami! 🙏😊✨🌸`;
        await whatsappProvider.sendMessage(sender, replyText);
        session.history.push({ role: 'assistant', content: replyText });
        await session_service_1.sessionService.setSession(sender, session);
        return;
    }
    // ------------------------------------------------------------------------
    // HANDLING GLOBAL INTENT: CANCEL (BATALKAN RESERVASI KLINIK KECANTIKAN)
    // ------------------------------------------------------------------------
    if (intent === 'CANCEL') {
        replyText = `🤖 Baik Kak, reservasi janji temu perawatan kecantikan Anda saat ini telah dibatalkan. Jika ingin melakukan reservasi treatment di lain waktu, cukup ketik kembali perawatan yang diinginkan ya Kak. Terima kasih! 😊✨`;
        await whatsappProvider.sendMessage(sender, replyText);
        await session_service_1.sessionService.deleteSession(sender);
        console.log(`👷 [Worker] Reservasi dibatalkan & sesi dihapus bersih untuk ${sender}\n`);
        return;
    }
    // ------------------------------------------------------------------------
    // STATE MACHINE FLOW (KLINIK KECANTIKAN & ESTETIKA)
    // ------------------------------------------------------------------------
    // A. STATE: AWAITING_NAME (MENUNGGU NAMA PASIEN)
    if (session.step === 'AWAITING_NAME') {
        if (intent === 'INQUIRY') {
            replyText = await (0, ai_service_1.answerInquiry)(message, catalogContext, session.history);
            replyText = `${replyText}\n\n*Catatan:* Mohon infokan **Nama Lengkap Pasien/Klien** terlebih dahulu ya Kak agar reservasi klinik kecantikan bisa kami catat. 😊`;
            await whatsappProvider.sendMessage(sender, replyText);
            session.history.push({ role: 'assistant', content: replyText });
            await session_service_1.sessionService.setSession(sender, session);
            return;
        }
        if (session.booking) {
            const extractedNew = await (0, ai_service_1.extractBookingFromChat)(message, catalogContext, session.history, session.booking);
            const cleanName = extractedNew.nama_pasien && extractedNew.nama_pasien.trim() !== ''
                ? (0, ai_service_1.cleanPatientName)(extractedNew.nama_pasien)
                : (0, ai_service_1.cleanPatientName)(message);
            session.booking.nama_pasien = cleanName;
            session.booking.nomor_hp = sanitizePhoneNumber(extractedNew.nomor_hp || session.booking.nomor_hp, cleanSenderPhone);
            if (extractedNew.tanggal_booking && extractedNew.tanggal_booking.trim() !== '') {
                session.booking.tanggal_booking = extractedNew.tanggal_booking;
            }
            if (extractedNew.jam_booking && extractedNew.jam_booking.trim() !== '') {
                session.booking.jam_booking = extractedNew.jam_booking;
            }
            const isDateMissing = !session.booking.tanggal_booking || session.booking.tanggal_booking.trim() === '' || session.booking.tanggal_booking.trim() === '-';
            const isTimeMissing = !session.booking.jam_booking || session.booking.jam_booking.trim() === '' || session.booking.jam_booking.trim() === '-' || session.booking.jam_booking.includes('Sesuai');
            if (isDateMissing || isTimeMissing) {
                session.step = 'AWAITING_DATE_TIME';
                if (isDateMissing) {
                    replyText = `🤖 Terima kasih Kak *${cleanName}*! Selanjutnya, mohon infokan **Hari/Tanggal & Jam Slot Kedatangan** yang Kakak inginkan untuk perawatan ya (contoh: *Besok jam 14:00 WIB* atau *Sabtu jam 10:00 WIB*). 😊`;
                }
                else {
                    replyText = `🤖 Terima kasih Kak *${cleanName}*! Untuk tanggal *${session.booking.tanggal_booking}*, Kakak ingin mengambil **Jam Slot** berapa? (Klinik kami buka 09:00 - 20:00 WIB, contoh: *14:00 WIB* atau *10:00 WIB*). 😊`;
                }
            }
            else {
                session.step = 'AWAITING_CONFIRMATION';
                replyText = renderBookingRecap(session.booking, cleanSenderPhone);
            }
            await whatsappProvider.sendMessage(sender, replyText);
            session.history.push({ role: 'assistant', content: replyText });
            await session_service_1.sessionService.setSession(sender, session);
        }
        else {
            session.step = 'IDLE';
            replyText = `🤖 Halo Kak! Silakan sebutkan perawatan kecantikan yang ingin Kakak reservasi ya. 😊✨`;
            await whatsappProvider.sendMessage(sender, replyText);
            session.history.push({ role: 'assistant', content: replyText });
            await session_service_1.sessionService.setSession(sender, session);
        }
        return;
    }
    // B. STATE: AWAITING_DATE_TIME (MENUNGGU TANGGAL & JAM KEDATANGAN)
    if (session.step === 'AWAITING_DATE_TIME') {
        if (intent === 'INQUIRY') {
            replyText = await (0, ai_service_1.answerInquiry)(message, catalogContext, session.history);
            replyText = `${replyText}\n\n*Catatan:* Mohon infokan **Hari/Tanggal & Jam Slot Kedatangan** Kakak terlebih dahulu ya agar bisa kami jadwalkan dokter estetikanya. 😊`;
            await whatsappProvider.sendMessage(sender, replyText);
            session.history.push({ role: 'assistant', content: replyText });
            await session_service_1.sessionService.setSession(sender, session);
            return;
        }
        // Gunakan AI untuk ekstraksi presisi tanggal/jam dari pesan baru pasien
        if (session.booking) {
            const extractedNew = await (0, ai_service_1.extractBookingFromChat)(message, catalogContext, session.history, session.booking);
            if (extractedNew.nama_pasien && extractedNew.nama_pasien.trim() !== '') {
                session.booking.nama_pasien = (0, ai_service_1.cleanPatientName)(extractedNew.nama_pasien);
            }
            session.booking.nomor_hp = sanitizePhoneNumber(extractedNew.nomor_hp || session.booking.nomor_hp, cleanSenderPhone);
            if (extractedNew.tanggal_booking && extractedNew.tanggal_booking.trim() !== '') {
                session.booking.tanggal_booking = extractedNew.tanggal_booking;
            }
            if (extractedNew.jam_booking && extractedNew.jam_booking.trim() !== '') {
                session.booking.jam_booking = extractedNew.jam_booking;
            }
            // VALIDASI JAM OPERASIONAL KLINIK (09:00 - 20:00 WIB)
            if (session.booking.jam_booking && session.booking.jam_booking.trim() !== '') {
                const hourMatch = session.booking.jam_booking.match(/^(\d{1,2}):/);
                if (hourMatch) {
                    const hour = parseInt(hourMatch[1], 10);
                    if (hour < 9 || hour > 20) {
                        replyText = `🤖 Maaf Kak *${session.booking.nama_pasien}*, klinik kami beroperasi pada pukul **09:00 - 20:00 WIB**. Untuk jam *${session.booking.jam_booking}* klinik sudah tutup ya. Apakah Kakak bersedia di jam operasional kami, misalnya jam *19:00 WIB* (malam) atau jam *10:00 WIB* (pagi)? 😊`;
                        session.booking.jam_booking = ''; // reset agar pasien memilih slot valid
                        await whatsappProvider.sendMessage(sender, replyText);
                        session.history.push({ role: 'assistant', content: replyText });
                        await session_service_1.sessionService.setSession(sender, session);
                        return;
                    }
                }
            }
            const isDateMissing = !session.booking.tanggal_booking || session.booking.tanggal_booking.trim() === '' || session.booking.tanggal_booking.trim() === '-';
            const isTimeMissing = !session.booking.jam_booking || session.booking.jam_booking.trim() === '' || session.booking.jam_booking.trim() === '-' || session.booking.jam_booking.includes('Sesuai');
            if (isDateMissing || isTimeMissing) {
                if (isDateMissing) {
                    replyText = `🤖 Terima kasih Kak *${session.booking.nama_pasien}*! Mohon infokan **Hari/Tanggal & Jam Slot Kedatangan** yang Kakak inginkan ya (contoh: *Besok jam 14:00 WIB*). 😊`;
                }
                else {
                    replyText = `🤖 Terima kasih Kak *${session.booking.nama_pasien}*! Untuk tanggal *${session.booking.tanggal_booking}*, Kakak ingin mengambil **Jam Slot** berapa? (Klinik kami buka 09:00 - 20:00 WIB, contoh: *14:00 WIB* atau *10:00 WIB*). 😊`;
                }
            }
            else {
                session.step = 'AWAITING_CONFIRMATION';
                replyText = renderBookingRecap(session.booking, cleanSenderPhone);
            }
            await whatsappProvider.sendMessage(sender, replyText);
            session.history.push({ role: 'assistant', content: replyText });
            await session_service_1.sessionService.setSession(sender, session);
        }
        else {
            session.step = 'IDLE';
            replyText = `🤖 Halo Kak! Silakan sebutkan perawatan kecantikan yang ingin Kakak reservasi ya. 😊✨`;
            await whatsappProvider.sendMessage(sender, replyText);
            session.history.push({ role: 'assistant', content: replyText });
            await session_service_1.sessionService.setSession(sender, session);
        }
        return;
    }
    // C. STATE: AWAITING_CONFIRMATION (MENUNGGU KONFIRMASI FINAL)
    if (session.step === 'AWAITING_CONFIRMATION') {
        if (intent === 'CONFIRM') {
            if (session.booking) {
                session.booking.nomor_hp = sanitizePhoneNumber(session.booking.nomor_hp, cleanSenderPhone);
                console.log(`📊 [Sheets Service] Menulis data reservasi klinik kecantikan ke Google Sheets...`);
                await (0, sheets_service_1.appendBookingToSheet)(session.booking);
                replyText = `🤖 *Reservasi Klinik Kecantikan Berhasil Terdaftar!* \n\nHalo Kak *${session.booking.nama_pasien}*, janji temu perawatan kecantikan Anda telah resmi terdaftar di klinik kami. Tim resepsionis / beauty consultant kami akan mengonfirmasi ulang jadwal Kakak. Terima kasih dan sampai jumpa di klinik kecantikan kami! 🙏😊✨`;
                await whatsappProvider.sendMessage(sender, replyText);
                session.history.push({ role: 'assistant', content: replyText });
                await session_service_1.sessionService.deleteSession(sender);
                console.log(`👷 [Worker] Reservasi klinik kecantikan selesai & sesi dihapus bersih untuk ${sender}`);
            }
            return;
        }
        if (intent === 'BOOKING') {
            console.log(`👷 [Worker] Mendeteksi perubahan/tambahan treatment dalam AWAITING_CONFIRMATION`);
            const updatedBooking = await (0, ai_service_1.extractBookingFromChat)(message, catalogContext, session.history, session.booking);
            if (updatedBooking && updatedBooking.layanan_dipilih && updatedBooking.layanan_dipilih.length > 0) {
                updatedBooking.nomor_hp = sanitizePhoneNumber(updatedBooking.nomor_hp, cleanSenderPhone);
                session.booking = updatedBooking;
                replyText = renderBookingRecap(session.booking, cleanSenderPhone);
            }
            else {
                replyText = `🤖 Maaf Kak, perubahan reservasi belum sesuai dengan katalog perawatan kecantikan kami. Silakan ketik kembali nama treatment yang diinginkan ya Kak.`;
            }
            await whatsappProvider.sendMessage(sender, replyText);
            session.history.push({ role: 'assistant', content: replyText });
            await session_service_1.sessionService.setSession(sender, session);
            return;
        }
        if (intent === 'INQUIRY') {
            replyText = await (0, ai_service_1.answerInquiry)(message, catalogContext, session.history);
            replyText = `${replyText}\n\n*Catatan:* Konfirmasi jadwal perawatan Kakak di atas masih menunggu konfirmasi. Apakah rincian janji temu sudah sesuai? (Ketik **Ya** jika sesuai). 😊✨`;
            await whatsappProvider.sendMessage(sender, replyText);
            session.history.push({ role: 'assistant', content: replyText });
            await session_service_1.sessionService.setSession(sender, session);
            return;
        }
        // Fallback jika pengguna mengirim teks lain (sapaan/pesan umum) saat masih menunggu konfirmasi
        if (session.booking) {
            replyText = `🤖 Halo Kak! Rincian reservasi janji temu perawatan kecantikan Kakak sebelumnya masih menunggu konfirmasi nih:\n\n${renderBookingRecap(session.booking, cleanSenderPhone)}\n\n*(Ketik **Ya** untuk konfirmasi, ketik perubahan treatment jika ingin ganti, atau ketik **Batal** untuk membatalkan).* 😊✨`;
        }
        else {
            session.step = 'IDLE';
            replyText = `🤖 Halo Kak! Ada yang bisa kami bantu seputar informasi treatment kecantikan atau reservasi jadwal dokter? 😊✨`;
        }
        await whatsappProvider.sendMessage(sender, replyText);
        session.history.push({ role: 'assistant', content: replyText });
        await session_service_1.sessionService.setSession(sender, session);
        return;
    }
    // D. STATE: IDLE (TIDAK ADA RESERVASI AKTIF)
    if (session.step === 'IDLE') {
        if (intent === 'BOOKING') {
            console.log(`👷 [Worker] Memproses pendaftaran reservasi klinik kecantikan baru...`);
            // Reset riwayat chat untuk reservasi baru agar tidak terkontaminasi data booking lama
            session.history = [{ role: 'user', content: message }];
            const extractedBooking = await (0, ai_service_1.extractBookingFromChat)(message, catalogContext, []);
            if (!extractedBooking.layanan_dipilih || extractedBooking.layanan_dipilih.length === 0) {
                console.log(`⚠️ [Worker] Pasien berniat booking tetapi tidak ada treatment yang cocok dengan katalog.`);
                replyText = `🤖 Halo Kak! Kami mendeteksi Kakak ingin melakukan reservasi perawatan, tetapi jenis treatment yang disebutkan belum tersedia di katalog kami.\n\n*Berikut Perawatan Kecantikan yang Tersedia:* \n${catalogContext}\n\nSilakan ketik ulang nama treatment yang Kakak inginkan ya! Terima kasih! 😊✨`;
                await whatsappProvider.sendMessage(sender, replyText);
                session.history.push({ role: 'assistant', content: replyText });
                await session_service_1.sessionService.setSession(sender, session);
                return;
            }
            extractedBooking.nomor_hp = sanitizePhoneNumber(extractedBooking.nomor_hp, cleanSenderPhone);
            session.booking = extractedBooking;
            const isNameMissing = !extractedBooking.nama_pasien ||
                extractedBooking.nama_pasien.trim() === '-' ||
                extractedBooking.nama_pasien.trim() === '';
            const isDateMissing = !extractedBooking.tanggal_booking ||
                extractedBooking.tanggal_booking.trim() === '-' ||
                extractedBooking.tanggal_booking.trim() === '';
            const isTimeMissing = !extractedBooking.jam_booking ||
                extractedBooking.jam_booking.trim() === '-' ||
                extractedBooking.jam_booking.trim() === '' ||
                extractedBooking.jam_booking.includes('Sesuai');
            if (isNameMissing) {
                session.step = 'AWAITING_NAME';
                replyText = `🤖 Terima kasih! Mohon infokan **Nama Lengkap Pasien/Klien** Kakak ya agar reservasi perawatan bisa kami catat. 😊`;
            }
            else if (isDateMissing || isTimeMissing) {
                session.step = 'AWAITING_DATE_TIME';
                if (isDateMissing) {
                    replyText = `🤖 Terima kasih Kak *${extractedBooking.nama_pasien}*! Mohon infokan **Hari/Tanggal & Jam Slot Kedatangan** Kakak ya agar kami jadwalkan dokternya (contoh: *Besok jam 14:00 WIB*). 😊`;
                }
                else {
                    replyText = `🤖 Terima kasih Kak *${extractedBooking.nama_pasien}*! Untuk tanggal *${extractedBooking.tanggal_booking}*, Kakak ingin mengambil **Jam Slot** berapa? (Klinik kami buka 09:00 - 20:00 WIB, contoh: *14:00 WIB* atau *10:00 WIB*). 😊`;
                }
            }
            else {
                session.step = 'AWAITING_CONFIRMATION';
                replyText = renderBookingRecap(extractedBooking, cleanSenderPhone);
            }
            await whatsappProvider.sendMessage(sender, replyText);
            session.history.push({ role: 'assistant', content: replyText });
            await session_service_1.sessionService.setSession(sender, session);
            return;
        }
        if (intent === 'INQUIRY') {
            replyText = await (0, ai_service_1.answerInquiry)(message, catalogContext, session.history);
            replyText = `🤖 ${replyText}`;
            await whatsappProvider.sendMessage(sender, replyText);
            session.history.push({ role: 'assistant', content: replyText });
            await session_service_1.sessionService.setSession(sender, session);
            return;
        }
        // Default Response (Sapaan Pembuka atau Percakapan Umum)
        const isGreeting = /^(halo|hai|p|pagi|siang|sore|malam|assalamu|halo kak|hi|menu|bantuan)/i.test(cleanMessageLower);
        if (isGreeting) {
            replyText = `🤖 Halo Kak! Selamat datang di Klinik Kecantikan & Estetika Kami. 😊✨\n\nAda yang bisa kami bantu seputar konsultasi kulit atau perawatan kecantikan Kakak? Kakak bisa menanyakan estimasi biaya/tarif treatment, rekomendasi perawatan wajah, atau bisa langsung mengetikkan jadwal booking treatment Kakak.\n\n*Contoh Format Reservasi:*\n_\"Mau booking Facial Glowing dan Laser Acne untuk besok jam 2 siang kak\"_`;
        }
        else {
            replyText = await (0, ai_service_1.answerInquiry)(message, catalogContext, session.history);
            replyText = `🤖 ${replyText}`;
        }
        await whatsappProvider.sendMessage(sender, replyText);
        session.history.push({ role: 'assistant', content: replyText });
        await session_service_1.sessionService.setSession(sender, session);
        return;
    }
}, {
    connection: redis_1.default,
    concurrency: 1,
});
exports.whatsappWorker.on('completed', (job) => {
    console.log(`✅ [Worker] Job #${job?.id} SELESAI diproses secara sukses.`);
});
exports.whatsappWorker.on('failed', (job, err) => {
    console.error(`🚨 [Worker] Job #${job?.id} GAGAL diproses! Alasan:`, err.message);
});
console.log(`⚙️ [Worker] Worker '${whatsapp_queue_1.WHATSAPP_QUEUE_NAME}' (Beauty & Aesthetic Clinic Booking) aktif...`);
exports.default = exports.whatsappWorker;
